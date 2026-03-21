-- ─── Usage: add token tracking columns ───────────────────────────────────────
ALTER TABLE usage ADD COLUMN IF NOT EXISTS tokens_input  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usage ADD COLUMN IF NOT EXISTS tokens_output INTEGER NOT NULL DEFAULT 0;

-- ─── Users: add current_semester ─────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_semester TEXT;
