import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import { Pool } from "pg";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "placeholder" });
const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "placeholder" });
const qdrant    = new QdrantClient({ url: process.env.QDRANT_URL || "http://localhost:6333", ...(process.env.QDRANT_API_KEY ? { apiKey: process.env.QDRANT_API_KEY } : {}) });
const pool      = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

const ALLOWED_DOC_TYPES = new Set(["slides", "exam", "notes", "textbook"]);
const MAX_FILE_SIZE     = 25 * 1024 * 1024; // 25 MB
const UUID_RE           = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_MIME: Record<string, "pdf" | "image" | "text" | "office"> = {
  "application/pdf":                                                          "pdf",
  "text/plain":                                                               "text",
  "image/jpeg":                                                               "image",
  "image/jpg":                                                                "image",
  "image/png":                                                                "image",
  "image/webp":                                                               "image",
  "image/gif":                                                                "image",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "office",
  "application/vnd.ms-powerpoint":                                            "office",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "office",
  "application/msword":                                                       "office",
};
const ALLOWED_EXT: Record<string, "pdf" | "image" | "text" | "office"> = {
  pdf:  "pdf",
  txt:  "text",
  jpg:  "image",
  jpeg: "image",
  png:  "image",
  webp: "image",
  gif:  "image",
  pptx: "office",
  ppt:  "office",
  docx: "office",
  doc:  "office",
};

export const maxDuration = 120;
export const dynamic     = "force-dynamic";

// ── Auto-detect document type from filename ─────────────────────────────────
function detectDocType(filename: string): string | null {
  const n = filename.toLowerCase();
  if (n.includes("exam") || n.includes("מבחן") || n.includes("moed") || n.includes("midterm") || n.includes("final")) return "exam";
  if (n.includes("lecture") || n.includes("הרצאה") || n.includes("slides") || n.includes("שקופיות")) return "slides";
  if (n.includes("summary") || n.includes("סיכום")) return "notes";
  if (n.includes("practice") || n.includes("תרגול") || n.includes("tirgul") || n.includes("hw") || n.includes("homework")) return "notes";
  if (n.includes("textbook") || n.includes("book") || n.includes("ספר")) return "textbook";
  return null;
}

// ── Ask Haiku to classify if filename isn't clear ──────────────────────────
async function classifyDocType(text: string, filename: string): Promise<string> {
  const fromName = detectDocType(filename);
  if (fromName) return fromName;
  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      messages: [{ role: "user", content: `Classify this university document into exactly one word: exam / slides / notes / textbook\n\nFilename: ${filename}\nFirst 500 chars:\n${text.slice(0, 500)}\n\nOne word only.` }],
    });
    const t = res.content[0].type === "text" ? res.content[0].text.trim().toLowerCase() : "";
    if (["exam", "slides", "notes", "textbook"].includes(t)) return t;
  } catch {}
  return "notes";
}

// ── Smart sentence-aware chunking ──────────────────────────────────────────
interface Chunk { text: string; slide_number: number | null; word_count: number }
function smartChunk(text: string, slideNumber: number | null = null, maxWords = 400): Chunk[] {
  const chunks: Chunk[] = [];
  const sentences = text.split(/(?<=[.!?؟])\s+/);
  let current = "";
  let wordCount = 0;

  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/).length;
    if (wordCount + words > maxWords && current.length > 0) {
      chunks.push({ text: current.trim(), slide_number: slideNumber, word_count: wordCount });
      current = sentence + " ";
      wordCount = words;
    } else {
      current += sentence + " ";
      wordCount += words;
    }
  }
  if (current.trim().length > 50) {
    chunks.push({ text: current.trim(), slide_number: slideNumber, word_count: wordCount });
  }
  return chunks;
}

// ── Quality filter ──────────────────────────────────────────────────────────
function qualityFilter(chunks: Chunk[]): Chunk[] {
  return chunks.filter(c => {
    if (c.word_count < 10) return false;
    const specialRatio = (c.text.match(/[^a-zA-Z\u0590-\u05FF\s\d.,;:!?()\-+=%]/g) || []).length / c.text.length;
    if (specialRatio > 0.4) return false;
    return true;
  });
}

// ── Detect language ─────────────────────────────────────────────────────────
function detectLanguage(text: string): string {
  const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
  const total = text.replace(/\s/g, "").length;
  return hebrewChars / total > 0.15 ? "Hebrew" : "English";
}

