import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { google } from "googleapis";
import Anthropic from "@anthropic-ai/sdk";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import { Pool } from "pg";

export const maxDuration = 300;
export const dynamic     = "force-dynamic";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "placeholder" });
const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "placeholder" });
const qdrant    = new QdrantClient({ url: process.env.QDRANT_URL || "http://localhost:6333", ...(process.env.QDRANT_API_KEY ? { apiKey: process.env.QDRANT_API_KEY } : {}) });
const pool      = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

const ALLOWED_MIME_DRIVE: Record<string, "pdf" | "image" | "text" | "office"> = {
  "application/pdf":                                                               "pdf",
  "text/plain":                                                                    "text",
  "image/jpeg":                                                                    "image",
  "image/png":                                                                     "image",
  "image/webp":                                                                    "image",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":    "office",
  "application/vnd.ms-powerpoint":                                                 "office",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":      "office",
  "application/msword":                                                            "office",
  // Google Workspace export targets
  "application/vnd.google-apps.presentation":                                      "office",
  "application/vnd.google-apps.document":                                          "office",
};

// ── Migrate material_queue to add status column ──────────────────────────────
async function ensureSchema() {
  await pool.query(`
    ALTER TABLE material_queue
      ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS error_msg TEXT,
      ADD COLUMN IF NOT EXISTS files_found INT,
      ADD COLUMN IF NOT EXISTS chunks_created INT,
      ADD COLUMN IF NOT EXISTS course_number TEXT,
      ADD COLUMN IF NOT EXISTS professor TEXT,
      ADD COLUMN IF NOT EXISTS semester TEXT,
      ADD COLUMN IF NOT EXISTS log TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS processed_file_ids TEXT NOT NULL DEFAULT '';
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS mq_status_idx ON material_queue(status)`);
}

function ts() {
  return new Date().toISOString().slice(11, 19); // HH:MM:SS
}

async function appendLog(id: string, line: string) {
  await pool.query(
    `UPDATE material_queue SET log = log || $1 WHERE id = $2`,
    [`[${ts()}] ${line}\n`, id]
  ).catch(() => {});
}

// ── Google Drive auth via service account ────────────────────────────────────
function getDriveClient() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY env var not set");
  const credentials = JSON.parse(keyJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  return google.drive({ version: "v3", auth });
}

// ── Extract folder ID from various Drive URL formats ─────────────────────────
function extractFolderId(url: string): string | null {
  // https://drive.google.com/drive/folders/FOLDER_ID
  // https://drive.google.com/drive/u/0/folders/FOLDER_ID
  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  // https://drive.google.com/open?id=FOLDER_ID
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  return null;
}

// ── List all files in a Drive folder (recursive, tracks full path) ────────────
async function listDriveFiles(
  drive: ReturnType<typeof google.drive>,
  folderId: string,
  pathSoFar: string[] = [],
  depth = 0,
  onProgress?: (count: number) => void,
): Promise<{ id: string; name: string; mimeType: string; size: string; folderPath: string[] }[]> {
  if (depth > 6) return [];
  const files: { id: string; name: string; mimeType: string; size: string; folderPath: string[] }[] = [];
  let pageToken: string | undefined;
  const subfolders: { id: string; name: string }[] = [];
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, size)",
      pageSize: 1000,
      pageToken,
    });
    for (const f of res.data.files ?? []) {
      if (!f.id || !f.name || !f.mimeType) continue;
      if (f.mimeType === "application/vnd.google-apps.folder") {
        subfolders.push({ id: f.id, name: f.name });
      } else {
        files.push({ id: f.id, name: f.name, mimeType: f.mimeType, size: f.size ?? "0", folderPath: pathSoFar });
        onProgress?.(files.length);
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  // Recurse into subfolders in parallel (max 5 concurrent to avoid rate limits)
  for (let i = 0; i < subfolders.length; i += 5) {
    const batch = subfolders.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(f => listDriveFiles(drive, f.id, [...pathSoFar, f.name], depth + 1, onProgress).catch(() => []))
    );
    for (const nested of results) files.push(...nested);
  }
  return files;
}

