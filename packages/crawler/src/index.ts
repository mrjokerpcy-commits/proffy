import cron from "node-cron";
import { scrapeCheesefork } from "./scrapers/cheesefork";

const SEMESTERS = ["2025a", "2025b", "2025s"]; // a=Semester A, b=Semester B, s=Summer

// In-memory cache — in production store in PostgreSQL
const cache: Record<string, any[]> = {};

async function runCheeseforkSync() {
  console.log("[crawler] Starting Technion cheesefork sync...");
  for (const semester of SEMESTERS) {
    const courses = await scrapeCheesefork(semester);
    cache[`technion:${semester}`] = courses;
    console.log(`[crawler] Cached ${courses.length} courses for ${semester}`);
  }
}

export function getCachedTechnionCourses(semester: string) {
  return cache[`technion:${semester}`] || [];
}

// Run on startup + every 24 hours
async function start() {
  await runCheeseforkSync();

  cron.schedule("0 3 * * *", async () => {
    console.log("[crawler] Running scheduled cheesefork sync");
    await runCheeseforkSync();
  });

  console.log("[crawler] Scheduler running — syncs daily at 3:00 AM");
}

start().catch(console.error);