// ── Extract text from image via Claude Vision ───────────────────────────────
async function extractFromImage(buffer: Buffer, mimeType: string, isHandwriting = false): Promise<{ text: string; confidence: number }> {
  const base64 = buffer.toString("base64");
  const prompt = isHandwriting
    ? "Transcribe these handwritten university notes. Include all text, math formulas (use LaTeX notation), and describe any diagrams briefly. Return transcription only."
    : "Extract all text from this image verbatim. Preserve headings, equations (LaTeX notation), and structure. Return extracted text only.";
  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-6", // best for vision + Hebrew
    max_tokens: 3000,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: base64 } },
        { type: "text", text: prompt },
      ],
    }],
  });
  const text = res.content.filter(b => b.type === "text").map(b => (b as any).text).join("");
  // Estimate confidence from response length
  const confidence = text.length > 100 ? 90 : text.length > 30 ? 70 : 50;
  return { text, confidence };
}

// ── Extract text from PDF via Claude document API ──────────────────────────
async function extractFromPdf(buffer: Buffer): Promise<{ text: string; pages: number }> {
  const MAX_BYTES = 4_000_000;
  const workingBuffer = buffer.length > MAX_BYTES ? buffer.subarray(0, MAX_BYTES) : buffer;
  const base64 = workingBuffer.toString("base64");
  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } } as any,
        { type: "text", text: "Extract all text from this document verbatim. Preserve headings, equations, and structure. At the very end output: PAGES:[number]" },
      ],
    }],
  });
  const full = res.content.filter(b => b.type === "text").map(b => (b as any).text).join("");
  const pagesMatch = full.match(/PAGES:(\d+)/);
  const pages = pagesMatch ? parseInt(pagesMatch[1]) : 0;
  const text = full.replace(/PAGES:\d+/, "").trim();
  return { text, pages };
}