// Generic/upload folder names to ignore when inferring course
const GENERIC_FOLDER_NAMES = new Set([
  "uploads", "upload", "תיקיות העלאות", "תיקיית העלאות", "shared", "files",
  "documents", "material", "materials", "course material", "חומרי לימוד",
  "general", "misc", "other", "שונות", "כללי", "downloads", "all courses",
  "past exams", "מבחנים", "exams", "tests", "quizzes", "homework", "hw",
  "lectures", "tutorials", "תרגולים", "הרצאות", "notes", "סיכומים",
]);

// Per-invocation cache: folder path string → inferred course name
// Avoids calling AI for every file in the same folder (can be thousands)
const coursePathCache = new Map<string, string | null>();

// ── Use AI to extract course name from folder path + filename ─────────────────
async function inferCourseFromPath(folderPath: string[], filename: string): Promise<string | null> {
  // Strip generic folder names from the path — keep meaningful course-level folders
  const meaningfulPath = folderPath.filter(p => {
    const lower = p.trim().toLowerCase();
    return !GENERIC_FOLDER_NAMES.has(lower) && !GENERIC_FOLDER_NAMES.has(p.trim()) && p.trim().length > 1;
  });

  // If only one meaningful folder remains, use it directly (no AI call needed)
  if (meaningfulPath.length === 1) return meaningfulPath[0];

  const pathStr = meaningfulPath.join(" / ");

  // Cache hit: same folder path already resolved this run
  if (coursePathCache.has(pathStr)) return coursePathCache.get(pathStr)!;

  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 30,
      messages: [{
        role: "user",
        content: `You are tagging university course material. Given this folder path and filename, identify the COURSE NAME (e.g. "מימון", "Calculus", "Macroeconomics", "Parallel Computing").
Rules:
- Pick the folder that represents the COURSE, not a subfolder type (not "Past Exams", "Lectures", etc.)
- If the path has both a course and a subfolder type, pick the course
- If path is empty, infer from the filename
- Reply with ONLY the course name, nothing else

Path: ${pathStr || "(root)"}
File: ${filename}

Course name:`,
      }],
    });
    const text = res.content[0].type === "text" ? res.content[0].text.trim() : null;
    const result = (text && text.length > 0 && text.length < 100) ? text : (meaningfulPath.length > 0 ? meaningfulPath[0] : null);
    coursePathCache.set(pathStr, result);
    return result;
  } catch {}

  // Fallback: use the first meaningful folder (most likely the course-level one)
  const fallback = meaningfulPath.length > 0 ? meaningfulPath[0] : null;
  coursePathCache.set(pathStr, fallback);
  return fallback;
}

// ── Download a Drive file as Buffer ─────────────────────────────────────────
async function downloadDriveFile(drive: ReturnType<typeof google.drive>, fileId: string, mimeType: string): Promise<{ buffer: Buffer; exportedMime: string }> {
  // Google Workspace files must be exported
  // Google Slides → PDF (we have working PDF extractor via Claude Haiku)
  if (mimeType === "application/vnd.google-apps.presentation") {
    const res = await drive.files.export(
      { fileId, mimeType: "application/pdf" },
      { responseType: "arraybuffer" }
    );
    return { buffer: Buffer.from(res.data as ArrayBuffer), exportedMime: "application/pdf" };
  }
  // Google Docs → plain text (no external service needed, preserves Hebrew perfectly)
  if (mimeType === "application/vnd.google-apps.document") {
    const res = await drive.files.export(
      { fileId, mimeType: "text/plain" },
      { responseType: "arraybuffer" }
    );
    return { buffer: Buffer.from(res.data as ArrayBuffer), exportedMime: "text/plain" };
  }
  // Regular files
  const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
  return { buffer: Buffer.from(res.data as ArrayBuffer), exportedMime: mimeType };
}

