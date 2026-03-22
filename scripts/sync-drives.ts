/**
 * Proffy — Drive Sync Pipeline
 *
 * Reads Google Drive + OneDrive sources from sources.json,
 * classifies every file, extracts text, chunks, embeds, and upserts
 * to Qdrant. Skips already-processed files. ~1000 files in ~3 min.
 *
 * Usage:
 *   npx tsx scripts/sync-drives.ts                  # process all sources
 *   npx tsx scripts/sync-drives.ts --dry-run        # list files, no ingestion
 *   npx tsx scripts/sync-drives.ts --course 234218  # only one course number
 *
 * Required env (via apps/web/.env.local):
 *   ANTHROPIC_API_KEY, OPENAI_API_KEY, QDRANT_URL, DATABASE_URL
 *   GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON)
 *   GOOGLE_CLOUD_API_KEY (for Vision OCR)
 *   MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET (for OneDrive)
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { randomUUID } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { Pool } from "pg";

// ── Load env ──────────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, "../apps/web/.env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const [k, ...v] = line.split("=");
    if (k?.trim() && !k.startsWith("#") && v.length) {
      process.env[k.trim()] = v.join("=").trim();
    }
  }
}

// ── Clients ───────────────────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const qdrant    = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  ...(process.env.QDRANT_API_KEY ? { apiKey: process.env.QDRANT_API_KEY } : {}),
});
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// ── Args ──────────────────────────────────────────────────────────────────────
const DRY_RUN       = process.argv.includes("--dry-run");
const FILTER_COURSE = process.argv.includes("--course")
  ? process.argv[process.argv.indexOf("--course") + 1]
  : null;

// ── Types ─────────────────────────────────────────────────────────────────────
interface DriveSource {
  type: "google_drive" | "onedrive";
  folder_id: string;
  description?: string;
}
interface CourseConfig {
  university: string;
  faculty: string;
  course_number: string;
  course_name: string;
  professor: string;
  semester: string;
  sources: DriveSource[];
}
interface Config { courses: CourseConfig[] }

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  source: DriveSource;
  driveType: "google_drive" | "onedrive";
}

interface Chunk {
  text: string;
  slide_number: number | null;
  page_number: number | null;
  chunk_index: number;
  word_count: number;
}

interface FilePayload {
  university: string;
  faculty: string;
  course_number: string;
  course_name: string;
  professor: string;
  semester: string;
  file_type: string;
  file_name: string;
  slide_number: number | null;
  page_number: number | null;
  chunk_index: number;
  chunk_text: string;
  language: string;
  priority: number;
  helpfulness_score: number;
  is_shared: boolean;
  trust_level: string;
  drive_file_id: string;
}

// ── Config ────────────────────────────────────────────────────────────────────
const sourcesPath = path.join(__dirname, "../sources.json");
if (!fs.existsSync(sourcesPath)) {
  console.error("sources.json not found. Create it from the template in the spec.");
  process.exit(1);
}
const config: Config = JSON.parse(fs.readFileSync(sourcesPath, "utf-8"));

// ── File type classification ──────────────────────────────────────────────────
const FILE_PRIORITY: Record<string, number> = {
  exam: 1.4, lecture: 1.2, practice: 1.0, summary: 0.9, misc: 0.7, ignore: 0,
};

function classifyByFilename(name: string): string {
  const n = name.toLowerCase();
  if (/exam|מבחן|moed|midterm|final|quiz|בחינה|test/.test(n)) return "exam";
  if (/lecture|הרצאה|slides|שקופיות|lec\d|shiur/.test(n)) return "lecture";
  if (/practice|תרגול|tirgul|hw|homework|exercise|תרגיל/.test(n)) return "practice";
  if (/summary|סיכום|sikkum|notes?|recap/.test(n)) return "summary";
  if (/syllabus|schedule|registration|admin|moodle|info/.test(n)) return "ignore";
  return "";
}

async function classifyFile(name: string, firstWords: string): Promise<string> {
  const fromName = classifyByFilename(name);
  if (fromName) return fromName;
  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 5,
      messages: [{ role: "user", content: `Classify this university file. Reply with exactly one word: exam / lecture / practice / summary / misc / ignore\n\nFilename: ${name}\nContent start: ${firstWords.slice(0, 300)}` }],
    });
    const t = res.content[0].type === "text" ? res.content[0].text.trim().toLowerCase() : "";
    return FILE_PRIORITY[t] !== undefined ? t : "misc";
  } catch {
    return "misc";
  }
}

// ── Language detection ────────────────────────────────────────────────────────
function detectLanguage(text: string): string {
  const hebrewChars = (text.match(/[\u05D0-\u05FF\uFB50-\uFDFF]/g) ?? []).length;
  return hebrewChars / text.length > 0.15 ? "hebrew" : "english";
}

// ── Smart chunking ────────────────────────────────────────────────────────────
function smartChunk(
  text: string,
  slideNumber: number | null = null,
  pageNumber: number | null = null,
  maxWords = 400,
): Chunk[] {
  const sentences = text.replace(/\n{3,}/g, "\n\n").split(/(?<=[.!?؟।\n])\s+/);
  const chunks: Chunk[] = [];
  let buf = "";
  let idx = 0;

  for (const sentence of sentences) {
    const words = (buf + " " + sentence).trim().split(/\s+/);
    if (words.length > maxWords && buf) {
      chunks.push({ text: buf.trim(), slide_number: slideNumber, page_number: pageNumber, chunk_index: idx++, word_count: buf.trim().split(/\s+/).length });
      buf = sentence;
    } else {
      buf = (buf + " " + sentence).trim();
    }
  }
  if (buf.trim().split(/\s+/).length >= 10) {
    chunks.push({ text: buf.trim(), slide_number: slideNumber, page_number: pageNumber, chunk_index: idx, word_count: buf.trim().split(/\s+/).length });
  }
  return chunks;
}

function qualityFilter(chunks: Chunk[]): Chunk[] {
  return chunks.filter(c => {
    if (c.word_count < 10) return false;
    const specialChars = (c.text.match(/[^a-zA-Z0-9\u05D0-\u05FF\s.,;:()\-'"]/g) ?? []).length;
    return specialChars / c.text.length < 0.4;
  });
}

// ── PDF text extraction ───────────────────────────────────────────────────────
async function extractPdf(buffer: Buffer, filename: string): Promise<{ chunks: Chunk[]; pages: number }> {
  try {
    // Try pdf-parse first (fast, no AI cost)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    const text: string = data.text ?? "";
    const pages: number = data.numpages ?? 1;
    const wordsPerPage = text.split(/\s+/).length / Math.max(pages, 1);

    // If < 20 words/page → likely scanned, use Vision OCR
    if (wordsPerPage < 20) {
      console.log(`  → Scanned PDF detected (${Math.round(wordsPerPage)} w/p), using Vision OCR`);
      return await ocrPdf(buffer, filename, pages);
    }

    const rawChunks = smartChunk(text, null, null);
    return { chunks: qualityFilter(rawChunks), pages };
  } catch {
    // Fallback: Claude document API
    return await extractPdfWithClaude(buffer);
  }
}

async function extractPdfWithClaude(buffer: Buffer): Promise<{ chunks: Chunk[]; pages: number }> {
  const base64 = buffer.toString("base64");
  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: [{
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      }, { type: "text", text: "Extract all text from this document. Output only the extracted text." }],
    }],
  });
  const text = res.content[0].type === "text" ? res.content[0].text : "";
  return { chunks: qualityFilter(smartChunk(text)), pages: 1 };
}

async function ocrPdf(buffer: Buffer, filename: string, pages: number): Promise<{ chunks: Chunk[]; pages: number }> {
  // Use Google Vision API on base64 PDF
  const base64 = buffer.toString("base64");
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    console.log("  → No GOOGLE_CLOUD_API_KEY, falling back to Claude Vision");
    return await extractPdfWithClaude(buffer);
  }
  const res = await fetch(`https://vision.googleapis.com/v1/files:asyncBatchAnnotate?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [{
        inputConfig: { content: base64, mimeType: "application/pdf" },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        outputConfig: { gcsDestination: { uri: "gs://placeholder" }, batchSize: 1 },
      }],
    }),
  }).catch(() => null);

  if (!res?.ok) {
    // Fallback: send to Claude Vision page by page (up to 10 pages)
    return await extractPdfWithClaude(buffer);
  }

  const data = await res.json();
  const text: string = data.responses?.[0]?.fullTextAnnotation?.text ?? "";
  const cleaned = await cleanOcrText(text);
  return { chunks: qualityFilter(smartChunk(cleaned)), pages };
}

// ── OCR text cleanup via Haiku ────────────────────────────────────────────────
async function cleanOcrText(rawText: string): Promise<string> {
  if (rawText.length < 100) return rawText;
  try {
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `Clean up this OCR-extracted text from a university document. Fix obvious OCR errors, preserve Hebrew text, maintain paragraph structure. Output only the cleaned text:\n\n${rawText.slice(0, 3000)}`,
      }],
    });
    return res.content[0].type === "text" ? res.content[0].text : rawText;
  } catch {
    return rawText;
  }
}

// ── Image OCR ─────────────────────────────────────────────────────────────────
async function extractImage(buffer: Buffer, mimeType: string): Promise<{ chunks: Chunk[] }> {
  const base64 = buffer.toString("base64");
  try {
    const res = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mimeType as any, data: base64 } },
          { type: "text", text: "Extract all text from this image. If it's a Hebrew document, preserve Hebrew. Output only the extracted text." },
        ],
      }],
    });
    const text = res.content[0].type === "text" ? res.content[0].text : "";
    return { chunks: qualityFilter(smartChunk(text)) };
  } catch {
    return { chunks: [] };
  }
}

// ── PPTX extraction via Python processor ──────────────────────────────────────
interface SlideData { slide_number: number; title: string; content: string[]; notes: string }
async function extractPptx(buffer: Buffer, filename: string): Promise<{ chunks: Chunk[]; pages: number }> {
  const processorUrl = process.env.PROCESSOR_URL || "http://localhost:8001";
  try {
    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array(buffer)]), filename);
    const res = await fetch(`${processorUrl}/extract/pptx`, {
      method: "POST", body: formData,
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error("Processor error");
    const slides: SlideData[] = await res.json();
    const chunks: Chunk[] = [];
    for (const slide of slides) {
      const parts = [slide.title, ...slide.content, slide.notes].filter(Boolean);
      const text = parts.join("\n").trim();
      if (text.length > 50) {
        const slideChunks = smartChunk(text, slide.slide_number, null);
        chunks.push(...slideChunks);
      }
    }
    return { chunks: qualityFilter(chunks), pages: slides.length };
  } catch {
    // Fallback: treat first 3000 chars via Claude
    const res = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: `Extract all slide text from this presentation (base64):\n${buffer.toString("base64").slice(0, 4000)}\n\nOutput only the text.` }],
    });
    const text = res.content[0].type === "text" ? res.content[0].text : "";
    return { chunks: qualityFilter(smartChunk(text)), pages: 0 };
  }
}

// ── DOCX extraction via mammoth ───────────────────────────────────────────────
async function extractDocx(buffer: Buffer): Promise<{ chunks: Chunk[]; pages: number }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    const text: string = result.value ?? "";
    return { chunks: qualityFilter(smartChunk(text)), pages: 1 };
  } catch {
    return { chunks: [], pages: 0 };
  }
}

// ── Google Drive API ──────────────────────────────────────────────────────────
let _gdriveToken: string | null = null;
let _gdriveTokenExpiry = 0;

async function getGoogleToken(): Promise<string> {
  if (_gdriveToken && Date.now() < _gdriveTokenExpiry - 60_000) return _gdriveToken;

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, "../google-service-account.json");
  if (!fs.existsSync(credPath)) throw new Error(`Service account not found: ${credPath}`);

  const creds = JSON.parse(fs.readFileSync(credPath, "utf-8"));
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  // Build JWT
  const header  = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: creds.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp,
  })).toString("base64url");

  const { createSign } = await import("crypto");
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(creds.private_key).toString("base64url");
  const jwt = `${header}.${payload}.${sig}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth2:grant-type:jwt-bearer", assertion: jwt }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error(`Google token failed: ${JSON.stringify(tokenData)}`);

  _gdriveToken = tokenData.access_token;
  _gdriveTokenExpiry = (now + (tokenData.expires_in ?? 3600)) * 1000;
  return _gdriveToken!;
}

// List files in a Google Drive folder (recursive, cached 1 hour)
const _folderCache = new Map<string, DriveFile[]>();
const _folderCacheTime = new Map<string, number>();
const CACHE_TTL = 60 * 60 * 1000;

const GDRIVE_MIME_MAP: Record<string, string> = {
  "application/pdf": "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.ms-powerpoint": "pptx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "docx",
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
  "text/plain": "text/plain",
};

async function listGoogleDriveFiles(folderId: string, source: DriveSource): Promise<DriveFile[]> {
  const cacheKey = `gdrive:${folderId}`;
  const cached = _folderCache.get(cacheKey);
  if (cached && Date.now() - (_folderCacheTime.get(cacheKey) ?? 0) < CACHE_TTL) return cached;

  const token = await getGoogleToken();
  const files: DriveFile[] = [];

  async function listFolder(id: string) {
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({
        q: `'${id}' in parents and trashed = false`,
        fields: "nextPageToken,files(id,name,mimeType,size)",
        pageSize: "1000",
        ...(pageToken ? { pageToken } : {}),
      });
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      for (const f of data.files ?? []) {
        if (f.mimeType === "application/vnd.google-apps.folder") {
          await listFolder(f.id); // recurse
        } else if (GDRIVE_MIME_MAP[f.mimeType]) {
          files.push({ id: f.id, name: f.name, mimeType: f.mimeType, size: parseInt(f.size ?? "0"), source, driveType: "google_drive" });
        }
      }
      pageToken = data.nextPageToken;
    } while (pageToken);
  }

  await listFolder(folderId);
  _folderCache.set(cacheKey, files);
  _folderCacheTime.set(cacheKey, Date.now());
  return files;
}

async function downloadGoogleDriveFile(fileId: string): Promise<Buffer> {
  const token = await getGoogleToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── OneDrive / Microsoft Graph API ────────────────────────────────────────────
let _msToken: string | null = null;
let _msTokenExpiry = 0;

async function getMicrosoftToken(): Promise<string> {
  if (_msToken && Date.now() < _msTokenExpiry - 60_000) return _msToken;

  const tenantId = process.env.MS_TENANT_ID;
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) throw new Error("Missing MS_TENANT_ID, MS_CLIENT_ID, or MS_CLIENT_SECRET");

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`MS token failed: ${JSON.stringify(data)}`);
  _msToken = data.access_token;
  _msTokenExpiry = Date.now() + (data.expires_in ?? 3600) * 1000;
  return _msToken!;
}

const ONEDRIVE_EXT_MAP: Record<string, boolean> = {
  pdf: true, pptx: true, ppt: true, docx: true, doc: true,
  jpg: true, jpeg: true, png: true, webp: true, txt: true,
};

async function listOneDriveFiles(folderId: string, source: DriveSource): Promise<DriveFile[]> {
  const cacheKey = `onedrive:${folderId}`;
  const cached = _folderCache.get(cacheKey);
  if (cached && Date.now() - (_folderCacheTime.get(cacheKey) ?? 0) < CACHE_TTL) return cached;

  const token = await getMicrosoftToken();
  const files: DriveFile[] = [];

  async function listFolder(id: string) {
    const res = await fetch(`https://graph.microsoft.com/v1.0/drives/${id}/root/children?$top=1000`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    for (const item of data.value ?? []) {
      if (item.folder) {
        await listFolder(item.id);
      } else {
        const ext = item.name.split(".").pop()?.toLowerCase() ?? "";
        if (ONEDRIVE_EXT_MAP[ext]) {
          files.push({ id: item.id, name: item.name, mimeType: item.file?.mimeType ?? "", size: item.size, source, driveType: "onedrive" });
        }
      }
    }
  }

  await listFolder(folderId);
  _folderCache.set(cacheKey, files);
  _folderCacheTime.set(cacheKey, Date.now());
  return files;
}

async function downloadOneDriveFile(fileId: string): Promise<Buffer> {
  const token = await getMicrosoftToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0/drive/items/${fileId}/content`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`OneDrive download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Extract text from buffer based on extension ───────────────────────────────
async function extractText(buffer: Buffer, filename: string, mimeType: string): Promise<{ chunks: Chunk[]; pages: number }> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf" || mimeType === "application/pdf") return extractPdf(buffer, filename);
  if (ext === "pptx" || ext === "ppt") return extractPptx(buffer, filename);
  if (ext === "docx" || ext === "doc") return extractDocx(buffer);
  if (["jpg","jpeg","png","webp"].includes(ext)) return extractImage(buffer, mimeType || `image/${ext}`);
  if (ext === "txt") return { chunks: qualityFilter(smartChunk(buffer.toString("utf-8"))), pages: 1 };
  return { chunks: [], pages: 0 };
}

// ── Batch embed ───────────────────────────────────────────────────────────────
async function batchEmbed(texts: string[]): Promise<number[][]> {
  const BATCH = 100;
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const res = await openai.embeddings.create({ model: "text-embedding-3-small", input: batch });
    vectors.push(...res.data.map(d => d.embedding));
  }
  return vectors;
}

// ── Ensure Qdrant collection exists ───────────────────────────────────────────
async function ensureCollection() {
  try {
    await qdrant.getCollection("materials");
  } catch {
    await qdrant.createCollection("materials", {
      vectors: { size: 1536, distance: "Cosine" },
    });
    console.log("Created Qdrant collection 'materials'");
  }
}

// ── p-limit implementation (no dep required) ──────────────────────────────────
function pLimit(concurrency: number) {
  const queue: (() => void)[] = [];
  let active = 0;

  function next() {
    while (active < concurrency && queue.length > 0) {
      active++;
      const fn = queue.shift()!;
      fn();
    }
  }

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      queue.push(() => {
        fn().then(v => { active--; next(); resolve(v); }).catch(e => { active--; next(); reject(e); });
      });
      next();
    });
  };
}

// ── Process a single file ─────────────────────────────────────────────────────
async function processFile(
  file: DriveFile,
  course: CourseConfig,
  dirPath: string,
): Promise<{ skipped: boolean; chunks: number }> {
  // Skip already-processed
  const { rows: existing } = await pool.query(
    "SELECT id FROM processed_files WHERE drive_file_id = $1 AND drive_type = $2",
    [file.id, file.driveType]
  );
  if (existing.length > 0) return { skipped: true, chunks: 0 };

  // Download (never saved to disk)
  let buffer: Buffer;
  try {
    buffer = file.driveType === "google_drive"
      ? await downloadGoogleDriveFile(file.id)
      : await downloadOneDriveFile(file.id);
  } catch (err) {
    console.error(`  ✗ Download failed: ${file.name} — ${(err as Error).message}`);
    return { skipped: false, chunks: 0 };
  }

  // Classify
  const firstWords = buffer.toString("utf-8", 0, 500).replace(/[^\x20-\x7E\u05D0-\u05FF]/g, " ");
  const fileType = await classifyFile(file.name, firstWords);
  if (fileType === "ignore") {
    console.log(`  ⏭  Ignored: ${file.name}`);
    return { skipped: false, chunks: 0 };
  }

  // Extract text
  const { chunks, pages } = await extractText(buffer, file.name, file.mimeType);
  if (chunks.length === 0) {
    console.log(`  ⚠  No text extracted: ${file.name}`);
    return { skipped: false, chunks: 0 };
  }

  const lang = detectLanguage(chunks.map(c => c.text).join(" "));
  const priority = FILE_PRIORITY[fileType] ?? 0.7;

  // Build payloads
  const payloads: FilePayload[] = chunks.map(c => ({
    university:        course.university,
    faculty:           course.faculty,
    course_number:     course.course_number,
    course_name:       course.course_name,
    professor:         course.professor.toLowerCase(),
    semester:          course.semester,
    file_type:         fileType,
    file_name:         file.name,
    slide_number:      c.slide_number,
    page_number:       c.page_number,
    chunk_index:       c.chunk_index,
    chunk_text:        c.text,
    language:          lang,
    priority,
    helpfulness_score: 0.5,
    is_shared:         true,
    trust_level:       "official",
    drive_file_id:     file.id,
  }));

  // Embed in batches of 100
  const vectors = await batchEmbed(chunks.map(c => c.text));

  // Upsert to Qdrant in batches of 100
  const BATCH = 100;
  for (let i = 0; i < vectors.length; i += BATCH) {
    const bVectors = vectors.slice(i, i + BATCH);
    const bPayloads = payloads.slice(i, i + BATCH);
    await qdrant.upsert("materials", {
      points: bVectors.map((vec, j) => ({
        id: randomUUID(),
        vector: vec,
        payload: bPayloads[j] as Record<string, unknown>,
      })),
    });
  }

  // Log to PostgreSQL
  await pool.query(
    `INSERT INTO processed_files
       (drive_file_id, drive_type, file_name, file_type, university, faculty,
        course_number, course_name, professor, semester, chunk_count)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (drive_file_id, drive_type) DO UPDATE SET
       chunk_count = EXCLUDED.chunk_count, processed_at = NOW()`,
    [file.id, file.driveType, file.name, fileType, course.university, course.faculty,
     course.course_number, course.course_name, course.professor, course.semester, chunks.length]
  );

  return { skipped: false, chunks: chunks.length };
}

// ── Ensure directory record exists ────────────────────────────────────────────
async function ensureDirectory(course: CourseConfig): Promise<string> {
  const dirPath = [
    course.university,
    course.faculty,
    `${course.course_number} - ${course.course_name}`,
    course.professor,
    course.semester,
  ].filter(Boolean).join("/");

  await pool.query(
    `INSERT INTO directories (university, faculty, course_number, course_name, professor, semester, path)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (path) DO NOTHING`,
    [course.university, course.faculty, course.course_number, course.course_name, course.professor, course.semester, dirPath]
  );
  return dirPath;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await ensureCollection();

  const courses = FILTER_COURSE
    ? config.courses.filter(c => c.course_number === FILTER_COURSE)
    : config.courses;

  if (courses.length === 0) {
    console.log("No matching courses found.");
    process.exit(0);
  }

  console.log(`\n🚀 Drive Sync Pipeline — ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`📚 Processing ${courses.length} course(s)\n`);

  const limit = pLimit(20);
  let totalFiles = 0;
  let totalChunks = 0;
  let skipped = 0;
  const startTime = Date.now();

  for (const course of courses) {
    console.log(`\n📖 ${course.university} / ${course.faculty} / ${course.course_number} — ${course.course_name} (${course.professor}, ${course.semester})`);

    const dirPath = DRY_RUN ? "" : await ensureDirectory(course);

    // Collect all files from all sources for this course
    const allFiles: DriveFile[] = [];
    for (const source of course.sources) {
      try {
        const files = source.type === "google_drive"
          ? await listGoogleDriveFiles(source.folder_id, source)
          : await listOneDriveFiles(source.folder_id, source);
        console.log(`  📁 ${source.description ?? source.type}: ${files.length} file(s)`);
        allFiles.push(...files);
      } catch (err) {
        console.error(`  ✗ Failed to list ${source.type} folder ${source.folder_id}: ${(err as Error).message}`);
      }
    }

    if (DRY_RUN) {
      console.log(`  → DRY RUN: would process ${allFiles.length} file(s)`);
      totalFiles += allFiles.length;
      continue;
    }

    // Process all files with p-limit 20
    const results = await Promise.all(
      allFiles.map(file =>
        limit(async () => {
          const result = await processFile(file, course, dirPath);
          if (!result.skipped) {
            const status = result.chunks > 0 ? `✓ ${result.chunks} chunks` : "✗ no text";
            console.log(`  [${status}] ${file.name}`);
          }
          return result;
        })
      )
    );

    const courseChunks = results.reduce((s, r) => s + r.chunks, 0);
    const courseSkipped = results.filter(r => r.skipped).length;
    totalFiles += allFiles.length;
    totalChunks += courseChunks;
    skipped += courseSkipped;
    console.log(`  → ${allFiles.length - courseSkipped} processed (${courseSkipped} skipped), ${courseChunks} chunks`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Done in ${elapsed}s — ${totalFiles} files, ${totalChunks} chunks, ${skipped} skipped`);
  await pool.end();
}

main().catch(err => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
