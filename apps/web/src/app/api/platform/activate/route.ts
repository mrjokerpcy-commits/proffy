import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

const VALID_PLATFORMS = ["uni", "psycho", "yael", "bagrut"];

// Per-platform codes from env: BETA_CODES_UNI, BETA_CODES_PSYCHO, etc.
// Falls back to BETA_ACCESS_CODES if no platform-specific codes are set.
function getCodesForPlatform(platform: string): Set<string> {
  const key = `BETA_CODES_${platform.toUpperCase()}`;
  const raw = process.env[key] ?? process.env.BETA_ACCESS_CODES ?? "";
  return new Set(raw.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean));
}

// Rate limit: 10 attempts per IP per 15 min
const attempts = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }
  if (entry.count >= 10) return true;
  entry.count++;
  return false;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json();
  const platform: string = body?.platform ?? "";
  const code: string = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";

  if (!VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "Access code required" }, { status: 400 });
  }

  const validCodes = getCodesForPlatform(platform);
  // If no codes are configured for this platform, accept any non-empty code (open beta).
  // Set BETA_CODES_<PLATFORM> or BETA_ACCESS_CODES in env to restrict access.
  if (validCodes.size > 0 && !validCodes.has(code)) {
    return NextResponse.json({ error: "Invalid access code" }, { status: 403 });
  }

  await pool.query(
    `INSERT INTO platform_subscriptions (user_id, platform, plan, status)
     VALUES ($1, $2, 'free', 'active')
     ON CONFLICT (user_id, platform) DO NOTHING`,
    [session.user.id, platform]
  );

  return NextResponse.json({ ok: true });
}
