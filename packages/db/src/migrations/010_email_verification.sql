-- ─── Email verification + material submission queue ───────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Mark existing users as already verified (pre-verification era)
UPDATE users SET email_verified = true WHERE email_verified = false;

CREATE TABLE IF NOT EXISTS email_verifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL,
  code       CHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '15 minutes',
  used       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ev_email_idx ON email_verifications(email);

CREATE TABLE IF NOT EXISTS material_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university  TEXT NOT NULL,
  course_name TEXT NOT NULL,
  url         TEXT NOT NULL,
  url_type    TEXT NOT NULL DEFAULT 'drive_folder',
  submitted_by UUID REFERENCES users(id),
  status      TEXT NOT NULL DEFAULT 'pending',
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS mq_status_idx ON material_queue(status);
