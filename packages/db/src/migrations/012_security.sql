-- Track failed verification attempts to prevent brute-force on 6-digit OTP codes
ALTER TABLE email_verifications
  ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0;

-- Fast lookups on active codes
CREATE INDEX IF NOT EXISTS idx_ev_email_active
  ON email_verifications (email, used, expires_at);

-- Fast lookups on usage counters
CREATE INDEX IF NOT EXISTS idx_usage_user_date
  ON usage (user_id, date);
