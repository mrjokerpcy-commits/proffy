-- Migration 001: platform_subscriptions table
-- Run once on the VPS database:
--   docker exec -i vps-db-1 psql -U studyai -d studyai < migrations/001_platform_subscriptions.sql

CREATE TABLE IF NOT EXISTS platform_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT NOT NULL,
  platform   TEXT NOT NULL CHECK (platform IN ('uni', 'psycho', 'yael', 'bagrut')),
  plan       TEXT NOT NULL DEFAULT 'free',
  status     TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_platform_subs_user ON platform_subscriptions (user_id);
