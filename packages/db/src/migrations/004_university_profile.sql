-- ─── User profile extras (round 2) ──────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS university     TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS learning_style TEXT;   -- visual | practice | reading | mixed
