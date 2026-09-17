import { initializeDatabase } from "./client";

const db = initializeDatabase();

const tables = db
  .prepare(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
  )
  .all() as Array<{ name: string }>;

const tenderColumns = db.prepare(`PRAGMA table_info(tenders)`).all() as Array<{ name: string }>;
const requirementColumns = db
  .prepare(`PRAGMA table_info(tender_requirements)`)
  .all() as Array<{ name: string }>;
const applicationColumns = db.prepare(`PRAGMA table_info(applications)`).all() as Array<{ name: string }>;
const documentColumns = db
  .prepare(`PRAGMA table_info(application_documents)`)
  .all() as Array<{ name: string }>;
const verificationColumns = db
  .prepare(`PRAGMA table_info(verification_results)`)
  .all() as Array<{ name: string }>;
const entityResolutionColumns = db
  .prepare(`PRAGMA table_info(entity_resolution_results)`)
  .all() as Array<{ name: string }>;
const complianceColumns = db
  .prepare(`PRAGMA table_info(compliance_results)`)
  .all() as Array<{ name: string }>;
const evidenceColumns = db
  .prepare(`PRAGMA table_info(evidence_findings)`)
  .all() as Array<{ name: string }>;
const resolutionColumns = db
  .prepare(`PRAGMA table_info(finding_resolutions)`)
  .all() as Array<{ name: string }>;
const resolutionHistoryColumns = db
  .prepare(`PRAGMA table_info(finding_resolution_history)`)
  .all() as Array<{ name: string }>;
const userCount = db.prepare(`SELECT COUNT(*) AS count FROM users`).get() as { count: number };

console.log(`SQLite database migrated at: ${db.name}`);
console.log(`Tables: ${tables.map((table) => table.name).join(", ")}`);
console.log(`Tenders columns: ${tenderColumns.map((column) => column.name).join(", ")}`);
console.log(
  `Requirement columns: ${requirementColumns.map((column) => column.name).join(", ")}`
);
console.log(
  `Application columns: ${applicationColumns.map((column) => column.name).join(", ") || "(missing)"}`
);
console.log(
  `Document columns: ${documentColumns.map((column) => column.name).join(", ") || "(missing)"}`
);
console.log(
  `Verification columns: ${verificationColumns.map((column) => column.name).join(", ") || "(missing)"}`
);
console.log(
  `Entity resolution columns: ${entityResolutionColumns.map((column) => column.name).join(", ") || "(missing)"}`
);
console.log(
  `Compliance columns: ${complianceColumns.map((column) => column.name).join(", ") || "(missing)"}`
);
console.log(
  `Evidence columns: ${evidenceColumns.map((column) => column.name).join(", ") || "(missing)"}`
);
console.log(
  `Resolution columns: ${resolutionColumns.map((column) => column.name).join(", ") || "(missing)"}`
);
console.log(
  `Resolution history columns: ${resolutionHistoryColumns.map((column) => column.name).join(", ") || "(missing)"}`
);
console.log(`Existing users preserved: ${userCount.count}`);

db.close();
