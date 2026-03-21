import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { email, code } = body as Record<string, unknown>;
  if (typeof email !== "string" || typeof code !== "string" || !/^\d{6}$/.test(code))
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const normalizedEmail = email.toLowerCase().trim();

  const { rows } = await pool.query(
    `SELECT id FROM email_verifications
     WHERE email = $1 AND code = $2 AND used = false AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [normalizedEmail, code]
  );

  if (rows.length === 0)
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });

  // Mark code used + verify user
  await pool.query("UPDATE email_verifications SET used = true WHERE id = $1", [rows[0].id]);
  await pool.query(
    "UPDATE users SET email_verified = true, email_verified_at = NOW() WHERE email = $1",
    [normalizedEmail]
  );

  return NextResponse.json({ status: "verified" });
}
