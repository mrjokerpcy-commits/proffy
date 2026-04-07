-- Per-platform subscriptions.
-- A user only has access to a platform if they have a row here.
-- Free tier must be explicitly activated (user registers for the platform).

CREATE TABLE IF NOT EXISTS platform_subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform            TEXT NOT NULL,  -- uni | psycho | yael | bagrut
  plan                TEXT NOT NULL DEFAULT 'free',  -- free | pro | max
  status              TEXT NOT NULL DEFAULT 'active',  -- active | cancelled | past_due
  stripe_customer_id  TEXT,
  stripe_sub_id       TEXT,
  payplus_sub_id      TEXT,
  current_period_end  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_subscriptions_user_platform_idx
  ON platform_subscriptions(user_id, platform);
