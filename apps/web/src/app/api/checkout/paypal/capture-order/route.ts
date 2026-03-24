import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

async function getPayPalToken() {
  const res = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  return data.access_token as string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { orderId } = body;
  // Validate orderId to prevent path traversal — PayPal order IDs are alphanumeric, 17 chars
  if (!orderId || typeof orderId !== "string" || !/^[A-Z0-9]{8,25}$/i.test(orderId))
    return NextResponse.json({ error: "Invalid orderId" }, { status: 400 });

  const token = await getPayPalToken();

  const res = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const capture = await res.json();
  if (capture.status !== "COMPLETED") {
    return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
  }

  // Extract plan from custom_id
  const customId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id ?? "";
  const [, plan] = customId.split(":");

  if (plan && ["pro", "max"].includes(plan)) {
    await pool.query(
      `INSERT INTO subscriptions (user_id, plan, status)
       VALUES ($1, $2, 'active')
       ON CONFLICT (user_id) DO UPDATE SET plan = $2, status = 'active', updated_at = NOW()`,
      [session.user.id, plan]
    );
  }

  return NextResponse.json({ ok: true, plan });
}
