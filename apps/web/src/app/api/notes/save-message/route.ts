import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, courseId } = await req.json();
  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  if (!courseId || !UUID_RE.test(courseId)) {
    return NextResponse.json({ error: "Valid courseId required" }, { status: 400 });
  }

  // Truncate to 4000 chars max
  const truncated = content.slice(0, 4000);
  const title = truncated.split("\n")[0].replace(/^#+\s*/, "").slice(0, 120);

  await pool.query(
    `INSERT INTO course_notes (user_id, course_id, title, content, note_type)
     VALUES ($1, $2, $3, $4, 'note')`,
    [session.user.id, courseId, title, truncated]
  );

  return NextResponse.json({ ok: true });
}
