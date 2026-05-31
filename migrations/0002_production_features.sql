-- ============================================================
-- Migration 0002 — webhooks, status_history, api_keys
-- Run: npm run db:migrate
-- ============================================================

CREATE TABLE IF NOT EXISTS webhooks (
  id        TEXT PRIMARY KEY,
  url       TEXT NOT NULL,
  secret    TEXT NOT NULL,
  events    TEXT NOT NULL DEFAULT 'status_change',
  confirmed INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_webhooks_confirmed ON webhooks (confirmed);

CREATE TABLE IF NOT EXISTS status_history (
  id             TEXT PRIMARY KEY,
  state          TEXT NOT NULL,
  previous_state TEXT,
  tension        INTEGER,
  confidence     REAL,
  reason         TEXT,
  created_at     INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_status_history_created ON status_history (created_at DESC);

CREATE TABLE IF NOT EXISTS api_keys (
  id           TEXT PRIMARY KEY,
  key_hash     TEXT UNIQUE NOT NULL,
  label        TEXT NOT NULL DEFAULT '',
  rate_limit   INTEGER NOT NULL DEFAULT 1000,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  last_used_at INTEGER
);
