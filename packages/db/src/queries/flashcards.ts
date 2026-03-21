import { pool } from "../client";

export interface Flashcard {
  id: string;
  user_id: string;
  course_id: string;
  front: string;
  back: string;
  next_review_at: Date;
  interval_days: number;
  ease_factor: number;
  review_count: number;
}

export async function getDueFlashcards(userId: string, courseId?: string): Promise<Flashcard[]> {
  const query = courseId
    ? "SELECT * FROM flashcards WHERE user_id = $1 AND course_id = $2 AND next_review_at <= now() ORDER BY next_review_at LIMIT 20"
    : "SELECT * FROM flashcards WHERE user_id = $1 AND next_review_at <= now() ORDER BY next_review_at LIMIT 20";
  const params = courseId ? [userId, courseId] : [userId];
  const { rows } = await pool.query(query, params);
  return rows;
}

export async function createFlashcard(data: {
  user_id: string;
  course_id: string;
  front: string;
  back: string;
}): Promise<Flashcard> {
  const { rows } = await pool.query(
    `INSERT INTO flashcards (user_id, course_id, front, back) VALUES ($1,$2,$3,$4) RETURNING *`,
    [data.user_id, data.course_id, data.front, data.back]
  );
  return rows[0];
}

// SM-2 spaced repetition algorithm
export async function reviewFlashcard(
  id: string,
  quality: number // 0-5: 0=blackout, 5=perfect
): Promise<Flashcard> {
  const { rows: current } = await pool.query("SELECT * FROM flashcards WHERE id = $1", [id]);
  const card = current[0];

  let { ease_factor, interval_days } = card;

  if (quality >= 3) {
    interval_days = card.review_count === 0 ? 1 : card.review_count === 1 ? 6 : Math.round(interval_days * ease_factor);
    ease_factor = Math.max(1.3, ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  } else {
    interval_days = 1;
  }

  const next_review_at = new Date(Date.now() + interval_days * 24 * 60 * 60 * 1000);

  const { rows } = await pool.query(
    `UPDATE flashcards
     SET interval_days = $1, ease_factor = $2, next_review_at = $3, review_count = review_count + 1
     WHERE id = $4 RETURNING *`,
    [interval_days, ease_factor, next_review_at, id]
  );
  return rows[0];
}
