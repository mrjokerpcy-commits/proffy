-- ─── User profile extras ──────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS field_of_study  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS study_challenge TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS hours_per_week  INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS study_goal      TEXT;   -- pass | good | excellent
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_done BOOLEAN NOT NULL DEFAULT false;

-- ─── Course notes ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS course_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       TEXT,
  content     TEXT NOT NULL,
  note_type   TEXT NOT NULL DEFAULT 'note',  -- note | trick | prof_said | formula
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS course_notes_course_idx ON course_notes(course_id, user_id);
CREATE INDEX IF NOT EXISTS course_notes_type_idx   ON course_notes(user_id, note_type);
