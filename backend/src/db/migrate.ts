import type Database from "better-sqlite3";

type ColumnInfo = {
  name: string;
};

function hasTable(db: Database.Database, table: string): boolean {
  const row = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(table) as { name: string } | undefined;
  return Boolean(row);
}

function hasColumn(db: Database.Database, table: string, column: string): boolean {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as ColumnInfo[];
  return columns.some((entry) => entry.name === column);
}

export function applySafeMigrations(db: Database.Database): void {
  if (!hasColumn(db, "tenders", "department")) {
    db.exec(`ALTER TABLE tenders ADD COLUMN department TEXT NOT NULL DEFAULT ''`);
  }

  if (!hasColumn(db, "tenders", "opening_date")) {
    db.exec(`ALTER TABLE tenders ADD COLUMN opening_date TEXT`);
  }

  if (!hasColumn(db, "tenders", "closing_date")) {
    db.exec(`ALTER TABLE tenders ADD COLUMN closing_date TEXT`);
  }

  if (!hasColumn(db, "tender_requirements", "name")) {
    db.exec(`ALTER TABLE tender_requirements ADD COLUMN name TEXT NOT NULL DEFAULT ''`);
  }

  if (!hasColumn(db, "tender_requirements", "tender_clause")) {
    db.exec(`ALTER TABLE tender_requirements ADD COLUMN tender_clause TEXT NOT NULL DEFAULT ''`);
  }

  if (!hasColumn(db, "tender_requirements", "verification_method")) {
    db.exec(`ALTER TABLE tender_requirements ADD COLUMN verification_method TEXT NOT NULL DEFAULT ''`);
  }

  if (!hasColumn(db, "tender_requirements", "rule_type")) {
    db.exec(`ALTER TABLE tender_requirements ADD COLUMN rule_type TEXT NOT NULL DEFAULT ''`);
  }

  if (!hasTable(db, "applications")) {
    db.exec(`
      CREATE TABLE applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tender_id INTEGER NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
        bidder_user_id INTEGER NOT NULL REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'DRAFT',
        gstin TEXT NOT NULL DEFAULT '',
        pan TEXT NOT NULL DEFAULT '',
        oem TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (tender_id, bidder_user_id)
      )
    `);
  }

  db.exec(`CREATE INDEX IF NOT EXISTS idx_applications_bidder_user_id ON applications(bidder_user_id)`);
}
