-- App-wide metrics storage for durable counters.

CREATE TABLE IF NOT EXISTS app_stats (
  metric TEXT PRIMARY KEY,
  counter_value INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO app_stats (metric, counter_value)
VALUES ('total_contact_swaps', 0);