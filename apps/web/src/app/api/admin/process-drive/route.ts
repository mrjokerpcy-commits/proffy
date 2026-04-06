import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

// Admin-only endpoint that proxies to the cron with the secret header
export async function POST(req: NextRequest) {
  const deny = await requireAdmin(req);
  if (deny) return deny;

  const cronUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/cron/process-drive-queue`;
  const secret  = process.env.CRON_SECRET;

  const res = await fetch(cronUrl, {
    method: "GET",
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
  }).catch(e => ({ ok: false, json: async () => ({ error: e.message }) }));

  const data = await (res as Response).json().catch(() => ({}));
  return NextResponse.json(data, { status: (res as Response).ok ? 200 : 500 });
}
