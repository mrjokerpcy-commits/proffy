-- Yael platform tables
-- yael_sessions: one row per practice session a user completes
-- yael_progress:  rolling totals per user × section (upserted on session complete)
-- yael_questions_attempted: every question answered in every session

CREATE TABLE IF NOT EXISTS yael_sessions (
  id                UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section           TEXT      NOT NULL,          -- reading | vocabulary | grammar
  score             INTEGER   NOT NULL DEFAULT 0,
  total             INTEGER   NOT NULL DEFAULT 0,
  duration_seconds  INTEGER,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS yael_sessions_user_id_idx ON yael_sessions(user_id);

CREATE TABLE IF NOT EXISTS yael_progress (
  user_id           UUID   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section           TEXT   NOT NULL,
  total_questions   INTEGER NOT NULL DEFAULT 0,
  correct_answers   INTEGER NOT NULL DEFAULT 0,
  sessions_done     INTEGER NOT NULL DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, section)
);

CREATE TABLE IF NOT EXISTS yael_questions_attempted (
  id               UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID      NOT NULL REFERENCES yael_sessions(id) ON DELETE CASCADE,
  question_text    TEXT      NOT NULL,
  options          JSONB,                         -- array of option strings
  correct_answer   TEXT      NOT NULL,            -- the letter: A | B | C | D
  student_answer   TEXT,
  is_correct       BOOLEAN,
  explanation      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS yael_qa_session_idx ON yael_questions_attempted(session_id);
