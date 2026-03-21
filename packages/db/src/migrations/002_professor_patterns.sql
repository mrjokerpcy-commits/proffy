-- ─── Documents (uploaded files tracker) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'notes',   -- slides | exam | notes | textbook
  professor   TEXT,
  size_bytes  INTEGER,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_course_idx ON documents(course_id, user_id);

-- ─── Professor Patterns (AI-extracted from past exams) ─────────────────────
CREATE TABLE IF NOT EXISTS professor_patterns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic       TEXT NOT NULL,
  pct         INTEGER NOT NULL CHECK (pct BETWEEN 0 AND 100),
  source_file TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS professor_patterns_course_idx ON professor_patterns(course_id, user_id);

-- ─── Flashcard column alias (next_review_at already correct in 001) ────────
-- (no changes needed — schema already uses next_review_at)
