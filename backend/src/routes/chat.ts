import { Router, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import { Pool } from "pg";
import { z } from "zod";

import { flag }                                            from "../services/flags";
import { detectFrustration, getFrustratedSystemAddendum } from "../services/frustration";
import { compactHistory }                                  from "../services/compaction";
import { loadCourseContext }                               from "../services/courseContext";
import { appendStudyLog, trackUsage }                      from "../services/studyLog";
import { dreamCourseInsights }                             from "../services/dream";
import { mailboxSearch, formatMailboxContext }             from "../services/mailboxRag";
import { updateMomentum, isPassive, getQuizModeAddendum, createMomentumState } from "../services/momentum";

const router    = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
const qdrant    = new QdrantClient({ url: process.env.QDRANT_URL || "http://localhost:6333" });
const pool      = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
});

let _openai: OpenAI | null = null;
const getOpenAI = () => (_openai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));

const ChatSchema = z.object({
  message        : z.string().min(1).max(4000),
  courseId       : z.string().optional(),
  university     : z.string().optional(),
  department     : z.string().optional(),
  course         : z.string().optional(),
  professor      : z.string().optional(),
  history        : z.array(z.object({
    role   : z.enum(["user", "assistant"]),
    content: z.string(),
  })).optional(),
  // Session momentum state forwarded from client
  momentumState  : z.object({
    continueCount    : z.number(),
    messageTimes     : z.array(z.number()),
    frustrationEvents: z.number(),
    questionDepth    : z.enum(["surface", "medium", "deep"]),
  }).optional(),
});

