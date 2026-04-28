-- ContactSwap Database Schema

CREATE TABLE IF NOT EXISTS config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  owner_email TEXT NOT NULL,
  owner_contact_url TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  fields TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS forms (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  template_id TEXT,
  field_config TEXT NOT NULL,
  original_contact_url TEXT NOT NULL,
  original_contact_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (template_id) REFERENCES templates(id)
);

CREATE INDEX IF NOT EXISTS idx_forms_token ON forms(token);
CREATE INDEX IF NOT EXISTS idx_forms_status ON forms(status);
CREATE INDEX IF NOT EXISTS idx_forms_expires_at ON forms(expires_at);

