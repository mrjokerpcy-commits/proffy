import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid = session.user.id;

  const [fcDue, fcTotal, notesTotal, reviewTotal] = await Promise.all([
    pool.query("SELECT COUNT(*) as c FROM flashcards WHERE user_id=$1 AND next_review_at<=NOW()", [uid])
      .then(r => parseInt(r.rows[0]?.c ?? "0", 10)).catch(() => 0),
    pool.query("SELECT COUNT(*) as c FROM flashcards WHERE user_id=$1", [uid])
      .then(r => parseInt(r.rows[0]?.c ?? "0", 10)).catch(() => 0),
    pool.query("SELECT COUNT(*) as c FROM course_notes WHERE user_id=$1", [uid])
      .then(r => parseInt(r.rows[0]?.c ?? "0", 10)).catch(() => 0),
    pool.query("SELECT COUNT(*) as c FROM student_insights WHERE user_id=$1 AND status IN ('weak','needs_review')", [uid])
      .then(r => parseInt(r.rows[0]?.c ?? "0", 10)).catch(() => 0),
  ]);

  return NextResponse.json({ fcDue, fcTotal, notesTotal, reviewTotal });
}
