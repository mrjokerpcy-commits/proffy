import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid = session.user.id;

  // Verify password before deleting
  let body: { password?: string } = {};
  try { body = await req.json(); } catch { /* ignore */ }
  if (!body.password) return NextResponse.json({ error: "Password required." }, { status: 400 });

  const { rows: userRows } = await pool.query("SELECT password_hash FROM users WHERE id = $1", [uid]);
  const hash = userRows[0]?.password_hash;
  if (!hash) return NextResponse.json({ error: "Cannot verify password for this account." }, { status: 400 });
  const valid = await bcrypt.compare(body.password, hash);
  if (!valid) return NextResponse.json({ error: "Incorrect password." }, { status: 403 });

  // Delete all user data in dependency order
  await pool.query("DELETE FROM chat_messages WHERE session_id IN (SELECT id FROM chat_sessions WHERE user_id = $1)", [uid]);
  await pool.query("DELETE FROM chat_sessions WHERE user_id = $1", [uid]);
  await pool.query("DELETE FROM flashcards WHERE user_id = $1", [uid]);
  await pool.query("DELETE FROM course_notes WHERE user_id = $1", [uid]);
  await pool.query("DELETE FROM student_insights WHERE user_id = $1", [uid]);
  await pool.query("DELETE FROM material_queue WHERE submitted_by = $1", [uid]).catch(() => {});
  await pool.query("DELETE FROM processed_files WHERE user_id = $1", [uid]).catch(() => {});
  await pool.query("DELETE FROM usage WHERE user_id = $1", [uid]).catch(() => {});
  await pool.query("DELETE FROM subscriptions WHERE user_id = $1", [uid]).catch(() => {});
  await pool.query("DELETE FROM courses WHERE user_id = $1", [uid]);
  await pool.query("DELETE FROM users WHERE id = $1", [uid]);

  return NextResponse.json({ ok: true });
}
