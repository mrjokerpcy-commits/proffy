import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  // Rate limit: max 5 registrations per IP per hour
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  try {
    const { rows: ipRows } = await pool.query(
      `SELECT COUNT(*) as cnt FROM users WHERE created_at > NOW() - INTERVAL '1 hour'
       AND created_ip = $1`,
      [ip]
    );
    if (parseInt(ipRows[0]?.cnt ?? "0", 10) >= 5) {
      return NextResponse.json({ error: "Too many registrations. Try again later." }, { status: 429 });
    }
  } catch { /* ok if created_ip column not yet added */ }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { email, password, name } = body as Record<string, unknown>;

  if (typeof email !== "string" || !EMAIL_RE.test(email) || email.length > 254)
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  if (typeof password !== "string" || password.length < 8 || password.length > 128)
    return NextResponse.json({ error: "Password must be 8–128 characters" }, { status: 400 });

  const safeName = typeof name === "string"
    ? name.replace(/[\x00-\x1F\x7F]/g, "").slice(0, 100)
    : null;
  const normalizedEmail = email.toLowerCase().trim();

  // Check if already registered and verified
  const { rows: existing } = await pool.query(
    "SELECT id, email_verified FROM users WHERE email = $1", [normalizedEmail]
  );
  if (existing.length > 0 && existing[0].email_verified) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  // Hash password and upsert verified user
  const password_hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (email, name, password_hash, email_verified, email_verified_at)
     VALUES ($1, $2, $3, true, NOW())
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       password_hash = EXCLUDED.password_hash,
       email_verified = true,
       email_verified_at = NOW()`,
    [normalizedEmail, safeName, password_hash]
  );

  return NextResponse.json({ status: "auto_verified", email: normalizedEmail }, { status: 200 });
}
