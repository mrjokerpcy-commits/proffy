-- ─── Message feedback (thumbs up / down per assistant response) ───────────────
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS message_id UUID DEFAULT gen_random_uuid();

CREATE TABLE IF NOT EXISTS message_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID NOT NULL,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   UUID REFERENCES courses(id) ON DELETE SET NULL,
  rating      TEXT NOT NULL CHECK (rating IN ('up', 'down')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS feedback_message_idx ON message_feedback(message_id);
CREATE INDEX IF NOT EXISTS feedback_user_idx ON message_feedback(user_id);

-- ─── Quiz attempts (for learning from wrong answers) ───────────────────────────
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id      UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  topic          TEXT NOT NULL,
  student_answer TEXT,
  correct_answer TEXT,
  is_correct     BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS quiz_attempts_course_idx ON quiz_attempts(course_id, topic);
