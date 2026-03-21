import { pool } from "../client";

const FREE_LIMIT = 10;

export async function incrementUsage(userId: string): Promise<void> {
  await pool.query(
    `INSERT INTO usage (user_id, date, questions)
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (user_id, date) DO UPDATE SET questions = usage.questions + 1`,
    [userId]
  );
}

export async function getTodayUsage(userId: string): Promise<number> {
  const { rows } = await pool.query(
    "SELECT questions FROM usage WHERE user_id = $1 AND date = CURRENT_DATE",
    [userId]
  );
  return rows[0]?.questions ?? 0;
}

export async function checkUsageLimit(userId: string, plan: string): Promise<boolean> {
  if (plan !== "free") return true; // paid plans: always allowed
  const used = await getTodayUsage(userId);
  return used < FREE_LIMIT;
}
