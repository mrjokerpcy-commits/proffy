import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { Pool } from "pg";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "placeholder" });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// GET /api/flashcards?courseId=X — fetch due flashcards
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId || !UUID_RE.test(courseId)) return NextResponse.json({ error: "Valid courseId required" }, { status: 400 });

  const { rows } = await pool.query(
    `SELECT id, front, back, interval_days, ease_factor, review_count
     FROM flashcards
     WHERE user_id = $1 AND course_id = $2 AND next_review_at <= NOW()
     ORDER BY next_review_at ASC
     LIMIT 30`,
    [session.user.id, courseId]
  );

  return NextResponse.json({ flashcards: rows });
}

// POST /api/flashcards — generate flashcards from material via AI
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId, topic } = await req.json();
  if (!courseId || !UUID_RE.test(courseId)) return NextResponse.json({ error: "Valid courseId required" }, { status: 400 });

  // Sanitise topic — max 120 chars, strip control characters
  const safeTopic = typeof topic === "string"
    ? topic.replace(/[\x00-\x1F\x7F]/g, "").slice(0, 120)
    : undefined;

  const { rows: courseRows } = await pool.query(
    "SELECT * FROM courses WHERE id = $1 AND user_id = $2",
    [courseId, session.user.id]
  );
  if (!courseRows[0]) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  const course = courseRows[0];

  // Generate flashcards with Claude
  const prompt = `You are Proffy, an expert tutor for Israeli universities.
Generate 10 high-quality spaced-repetition flashcards for: ${course.name}${safeTopic ? ` — focusing on: ${safeTopic}` : ""}.
University: ${course.university}. Professor: ${course.professor ?? "unknown"}.

Return ONLY a JSON array, no explanation:
[
  {"front": "Question or concept", "back": "Complete answer with key details"},
  ...
]

Make each card test one atomic concept. Answers should be 1-3 sentences, precise.`;

  let cards: { front: string; back: string }[] = [];
  try {
    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });
    const text = resp.content.filter(b => b.type === "text").map(b => (b as any).text).join("");
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) cards = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("Flashcard generation error:", err);
    return NextResponse.json({ error: "Failed to generate flashcards" }, { status: 500 });
  }

  // Insert into DB
  const inserted = [];
  for (const card of cards) {
    const { rows } = await pool.query(
      `INSERT INTO flashcards (user_id, course_id, front, back)
       VALUES ($1, $2, $3, $4) RETURNING id, front, back`,
      [session.user.id, courseId, card.front, card.back]
    );
    inserted.push(rows[0]);
  }

  return NextResponse.json({ flashcards: inserted, count: inserted.length });
}
