-- ─── Student knowledge tracking ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_insights (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id  UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  topic      TEXT NOT NULL,
  status     TEXT NOT NULL,   -- weak | needs_review | mastered
  note       TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, course_id, topic)
);
CREATE INDEX IF NOT EXISTS insights_user_course_idx ON student_insights(user_id, course_id);