// ── Shared: auto-detect doc type from filename ───────────────────────────────
function detectDocType(filename: string): string | null {
  const n = filename.toLowerCase();
  if (n.includes("exam") || n.includes("מבחן") || n.includes("moed") || n.includes("midterm") || n.includes("final")) return "exam";
  if (n.includes("lecture") || n.includes("הרצאה") || n.includes("slides") || n.includes("שקופיות")) return "slides";
  if (n.includes("summary") || n.includes("סיכום")) return "notes";
  if (n.includes("practice") || n.includes("תרגול") || n.includes("tirgul") || n.includes("hw") || n.includes("homework")) return "notes";
  if (n.includes("textbook") || n.includes("book") || n.includes("ספר")) return "textbook";
  return null;
}

// Combined: verifies course name against content AND classifies doc type in one AI call.
// Returns { course, docType, mismatch }.
// mismatch = true means the content looks like a different subject than pathCourse.
async function inferCourseAndDocType(
  folderPath: string[],
  filename: string,
  sampleText: string,
  pathCourse: string,    // course name from path inference (may be wrong)
  fallbackCourse: string // queue-level course name
): Promise<{ course: string; docType: string; mismatch: boolean }> {
  const docTypeFromName = detectDocType(filename);

  // Build meaningful path string for context
  const meaningfulPath = folderPath.filter(p => {
    const lower = p.trim().toLowerCase();
    return !GENERIC_FOLDER_NAMES.has(lower) && !GENERIC_FOLDER_NAMES.has(p.trim()) && p.trim().length > 1;
  });
  const pathStr = meaningfulPath.join(" / ");

  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 60,
      messages: [{
        role: "user",
        content: `You are a university course material tagger. Analyze this file and respond with JSON only.

Folder path: ${pathStr || "(root)"}
Filename: ${filename}
Expected course (from folder): ${pathCourse}
First 400 chars of content:
${sampleText.slice(0, 400)}

Respond with exactly this JSON (no markdown, no extra text):
{"course":"<actual course name>","type":"<exam|slides|notes|textbook>","match":<true|false>}

- course: the real course this material belongs to (use content to verify, correct if path is wrong)
- type: document type based on content
- match: true if content matches the expected course, false if it looks like a different subject`,
      }],
    });
    const raw = res.content[0].type === "text" ? res.content[0].text.trim() : "";
    const parsed = JSON.parse(raw);
    const course   = typeof parsed.course === "string" && parsed.course.length > 0 && parsed.course.length < 120
      ? parsed.course : pathCourse || fallbackCourse;
    const docType  = ["exam", "slides", "notes", "textbook"].includes(parsed.type) ? parsed.type : (docTypeFromName ?? "notes");
    const mismatch = parsed.match === false;
    return { course, docType, mismatch };
  } catch {}

  // Fallback
  return { course: pathCourse || fallbackCourse, docType: docTypeFromName ?? "notes", mismatch: false };
}

interface Chunk { text: string; slide_number: number | null; word_count: number }

