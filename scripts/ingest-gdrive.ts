/**
 * Proffy — Google Drive ingestion script
 *
 * Downloads all PDFs from a public Google Drive folder, extracts text via Claude,
 * embeds with OpenAI, and stores in Qdrant as shared platform content.
 *
 * Usage:
 *   npx tsx scripts/ingest-gdrive.ts \
 *     --folder 16g08YIerCR2YX-NcgI8bzy7sRA3xIi7t \
 *     --course "Data Structures" \
 *     --university Technion \
 *     --professor "Prof. Cohen" \
 *     --type slides
 *
 * Requires in .env.local:
 *   GOOGLE_API_KEY=...       (console.cloud.google.com → Enable Drive API → Create API Key)
 *   ANTHROPIC_API_KEY=...
 *   OPENAI_API_KEY=...
 *   QDRANT_URL=...
 */

import Anthropic from "@anthropic-ai/sdk";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ── Load env ──────────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, "../apps/web/.env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const [k, ...v] = line.split("=");
    if (k && v.length) process.env[k.trim()] = v.join("=").trim();
  }
}

// ── Parse args ────────────────────────────────────────────────────────────────
function arg(flag: string, required = true): string {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || !process.argv[idx + 1]) {
    if (required) { console.error(`Missing ${flag}`); process.exit(1); }
    return "";
  }
  return process.argv[idx + 1];
}

const ALL_SHARED  = process.argv.includes("--all-shared"); // ingest everything shared with this service account
const FOLDER_ID   = ALL_SHARED ? "" : arg("--folder");
const COURSE_NAME = arg("--course", false);
const UNIVERSITY  = arg("--university", !ALL_SHARED);
const PROFESSOR   = arg("--professor", false);
const DOC_TYPE    = arg("--type", false) || "slides"; // slides | exam | notes | textbook
// trust_level: "official" = professor/faculty uploaded (default for admin-run ingest)
//              "verified"  = cross-referenced, confirmed accurate
//              "student"   = uploaded by a student (unverified)
const TRUST_LEVEL = arg("--trust", false) || "official";

// ── Service Account auth ──────────────────────────────────────────────────────
const SA_KEY_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY ?? "";
if (!SA_KEY_PATH || !fs.existsSync(SA_KEY_PATH)) {
  console.error("GOOGLE_SERVICE_ACCOUNT_KEY not set or file not found in .env.local");
  process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(SA_KEY_PATH, "utf-8"));

// Generate a signed JWT and exchange it for an access token
async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  })).toString("base64url");

  const { createSign } = await import("crypto");
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(serviceAccount.private_key, "base64url");
  const jwt = `${header}.${payload}.${sig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await res.json() as any;
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

let _accessToken = "";
let _tokenExpiry = 0;
async function driveToken(): Promise<string> {
  if (Date.now() < _tokenExpiry) return _accessToken;
  _accessToken = await getAccessToken();
  _tokenExpiry = Date.now() + 55 * 60 * 1000; // refresh 5 min before expiry
  return _accessToken;
}

// ── Clients ───────────────────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const qdrant    = new QdrantClient({ url: process.env.QDRANT_URL || "http://localhost:6333" });

const CHUNK_SIZE    = 600;
const CHUNK_OVERLAP = 100;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, Math.min(start + CHUNK_SIZE, text.length)).trim());
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks.filter(c => c.length > 40);
}

// ── Google Drive helpers ───────────────────────────────────────────────────────
interface DriveFile { id: string; name: string; mimeType: string; }

async function listDriveFiles(folderId: string): Promise<DriveFile[]> {
  const token = await driveToken();
  const files: DriveFile[] = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType)",
      pageSize: "100",
      ...(pageToken ? { pageToken } : {}),
    });
    const res  = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json() as any;
    if (data.error) throw new Error(`Drive API error: ${JSON.stringify(data.error)}`);
    files.push(...(data.files ?? []));
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);
  return files;
}

async function downloadDriveFile(fileId: string, mimeType: string): Promise<Buffer> {
  const token = await driveToken();
  const authHeader = { Authorization: `Bearer ${token}` };

  // Export Google Workspace files as PDF; download native files directly
  const isGoogleFile = mimeType.startsWith("application/vnd.google-apps.");
  let res: Response;
  if (isGoogleFile) {
    res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`, { headers: authHeader });
  } else {
    res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers: authHeader });
  }
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);

  const buf = await res.arrayBuffer();
  return Buffer.from(buf);
}

