import { pool } from "../client";
import fs from "fs";
import path from "path";

async function runMigrations() {
  const client = await pool.connect();
  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id        SERIAL PRIMARY KEY,
        filename  TEXT UNIQUE NOT NULL,
        run_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const migrationsDir = path.join(__dirname);
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        "SELECT id FROM _migrations WHERE filename = $1",
        [file]
      );
      if (rows.length > 0) {
        console.log(`[migrations] Already ran: ${file}`);
        continue;
      }

      console.log(`[migrations] Running: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      await client.query(sql);
      await client.query("INSERT INTO _migrations(filename) VALUES($1)", [file]);
      console.log(`[migrations] Done: ${file}`);
    }

    console.log("[migrations] All migrations complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error("[migrations] Failed:", err);
  process.exit(1);
});
