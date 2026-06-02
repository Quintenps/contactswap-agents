-- Add short-lived exchange token storage for completed forms.
-- Tokens are stored as SHA-256 hashes and can be re-applied safely.

CREATE TABLE IF NOT EXISTS form_exchange_tokens (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL,
  exchange_token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
);