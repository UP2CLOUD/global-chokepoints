-- ============================================================
-- Cloudflare D1 migration — email alert subscriptions
-- Run: npm run db:migrate
-- ============================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id                TEXT PRIMARY KEY,
  email             TEXT UNIQUE NOT NULL,
  confirm_token     TEXT UNIQUE NOT NULL,
  unsubscribe_token TEXT UNIQUE NOT NULL,
  confirmed         INTEGER NOT NULL DEFAULT 0,
  confirmed_at      INTEGER,
  created_at        INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_confirm_token
  ON subscriptions (confirm_token);

CREATE INDEX IF NOT EXISTS idx_subscriptions_unsubscribe_token
  ON subscriptions (unsubscribe_token);

-- system_state stores the last known strait status so the CRON
-- only fires emails when the status actually changes.
CREATE TABLE IF NOT EXISTS system_state (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT OR IGNORE INTO system_state (key, value)
  VALUES ('last_alerted_status', 'OPEN');