// ── Qdrant setup ──────────────────────────────────────────────────────────────
async function ensureCollection() {
  try {
    await qdrant.getCollection("studyai_chunks");
  } catch {
    await qdrant.createCollection("studyai_chunks", {
      vectors: { size: 1536, distance: "Cosine" },
    });
  }
}

// ── Process one file ──────────────────────────────────────────────────────────
async function processFile(file: DriveFile, buffer: Buffer) {
  console.log(`  → Extracting text with Claude…`);
  const base64 = buffer.toString("base64");

  const claudeResp = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001", // cheap for extraction
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } } as any,
        { type: "text", text: "Extract all text from this document verbatim. Preserve headings, equations, and structure as best you can." },
      ],
    }],
  });

  const extractedText = claudeResp.content
    .filter(b => b.type === "text")
    .map(b => (b as any).text)
    .join("");

  const chunks = chunkText(extractedText);
  if (chunks.length === 0) { console.log(`  ⚠ No text extracted, skipping.`); return 0; }

  console.log(`  → Embedding ${chunks.length} chunks…`);
  const points: any[] = [];
  for (let i = 0; i < chunks.length; i += 20) {
    const batch = chunks.slice(i, i + 20);
    const embRes = await openai.embeddings.create({ model: "text-embedding-3-small", input: batch });
    for (let j = 0; j < batch.length; j++) {
      points.push({
        id: crypto.randomUUID(),
        vector: embRes.data[j].embedding,
        payload: {
          text:        batch[j],
          filename:    file.name,
          type:        DOC_TYPE,
          professor:   PROFESSOR || null,
          university:  UNIVERSITY,
          course:      COURSE_NAME,
          is_shared:   true,      // platform content, visible to all students of this course
          trust_level: TRUST_LEVEL, // "official" | "verified" | "student"
          user_id:     null,
          chunk_index: i + j,
        },
      });
    }
  }

  await qdrant.upsert("studyai_chunks", { points });
  console.log(`  ✓ Stored ${points.length} chunks in Qdrant`);
  return points.length;
}

const FOLDER_MIME = "application/vnd.google-apps.folder";
const EXPORTABLE  = new Set([
  "application/pdf",
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.presentation",
  "application/vnd.google-apps.spreadsheet",
]);

// ── Ingest a single folder as one course ─────────────────────────────────────
async function ingestFolder(folderId: string, courseName: string, professorName: string, depth = 0) {
  const indent = "  ".repeat(depth);
  console.log(`${indent}📂 ${courseName}`);

  const allFiles = await listDriveFiles(folderId);
  const subfolders = allFiles.filter(f => f.mimeType === FOLDER_MIME);
  const files      = allFiles.filter(f => EXPORTABLE.has(f.mimeType));

  let totalChunks = 0;

  // Process files in this folder
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`${indent}  [${i + 1}/${files.length}] ${file.name}`);
    try {
      const buffer = await downloadDriveFile(file.id, file.mimeType);
      const count  = await processFileForCourse(file, buffer, courseName, professorName);
      totalChunks += count;
      // Pause between files — 20s to stay within Anthropic's 50k token/min limit
      if (i < files.length - 1) await new Promise(r => setTimeout(r, 20000));
    } catch (err: any) {
      console.log(`${indent}  ✗ ${err.message?.slice(0, 120)}`);
      // On rate limit errors, wait longer before continuing
      if (err.message?.includes("429") || err.message?.includes("rate") || err.message?.includes("quota")) {
        console.log(`${indent}  ⏳ Rate limited — waiting 60s…`);
        await new Promise(r => setTimeout(r, 60000));
      }
    }
  }

  // Recurse into subfolders — treat each as a sub-course or same course
  for (const sub of subfolders) {
    // Use subfolder name as course name if root folder is generic ("EE Courses")
    // Otherwise keep parent course name
    const subCourseName = COURSE_NAME ? `${courseName} — ${sub.name}` : sub.name;
    totalChunks += await ingestFolder(sub.id, subCourseName, professorName, depth + 1);
  }

  return totalChunks;
}

