import { initializeDatabase } from "./client";

const db = initializeDatabase();

const tables = db
  .prepare(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
  )
  .all() as Array<{ name: string }>;

const tenderColumns = db.prepare(`PRAGMA table_info(tenders)`).all() as Array<{ name: string }>;
const userCount = db.prepare(`SELECT COUNT(*) AS count FROM users`).get() as { count: number };

console.log(`SQLite database migrated at: ${db.name}`);
console.log(`Tables: ${tables.map((table) => table.name).join(", ")}`);
console.log(`Tenders columns: ${tenderColumns.map((column) => column.name).join(", ")}`);
console.log(`Existing users preserved: ${userCount.count}`);

db.close();
