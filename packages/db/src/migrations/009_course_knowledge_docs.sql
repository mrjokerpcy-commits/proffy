-- ─── Per-course knowledge documents ──────────────────────────────────────────
-- One structured document per course, written by the AI only when it has
-- verified, accurate information (not after every chat).
-- Sections: exam_focus | common_struggles | prof_patterns | key_concepts | important_notes
CREATE TABLE IF NOT EXISTS course_knowledge_docs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university   TEXT NOT NULL,
  course_name  TEXT NOT NULL,
  -- Each section stored separately so updates don't clobber other sections
  exam_focus       TEXT NOT NULL DEFAULT '',
  common_struggles TEXT NOT NULL DEFAULT '',
  prof_patterns    TEXT NOT NULL DEFAULT '',
  key_concepts     TEXT NOT NULL DEFAULT '',
  important_notes  TEXT NOT NULL DEFAULT '',
  frequently_asked TEXT NOT NULL DEFAULT '',  -- common questions students ask about this course
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(university, course_name)
);
CREATE INDEX IF NOT EXISTS ckd_course_idx ON course_knowledge_docs(university, course_name);
