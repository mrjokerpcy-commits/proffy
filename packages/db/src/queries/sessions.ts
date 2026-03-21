import { pool } from "../client";

export interface ChatSession {
  id: string;
  user_id: string;
  course_id: string | null;
  title: string | null;
  created_at: Date;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  sources: any[] | null;
  created_at: Date;
}

export async function createSession(data: {
  user_id: string;
  course_id?: string;
  title?: string;
}): Promise<ChatSession> {
  const { rows } = await pool.query(
    `INSERT INTO chat_sessions (user_id, course_id, title) VALUES ($1, $2, $3) RETURNING *`,
    [data.user_id, data.course_id ?? null, data.title ?? null]
  );
  return rows[0];
}

export async function getSessionsByUser(userId: string, limit = 20): Promise<ChatSession[]> {
  const { rows } = await pool.query(
    "SELECT * FROM chat_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
    [userId, limit]
  );
  return rows;
}

export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const { rows } = await pool.query(
    "SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC",
    [sessionId]
  );
  return rows;
}

export async function saveMessage(data: {
  session_id: string;
  role: "user" | "assistant";
  content: string;
  sources?: any[];
}): Promise<ChatMessage> {
  const { rows } = await pool.query(
    `INSERT INTO chat_messages (session_id, role, content, sources)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.session_id, data.role, data.content, data.sources ? JSON.stringify(data.sources) : null]
  );
  return rows[0];
}

export async function updateSessionTitle(sessionId: string, title: string): Promise<void> {
  await pool.query("UPDATE chat_sessions SET title = $1 WHERE id = $2", [title, sessionId]);
}
