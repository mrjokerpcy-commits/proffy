import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Pool } from "pg";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const plan = session.metadata?.plan;
    const stripeCustomerId = session.customer as string;
    const stripeSubId = session.subscription as string;

    if (userId && plan) {
      await pool.query(
        `INSERT INTO subscriptions (user_id, plan, stripe_customer_id, stripe_subscription_id, status)
         VALUES ($1, $2, $3, $4, 'active')
         ON CONFLICT (user_id) DO UPDATE
         SET plan = $2, stripe_customer_id = $3, stripe_subscription_id = $4, status = 'active', updated_at = NOW()`,
        [userId, plan, stripeCustomerId, stripeSubId]
      );
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.user_id;
    if (userId) {
      await pool.query(
        `UPDATE subscriptions SET plan = 'free', status = 'canceled', updated_at = NOW() WHERE user_id = $1`,
        [userId]
      );
    }
  }

  return NextResponse.json({ received: true });
}
