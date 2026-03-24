import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: false,
});

function isAdmin(email?: string | null) {
  return email && email === process.env.ADMIN_EMAIL;
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, plan } = await req.json();
  if (!userId || !["free", "pro", "max"].includes(plan)) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  if (plan === "free") {
    await pool.query("DELETE FROM subscriptions WHERE user_id = $1", [userId]);
  } else {
    await pool.query(`
      INSERT INTO subscriptions (user_id, plan, status)
      VALUES ($1, $2, 'active')
      ON CONFLICT (user_id) DO UPDATE SET plan = $2, status = 'active', updated_at = now()
    `, [userId, plan]);
  }

  return NextResponse.json({ ok: true });
}
