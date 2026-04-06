import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

export async function POST(req: NextRequest) {
  try {
    const { name, email, study } = await req.json();
    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Name and email required" }, { status: 400 });
    }

    // Create table if it doesn't exist yet
    await pool.query(`
      CREATE TABLE IF NOT EXISTS access_requests (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        study TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Upsert — don't error on duplicate email, just update name/study
    await pool.query(
      `INSERT INTO access_requests (name, email, study)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, study = EXCLUDED.study`,
      [name.trim(), email.trim().toLowerCase(), study?.trim() ?? null]
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[request-access]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