// ── Forward PPTX/DOCX to Python processor if available ─────────────────────
interface SlideData { slide_number: number; title: string; content: string[]; notes: string }
async function extractFromOffice(buffer: Buffer, filename: string): Promise<{ chunks: Chunk[]; pages: number } | null> {
  const processorUrl = process.env.PROCESSOR_URL || "http://localhost:8001";
  try {
    const formData = new FormData();
    formData.append("file", new Blob([buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)]), filename);
    const res = await fetch(`${processorUrl}/extract/pptx`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const slides: SlideData[] = await res.json();
    const chunks: Chunk[] = [];
    for (const slide of slides) {
      const parts = [slide.title, ...slide.content, slide.notes].filter(Boolean);
      const text = parts.join("\n").trim();
      if (text.length > 50) {
        const slideChunks = smartChunk(text, slide.slide_number);
        chunks.push(...slideChunks);
      }
    }
    return { chunks: qualityFilter(chunks), pages: slides.length };
  } catch {
    return null; // processor not available
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid form data" }, { status: 400 }); }

  const file       = formData.get("file") as File | null;
  const courseId   = formData.get("courseId") as string | null;
  const rawDocType = formData.get("type") as string | null;

  if (!file || !courseId) {
    return NextResponse.json({ error: "file and courseId are required" }, { status: 400 });
  }
  if (!UUID_RE.test(courseId)) {
    return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 25 MB)" }, { status: 413 });
  }

  // Determine file kind from MIME + extension
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const kindFromMime = ALLOWED_MIME[file.type];
  const kindFromExt  = ALLOWED_EXT[ext];
  const fileKind     = kindFromMime ?? kindFromExt;
  if (!fileKind) {
    return NextResponse.json({ error: "Unsupported file type. Accepted: PDF, TXT, JPG, PNG, WEBP, PPTX, DOCX" }, { status: 415 });
  }

  // Sanitise filename
  const safeFilename = file.name.replace(/[^a-zA-Z0-9._\-\u0590-\u05FF ]/g, "_").slice(0, 200);

  // Verify course belongs to user
  const { rows: courseRows } = await pool.query(
    "SELECT * FROM courses WHERE id = $1 AND user_id = $2",
    [courseId, session.user.id]
  );
  if (!courseRows[0]) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  const course = courseRows[0];

  const fileBuffer = Buffer.from(await file.arrayBuffer());

  // ── Extract text based on file type ───────────────────────────────────────
  let rawChunks: Chunk[]     = [];
  let pages                   = 0;
  let confidence              = 99;
  let patterns: { topic: string; pct: number }[] = [];

  try {
    if (fileKind === "text") {
      const text = fileBuffer.toString("utf-8");
      rawChunks = smartChunk(text);
      pages = 1;

    } else if (fileKind === "image") {
      const { text, confidence: c } = await extractFromImage(fileBuffer, file.type || "image/jpeg");
      confidence = c;
      rawChunks  = smartChunk(text);
      pages      = 1;

    } else if (fileKind === "office") {
      // Try Python processor first (preserves slide numbers)
      const officeResult = await extractFromOffice(fileBuffer, file.name);
      if (officeResult) {
        rawChunks = officeResult.chunks;
        pages     = officeResult.pages;
      } else {
        // Fallback: send as image/vision (less accurate but always works)
        const { text, confidence: c } = await extractFromImage(fileBuffer, "image/png");
        confidence = c;
        rawChunks  = smartChunk(text);
        pages      = 1;
      }

    } else {
      // PDF — primary path
      const isExam = rawDocType === "exam" || detectDocType(file.name) === "exam";
      if (isExam) {
        // Full extraction + pattern detection
        const MAX_BYTES = 4_000_000;
        const workingBuffer = fileBuffer.length > MAX_BYTES ? fileBuffer.subarray(0, MAX_BYTES) : fileBuffer;
        const base64 = workingBuffer.toString("base64");
        const res = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          messages: [{
            role: "user",
            content: [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } } as any,
              { type: "text", text: `Extract all text from this document verbatim.\nThen output a JSON block:\n<patterns>\n[{"topic":"Topic","pct":80},...up to 8]\n</patterns>\nPCT = how often this topic appears in professor's exams (0-100). Focus on specific concepts.\nAlso output: PAGES:[number]` },
            ],
          }],
        });
        const full = res.content.filter(b => b.type === "text").map(b => (b as any).text).join("");
        const pagesMatch = full.match(/PAGES:(\d+)/);
        pages = pagesMatch ? parseInt(pagesMatch[1]) : 0;
        const pMatch = full.match(/<patterns>([\s\S]*?)<\/patterns>/);
        if (pMatch) {
          try { patterns = JSON.parse(pMatch[1].trim()); } catch {}
        }
        const text = full.replace(/<patterns>[\s\S]*?<\/patterns>/, "").replace(/PAGES:\d+/, "").trim();
        rawChunks = smartChunk(text);
      } else {
        const { text, pages: p } = await extractFromPdf(fileBuffer);
        pages     = p;
        rawChunks = smartChunk(text);
      }
    }
  } catch (err) {
    console.error("Extraction error:", err);
    return NextResponse.json({ error: "Failed to extract document text" }, { status: 500 });
  }

  // Quality filter
  const chunks = qualityFilter(rawChunks);

  // Auto-detect doc type
  const sampleText = chunks.slice(0, 3).map(c => c.text).join(" ");
  const file_type_detected = ALLOWED_DOC_TYPES.has(rawDocType ?? "")
    ? (rawDocType as string)
    : await classifyDocType(sampleText, file.name);

  const language = detectLanguage(sampleText);

  // Embed + store in Qdrant
  let chunkCount = 0;
  if (chunks.length > 0) {
    try {
      try { await qdrant.getCollection("studyai_chunks"); }
      catch { await qdrant.createCollection("studyai_chunks", { vectors: { size: 1536, distance: "Cosine" } }); }

      const points: any[] = [];
      for (let i = 0; i < chunks.length; i += 20) {
        const batch = chunks.slice(i, i + 20);
        const embRes = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: batch.map(c => c.text),
        });
        for (let j = 0; j < batch.length; j++) {
          points.push({
            id: crypto.randomUUID(),
            vector: embRes.data[j].embedding,
            payload: {
              text:         batch[j].text,
              filename:     safeFilename,
              type:         file_type_detected,
              professor:    course.professor ?? null,
              university:   course.university,
              course:       course.name,
              course_id:    courseId,
              user_id:      session.user.id,
              chunk_index:  i + j,
              slide_number: batch[j].slide_number,
              helpful_count: 0,
              total_shown:   0,
              helpfulness_score: 0.5,
            },
          });
        }
      }
      await qdrant.upsert("studyai_chunks", { points });
      chunkCount = points.length;
    } catch (err) {
      console.error("Qdrant embed error:", err);
    }
  }

  // Save document record
  const { rows: docRows } = await pool.query(
    `INSERT INTO documents (course_id, user_id, filename, type, professor, size_bytes, chunk_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [courseId, session.user.id, safeFilename, file_type_detected, course.professor ?? null, file.size, chunkCount]
  );

  // Upsert professor patterns if exam
  if (patterns.length > 0) {
    await pool.query("DELETE FROM professor_patterns WHERE course_id = $1 AND user_id = $2", [courseId, session.user.id]);
    for (const p of patterns) {
      await pool.query(
        `INSERT INTO professor_patterns (course_id, user_id, topic, pct, source_file) VALUES ($1,$2,$3,$4,$5)`,
        [courseId, session.user.id, p.topic, p.pct, file.name]
      );
    }
  }

  return NextResponse.json({
    success:             true,
    documentId:          docRows[0].id,
    chunks_created:      chunkCount,
    file_type_detected,
    pages_found:         pages,
    language,
    confidence,
    patterns:            patterns,
    message:             `Your material is ready — ask me anything about it`,
  });
}