async function processFileForCourse(file: DriveFile, buffer: Buffer, courseName: string, professorName: string) {
  // If file is very large, truncate to first 8MB — better to extract partial content than skip entirely
  // Claude can handle partial PDFs and extract whatever pages it can read
  const MAX_BYTES = 4_000_000; // ~5.3MB base64 — safely within Claude's limit
  const workingBuffer = buffer.length > MAX_BYTES ? buffer.subarray(0, MAX_BYTES) : buffer;
  if (buffer.length > MAX_BYTES) {
    console.log(`    ⚠ Large file (${(buffer.length / 1e6).toFixed(1)}MB) — processing first ${MAX_BYTES / 1e6}MB`);
  }

  const base64 = workingBuffer.toString("base64");

  let claudeResp: any;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      claudeResp = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } } as any,
            { type: "text", text: "Extract all text from this document verbatim. Preserve headings, equations, and structure as best you can." },
          ],
        }],
      });
      break;
    } catch (e: any) {
      if ((e.message?.includes("429") || e.status === 429) && attempt < 3) {
        const wait = (attempt + 1) * 30000;
        console.log(`    ⏳ Anthropic rate limit, waiting ${wait/1000}s…`);
        await new Promise(r => setTimeout(r, wait));
      } else throw e;
    }
  }

  const extractedText = claudeResp.content
    .filter(b => b.type === "text")
    .map(b => (b as any).text)
    .join("");

  const chunks = chunkText(extractedText);
  if (chunks.length === 0) { console.log(`    ⚠ No text extracted, skipping.`); return 0; }

  console.log(`    → Embedding ${chunks.length} chunks…`);
  const points: any[] = [];
  for (let i = 0; i < chunks.length; i += 10) {
    const batch = chunks.slice(i, i + 10);
    let embRes: any;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        embRes = await openai.embeddings.create({ model: "text-embedding-3-small", input: batch });
        break;
      } catch (e: any) {
        if (e.message?.includes("429") && attempt < 3) {
          const wait = (attempt + 1) * 20000;
          console.log(`    ⏳ OpenAI rate limit, waiting ${wait/1000}s…`);
          await new Promise(r => setTimeout(r, wait));
        } else throw e;
      }
    }
    for (let j = 0; j < batch.length; j++) {
      points.push({
        id: crypto.randomUUID(),
        vector: embRes.data[j].embedding,
        payload: {
          text:        batch[j],
          filename:    file.name,
          type:        DOC_TYPE,
          professor:   professorName || null,
          university:  UNIVERSITY,
          course:      courseName,
          is_shared:   true,
          trust_level: TRUST_LEVEL,
          user_id:     null,
          chunk_index: i + j,
        },
      });
    }
  }

  await qdrant.upsert("studyai_chunks", { points });
  console.log(`    ✓ Stored ${points.length} chunks`);
  return points.length;
}

// ── List all top-level folders shared with the service account ─────────────────
async function listSharedFolders(): Promise<DriveFile[]> {
  const token = await driveToken();
  const folders: DriveFile[] = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      q: `sharedWithMe = true and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType)",
      pageSize: "100",
      ...(pageToken ? { pageToken } : {}),
    });
    const res  = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json() as any;
    if (data.error) throw new Error(`Drive API error: ${JSON.stringify(data.error)}`);
    folders.push(...(data.files ?? []));
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);
  return folders;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await ensureCollection();

  if (ALL_SHARED) {
    console.log(`\n🎓 Proffy Drive Ingestion — ALL SHARED FOLDERS`);
    console.log(`   University : ${UNIVERSITY || "(from folder names)"}`);
    console.log(`   Type       : ${DOC_TYPE}\n`);

    const sharedFolders = await listSharedFolders();
    if (sharedFolders.length === 0) {
      console.log("⚠ No folders found shared with this service account.");
      console.log("  Make sure you shared the folders with: " + serviceAccount.client_email);
      return;
    }

    console.log(`Found ${sharedFolders.length} shared folder(s):\n`);
    sharedFolders.forEach((f, i) => console.log(`  ${i + 1}. ${f.name} (${f.id})`));
    console.log("");

    let grandTotal = 0;
    for (const folder of sharedFolders) {
      const uni = UNIVERSITY || "Technion";
      grandTotal += await ingestFolder(folder.id, folder.name, PROFESSOR);
    }

    console.log(`\n✅ All shared folders ingested! ${grandTotal} total chunks.`);
    console.log(`   The agent now has knowledge from all shared Technion material.\n`);
    return;
  }

  console.log(`\n🎓 Proffy Drive Ingestion`);
  console.log(`   Folder  : https://drive.google.com/drive/folders/${FOLDER_ID}`);
  console.log(`   Course  : ${COURSE_NAME || "(from subfolder names)"}`);
  console.log(`   Uni     : ${UNIVERSITY}`);
  console.log(`   Prof    : ${PROFESSOR || "(from folder names)"}`);
  console.log(`   Type    : ${DOC_TYPE}\n`);

  const rootName = COURSE_NAME || "Technion EE";
  const total    = await ingestFolder(FOLDER_ID, rootName, PROFESSOR);

  console.log(`\n✅ Done! ${total} total chunks ingested for ${UNIVERSITY}`);
  console.log(`   Students asking about these courses will now get answers from the real material.\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
