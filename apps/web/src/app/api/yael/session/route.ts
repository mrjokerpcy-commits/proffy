import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

// POST — create a new session
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { section } = await req.json();
  const valid = ["reading", "vocabulary", "grammar"];
  if (!valid.includes(section)) return NextResponse.json({ error: "Invalid section" }, { status: 400 });

  const { rows } = await pool.query(
    `INSERT INTO yael_sessions (user_id, section) VALUES ($1, $2) RETURNING id`,
    [session.user.id, section]
  );
  return NextResponse.json({ sessionId: rows[0].id });
}

// PATCH — complete a session (submit score + questions attempted)
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId, score, total, durationSeconds, questions } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  // Verify session belongs to user
  const { rows } = await pool.query(
    `SELECT id, section FROM yael_sessions WHERE id = $1 AND user_id = $2`,
    [sessionId, session.user.id]
  );
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { section } = rows[0];

  await pool.query(
    `UPDATE yael_sessions SET score=$1, total=$2, duration_seconds=$3, completed_at=NOW() WHERE id=$4`,
    [score, total, durationSeconds ?? null, sessionId]
  );

  // Upsert progress
  await pool.query(`
    INSERT INTO yael_progress (user_id, section, total_questions, correct_answers, sessions_done, last_practiced_at, updated_at)
    VALUES ($1, $2, $3, $4, 1, NOW(), NOW())
    ON CONFLICT (user_id, section) DO UPDATE SET
      total_questions   = yael_progress.total_questions + $3,
      correct_answers   = yael_progress.correct_answers + $4,
      sessions_done     = yael_progress.sessions_done + 1,
      last_practiced_at = NOW(),
      updated_at        = NOW()
  `, [session.user.id, section, total, score]);

  // Save individual questions
  if (Array.isArray(questions) && questions.length > 0) {
    for (const q of questions) {
      await pool.query(`
        INSERT INTO yael_questions_attempted
          (session_id, question_text, options, correct_answer, student_answer, is_correct, explanation)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        sessionId,
        q.text ?? "",
        JSON.stringify(q.options ?? {}),
        q.correct ?? "",
        q.studentAnswer ?? null,
        q.isCorrect ?? null,
        q.explanation ?? null,
      ]);
    }
  }

  return NextResponse.json({ ok: true });
}
