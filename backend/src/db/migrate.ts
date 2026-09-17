import type Database from "better-sqlite3";

type ColumnInfo = {
  name: string;
};

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
}
