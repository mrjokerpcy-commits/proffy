import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req);
  if (deny) return deny;

  const vars = {
    GOOGLE_SERVICE_ACCOUNT_KEY: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    QDRANT_URL:                  !!process.env.QDRANT_URL,
    QDRANT_API_KEY:              !!process.env.QDRANT_API_KEY,
    OPENAI_API_KEY:              !!process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY:           !!process.env.ANTHROPIC_API_KEY,
    DATABASE_URL:                !!process.env.DATABASE_URL,
    NEXTAUTH_SECRET:             !!process.env.NEXTAUTH_SECRET,
    ADMIN_EMAIL:                 !!process.env.ADMIN_EMAIL,
    CRON_SECRET:                 !!process.env.CRON_SECRET,
  };

  return NextResponse.json({ vars });
}