function smartChunk(text: string, slideNumber: number | null = null, maxWords = 300): Chunk[] {
  const chunks: Chunk[] = [];

  // Split on: markdown headers (##), blank lines between paragraphs, or sentence-ending punctuation
  // Handles Hebrew RTL numbered lists like ".1 ..." by splitting on blank lines + headers first
  const segments = text
    .split(/\n{2,}/)                          // split on blank lines
    .flatMap(seg => seg.split(/(?=^#{1,3} )/m)) // further split on markdown headers
    .map(s => s.trim())
    .filter(s => s.length > 0);

  let current = "";
  let wordCount = 0;

  function flush() {
    if (current.trim().length > 50) {
      chunks.push({ text: current.trim(), slide_number: slideNumber, word_count: wordCount });
    }
    current = "";
    wordCount = 0;
  }

  for (const seg of segments) {
    const words = seg.split(/\s+/).length;
    // If segment alone exceeds limit, split it further by sentence
    if (words > maxWords) {
      if (current) flush();
      const sentences = seg.split(/(?<=[.!?؟])\s+/);
      for (const sentence of sentences) {
        const sw = sentence.trim().split(/\s+/).length;
        if (wordCount + sw > maxWords && current.length > 0) {
          flush();
        }
        current += sentence + " ";
        wordCount += sw;
      }
      flush();
    } else if (wordCount + words > maxWords && current.length > 0) {
      flush();
      current = seg + "\n\n";
      wordCount = words;
    } else {
      current += seg + "\n\n";
      wordCount += words;
    }
  }
  flush();
  return chunks;
}

function qualityFilter(chunks: Chunk[]): Chunk[] {
  return chunks.filter(c => {
    if (c.word_count < 10) return false;
    const specialRatio = (c.text.match(/[^a-zA-Z\u0590-\u05FF\s\d.,;:!?()\-+=%]/g) || []).length / c.text.length;
    return specialRatio <= 0.4;
  });
}

const EXTRACT_PROMPT = `Extract all text from this document verbatim and with high accuracy.
Rules:
- Preserve the exact Hebrew text — do not translate, summarize, or paraphrase
- Preserve all mathematical formulas and equations in LaTeX notation (e.g. $x^2 + y^2$, $$\\sum_{i=1}^n$$)
- Preserve headings, numbered lists, bullet points, and document structure
- For tables: preserve as markdown tables
- For mixed Hebrew/English content: keep both languages exactly as they appear
- Return extracted text only — no commentary, no "Here is the extracted text:" preamble`;

const IMAGE_EXTRACT_PROMPT = `You are extracting text from a scanned or photographed academic document (university exam, lecture notes, or study material). Extract with maximum accuracy.

Critical rules:
1. Hebrew text: extract RIGHT-TO-LEFT text exactly as written — every word, abbreviation, and shorthand as-is. Do not expand abbreviations.
2. Math formulas: convert ALL mathematical expressions to LaTeX inline ($...$) or display ($$...$$) notation. Fractions → \\frac{}{}, roots → \\sqrt{}, subscripts → _{}, superscripts → ^{}. Example: "100/1.05^4" → $\\frac{100}{1.05^4}$
3. Tables and grids: reproduce as markdown tables with | delimiters
4. Question numbers: preserve exactly (שאלה 1, .1, א., (א), etc.)
5. If the scan is tilted or low quality: still extract every readable character — mark truly unreadable parts as [?]
6. Mixed Hebrew+English+math is common in Israeli university material — handle all three in the same line
7. Return ONLY the extracted text. No preamble, no "Here is the text", no explanation.`;


async function extractFromPdf(buffer: Buffer): Promise<string> {
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
        { type: "text", text: EXTRACT_PROMPT },
      ],
    }],
  });
  return res.content.filter(b => b.type === "text").map(b => (b as any).text).join("").trim();
}

async function extractFromImage(buffer: Buffer, mimeType: string): Promise<string> {
  const base64 = buffer.toString("base64");
  const safeMime = (["image/jpeg","image/png","image/webp","image/gif"].includes(mimeType)
    ? mimeType : "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: safeMime, data: base64 } },
        { type: "text", text: IMAGE_EXTRACT_PROMPT },
      ],
    }],
  });
  return res.content.filter(b => b.type === "text").map(b => (b as any).text).join("");
}

interface SlideData { slide_number: number; title: string; content: string[]; notes: string }
async function extractFromOffice(buffer: Buffer, filename: string): Promise<Chunk[] | null> {
  const processorUrl = process.env.PROCESSOR_URL || "http://localhost:8001";
  try {
    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array(buffer)]), filename);
    const res = await fetch(`${processorUrl}/extract/pptx`, { method: "POST", body: formData, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;
    const slides: SlideData[] = await res.json();
    const chunks: Chunk[] = [];
    for (const slide of slides) {
      const text = [slide.title, ...slide.content, slide.notes].filter(Boolean).join("\n").trim();
      if (text.length > 50) chunks.push(...smartChunk(text, slide.slide_number));
    }
    return qualityFilter(chunks);
  } catch { return null; }
}

