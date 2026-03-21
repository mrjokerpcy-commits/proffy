-- ─── Lifetime course creation counter (for free tier limit) ──────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS courses_created INTEGER NOT NULL DEFAULT 0;

-- Backfill from existing courses
UPDATE users SET courses_created = (
  SELECT COUNT(*) FROM courses WHERE courses.user_id = users.id
);
