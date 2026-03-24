import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!session?.user?.email || session.user.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { url, university, faculty, note } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  // Ensure status column exists (added by cron migration)
  await pool.query(
    `ALTER TABLE material_queue ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'`
  ).catch(() => {});

  try {
    await pool.query(
      `INSERT INTO material_queue
         (university, course_name, url, url_type, submitted_by, note)
       VALUES ($1, $2, $3, 'drive_folder', $4, $5)`,
      [
        university ?? "TAU",
        faculty ?? null,
        url.trim(),
        session.user.id,
        note ?? null,
      ]
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "DB error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
