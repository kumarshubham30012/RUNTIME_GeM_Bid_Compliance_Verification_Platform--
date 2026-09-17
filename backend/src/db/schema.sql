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
  name TEXT NOT NULL DEFAULT '',
  tender_clause TEXT NOT NULL DEFAULT '',
  requirement_text TEXT NOT NULL DEFAULT '',
  category TEXT,
  is_mandatory INTEGER NOT NULL DEFAULT 1,
  verification_method TEXT NOT NULL DEFAULT '',
  rule_type TEXT NOT NULL DEFAULT '',
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

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tender_id INTEGER NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  bidder_user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'DRAFT',
  gstin TEXT NOT NULL DEFAULT '',
  pan TEXT NOT NULL DEFAULT '',
  oem TEXT NOT NULL DEFAULT '',
  udyam TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (tender_id, bidder_user_id)
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_tenders_created_by_user_id ON tenders(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_tender_requirements_tender_id ON tender_requirements(tender_id);
CREATE INDEX IF NOT EXISTS idx_bidders_tender_id ON bidders(tender_id);
CREATE INDEX IF NOT EXISTS idx_applications_bidder_user_id ON applications(bidder_user_id);

CREATE TABLE IF NOT EXISTS application_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  requirement_id INTEGER NOT NULL REFERENCES tender_requirements(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_application_documents_application_id ON application_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_application_documents_requirement_id ON application_documents(requirement_id);

CREATE TABLE IF NOT EXISTS verification_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  requirement_id INTEGER NOT NULL REFERENCES tender_requirements(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'SANDBOX',
  status TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  result_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (application_id, requirement_id)
);

CREATE INDEX IF NOT EXISTS idx_verification_results_application_id ON verification_results(application_id);

CREATE TABLE IF NOT EXISTS entity_resolution_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  source_a TEXT NOT NULL,
  value_a TEXT NOT NULL DEFAULT '',
  source_b TEXT NOT NULL,
  value_b TEXT NOT NULL DEFAULT '',
  classification TEXT NOT NULL,
  confidence REAL NOT NULL,
  reasoning TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (application_id, field_name, source_a, source_b)
);

CREATE INDEX IF NOT EXISTS idx_entity_resolution_results_application_id ON entity_resolution_results(application_id);
