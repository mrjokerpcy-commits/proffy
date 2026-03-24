import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_TYPES = new Set(["note", "trick", "prof_said", "formula"]);

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId || !UUID_RE.test(courseId)) return NextResponse.json({ error: "Valid courseId required" }, { status: 400 });

  const { rows } = await pool.query(
    `SELECT * FROM course_notes WHERE course_id = $1 AND user_id = $2 ORDER BY created_at DESC`,
    [courseId, session.user.id]
  );
  return NextResponse.json({ notes: rows });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const courseId = typeof body.courseId === "string" ? body.courseId : null;
  if (!courseId || !UUID_RE.test(courseId)) return NextResponse.json({ error: "Valid courseId required" }, { status: 400 });

  const content = typeof body.content === "string" ? body.content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim().slice(0, 2000) : null;
  if (!content) return NextResponse.json({ error: "content is required" }, { status: 400 });

  const title = typeof body.title === "string" ? body.title.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, 200) : null;
  const note_type = typeof body.note_type === "string" && ALLOWED_TYPES.has(body.note_type) ? body.note_type : "note";

  // Verify course belongs to user
  const { rows: courseRows } = await pool.query("SELECT id FROM courses WHERE id = $1 AND user_id = $2", [courseId, session.user.id]);
  if (!courseRows[0]) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const { rows } = await pool.query(
    `INSERT INTO course_notes (user_id, course_id, title, content, note_type) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [session.user.id, courseId, title, content, note_type]
  );
  return NextResponse.json({ note: rows[0] }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const noteId = req.nextUrl.searchParams.get("id");
  if (!noteId || !UUID_RE.test(noteId)) return NextResponse.json({ error: "Valid note id required" }, { status: 400 });

  await pool.query("DELETE FROM course_notes WHERE id = $1 AND user_id = $2", [noteId, session.user.id]);
  return NextResponse.json({ ok: true });
}
