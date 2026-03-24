import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { email, code } = body as Record<string, unknown>;
  if (typeof email !== "string" || typeof code !== "string" || !/^\d{6}$/.test(code))
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const normalizedEmail = email.toLowerCase().trim();

  // Brute-force protection: find the active code for this email
  const { rows: activeRows } = await pool.query(
    `SELECT id, code, attempts FROM email_verifications
     WHERE email = $1 AND used = false AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [normalizedEmail]
  );

  if (activeRows.length === 0)
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });

  const activeCode = activeRows[0];

  // Max 5 wrong attempts before locking the code
  if (activeCode.attempts >= 5)
    return NextResponse.json({ error: "Too many attempts. Request a new code." }, { status: 429 });

  if (activeCode.code !== code) {
    // Wrong code — increment attempt counter
    await pool.query(
      "UPDATE email_verifications SET attempts = attempts + 1 WHERE id = $1",
      [activeCode.id]
    );
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  const rows = [activeCode];

  // Mark code used + verify user
  await pool.query("UPDATE email_verifications SET used = true WHERE id = $1", [rows[0].id]);
  await pool.query(
    "UPDATE users SET email_verified = true, email_verified_at = NOW() WHERE email = $1",
    [normalizedEmail]
  );

  return NextResponse.json({ status: "verified" });
}
