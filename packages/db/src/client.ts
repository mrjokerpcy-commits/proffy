import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://studyai:studyai@localhost:5432/studyai",
});
