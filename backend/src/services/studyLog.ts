/**
 * Append-only study logs — inspired by KAIROS audit trail from the leak.
 * The agent cannot self-erase these logs. Daily JSONL files per user.
 * Also tracks token usage in the DB for billing/rate-limiting.
 */
import fs   from "fs";
import path from "path";
import { Pool } from "pg";

const LOG_DIR = process.env.STUDY_LOG_DIR
  ?? path.join(process.cwd(), "logs", "study");

export function appendStudyLog(userId: string, entry: Record<string, unknown>): void {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const dir  = path.join(LOG_DIR, userId);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${date}.jsonl`);
    fs.appendFileSync(file, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
  } catch {
    // Logging must never throw — fail silently
  }
}

export async function trackUsage(
  pool     : Pool,
  userId   : string,
  tokensIn : number,
  tokensOut: number,
): Promise<void> {
  try {
    const date = new Date().toISOString().slice(0, 10);
    await pool.query(`
      INSERT INTO usage (id, user_id, date, questions, tokens_input, tokens_output)
      VALUES (gen_random_uuid(), $1, $2, 1, $3, $4)
      ON CONFLICT (user_id, date) DO UPDATE SET
        questions     = usage.questions     + 1,
        tokens_input  = usage.tokens_input  + $3,
        tokens_output = usage.tokens_output + $4
    `, [userId, date, tokensIn, tokensOut]);
  } catch {
    // Don't block a chat over usage tracking
  }
}
