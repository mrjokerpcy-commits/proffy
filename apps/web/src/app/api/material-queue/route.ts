import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { url, courseId, note } = body;

  if (!url || typeof url !== "string" || url.length > 2000)
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  if (!courseId || !UUID_RE.test(courseId))
    return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });

  // Fetch course to get university + name (needed for material_queue)
  const { rows } = await pool.query(
    "SELECT name, university, course_number, professor FROM courses WHERE id = $1 AND user_id = $2",
    [courseId, session.user.id]
  );
  if (!rows[0]) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const { name: courseName, university, course_number, professor } = rows[0];

  await pool.query(
    `INSERT INTO material_queue (university, course_name, course_number, professor, url, url_type, submitted_by, note)
     VALUES ($1, $2, $3, $4, $5, 'drive_folder', $6, $7)
     ON CONFLICT DO NOTHING`,
    [university, courseName, course_number ?? null, professor ?? null, url.trim(), session.user.id, note?.slice(0, 500) ?? null]
  );

  return NextResponse.json({ success: true });
}
