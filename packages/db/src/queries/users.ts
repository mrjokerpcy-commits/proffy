import { pool } from "../client";

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  password_hash: string | null;
  university: string | null;
  created_at: Date;
}

export async function getUserById(id: string): Promise<User | null> {
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return rows[0] ?? null;
}

export async function createUser(data: {
  email: string;
  name?: string;
  image?: string;
  password_hash?: string;
  university?: string;
}): Promise<User> {
  const { rows } = await pool.query(
    `INSERT INTO users (email, name, image, password_hash, university)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, image = EXCLUDED.image
     RETURNING *`,
    [data.email, data.name ?? null, data.image ?? null, data.password_hash ?? null, data.university ?? null]
  );
  return rows[0];
}

export async function updateUserUniversity(userId: string, university: string): Promise<void> {
  await pool.query(
    "UPDATE users SET university = $1, updated_at = now() WHERE id = $2",
    [university, userId]
  );
}

export async function getUserPlan(userId: string): Promise<string> {
  const { rows } = await pool.query(
    "SELECT plan FROM subscriptions WHERE user_id = $1 AND status = 'active'",
    [userId]
  );
  return rows[0]?.plan ?? "free";
}