router.post("/", async (req: Request, res: Response) => {
  const parsed = ChatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const {
    message, courseId, university, department, course, professor,
    history = [], momentumState,
  } = parsed.data;

  const userId    = (req as any).user?.id ?? "anonymous";
  const startTime = Date.now();

  // ── SSE headers ────────────────────────────────────────────────────────────
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");

  try {
    // ── 1. Frustration detection (regex — no inference cost) ────────────────
    const isFrustrated =
      flag("FRUSTRATION_DETECTION") && detectFrustration(message);

    // ── 2. Session momentum (passive student detection) ─────────────────────
    const prevMomentum = momentumState ?? createMomentumState();
    const momentum     = flag("MOMENTUM_TRACKING")
      ? updateMomentum(prevMomentum, message)
      : prevMomentum;
    const studentIsPassive = flag("MOMENTUM_TRACKING") && isPassive(momentum);

    // ── 3. Auto-compact history if session is too long ──────────────────────
    const compactedHistory = flag("AUTO_COMPACTION")
      ? await compactHistory(anthropic, history)
      : history;

    // ── 4. PARALLEL: embed query + load course context simultaneously ────────
    const [embeddingResponse, courseContext] = await Promise.all([
      getOpenAI().embeddings.create({ model: "text-embedding-3-small", input: message }),
      flag("COURSE_CONTEXT")
        ? loadCourseContext(pool, courseId, university, course)
        : Promise.resolve(null),
    ]);

    const queryVector = embeddingResponse.data[0].embedding;

    // ── 5. RAG: mailbox parallel search OR standard single search ────────────
    let context: string;
    let sources: Array<{ filename: string; type: string; professor: string; score: number; source?: string }>;

    if (flag("MAILBOX_RAG")) {
      // Three parallel workers: slides · exams · textbooks
      const baseFilter: Record<string, string> = {};
      if (university)  baseFilter.university  = university;
      if (department)  baseFilter.department  = department;
      if (course)      baseFilter.course      = course;
      if (professor)   baseFilter.professor   = professor;

      const chunks = await mailboxSearch(qdrant, queryVector, baseFilter);
      const formatted = formatMailboxContext(chunks);
      context = formatted.context;
      sources = formatted.sources;
    } else {
      // Standard single Qdrant search
      const filter: { must: object[] } = { must: [] };
      if (university)  filter.must.push({ key: "university",  match: { value: university  } });
      if (department)  filter.must.push({ key: "department",  match: { value: department  } });
      if (course)      filter.must.push({ key: "course",      match: { value: course      } });
      if (professor)   filter.must.push({ key: "professor",   match: { value: professor   } });

      const searchResult = await qdrant.search("studyai_chunks", {
        vector      : queryVector,
        limit       : 8,
        filter      : filter.must.length > 0 ? filter : undefined,
        with_payload: true,
      });

      context = searchResult
        .map((hit, i) => {
          const p      = hit.payload as Record<string, string>;
          const source = [p.filename, p.type, p.professor].filter(Boolean).join(" · ");
          return `[Source ${i + 1}: ${source}]\n${p.text}`;
        })
        .join("\n\n---\n\n");

      sources = searchResult.map((hit) => ({
        filename : (hit.payload as any)?.filename,
        type     : (hit.payload as any)?.type,
        professor: (hit.payload as any)?.professor,
        score    : hit.score,
      }));
    }

    // ── 6. System prompt — cache-optimized ordering ──────────────────────────
    //
    // Stable sections come FIRST to maximize prompt cache hit rate.
    // Volatile sections (date, context) go LAST so they don't bust the cache.
    //
    // [STABLE]      core persona + rules
    // [SEMI-STABLE] course background knowledge (changes per course, not per turn)
    // [VOLATILE]    retrieved chunks + behavioral addenda (change every turn)

    const courseLabel = [university, department, course, professor].filter(Boolean).join(", ") || "General";

    // --- STABLE section (rarely changes) ---
    const stableSection = `You are Proffy, an expert AI tutor for Israeli university students.
You help students understand course material, prepare for exams, and build strong intuition.

CORE RULES:
- Always cite retrieved sources using [Source N] notation
- Treat retrieved context as strong hints, not absolute facts — if something seems wrong or incomplete, say so honestly
- Never hallucinate. If you don't know, say so explicitly
- Render math using LaTeX ($$...$$)
- Code blocks: use markdown fences with language tags
- Be direct and concise — students are often under pressure
- When a source is from an exam solution [EXAM], prioritize it for problem-solving questions`;

    // --- SEMI-STABLE section (changes per course, cached across turns) ---
    const semiStableSection = courseContext
      ? `\n\nCOURSE BACKGROUND (verified — treat as strong prior, still cite retrieved sources):\n${courseContext}`
      : "";

    const courseSection = `\n\nCourse: ${courseLabel}`;

    // --- VOLATILE section (changes every turn — not cached) ---
    const contextSection = `\n\nRetrieved course material (cite as [Source N]):
${context || "No course material found. Answer from general knowledge."}`;

    const behaviorSection = [
      isFrustrated     ? getFrustratedSystemAddendum() : "",
      studentIsPassive ? getQuizModeAddendum()          : "",
    ].filter(Boolean).join("");

    const systemPrompt = stableSection + semiStableSection + courseSection + contextSection + behaviorSection;

    // ── 7. Build params — prompt caching on stable + semi-stable sections ────
    //
    // We cache the system prompt as one block. The stable prefix maximizes cache
    // hit rate because it never changes; volatile suffix is appended each turn.
    const betas: string[] = flag("PROMPT_CACHING") ? ["prompt-caching-2024-07-31"] : [];

    const streamParams: Parameters<typeof anthropic.messages.stream>[0] = {
      model     : "claude-sonnet-4-6",
      max_tokens: 2048,
      ...(betas.length > 0 ? { betas } : {}),
      system: flag("PROMPT_CACHING")
        ? [{ type: "text" as const, text: systemPrompt, cache_control: { type: "ephemeral" as const } }]
        : systemPrompt,
      messages: [
        ...compactedHistory.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
        { role: "user" as const, content: message },
      ],
    };

    // ── 8. Stream ─────────────────────────────────────────────────────────────
    const stream = anthropic.messages.stream(streamParams);

    // Send metadata first — frontend renders source chips + momentum before text arrives
    res.write(`data: ${JSON.stringify({ type: "sources", sources })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "momentum", state: momentum, passive: studentIsPassive })}\n\n`);

    let fullResponse = "";
    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        fullResponse += chunk.delta.text;
        res.write(`data: ${JSON.stringify({ type: "token", text: chunk.delta.text })}\n\n`);
      }
    }

    const finalMsg  = await stream.finalMessage();
    const tokensIn  = finalMsg.usage?.input_tokens  ?? 0;
    const tokensOut = finalMsg.usage?.output_tokens ?? 0;

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();

    // ── 9. Post-session async work — never await these ────────────────────────
    if (flag("STUDY_LOG")) {
      appendStudyLog(userId, {
        message,
        courseId, university, course, professor,
        responseLength  : fullResponse.length,
        sourcesCount    : sources.length,
        isFrustrated,
        studentIsPassive,
        questionDepth   : momentum.questionDepth,
        durationMs      : Date.now() - startTime,
      });
    }

    trackUsage(pool, userId, tokensIn, tokensOut);

    // ── 10. autoDream — consolidate insights in background ───────────────────
    if (flag("DREAM") && university && course && history.length >= 4) {
      const allMessages = [
        ...compactedHistory,
        { role: "user",      content: message       },
        { role: "assistant", content: fullResponse  },
      ];
      dreamCourseInsights(anthropic, pool, university, course, allMessages).catch(() => {});
    }

  } catch (err) {
    console.error("[chat] Error:", err);
    res.write(`data: ${JSON.stringify({ type: "error", message: "Something went wrong" })}\n\n`);
    res.end();
  }
});

export { router as chatRouter };
