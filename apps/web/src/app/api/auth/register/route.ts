import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { sendVerificationEmail } from "@/lib/email";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
});

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

function randomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
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

  // Hash password and upsert unverified user
  const password_hash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users (email, name, password_hash, email_verified)
     VALUES ($1, $2, $3, false)
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       password_hash = EXCLUDED.password_hash`,
    [normalizedEmail, safeName, password_hash]
  );

  // Invalidate old codes and create new one
  await pool.query("UPDATE email_verifications SET used = true WHERE email = $1", [normalizedEmail]);
  const code = randomCode();
  await pool.query(
    "INSERT INTO email_verifications (email, code) VALUES ($1, $2)",
    [normalizedEmail, code]
  );

  // Send email
  try {
    await sendVerificationEmail(normalizedEmail, code, safeName ?? undefined);
  } catch (err) {
    console.error("Email send failed:", err);
    return NextResponse.json({ error: "Could not send verification email. Try again." }, { status: 500 });
  }

  return NextResponse.json({ status: "verification_sent", email: normalizedEmail }, { status: 200 });
}
