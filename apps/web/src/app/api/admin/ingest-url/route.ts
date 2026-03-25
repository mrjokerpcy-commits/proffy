import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import { Pool } from "pg";
import { createHash } from "crypto";

export const maxDuration = 300;
export const dynamic     = "force-dynamic";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "placeholder" });
const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "placeholder" });
const qdrant    = new QdrantClient({ url: process.env.QDRANT_URL || "http://localhost:6333", ...(process.env.QDRANT_API_KEY ? { apiKey: process.env.QDRANT_API_KEY } : {}) });
const pool      = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

async function ensureSchema() {
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
  // Add column if table already exists from older version
  await pool.query(`ALTER TABLE technion_courses ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN NOT NULL DEFAULT false`).catch(() => {});
}

function chunkId(urlHash: string, index: number): string {
  const h = createHash("sha1").update(`${urlHash}:${index}`).digest("hex");
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}

function smartChunk(text: string, maxWords = 300): string[] {
  const chunks: string[] = [];
  const segments = text.split(/\n{2,}/).map(s => s.trim()).filter(s => s.length > 50);
  let current = "";
  let wordCount = 0;
  for (const seg of segments) {
    const words = seg.split(/\s+/).length;
    if (wordCount + words > maxWords && current.length > 0) {
      chunks.push(current.trim());
      current = seg + "\n\n";
      wordCount = words;
    } else {
      current += seg + "\n\n";
      wordCount += words;
    }
  }
  if (current.trim().length > 50) chunks.push(current.trim());
  return chunks;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!session?.user?.email || session.user.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let url = "", pastedText = "", university = "Technion", label = "reference";
  let fileBuffer: Buffer | null = null;

  if (contentType.includes("multipart/form-data")) {
    const fd = await req.formData();
    const file = fd.get("file") as File | null;
    university = (fd.get("university") as string) || "Technion";
    label      = (fd.get("label") as string) || "reference";
    if (file) fileBuffer = Buffer.from(await file.arrayBuffer());
  } else {
    const body = await req.json().catch(() => ({}));
    url        = body.url ?? "";
    pastedText = body.text ?? "";
    university = body.university ?? "Technion";
    label      = body.label ?? "reference";
  }

  if (!url && !pastedText && !fileBuffer) return NextResponse.json({ error: "url, text, or file required" }, { status: 400 });

  await ensureSchema().catch(() => {});

  const urlHash = createHash("sha256").update(url || pastedText.slice(0, 100) || label).digest("hex").slice(0, 16);
  let courseCount = 0;
  let chunkCount  = 0;
  const allTextChunks: string[] = [];

  if (pastedText) {
    // ── Text mode: process pasted text directly ──────────────────────────────
    const CHUNK_SIZE = 12000; // chars per slice to stay under token limit
    for (let offset = 0; offset < pastedText.length; offset += CHUNK_SIZE) {
      const slice = pastedText.slice(offset, offset + CHUNK_SIZE);
      try {
        const res = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          messages: [{
            role: "user",
            content: `From this university catalog text, extract ALL course listings as JSON:
<courses>
[{"number":"104136","name":"Calculus 2M","name_he":"מתמטיקה 2ח","faculty":"הנדסת חשמל ומחשבים","mandatory":true}]
</courses>
Rules:
- Course numbers are exactly 6 digits
- mandatory = true if marked חובה
- Include every course in this text chunk
- If none found, output <courses>[]</courses>

Text:
${slice}`,
          }],
        });
        const full = res.content[0].type === "text" ? res.content[0].text : "";
        const coursesMatch = full.match(/<courses>([\s\S]*?)<\/courses>/);
        if (coursesMatch) {
          try {
            const courses = JSON.parse(coursesMatch[1].trim());
            for (const c of courses) {
              if (c.number && c.name && /^\d{5,8}$/.test(String(c.number))) {
                await pool.query(
                  `INSERT INTO technion_courses (course_number, name, name_hebrew, faculty, is_mandatory)
                   VALUES ($1, $2, $3, $4, $5)
                   ON CONFLICT (course_number) DO UPDATE
                     SET name = EXCLUDED.name, name_hebrew = EXCLUDED.name_hebrew,
                         faculty = EXCLUDED.faculty, is_mandatory = EXCLUDED.is_mandatory, updated_at = NOW()`,
                  [String(c.number), String(c.name).slice(0, 200), c.name_he ? String(c.name_he).slice(0, 200) : null, c.faculty ? String(c.faculty).slice(0, 100) : null, c.mandatory === true]
                );
                courseCount++;
              }
            }
          } catch {}
        }
        allTextChunks.push(...smartChunk(slice));
      } catch (err: any) {
        console.error(`Text slice ${offset} error:`, err.message);
      }
      if (offset + CHUNK_SIZE < pastedText.length) await new Promise(r => setTimeout(r, 3000));
    }
  } else if (fileBuffer) {
    // ── File mode: process uploaded PDF buffer ────────────────────────────────
    const SLICE = 4_000_000;
    for (let offset = 0; offset < fileBuffer.length; offset += SLICE) {
      const slice  = fileBuffer.subarray(offset, offset + SLICE);
      const base64 = slice.toString("base64");
      try {
        const res = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 8192,
          messages: [{ role: "user", content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } } as any,
            { type: "text", text: `Extract all text from this document verbatim.\nIf this document contains course listings output them at the end:\n<courses>\n[{"number":"104136","name":"Calculus 2M","name_he":"מתמטיקה 2ח","faculty":"הנדסת חשמל ומחשבים","mandatory":true}]\n</courses>\nCourse numbers are exactly 6 digits. mandatory=true if marked חובה. Include EVERY course found.` },
          ]}],
        });
        const full = res.content[0].type === "text" ? res.content[0].text : "";
        const coursesMatch = full.match(/<courses>([\s\S]*?)<\/courses>/);
        if (coursesMatch) {
          try {
            const courses = JSON.parse(coursesMatch[1].trim());
            for (const c of courses) {
              if (c.number && c.name && /^\d{5,8}$/.test(String(c.number))) {
                await pool.query(
                  `INSERT INTO technion_courses (course_number, name, name_hebrew, faculty, is_mandatory)
                   VALUES ($1, $2, $3, $4, $5)
                   ON CONFLICT (course_number) DO UPDATE
                     SET name = EXCLUDED.name, name_hebrew = EXCLUDED.name_hebrew,
                         faculty = EXCLUDED.faculty, is_mandatory = EXCLUDED.is_mandatory, updated_at = NOW()`,
                  [String(c.number), String(c.name).slice(0, 200), c.name_he ? String(c.name_he).slice(0, 200) : null, c.faculty ? String(c.faculty).slice(0, 100) : null, c.mandatory === true]
                );
                courseCount++;
              }
            }
          } catch {}
        }
        allTextChunks.push(...smartChunk(full.replace(/<courses>[\s\S]*?<\/courses>/, "").trim()));
      } catch (err: any) {
        console.error(`File slice ${offset} error:`, err.message);
      }
      if (offset + SLICE < fileBuffer.length) await new Promise(r => setTimeout(r, 5000));
    }
  } else {
    // ── URL mode: fetch PDF ───────────────────────────────────────────────────
    let buffer: Buffer;
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(90_000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ProffyBot/1.0)", "Accept": "application/pdf,*/*" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      buffer = Buffer.from(await res.arrayBuffer());
    } catch (err: any) {
      return NextResponse.json({ error: `Fetch failed: ${err.message}` }, { status: 400 });
    }

    const SLICE = 4_000_000;
    for (let offset = 0; offset < buffer.length; offset += SLICE) {
      const slice  = buffer.subarray(offset, offset + SLICE);
      const base64 = slice.toString("base64");
      try {
        const res = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 8192,
          messages: [{
            role: "user",
            content: [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } } as any,
              { type: "text", text: `Extract all text from this document verbatim.
If this document contains course listings output them at the end:
<courses>
[{"number":"104136","name":"Calculus 2M","name_he":"מתמטיקה 2ח","faculty":"הנדסת חשמל ומחשבים","mandatory":true}]
</courses>
Course numbers are exactly 6 digits. mandatory=true if marked חובה. Include EVERY course found.` },
            ],
          }],
        });
        const full = res.content[0].type === "text" ? res.content[0].text : "";
        const coursesMatch = full.match(/<courses>([\s\S]*?)<\/courses>/);
        if (coursesMatch) {
          try {
            const courses = JSON.parse(coursesMatch[1].trim());
            for (const c of courses) {
              if (c.number && c.name && /^\d{5,8}$/.test(String(c.number))) {
                await pool.query(
                  `INSERT INTO technion_courses (course_number, name, name_hebrew, faculty, is_mandatory)
                   VALUES ($1, $2, $3, $4, $5)
                   ON CONFLICT (course_number) DO UPDATE
                     SET name = EXCLUDED.name, name_hebrew = EXCLUDED.name_hebrew,
                         faculty = EXCLUDED.faculty, is_mandatory = EXCLUDED.is_mandatory, updated_at = NOW()`,
                  [String(c.number), String(c.name).slice(0, 200), c.name_he ? String(c.name_he).slice(0, 200) : null, c.faculty ? String(c.faculty).slice(0, 100) : null, c.mandatory === true]
                );
                courseCount++;
              }
            }
          } catch {}
        }
        allTextChunks.push(...smartChunk(full.replace(/<courses>[\s\S]*?<\/courses>/, "").trim()));
      } catch (err: any) {
        console.error(`Slice ${offset} error:`, err.message);
      }
      if (offset + SLICE < buffer.length) await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Embed all text chunks as global knowledge
  if (allTextChunks.length > 0) {
    try {
      try { await qdrant.getCollection("studyai_chunks"); } catch {
        await qdrant.createCollection("studyai_chunks", { vectors: { size: 1536, distance: "Cosine" } });
      }

      for (let i = 0; i < allTextChunks.length; i += 20) {
        const batch = allTextChunks.slice(i, i + 20);
        const embRes = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: batch,
        });
        const points = batch.map((text, j) => ({
          id: chunkId(urlHash, i + j),
          vector: embRes.data[j].embedding,
          payload: {
            text,
            filename:      label,
            type:          "reference",
            university,
            course:        null,
            course_number: null,
            course_id:     null,
            user_id:       null,
            is_shared:     true,
            trust_level:   "verified",
            chunk_index:   i + j,
            slide_number:  null,
            helpful_count: 0,
            total_shown:   0,
            helpfulness_score: 0.8,
          },
        }));
        await qdrant.upsert("studyai_chunks", { points });
        chunkCount += points.length;
      }
    } catch (err: any) {
      console.error("Qdrant error:", err.message);
    }
  }

  return NextResponse.json({ success: true, chunks: chunkCount, courses: courseCount });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!session?.user?.email || session.user.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await ensureSchema().catch(() => {});
  const { rows } = await pool.query("SELECT COUNT(*) as c FROM technion_courses").catch(() => ({ rows: [{ c: "0" }] }));
  return NextResponse.json({ courses: parseInt(rows[0]?.c ?? "0", 10) });
}
