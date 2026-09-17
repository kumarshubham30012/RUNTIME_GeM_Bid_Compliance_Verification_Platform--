PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL DEFAULT '',
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'bidder',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tenders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT '',
  bid_number TEXT,
  description TEXT,
  opening_date TEXT,
  closing_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by_user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tender_requirements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tender_id INTEGER NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  requirement_text TEXT NOT NULL,
  category TEXT,
  is_mandatory INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bidders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tender_id INTEGER REFERENCES tenders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  organization TEXT,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_tenders_created_by_user_id ON tenders(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_tender_requirements_tender_id ON tender_requirements(tender_id);
CREATE INDEX IF NOT EXISTS idx_bidders_tender_id ON bidders(tender_id);
