import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

export async function GET() {
  const session = await getServerSession(authOptions);
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!session?.user?.email || session.user.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await Promise.all([
    pool.query(`ALTER TABLE material_queue ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'`),
    pool.query(`ALTER TABLE material_queue ADD COLUMN IF NOT EXISTS files_found INT`),
    pool.query(`ALTER TABLE material_queue ADD COLUMN IF NOT EXISTS chunks_created INT`),
    pool.query(`ALTER TABLE material_queue ADD COLUMN IF NOT EXISTS error_msg TEXT`),
    pool.query(`ALTER TABLE material_queue ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ`),
    pool.query(`ALTER TABLE material_queue ADD COLUMN IF NOT EXISTS log TEXT NOT NULL DEFAULT ''`),
  ]).catch(() => {});

  const { rows } = await pool.query(`
    SELECT mq.id, mq.url, mq.university, mq.course_name, mq.created_at AS submitted_at, mq.status,
           mq.files_found, mq.chunks_created, mq.error_msg, mq.processed_at, mq.log, u.email
    FROM material_queue mq
    LEFT JOIN users u ON u.id = mq.submitted_by
    ORDER BY mq.created_at DESC LIMIT 50
  `).catch(() => ({ rows: [] }));

  return NextResponse.json({ queue: rows });
}
