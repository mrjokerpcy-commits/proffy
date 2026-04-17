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
  ssl: false,
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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS technion_courses (
      course_number TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      name_hebrew   TEXT,
      faculty       TEXT,
      is_mandatory  BOOLEAN NOT NULL DEFAULT false,
      lecturer      TEXT,
      semester      TEXT,
      exam_date     TEXT,
      credits       TEXT,
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE technion_courses ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN NOT NULL DEFAULT false`).catch(() => {});
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

// ── Detect Google Workspace document URL (Docs, Slides, Sheets) ──────────────
function extractDocumentInfo(url: string): { id: string; mimeType: string; name: string } | null {
  const docsMatch = url.match(/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/);
  if (!docsMatch) return null;
  const type = docsMatch[1];
  const id   = docsMatch[2];
  const mimeTypes: Record<string, string> = {
    document:      "application/vnd.google-apps.document",
    presentation:  "application/vnd.google-apps.presentation",
    spreadsheets:  "application/vnd.google-apps.spreadsheet",
  };
  const names: Record<string, string> = {
    document:     "Google Doc",
    presentation: "Google Slides",
    spreadsheets: "Google Sheets",
  };
  return { id, mimeType: mimeTypes[type] ?? "application/vnd.google-apps.document", name: names[type] ?? "Google Doc" };
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

// ── Course identification cache ───────────────────────────────────────────────
// Key = meaningful folder path string → { course, courseNumber }
// First file per folder uses content to verify; all subsequent files reuse the result.
interface CourseTag { course: string; courseNumber: string | null }
const coursePathCache = new Map<string, CourseTag>();

// Hebrew course abbreviation knowledge baked in so AI doesn't need to guess
const COURSE_ABBREV_HINT = `
Common university course names and abbreviations:
- מדר / מד"ר / משוואות דיפרנציאליות רגילות = ODE (Ordinary Differential Equations)
- חדו"א / חדווא / חשבון אינפיניטסימלי = Calculus / Mathematical Analysis
- אלגברה לינארית / אל"ל = Linear Algebra
- פיסיקה / פיז = Physics
- מכניקה קלאסית = Classical Mechanics
- תורת החשמל = Electromagnetism
- מבוא למדעי המחשב / מבמח = Intro to CS
- מבנה נתונים = Data Structures
- תכנות מונחה עצמים / תמ"ע = OOP
- מערכות הפעלה / מה"פ = Operating Systems
- רשתות תקשורת = Computer Networks
- אלגוריתמים = Algorithms
- הסתברות / הסת = Probability
- סטטיסטיקה = Statistics
- מחשבים דיגיטליים = Digital Systems
- אלקטרוניקה = Electronics
- מימון / כלכלה = Finance / Economics
- חשבונאות = Accounting
- ביולוגיה / כימיה / פיזיקה = Biology / Chemistry / Physics
Course numbers often appear at the start of filenames or in the first lines of the document (e.g. 104136, 234123, 044101).
`;

// Extract meaningful (non-generic) folders from path
function getMeaningfulPath(folderPath: string[]): string[] {
  return folderPath.filter(p => {
    const lower = p.trim().toLowerCase();
    return !GENERIC_FOLDER_NAMES.has(lower) && !GENERIC_FOLDER_NAMES.has(p.trim()) && p.trim().length > 1;
  });
}

// ── Identify course for a file — cached per folder, content-verified on first file ──
async function identifyCourse(
  folderPath: string[],
  filename: string,
  sampleText: string,       // first ~600 chars of extracted content (used on cache miss)
  fallback: string          // queue-level course name
): Promise<CourseTag> {
  const meaningfulPath = getMeaningfulPath(folderPath);
  const pathStr = meaningfulPath.join(" / ");

  // Cache hit — this folder already resolved from a previous file's content
  if (coursePathCache.has(pathStr)) return coursePathCache.get(pathStr)!;

  // DB lookup: if any path segment or filename contains a 6-digit course number, check technion_courses
  const allText = [...folderPath, filename].join(" ");
  const numMatch = allText.match(/\b(\d{6})\b/);
  if (numMatch) {
    try {
      const { rows } = await pool.query(
        "SELECT name, name_hebrew FROM technion_courses WHERE course_number = $1",
        [numMatch[1]]
      );
      if (rows[0]) {
        const name = rows[0].name_hebrew || rows[0].name;
        const tag: CourseTag = { course: `${numMatch[1]} - ${name}`, courseNumber: numMatch[1] };
        coursePathCache.set(pathStr, tag);
        return tag;
      }
    } catch {}
  }

  // Single-folder path with no content ambiguity — use it directly (no AI needed)
  if (meaningfulPath.length === 1 && sampleText.length === 0) {
    const tag: CourseTag = { course: meaningfulPath[0], courseNumber: null };
    coursePathCache.set(pathStr, tag);
    return tag;
  }

  // AI call: use both path AND content for maximum accuracy
  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 80,
      messages: [{
        role: "user",
        content: `You are a university course material classifier. Identify the correct course for this file.
${COURSE_ABBREV_HINT}
Folder path: ${pathStr || "(root)"}
Filename: ${filename}
Expected course (from folder): ${meaningfulPath[0] ?? fallback}
First 600 chars of actual content:
${sampleText.slice(0, 600)}

Respond with JSON only (no markdown):
{"course":"<full course name in the language used>","number":"<course number if found, else null>"}

Rules:
- Use the CONTENT to verify and correct the course name if the folder is wrong
- If content clearly belongs to a different course than the folder name, use the content-inferred name
- course number = numeric ID like 104136 or 234123 (null if not found in content or filename)`,
      }],
    });
    const raw = res.content[0].type === "text" ? res.content[0].text.trim() : "";
    const parsed = JSON.parse(raw);
    const course = typeof parsed.course === "string" && parsed.course.length > 0 && parsed.course.length < 120
      ? parsed.course
      : (meaningfulPath[0] ?? fallback);
    const courseNumber = typeof parsed.number === "string" && /^\d{5,8}$/.test(parsed.number.trim())
      ? parsed.number.trim()
      : null;
    const tag: CourseTag = { course, courseNumber };
    coursePathCache.set(pathStr, tag);
    return tag;
  } catch {}

  // Fallback
  const tag: CourseTag = { course: meaningfulPath[0] ?? fallback, courseNumber: null };
  coursePathCache.set(pathStr, tag);
  return tag;
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
  // Exams — Hebrew: מועד (sitting), מבחן/בחינה (test), פתרון בחינה (exam solution)
  // Folder names: מבחנים, בחינות, exams
  if (
    n.includes("exam") || n.includes("test") || n.includes("midterm") || n.includes("final") ||
    n.includes("מבחן") || n.includes("בחינה") || n.includes("מועד") || n.includes("מבחנים") || n.includes("בחינות") ||
    n.includes("moed") || n.includes("quiz") ||
    // season + year patterns in exam folders e.g. "חורף 2015", "spring04", "winter14"
    /חורף\s*\d{4}/.test(n) || /קיץ\s*\d{4}/.test(n) || /אביב\s*\d{4}/.test(n) ||
    /spring\d{2}/.test(n) || /winter\d{2}/.test(n) || /summer\d{2}/.test(n)
  ) return "exam";
  // Slides / lectures
  if (
    n.includes("lecture") || n.includes("slides") || n.includes("lec") ||
    n.includes("הרצאה") || n.includes("הרצאות") || n.includes("שקופיות") || n.includes("מצגת") ||
    n.includes("class") || /^lec\d/.test(n) || /^class\d/.test(n)
  ) return "slides";
  // Textbooks
  if (n.includes("textbook") || n.includes("book") || n.includes("ספר") || n.includes("חוברת")) return "textbook";
  // Notes / summaries / tutorials / homework
  if (
    n.includes("summary") || n.includes("סיכום") || n.includes("תקציר") || n.includes("מסכם") ||
    n.includes("practice") || n.includes("תרגול") || n.includes("tirgul") || n.includes("תרגולים") ||
    n.includes("hw") || n.includes("homework") || n.includes("תרגיל") || n.includes("גיליון") ||
    n.includes("tutorial") || n.includes("rec") || n.includes("recitation") ||
    n.includes("מכין") || n.includes("notes") || n.includes("cheat")
  ) return "notes";
  return null;
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
): Promise<{ chunks: number; course: string; courseNumber: string | null }> {
  const fullPath = [...file.folderPath, file.name].join(" / ");
  const fileKind = ALLOWED_MIME_DRIVE[file.mimeType];
  if (!fileKind) return { chunks: 0, course: queueRow.course_name, courseNumber: queueRow.course_number ?? null }; // unsupported type, skip

  const { buffer, exportedMime } = await downloadDriveFile(drive, file.id, file.mimeType);
  if (buffer.length > 25 * 1024 * 1024) return { chunks: 0, course: queueRow.course_name, courseNumber: queueRow.course_number ?? null }; // skip files > 25MB

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
  if (chunks.length === 0) return { chunks: 0, course: queueRow.course_name, courseNumber: queueRow.course_number ?? null };

  const sampleText = chunks.slice(0, 4).map(c => c.text).join(" ");

  // Identify course — cached per folder, content-verified on first file per folder
  const { course: effectiveCourseName, courseNumber: detectedCourseNumber } = await identifyCourse(
    file.folderPath, file.name, sampleText, queueRow.course_name
  );

  // Doc type: check filename + folder path first (free), AI fallback only when ambiguous
  const fullPathForType = [...file.folderPath, file.name].join("/");
  const docType = detectDocType(fullPathForType) ?? await (async () => {
    try {
      const res = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        messages: [{ role: "user", content: `Classify: exam / slides / notes / textbook\n${file.name}\n${sampleText.slice(0, 300)}\nOne word:` }],
      });
      const t = res.content[0].type === "text" ? res.content[0].text.trim().toLowerCase() : "";
      return ["exam", "slides", "notes", "textbook"].includes(t) ? t : "notes";
    } catch { return "notes"; }
  })();

  const effectiveCourseNumber = detectedCourseNumber
    ?? queueRow.course_number
    ?? effectiveCourseName.match(/\b(\d{5,8})\b/)?.[1]
    ?? null;
  const safeFilename = file.name.replace(/[^a-zA-Z0-9._\-\u0590-\u05FF ]/g, "_").slice(0, 200);

  const count = await embedAndUpsert(chunks, {
    filename:      safeFilename,
    folder_path:   fullPath,
    type:          docType,
    professor:     queueRow.professor ?? null,
    university:    queueRow.university,
    course:        effectiveCourseName,
    course_number: effectiveCourseNumber,
    course_id:     null,
    user_id:       null,
    semester:      queueRow.semester ?? null,
    is_shared:     true,
    trust_level:   "verified",
  }, file.id);
  return { chunks: count, course: effectiveCourseName, courseNumber: effectiveCourseNumber };
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
      // ── Single Google Workspace document (Docs / Slides / Sheets) ────────────
      const docInfo = extractDocumentInfo(row.url);
      if (docInfo) {
        await pool.query(`UPDATE material_queue SET log = '' WHERE id = $1`, [row.id]).catch(() => {});
        await appendLog(row.id, `Detected Google Workspace document: ${docInfo.name} (${docInfo.id})`);
        try {
          const { buffer, exportedMime } = await downloadDriveFile(drive, docInfo.id, docInfo.mimeType);
          await appendLog(row.id, `Downloaded (${(buffer.length / 1024).toFixed(0)} KB, exported as ${exportedMime})`);

          let rawChunks: Chunk[] = [];
          if (exportedMime === "text/plain") {
            rawChunks = smartChunk(buffer.toString("utf-8"));
          } else if (exportedMime === "application/pdf") {
            const text = await extractFromPdf(buffer);
            rawChunks = smartChunk(text);
          } else {
            rawChunks = smartChunk(buffer.toString("utf-8"));
          }

          const chunks = qualityFilter(rawChunks);
          await appendLog(row.id, `Extracted ${chunks.length} chunks`);

          const label = row.course_name || row.note || docInfo.name;
          const docType = detectDocType(label) ?? "notes";
          const sampleText = chunks.slice(0, 4).map((c: Chunk) => c.text).join(" ");
          const { course: effectiveCourseName, courseNumber: effectiveCourseNumber } = await identifyCourse(
            [], label, sampleText, label
          );

          let chunkCount = 0;
          if (chunks.length > 0) {
            chunkCount = await embedAndUpsert(chunks, {
              filename:      label.slice(0, 200),
              folder_path:   row.url,
              type:          docType,
              professor:     row.professor ?? null,
              university:    row.university ?? "Technion",
              course:        effectiveCourseName,
              course_number: effectiveCourseNumber ?? row.course_number ?? null,
              course_id:     null,
              user_id:       null,
              semester:      row.semester ?? null,
              is_shared:     true,
              trust_level:   "verified",
            }, docInfo.id);
          }

          await pool.query(
            `UPDATE material_queue SET status = 'done', processed_at = NOW(), files_found = 1, chunks_created = $1 WHERE id = $2`,
            [chunkCount, row.id]
          );
          await appendLog(row.id, `Done. ${chunkCount} chunks created.`);
        } catch (err: any) {
          const msg = err.message?.slice(0, 500) ?? "Unknown error";
          await appendLog(row.id, `ERROR: ${msg}`);
          await pool.query(
            `UPDATE material_queue SET status = 'failed', error_msg = $1, processed_at = NOW() WHERE id = $2`,
            [msg, row.id]
          );
        }
        return;
      }

      const folderId = extractFolderId(row.url);
      if (!folderId) {
        await pool.query(
          `UPDATE material_queue SET status = 'failed', error_msg = $1, processed_at = NOW() WHERE id = $2`,
          ["Could not extract folder ID from URL. Supported: Drive folders and Google Docs/Slides/Sheets URLs.", row.id]
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

      // Priority courses: manual overrides + auto-loaded חובה courses from catalog for this faculty
      const manualPriority: string[] = (row.priority_courses ?? "").split(",").filter(Boolean);
      let autoPriority: string[] = [];
      if (row.course_name) {
        try {
          const { rows: mandatoryRows } = await pool.query(
            `SELECT course_number FROM technion_courses WHERE is_mandatory = true AND faculty ILIKE $1`,
            [`%${row.course_name}%`]
          );
          autoPriority = mandatoryRows.map((r: any) => r.course_number);
        } catch {}
      }
      const priorityCourses = [...new Set([...manualPriority, ...autoPriority])];
      if (priorityCourses.length > 0) {
        await appendLog(row.id, `Priority: ${priorityCourses.length} חובה courses (${autoPriority.length} from catalog, ${manualPriority.length} manual)`);
      }
      function isPriority(f: { name: string; folderPath: string[] }): boolean {
        if (priorityCourses.length === 0) return false;
        const text = [...f.folderPath, f.name].join(" ");
        return priorityCourses.some(num => text.includes(num));
      }
      const priorityFiles = remaining.filter(isPriority);
      const otherFiles    = remaining.filter(f => !isPriority(f));
      // Shuffle each group separately for coverage within the group
      for (let i = priorityFiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [priorityFiles[i], priorityFiles[j]] = [priorityFiles[j], priorityFiles[i]];
      }
      for (let i = otherFiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otherFiles[i], otherFiles[j]] = [otherFiles[j], otherFiles[i]];
      }
      const sorted = [...priorityFiles, ...otherFiles];
      const priorityNote = priorityFiles.length > 0 ? ` (${priorityFiles.length} priority files first)` : "";
      await appendLog(row.id, `${processedIds.size} already done, ${sorted.length} remaining${priorityNote}`);

      // Process up to 100 files per cron run
      const FILE_BATCH_SIZE = 100;
      const filesToProcess = sorted.slice(0, FILE_BATCH_SIZE);

      let totalChunks = 0;
      const newlyDoneIds: string[] = [];
      const queueRow = { university: row.university ?? "Unknown", course_name: row.course_name ?? "General", course_number: row.course_number, professor: row.professor, semester: row.semester };

      const CONCURRENCY = 2;
      for (let i = 0; i < filesToProcess.length; i += CONCURRENCY) {
        const batch = filesToProcess.slice(i, i + CONCURRENCY);
        await appendLog(row.id, `Batch ${Math.floor(i/CONCURRENCY)+1}/${Math.ceil(filesToProcess.length/CONCURRENCY)}: ${batch.map(f => f.name).join(", ")}`);
        const batchResults = await Promise.allSettled(
          batch.map(f => processDriveFile(drive, f, queueRow))
        );
        // Throttle: 2 files * ~10K tokens each = ~20K tokens. 50K limit/min → safe at 8s gap
        await new Promise(r => setTimeout(r, 8000));
        for (let j = 0; j < batchResults.length; j++) {
          const r = batchResults[j];
          if (r.status === "fulfilled") {
            totalChunks += r.value.chunks;
            // If file had content but no course number identified — leave in queue to retry
            const hasContent = r.value.chunks > 0;
            const hasCourseNumber = !!r.value.courseNumber;
            if (!hasContent || hasCourseNumber) {
              newlyDoneIds.push(batch[j].id);
            }
            const retryNote = hasContent && !hasCourseNumber ? " (no course # — will retry)" : "";
            await appendLog(row.id, `  ✓ ${batch[j].name} → ${r.value.chunks} chunks${r.value.course ? ` [${r.value.course}]` : ""}${retryNote}`);
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

  // Self-schedule: if any queue items are still pending, trigger next run immediately
  const { rows: stillPending } = await pool.query(
    `SELECT COUNT(*) as c FROM material_queue WHERE status = 'pending'`
  ).catch(() => ({ rows: [{ c: "0" }] }));

  if (parseInt(stillPending[0]?.c ?? "0", 10) > 0) {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const cronSecret = process.env.CRON_SECRET;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (cronSecret) headers["Authorization"] = `Bearer ${cronSecret}`;
    // Fire and forget — don't await, just kick off the next run in background
    fetch(`${baseUrl}/api/cron/process-drive-queue`, { headers }).catch(() => {});
  }

  return NextResponse.json({ processed: pending.length, succeeded, failed });
}
