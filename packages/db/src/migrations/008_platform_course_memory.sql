-- ─── Platform-wide course memory (learned from all student conversations) ─────
CREATE TABLE IF NOT EXISTS platform_course_memory (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university    TEXT NOT NULL,
  course_name   TEXT NOT NULL,
  topic         TEXT NOT NULL,
  insight       TEXT NOT NULL,
  insight_type  TEXT NOT NULL DEFAULT 'common_struggle',
  -- common_struggle | exam_focus | prof_pattern | key_concept | common_mistake
  confidence    INTEGER NOT NULL DEFAULT 1,  -- increments each time reinforced across students
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(university, course_name, topic, insight_type)
);
CREATE INDEX IF NOT EXISTS pcm_course_idx ON platform_course_memory(university, course_name);
