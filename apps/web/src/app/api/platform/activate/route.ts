import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

const VALID_PLATFORMS = ["uni", "psycho", "yael", "bagrut"];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const platform = body?.platform;
  if (!VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  await pool.query(
    `INSERT INTO platform_subscriptions (user_id, platform, plan, status)
     VALUES ($1, $2, 'free', 'active')
     ON CONFLICT (user_id, platform) DO NOTHING`,
    [session.user.id, platform]
  );

  return NextResponse.json({ ok: true });
}
