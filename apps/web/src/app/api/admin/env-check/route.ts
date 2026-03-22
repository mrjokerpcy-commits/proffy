import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!session?.user?.email || session.user.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
