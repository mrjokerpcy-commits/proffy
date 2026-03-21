import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const PLAN_PRICES: Record<string, string> = {
  pro: "22.00",  // ~₪79
  max: "42.00",  // ~₪149
};

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

  const { plan } = await req.json();
  if (!["pro", "max"].includes(plan)) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const token = await getPayPalToken();

  const res = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        amount: { currency_code: "USD", value: PLAN_PRICES[plan] },
        description: `Proffy ${plan === "pro" ? "Pro" : "Max"} — monthly subscription`,
        custom_id: `${session.user.id}:${plan}`,
      }],
    }),
  });

  const order = await res.json();
  return NextResponse.json({ orderId: order.id });
}