// ── Ensure Qdrant collection exists with indexes ─────────────────────────────
async function ensureQdrantCollection() {
  try { await qdrant.getCollection("studyai_chunks"); return; } catch {}
  await qdrant.createCollection("studyai_chunks", { vectors: { size: 1536, distance: "Cosine" } });
  await Promise.all([
    qdrant.createPayloadIndex("studyai_chunks", { field_name: "university",    field_schema: "keyword" }),
    qdrant.createPayloadIndex("studyai_chunks", { field_name: "course_number", field_schema: "keyword" }),
    qdrant.createPayloadIndex("studyai_chunks", { field_name: "course_id",     field_schema: "keyword" }),
    qdrant.createPayloadIndex("studyai_chunks", { field_name: "type",          field_schema: "keyword" }),
    qdrant.createPayloadIndex("studyai_chunks", { field_name: "user_id",       field_schema: "keyword" }),
    qdrant.createPayloadIndex("studyai_chunks", { field_name: "is_shared",     field_schema: "bool" }),
  ]);
}

// ── Deterministic UUID from fileId + chunkIndex (enables idempotent upserts) ─
function chunkId(fileId: string, chunkIndex: number): string {
  const hash = createHash("sha1").update(`${fileId}:${chunkIndex}`).digest("hex");
  // Format as UUID v4-compatible string
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;
}

// ── Embed + upsert chunks to Qdrant ─────────────────────────────────────────
async function embedAndUpsert(chunks: Chunk[], payload: Record<string, unknown>, fileId: string) {
  let count = 0;
  for (let i = 0; i < chunks.length; i += 20) {
    const batch = chunks.slice(i, i + 20);
    const embRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch.map(c => c.text),
    });
    const points = batch.map((c, j) => ({
      id: chunkId(fileId, i + j),
      vector: embRes.data[j].embedding,
      payload: {
        ...payload,
        text:        c.text,
        chunk_index: i + j,
        slide_number: c.slide_number,
        helpful_count: 0,
        total_shown:   0,
        helpfulness_score: 0.5,
      },
    }));
    await qdrant.upsert("studyai_chunks", { points });
    count += points.length;
  }
  return count;
}

// ── Process a single Drive file ──────────────────────────────────────────────
async function processDriveFile(
  drive: ReturnType<typeof google.drive>,
  file: { id: string; name: string; mimeType: string; folderPath: string[] },
  queueRow: { university: string; course_name: string; course_number?: string; professor?: string; semester?: string }
): Promise<{ chunks: number; course: string; mismatch?: boolean }> {
  const fullPath = [...file.folderPath, file.name].join(" / ");
  const fileKind = ALLOWED_MIME_DRIVE[file.mimeType];
  if (!fileKind) return { chunks: 0, course: queueRow.course_name }; // unsupported type, skip

  const { buffer, exportedMime } = await downloadDriveFile(drive, file.id, file.mimeType);
  if (buffer.length > 25 * 1024 * 1024) return { chunks: 0, course: queueRow.course_name }; // skip files > 25MB

  // Determine effective kind after export
  // Google Slides → exported as PDF; Google Docs → exported as text/plain
  const effectiveKind: typeof fileKind =
    exportedMime === "application/pdf" ? "pdf" :
    exportedMime === "text/plain"      ? "text" :
    fileKind;

  let rawChunks: Chunk[] = [];

  if (effectiveKind === "text") {
    rawChunks = smartChunk(buffer.toString("utf-8"));
  } else if (effectiveKind === "image") {
    const text = await extractFromImage(buffer, exportedMime as "image/jpeg" | "image/png" | "image/webp");
    rawChunks = smartChunk(text);
  } else if (effectiveKind === "office") {
    // Fallback for .pptx/.docx uploaded directly (not Google Workspace) — try PPTX extractor
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "pptx";
    const officeChunks = await extractFromOffice(buffer, `${file.id}.${ext}`);
    if (officeChunks) {
      rawChunks = officeChunks;
    } else {
      // Last resort: convert to image and OCR
      const text = await extractFromImage(buffer, "image/png");
      rawChunks = smartChunk(text);
    }
  } else {
    // PDF
    const text = await extractFromPdf(buffer);
    rawChunks = smartChunk(text);
  }

  const chunks = qualityFilter(rawChunks);
  if (chunks.length === 0) return { chunks: 0, course: queueRow.course_name };

  const sampleText = chunks.slice(0, 3).map(c => c.text).join(" ");

  // Path-level course inference (cached per folder path)
  const pathCourse = file.folderPath.length > 0
    ? (await inferCourseFromPath(file.folderPath, file.name)) ?? queueRow.course_name
    : queueRow.course_name;

  // Content-aware: verify course name against extracted text and get doc type in one call
  const { course: effectiveCourseName, docType, mismatch } = await inferCourseAndDocType(
    file.folderPath, file.name, sampleText, pathCourse, queueRow.course_name
  );

  // mismatch is surfaced in the return value so the caller can log it

  const safeFilename = file.name.replace(/[^a-zA-Z0-9._\-\u0590-\u05FF ]/g, "_").slice(0, 200);

  const count = await embedAndUpsert(chunks, {
    filename:      safeFilename,
    folder_path:   fullPath,              // full Drive path for agent context
    type:          docType,
    professor:     queueRow.professor ?? null,
    university:    queueRow.university,
    course:        effectiveCourseName,   // AI-inferred course name
    course_number: queueRow.course_number ?? null,
    course_id:     null,
    user_id:       null,
    semester:      queueRow.semester ?? null,
    is_shared:     true,
    trust_level:   "verified",
  }, file.id);
  return { chunks: count, course: effectiveCourseName, mismatch };
}

