import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-auth";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

export async function POST(req: NextRequest) {
  const deny = await requireAdmin(req);
  if (deny) return deny;
  const session = await getServerSession(authOptions);

  const body = await req.json();
  const { url, university, faculty, note, priority_courses } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  // Normalise priority_courses: strip spaces, deduplicate, keep only 5-8 digit numbers
  const priorityList = typeof priority_courses === "string"
    ? [...new Set(priority_courses.split(/[\s,;]+/).map((s: string) => s.trim()).filter((s: string) => /^\d{5,8}$/.test(s)))]
    : [];
  const priorityStr = priorityList.join(",");

  // Ensure columns exist
  await pool.query(`ALTER TABLE material_queue ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'`).catch(() => {});
  await pool.query(`ALTER TABLE material_queue ADD COLUMN IF NOT EXISTS priority_courses TEXT NOT NULL DEFAULT ''`).catch(() => {});

  try {
    await pool.query(
      `INSERT INTO material_queue
         (university, course_name, url, url_type, submitted_by, note, priority_courses)
       VALUES ($1, $2, $3, 'drive_folder', $4, $5, $6)`,
      [
        university ?? "TAU",
        faculty ?? null,
        url.trim(),
        session?.user?.id ?? null,
        note ?? null,
        priorityStr,
      ]
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "DB error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
