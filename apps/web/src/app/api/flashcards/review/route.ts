import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// SM-2 algorithm
function sm2(easeFactor: number, intervalDays: number, reviewCount: number, quality: number) {
  // quality: 0 (blackout) → 5 (perfect)
  const newEF = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  let newInterval: number;
  if (quality < 3) {
    // Failed — reset
    newInterval = 1;
  } else if (reviewCount === 0) {
    newInterval = 1;
  } else if (reviewCount === 1) {
    newInterval = 6;
  } else {
    newInterval = Math.round(intervalDays * newEF);
  }

  return { easeFactor: newEF, intervalDays: newInterval };
}

// POST /api/flashcards/review
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { flashcardId, quality } = await req.json();
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  // quality: 0-5 integer only
  if (!flashcardId || !UUID_RE.test(flashcardId)) {
    return NextResponse.json({ error: "Valid flashcardId required" }, { status: 400 });
  }
  if (quality === undefined || typeof quality !== "number" || !Number.isInteger(quality) || quality < 0 || quality > 5) {
    return NextResponse.json({ error: "quality must be an integer 0-5" }, { status: 400 });
  }

  const { rows } = await pool.query(
    "SELECT * FROM flashcards WHERE id = $1 AND user_id = $2",
    [flashcardId, session.user.id]
  );
  if (!rows[0]) return NextResponse.json({ error: "Flashcard not found" }, { status: 404 });

  const card = rows[0];
  const { easeFactor, intervalDays } = sm2(
    card.ease_factor,
    card.interval_days,
    card.review_count,
    quality
  );

  const nextReview = new Date(Date.now() + intervalDays * 86400000);

  await pool.query(
    `UPDATE flashcards
     SET ease_factor = $1, interval_days = $2, next_review_at = $3, review_count = review_count + 1
     WHERE id = $4`,
    [easeFactor, intervalDays, nextReview.toISOString(), flashcardId]
  );

  return NextResponse.json({ nextReviewAt: nextReview, intervalDays });
}