// ── Main handler ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await ensureSchema();
  } catch (err) {
    console.error("Schema migration error:", err);
    // Continue anyway — table might already be correct
  }

  // Unstick items that have been 'processing' for > 20 minutes (cron timeout recovery)
  await pool.query(`
    UPDATE material_queue
    SET status = 'pending'
    WHERE status = 'processing'
      AND (processed_at IS NULL OR processed_at < NOW() - INTERVAL '20 minutes')
      AND created_at < NOW() - INTERVAL '20 minutes'
  `).catch(() => {});

  // Claim up to 3 pending items at once
  const { rows: pending } = await pool.query(`
    UPDATE material_queue
    SET status = 'processing'
    WHERE id IN (
      SELECT id FROM material_queue
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT 3
    )
    RETURNING *
  `);

  if (pending.length === 0) {
    return NextResponse.json({ processed: 0, message: "Queue empty" });
  }

  let drive: ReturnType<typeof google.drive>;
  try {
    drive = getDriveClient();
  } catch (err: any) {
    // Reset items back to pending
    await pool.query(`UPDATE material_queue SET status = 'pending' WHERE id = ANY($1)`, [pending.map((r: any) => r.id)]);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  await ensureQdrantCollection();

  const results = await Promise.allSettled(
    pending.map(async (row: any) => {
      const folderId = extractFolderId(row.url);
      if (!folderId) {
        await pool.query(
          `UPDATE material_queue SET status = 'failed', error_msg = $1, processed_at = NOW() WHERE id = $2`,
          ["Could not extract folder ID from URL", row.id]
        );
        return;
      }

      // Restore log only on first run (no processed files yet)
      const isFirstRun = !row.processed_file_ids;
      if (isFirstRun) await pool.query(`UPDATE material_queue SET log = '' WHERE id = $1`, [row.id]).catch(() => {});
      await appendLog(row.id, `Starting: ${row.url}`);

      let files: Awaited<ReturnType<typeof listDriveFiles>> = [];
      try {
        await appendLog(row.id, `Listing files in Drive folder...`);
        let lastLoggedCount = 0;
        const onProgress = (count: number) => {
          if (count - lastLoggedCount >= 200) {
            lastLoggedCount = count;
            appendLog(row.id, `  ...found ${count} files so far`).catch(() => {});
          }
        };
        files = await Promise.race([
          listDriveFiles(drive, folderId, [], 0, onProgress),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Drive listing timed out after 150s — folder may be too large or service account lacks access")), 150_000)
          ),
        ]);
        await appendLog(row.id, `Found ${files.length} files total`);
      } catch (err: any) {
        const msg = err.message?.slice(0, 500) ?? "Unknown error listing folder";
        await appendLog(row.id, `ERROR listing files: ${msg}`);
        await pool.query(
          `UPDATE material_queue SET status = 'failed', error_msg = $1, processed_at = NOW() WHERE id = $2`,
          [msg, row.id]
        );
        return;
      }

      // Resume from where we left off — skip already-processed file IDs
      const processedIds = new Set((row.processed_file_ids ?? "").split(",").filter(Boolean));
      const remaining = files.filter(f => !processedIds.has(f.id));
      await appendLog(row.id, `${processedIds.size} already done, ${remaining.length} remaining`);

      // Process up to 40 files per cron run to stay within 5-min timeout
      const FILE_BATCH_SIZE = 40;
      const filesToProcess = remaining.slice(0, FILE_BATCH_SIZE);

      let totalChunks = 0;
      const newlyDoneIds: string[] = [];
      const queueRow = { university: row.university ?? "Unknown", course_name: row.course_name ?? "General", course_number: row.course_number, professor: row.professor, semester: row.semester };

      for (let i = 0; i < filesToProcess.length; i += 5) {
        const batch = filesToProcess.slice(i, i + 5);
        await appendLog(row.id, `Batch ${Math.floor(i/5)+1}/${Math.ceil(filesToProcess.length/5)}: ${batch.map(f => f.name).join(", ")}`);
        const batchResults = await Promise.allSettled(
          batch.map(f => processDriveFile(drive, f, queueRow))
        );
        for (let j = 0; j < batchResults.length; j++) {
          const r = batchResults[j];
          if (r.status === "fulfilled") {
            totalChunks += r.value.chunks;
            newlyDoneIds.push(batch[j].id);
            await appendLog(row.id, `  ✓ ${batch[j].name} → ${r.value.chunks} chunks${r.value.course ? ` [${r.value.course}]` : ""}${r.value.mismatch ? " ⚠ content differs from folder" : ""}`);
          } else {
            const errMsg: string = (r.reason as any)?.message ?? "unknown error";
            // Transient errors (credit, rate limit, network) — do NOT mark as done so they're retried
            const isTransient = /credit balance|rate.?limit|529|overloaded|timeout|ECONNRESET|ETIMEDOUT/i.test(errMsg);
            if (!isTransient) {
              newlyDoneIds.push(batch[j].id); // permanent failure — skip on next run
            }
            await appendLog(row.id, `  ✗ ${batch[j].name} → ${errMsg}${isTransient ? " (will retry)" : ""}`);
          }
        }
        // Save progress after each mini-batch so a timeout doesn't lose work
        const allDoneIds = [...processedIds, ...newlyDoneIds].join(",");
        await pool.query(
          `UPDATE material_queue SET processed_file_ids = $1, chunks_created = COALESCE(chunks_created, 0) + $2 WHERE id = $3`,
          [allDoneIds, totalChunks, row.id]
        ).catch(() => {});
        totalChunks = 0; // reset so we don't double-count on next save
      }

      const allDoneIds = [...processedIds, ...newlyDoneIds].join(",");
      const allFilesProcessed = allDoneIds.split(",").filter(Boolean).length >= files.length;

      if (allFilesProcessed) {
        await appendLog(row.id, `Done — all ${files.length} files processed`);
        await pool.query(
          `UPDATE material_queue SET status = 'done', processed_at = NOW(), files_found = $1, processed_file_ids = $2 WHERE id = $3`,
          [files.length, allDoneIds, row.id]
        );
      } else {
        const left = files.length - allDoneIds.split(",").filter(Boolean).length;
        await appendLog(row.id, `Paused — ${left} files remaining, will continue next run`);
        await pool.query(
          `UPDATE material_queue SET status = 'pending', processed_file_ids = $1, files_found = $2 WHERE id = $3`,
          [allDoneIds, files.length, row.id]
        );
      }
    })
  );

  const succeeded = results.filter(r => r.status === "fulfilled").length;
  const failed    = results.filter(r => r.status === "rejected").length;

  return NextResponse.json({ processed: pending.length, succeeded, failed });
}
