import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import AdminClient from "./AdminClient";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!session?.user?.email || session.user.email !== adminEmail) redirect("/");

  // ── Overview stats ──────────────────────────────────────────────────────────
  const [totalUsers, paidUsers, todayUsage, weeklyUsage, monthlyUsage, allTimeUsage, recentUsers] =
    await Promise.all([
      pool.query("SELECT COUNT(*) FROM users"),
      pool.query("SELECT COUNT(*) FROM subscriptions WHERE status = 'active'"),
      pool.query(`
        SELECT
          SUM(questions) AS questions,
          SUM(tokens_input) AS tokens_input,
          SUM(tokens_output) AS tokens_output
        FROM usage WHERE date = CURRENT_DATE
      `),
      pool.query(`
        SELECT
          SUM(questions) AS questions,
          SUM(tokens_input) AS tokens_input,
          SUM(tokens_output) AS tokens_output
        FROM usage WHERE date >= CURRENT_DATE - INTERVAL '7 days'
      `),
      pool.query(`
        SELECT
          SUM(questions) AS questions,
          SUM(tokens_input) AS tokens_input,
          SUM(tokens_output) AS tokens_output
        FROM usage WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
      `),
      pool.query(`
        SELECT
          SUM(questions) AS questions,
          SUM(tokens_input) AS tokens_input,
          SUM(tokens_output) AS tokens_output
        FROM usage
      `),
      pool.query(`
        SELECT date, SUM(questions) AS questions, SUM(tokens_input) AS ti, SUM(tokens_output) AS to_
        FROM usage
        WHERE date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY date ORDER BY date DESC
      `),
    ]);

  // ── Users table ─────────────────────────────────────────────────────────────
  const { rows: users } = await pool.query(`
    SELECT
      u.id,
      u.email,
      u.name,
      u.university,
      u.created_at,
      COALESCE(s.plan, 'free') AS plan,
      COALESCE(s.status, 'none') AS sub_status,
      COALESCE(u7.questions, 0) AS msgs_7d,
      COALESCE(u7.tokens_input, 0) AS tin_7d,
      COALESCE(u7.tokens_output, 0) AS tout_7d,
      COALESCE(uat.questions, 0) AS msgs_total,
      COALESCE(uat.tokens_input, 0) AS tin_total,
      COALESCE(uat.tokens_output, 0) AS tout_total,
      COALESCE(cnt.course_count, 0) AS course_count
    FROM users u
    LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
    LEFT JOIN (
      SELECT user_id, SUM(questions) AS questions, SUM(tokens_input) AS tokens_input, SUM(tokens_output) AS tokens_output
      FROM usage WHERE date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY user_id
    ) u7 ON u7.user_id = u.id
    LEFT JOIN (
      SELECT user_id, SUM(questions) AS questions, SUM(tokens_input) AS tokens_input, SUM(tokens_output) AS tokens_output
      FROM usage GROUP BY user_id
    ) uat ON uat.user_id = u.id
    LEFT JOIN (
      SELECT user_id, COUNT(*) AS course_count FROM courses GROUP BY user_id
    ) cnt ON cnt.user_id = u.id
    ORDER BY u.created_at DESC
  `);

  // ── Material queue — ensure optional columns exist before querying ──────────
  await Promise.all([
    pool.query(`ALTER TABLE material_queue ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'`),
    pool.query(`ALTER TABLE material_queue ADD COLUMN IF NOT EXISTS files_found INT`),
    pool.query(`ALTER TABLE material_queue ADD COLUMN IF NOT EXISTS chunks_created INT`),
    pool.query(`ALTER TABLE material_queue ADD COLUMN IF NOT EXISTS error_msg TEXT`),
    pool.query(`ALTER TABLE material_queue ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ`),
  ]).catch(() => {});

  const { rows: queue } = await pool.query(`
    SELECT mq.id, mq.url, mq.university, mq.course_name, mq.submitted_at, mq.status,
           mq.files_found, mq.chunks_created, mq.error_msg, mq.processed_at, u.email
    FROM material_queue mq
    LEFT JOIN users u ON u.id = mq.submitted_by
    ORDER BY mq.submitted_at DESC LIMIT 50
  `).catch(() => ({ rows: [] }));

  return (
    <AdminClient
      stats={{
        totalUsers: Number(totalUsers.rows[0].count),
        paidUsers: Number(paidUsers.rows[0].count),
        today: todayUsage.rows[0],
        week: weeklyUsage.rows[0],
        month: monthlyUsage.rows[0],
        allTime: allTimeUsage.rows[0],
        dailyBreakdown: recentUsers.rows,
      }}
      users={users}
      queue={queue}
    />
  );
}
