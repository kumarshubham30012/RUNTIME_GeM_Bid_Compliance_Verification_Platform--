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
}
