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

  if (!hasTable(db, "application_documents")) {
    db.exec(`
      CREATE TABLE application_documents (
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
      )
    `);
  }

  db.exec(`CREATE INDEX IF NOT EXISTS idx_application_documents_application_id ON application_documents(application_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_application_documents_requirement_id ON application_documents(requirement_id)`);

  if (hasTable(db, "applications") && !hasColumn(db, "applications", "udyam")) {
    db.exec(`ALTER TABLE applications ADD COLUMN udyam TEXT NOT NULL DEFAULT ''`);
  }

  if (!hasTable(db, "verification_results")) {
    db.exec(`
      CREATE TABLE verification_results (
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
      )
    `);
  }

  db.exec(`CREATE INDEX IF NOT EXISTS idx_verification_results_application_id ON verification_results(application_id)`);

  if (!hasTable(db, "entity_resolution_results")) {
    db.exec(`
      CREATE TABLE entity_resolution_results (
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
      )
    `);
  }

  db.exec(`CREATE INDEX IF NOT EXISTS idx_entity_resolution_results_application_id ON entity_resolution_results(application_id)`);

  if (!hasTable(db, "compliance_results")) {
    db.exec(`
      CREATE TABLE compliance_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        requirement_id INTEGER NOT NULL REFERENCES tender_requirements(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        reason_code TEXT NOT NULL,
        evaluated_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (application_id, requirement_id)
      )
    `);
  }

  db.exec(`CREATE INDEX IF NOT EXISTS idx_compliance_results_application_id ON compliance_results(application_id)`);

  if (!hasTable(db, "evidence_findings")) {
    db.exec(`
      CREATE TABLE evidence_findings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        requirement_id INTEGER NOT NULL REFERENCES tender_requirements(id) ON DELETE CASCADE,
        requirement_name TEXT NOT NULL DEFAULT '',
        tender_clause TEXT NOT NULL DEFAULT '',
        compliance_status TEXT NOT NULL,
        submitted_value TEXT NOT NULL DEFAULT '',
        verified_value TEXT NOT NULL DEFAULT '',
        evidence_sources TEXT NOT NULL DEFAULT '',
        reasoning TEXT NOT NULL DEFAULT '',
        generated_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (application_id, requirement_id)
      )
    `);
  }

  db.exec(`CREATE INDEX IF NOT EXISTS idx_evidence_findings_application_id ON evidence_findings(application_id)`);

  if (!hasTable(db, "finding_resolutions")) {
    db.exec(`
      CREATE TABLE finding_resolutions (
        finding_id INTEGER PRIMARY KEY REFERENCES evidence_findings(id) ON DELETE CASCADE,
        application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        updated_by_user_id INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  if (!hasTable(db, "finding_resolution_history")) {
    db.exec(`
      CREATE TABLE finding_resolution_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        finding_id INTEGER NOT NULL REFERENCES evidence_findings(id) ON DELETE CASCADE,
        application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        previous_status TEXT NOT NULL,
        new_status TEXT NOT NULL,
        officer_user_id INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  db.exec(`CREATE INDEX IF NOT EXISTS idx_finding_resolution_history_finding_id ON finding_resolution_history(finding_id)`);

  if (!hasTable(db, "officer_decisions")) {
    db.exec(`
      CREATE TABLE officer_decisions (
        application_id INTEGER PRIMARY KEY REFERENCES applications(id) ON DELETE CASCADE,
        officer_user_id INTEGER NOT NULL REFERENCES users(id),
        decision TEXT NOT NULL,
        reason TEXT NOT NULL DEFAULT '',
        decided_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  if (!hasTable(db, "officer_decision_history")) {
    db.exec(`
      CREATE TABLE officer_decision_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        officer_user_id INTEGER NOT NULL REFERENCES users(id),
        decision TEXT NOT NULL,
        reason TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  db.exec(`CREATE INDEX IF NOT EXISTS idx_officer_decision_history_application_id ON officer_decision_history(application_id)`);
}
