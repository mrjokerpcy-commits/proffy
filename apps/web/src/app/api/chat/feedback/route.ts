import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";
import { QdrantClient } from "@qdrant/js-client-rest";

const pool  = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});
const qdrant = new QdrantClient({ url: process.env.QDRANT_URL || "http://localhost:6333", ...(process.env.QDRANT_API_KEY ? { apiKey: process.env.QDRANT_API_KEY } : {}) });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { messageId, rating, courseId } = body;

  if (!messageId || !UUID_RE.test(messageId)) {
    return NextResponse.json({ error: "Invalid messageId" }, { status: 400 });
  }
  if (rating !== "up" && rating !== "down") {
    return NextResponse.json({ error: "rating must be 'up' or 'down'" }, { status: 400 });
  }
  if (courseId && !UUID_RE.test(courseId)) {
    return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });
  }

  // Save feedback (upsert — user can change their vote)
  await pool.query(
    `INSERT INTO message_feedback (message_id, user_id, course_id, rating)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (message_id, user_id)
     DO UPDATE SET rating = EXCLUDED.rating, created_at = NOW()`,
    [messageId, session.user.id, courseId ?? null, rating]
  ).catch(() => {}); // table may not be migrated yet in all envs

  // Update Qdrant chunk scores based on feedback
  try {
    const { rows } = await pool.query(
      `SELECT sources FROM chat_messages WHERE id = $1`,
      [messageId]
    );
    const sources: { id?: string; filename?: string }[] = rows[0]?.sources ?? [];
    // Prefer direct point IDs (new format), fall back to filename lookup
    const pointIds = sources.map(s => s.id).filter(Boolean) as string[];

    if (pointIds.length > 0) {
      // Fast path: update by point ID directly
      for (const pointId of pointIds) {
        try {
          const points = await qdrant.retrieve("studyai_chunks", { ids: [pointId], with_payload: true });
          const p = points[0]?.payload as any;
          if (!p) continue;
          const total_shown   = (p.total_shown   ?? 0) + 1;
          const helpful_count = rating === "up" ? (p.helpful_count ?? 0) + 1 : (p.helpful_count ?? 0);
          await qdrant.setPayload("studyai_chunks", {
            points: [pointId],
            payload: { helpful_count, total_shown, helpfulness_score: helpful_count / total_shown },
          }).catch(() => {});
        } catch {}
      }
    } else if (sources.length > 0 && rating === "up") {
      // Fallback: filename-based update for old messages
      const filenames = [...new Set(sources.map(s => s.filename).filter(Boolean))];
      for (const filename of filenames) {
        try {
          const { points } = await qdrant.scroll("studyai_chunks", {
            filter: { must: [{ key: "filename", match: { value: filename } }] },
            limit: 50, with_payload: true, with_vector: false,
          });
          for (const point of points) {
            const p = point.payload as any;
            const total_shown   = (p.total_shown   ?? 0) + 1;
            const helpful_count = (p.helpful_count ?? 0) + 1;
            await qdrant.setPayload("studyai_chunks", {
              points: [point.id as string],
              payload: { helpful_count, total_shown, helpfulness_score: helpful_count / total_shown },
            }).catch(() => {});
          }
        } catch {}
      }
    }
  } catch {}

  return NextResponse.json({ ok: true });
}
