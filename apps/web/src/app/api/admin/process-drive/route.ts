import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Admin-only endpoint that proxies to the cron with the secret header
export async function POST() {
  const session = await getServerSession(authOptions);
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!session?.user?.email || session.user.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cronUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/cron/process-drive-queue`;
  const secret  = process.env.CRON_SECRET;

  const res = await fetch(cronUrl, {
    method: "GET",
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
  }).catch(e => ({ ok: false, json: async () => ({ error: e.message }) }));

  const data = await (res as Response).json().catch(() => ({}));
  return NextResponse.json(data, { status: (res as Response).ok ? 200 : 500 });
}
