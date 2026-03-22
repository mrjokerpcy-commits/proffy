import { NextRequest, NextResponse } from "next/server";
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
      ADD COLUMN IF NOT EXISTS semester TEXT;
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS mq_status_idx ON material_queue(status)`);
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

// ── List all files in a Drive folder (recursive, subfolder name = course) ─────
async function listDriveFiles(
  drive: ReturnType<typeof google.drive>,
  folderId: string,
  subfolderName: string | null = null,
  depth = 0,
): Promise<{ id: string; name: string; mimeType: string; size: string; courseName: string | null }[]> {
  if (depth > 3) return []; // cap recursion depth
  const files: { id: string; name: string; mimeType: string; size: string; courseName: string | null }[] = [];
  let pageToken: string | undefined;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, size)",
      pageSize: 100,
      pageToken,
    });
    for (const f of res.data.files ?? []) {
      if (!f.id || !f.name || !f.mimeType) continue;
      if (f.mimeType === "application/vnd.google-apps.folder") {
        // Recurse — the folder name becomes the course context for its files
        const nested = await listDriveFiles(drive, f.id, f.name, depth + 1);
        files.push(...nested);
      } else {
        files.push({ id: f.id, name: f.name, mimeType: f.mimeType, size: f.size ?? "0", courseName: subfolderName });
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return files;
}

// ── Download a Drive file as Buffer ─────────────────────────────────────────
async function downloadDriveFile(drive: ReturnType<typeof google.drive>, fileId: string, mimeType: string): Promise<{ buffer: Buffer; exportedMime: string }> {
  // Google Workspace files must be exported
  if (mimeType === "application/vnd.google-apps.presentation") {
    const res = await drive.files.export(
      { fileId, mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
      { responseType: "arraybuffer" }
    );
    return { buffer: Buffer.from(res.data as ArrayBuffer), exportedMime: "application/vnd.openxmlformats-officedocument.presentationml.presentation" };
  }
  if (mimeType === "application/vnd.google-apps.document") {
    const res = await drive.files.export(
      { fileId, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
      { responseType: "arraybuffer" }
    );
    return { buffer: Buffer.from(res.data as ArrayBuffer), exportedMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
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
  if (current.trim().length > 50) chunks.push({ text: current.trim(), slide_number: slideNumber, word_count: wordCount });
  return chunks;
}

function qualityFilter(chunks: Chunk[]): Chunk[] {
  return chunks.filter(c => {
    if (c.word_count < 10) return false;
    const specialRatio = (c.text.match(/[^a-zA-Z\u0590-\u05FF\s\d.,;:!?()\-+=%]/g) || []).length / c.text.length;
    return specialRatio <= 0.4;
  });
}

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
        { type: "text", text: "Extract all text from this document verbatim. Preserve headings, equations, and structure. Return text only." },
      ],
    }],
  });
  return res.content.filter(b => b.type === "text").map(b => (b as any).text).join("").trim();
}

async function extractFromImage(buffer: Buffer, mimeType: string): Promise<string> {
  const base64 = buffer.toString("base64");
  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: base64 } },
        { type: "text", text: "Extract all text from this image verbatim. Preserve headings, equations (LaTeX notation), and structure. Return extracted text only." },
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

// ── Embed + upsert chunks to Qdrant ─────────────────────────────────────────
async function embedAndUpsert(chunks: Chunk[], payload: Record<string, unknown>) {
  let count = 0;
  for (let i = 0; i < chunks.length; i += 20) {
    const batch = chunks.slice(i, i + 20);
    const embRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch.map(c => c.text),
    });
    const points = batch.map((c, j) => ({
      id: crypto.randomUUID(),
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
  file: { id: string; name: string; mimeType: string; courseName: string | null },
  queueRow: { university: string; course_name: string; course_number?: string; professor?: string; semester?: string }
): Promise<number> {
  // Subfolder name overrides the queue-level course name (more specific)
  const effectiveCourseName = file.courseName ?? queueRow.course_name;
  const effectiveMime = file.mimeType === "application/vnd.google-apps.presentation"
    ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    : file.mimeType === "application/vnd.google-apps.document"
    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    : file.mimeType;

  const fileKind = ALLOWED_MIME_DRIVE[file.mimeType];
  if (!fileKind) return 0; // unsupported type, skip

  const { buffer, exportedMime } = await downloadDriveFile(drive, file.id, file.mimeType);
  if (buffer.length > 25 * 1024 * 1024) return 0; // skip files > 25MB

  let rawChunks: Chunk[] = [];

  if (fileKind === "text") {
    rawChunks = smartChunk(buffer.toString("utf-8"));
  } else if (fileKind === "image") {
    const text = await extractFromImage(buffer, effectiveMime);
    rawChunks = smartChunk(text);
  } else if (fileKind === "office") {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "pptx";
    const officeChunks = await extractFromOffice(buffer, `${file.id}.${ext}`);
    if (officeChunks) {
      rawChunks = officeChunks;
    } else {
      const text = await extractFromImage(buffer, "image/png");
      rawChunks = smartChunk(text);
    }
  } else {
    // PDF
    const text = await extractFromPdf(buffer);
    rawChunks = smartChunk(text);
  }

  const chunks = qualityFilter(rawChunks);
  if (chunks.length === 0) return 0;

  const sampleText = chunks.slice(0, 3).map(c => c.text).join(" ");
  const docType = await classifyDocType(sampleText, file.name);

  const safeFilename = file.name.replace(/[^a-zA-Z0-9._\-\u0590-\u05FF ]/g, "_").slice(0, 200);

  return embedAndUpsert(chunks, {
    filename:      safeFilename,
    type:          docType,
    professor:     queueRow.professor ?? null,
    university:    queueRow.university,
    course:        effectiveCourseName,   // subfolder name if available
    course_number: queueRow.course_number ?? null,
    course_id:     null, // shared content — not tied to a specific user's course
    user_id:       null,
    semester:      queueRow.semester ?? null,
    is_shared:     true,
    trust_level:   "verified",
  });
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

      let files: Awaited<ReturnType<typeof listDriveFiles>> = [];
      try {
        files = await listDriveFiles(drive, folderId);
      } catch (err: any) {
        await pool.query(
          `UPDATE material_queue SET status = 'failed', error_msg = $1, processed_at = NOW() WHERE id = $2`,
          [err.message?.slice(0, 500), row.id]
        );
        return;
      }

      // Process files in batches of 5 to avoid rate limits
      let totalChunks = 0;
      const queueRow = { university: row.university, course_name: row.course_name, course_number: row.course_number, professor: row.professor, semester: row.semester };

      for (let i = 0; i < files.length; i += 5) {
        const batch = files.slice(i, i + 5);
        const batchResults = await Promise.allSettled(
          batch.map(f => processDriveFile(drive, f, queueRow))
        );
        for (const r of batchResults) {
          if (r.status === "fulfilled") totalChunks += r.value;
        }
      }

      await pool.query(
        `UPDATE material_queue SET status = 'done', processed_at = NOW(), files_found = $1, chunks_created = $2 WHERE id = $3`,
        [files.length, totalChunks, row.id]
      );
    })
  );

  const succeeded = results.filter(r => r.status === "fulfilled").length;
  const failed    = results.filter(r => r.status === "rejected").length;

  return NextResponse.json({ processed: pending.length, succeeded, failed });
}
