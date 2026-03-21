import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import { Pool } from "pg";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const qdrant = new QdrantClient({ url: process.env.QDRANT_URL || "http://localhost:6333" });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
});

const CHUNK_SIZE = 600;
const CHUNK_OVERLAP = 100;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end).trim());
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks.filter(c => c.length > 40);
}

const ALLOWED_DOC_TYPES = new Set(["slides", "exam", "notes", "textbook"]);
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME = new Set(["application/pdf", "text/plain"]);
// UUID v4 regex — prevents SQL injection / path traversal through courseId
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const courseId = formData.get("courseId") as string | null;
  const rawDocType = formData.get("type") as string | null;
  const docType = ALLOWED_DOC_TYPES.has(rawDocType ?? "") ? (rawDocType as string) : "notes";

  if (!file || !courseId) {
    return NextResponse.json({ error: "file and courseId are required" }, { status: 400 });
  }

  // Validate courseId is a UUID (prevents injection)
  if (!UUID_RE.test(courseId)) {
    return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });
  }

  // File size guard
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 413 });
  }

  // MIME type whitelist — check both reported type and extension
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const allowedExt = new Set(["pdf", "txt"]);
  if (!ALLOWED_MIME.has(file.type) && !allowedExt.has(ext)) {
    return NextResponse.json({ error: "Only PDF and TXT files are accepted" }, { status: 415 });
  }

  // Sanitise filename — strip path traversal characters
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

  const fileBuffer = await file.arrayBuffer();
  const fileBytes = new Uint8Array(fileBuffer);
  const base64Data = Buffer.from(fileBytes).toString("base64");

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const mediaType = isPdf ? "application/pdf" : "text/plain";

  // Use Claude to extract full text + (if exam) professor patterns
  let extractedText = "";
  let patterns: { topic: string; pct: number }[] = [];

  const isExam = docType === "exam";
  const extractionPrompt = isExam
    ? `Extract all text from this document verbatim.
Then, after the text, output a JSON block like this:
<patterns>
[
  {"topic": "AVL Trees", "pct": 90},
  {"topic": "Heaps", "pct": 75},
  ...up to 8 topics
]
</patterns>
The pct is your estimate (0-100) of how frequently this topic appears in the professor's exams based on this document.
Focus on specific algorithmic/conceptual topics, not general categories.`
    : "Extract all text from this document verbatim. Preserve structure, headings, and equations as best you can.";

  try {
    const claudeResp = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data,
              },
            } as any,
            {
              type: "text",
              text: extractionPrompt,
            },
          ],
        },
      ],
    });

    const fullResponse = claudeResp.content
      .filter(b => b.type === "text")
      .map(b => (b as any).text)
      .join("");

    // Split patterns JSON from text
    if (isExam) {
      const patternsMatch = fullResponse.match(/<patterns>([\s\S]*?)<\/patterns>/);
      if (patternsMatch) {
        try {
          patterns = JSON.parse(patternsMatch[1].trim());
        } catch {
          // ignore parse errors
        }
        extractedText = fullResponse.replace(/<patterns>[\s\S]*?<\/patterns>/, "").trim();
      } else {
        extractedText = fullResponse;
      }
    } else {
      extractedText = fullResponse;
    }
  } catch (err) {
    console.error("Claude extraction error:", err);
    return NextResponse.json({ error: "Failed to extract document text" }, { status: 500 });
  }

  // Chunk text and embed
  const chunks = chunkText(extractedText);
  let chunkCount = 0;

  if (chunks.length > 0) {
    try {
      // Ensure collection exists
      try {
        await qdrant.getCollection("studyai_chunks");
      } catch {
        await qdrant.createCollection("studyai_chunks", {
          vectors: { size: 1536, distance: "Cosine" },
        });
      }

      // Embed in batches of 20
      const points: any[] = [];
      for (let i = 0; i < chunks.length; i += 20) {
        const batch = chunks.slice(i, i + 20);
        const embRes = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: batch,
        });
        for (let j = 0; j < batch.length; j++) {
          points.push({
            id: crypto.randomUUID(),
            vector: embRes.data[j].embedding,
            payload: {
              text: batch[j],
              filename: safeFilename,
              type: docType,
              professor: course.professor ?? null,
              university: course.university,
              course: course.name,
              course_id: courseId,
              user_id: session.user.id,
              chunk_index: i + j,
            },
          });
        }
      }

      await qdrant.upsert("studyai_chunks", { points });
      chunkCount = points.length;
    } catch (err) {
      console.error("Qdrant embed error:", err);
      // Continue — don't fail the whole upload over indexing
    }
  }

  // Save document record
  const { rows: docRows } = await pool.query(
    `INSERT INTO documents (course_id, user_id, filename, type, professor, size_bytes, chunk_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [courseId, session.user.id, safeFilename, docType, course.professor ?? null, file.size, chunkCount]
  );

  // Upsert professor patterns if extracted
  if (isExam && patterns.length > 0) {
    // Delete old patterns for this course
    await pool.query(
      "DELETE FROM professor_patterns WHERE course_id = $1 AND user_id = $2",
      [courseId, session.user.id]
    );
    // Insert new ones
    for (const p of patterns) {
      await pool.query(
        `INSERT INTO professor_patterns (course_id, user_id, topic, pct, source_file)
         VALUES ($1, $2, $3, $4, $5)`,
        [courseId, session.user.id, p.topic, p.pct, file.name]
      );
    }
  }

  return NextResponse.json({
    success: true,
    documentId: docRows[0].id,
    chunkCount,
    patterns: isExam ? patterns : [],
  });
}
