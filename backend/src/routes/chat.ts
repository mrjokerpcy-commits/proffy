import { Router, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import { z } from "zod";

const router = Router();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
const qdrant = new QdrantClient({ url: process.env.QDRANT_URL || "http://localhost:6333" });
let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const ChatSchema = z.object({
  message: z.string().min(1).max(4000),
  courseId: z.string().optional(),
  university: z.string().optional(),
  department: z.string().optional(),
  course: z.string().optional(),
  professor: z.string().optional(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).optional(),
});

router.post("/", async (req: Request, res: Response) => {
  const parsed = ChatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { message, university, department, course, professor, history = [] } = parsed.data;

  // Set up SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    // 1. Embed the query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: message,
    });
    const queryVector = embeddingResponse.data[0].embedding;

    // 2. Build Qdrant filter from context
    const filter: any = { must: [] };
    if (university) filter.must.push({ key: "university", match: { value: university } });
    if (department) filter.must.push({ key: "department", match: { value: department } });
    if (course) filter.must.push({ key: "course", match: { value: course } });
    if (professor) filter.must.push({ key: "professor", match: { value: professor } });

    // 3. Retrieve relevant chunks
    const searchResult = await qdrant.search("studyai_chunks", {
      vector: queryVector,
      limit: 8,
      filter: filter.must.length > 0 ? filter : undefined,
      with_payload: true,
    });

    // 4. Build context from retrieved chunks
    const context = searchResult
      .map((hit, i) => {
        const p = hit.payload as any;
        const source = [p.filename, p.type, p.professor].filter(Boolean).join(" · ");
        return `[Source ${i + 1}: ${source}]\n${p.text}`;
      })
      .join("\n\n---\n\n");

    const sources = searchResult.map((hit) => ({
      filename: (hit.payload as any)?.filename,
      type: (hit.payload as any)?.type,
      professor: (hit.payload as any)?.professor,
      score: hit.score,
    }));

    // 5. Stream Claude response
    const systemPrompt = `You are StudyAI, an expert tutor for Israeli university students.
You help students understand course material, prepare for exams, and build strong intuition.
Always cite your sources using [Source N] notation.
If you don't know something from the provided context, say so honestly.
Render math using LaTeX notation ($$...$$).
Course context: ${[university, department, course, professor].filter(Boolean).join(", ") || "General"}

Retrieved context from course materials:
${context || "No specific course material found. Answer from general knowledge."}`;

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        ...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
        { role: "user", content: message },
      ],
    });

    // Send sources first
    res.write(`data: ${JSON.stringify({ type: "sources", sources })}\n\n`);

    // Stream text tokens
    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ type: "token", text: chunk.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Chat error:", err);
    res.write(`data: ${JSON.stringify({ type: "error", message: "Something went wrong" })}\n\n`);
    res.end();
  }
});

export { router as chatRouter };
