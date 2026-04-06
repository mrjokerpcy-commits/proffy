import { NextRequest, NextResponse } from "next/server";

// Codes are stored in env var — never shipped to the browser.
// Format: BETA_ACCESS_CODES="CODE1,CODE2,CODE3"
function getValidCodes(): Set<string> {
  const raw = process.env.BETA_ACCESS_CODES ?? "";
  return new Set(
    raw.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean)
  );
}

// Simple in-memory rate limit: max 10 attempts per IP per 15 min
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
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { valid: false, error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  let code: string;
  try {
    const body = await req.json();
    code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  } catch {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  if (!code || code.length > 64) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const valid = getValidCodes().has(code);
  return NextResponse.json({ valid });
}
