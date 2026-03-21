import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { sendVerificationEmail } from "@/lib/email";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { email } = body as Record<string, unknown>;
  if (typeof email !== "string" || !EMAIL_RE.test(email))
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const normalizedEmail = email.toLowerCase().trim();

  // Only resend if user exists and is not yet verified
  const { rows } = await pool.query(
    "SELECT name FROM users WHERE email = $1 AND email_verified = false",
    [normalizedEmail]
  );
  // Always return 200 to prevent user enumeration
  if (rows.length === 0) return NextResponse.json({ status: "ok" });

  // Rate limit: max 1 resend per minute
  const { rows: recent } = await pool.query(
    "SELECT id FROM email_verifications WHERE email = $1 AND created_at > NOW() - INTERVAL '1 minute' AND used = false",
    [normalizedEmail]
  );
  if (recent.length > 0) return NextResponse.json({ status: "ok" });

  await pool.query("UPDATE email_verifications SET used = true WHERE email = $1", [normalizedEmail]);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await pool.query("INSERT INTO email_verifications (email, code) VALUES ($1, $2)", [normalizedEmail, code]);

  try { await sendVerificationEmail(normalizedEmail, code, rows[0].name); } catch { /* silent */ }

  return NextResponse.json({ status: "ok" });
}
