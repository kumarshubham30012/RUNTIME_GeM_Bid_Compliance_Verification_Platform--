import { initializeDatabase } from "./client";

const db = initializeDatabase();
const tables = db
  .prepare(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
  )
  .all() as Array<{ name: string }>;

console.log(`SQLite database initialized at: ${db.name}`);
console.log(`Tables: ${tables.map((table) => table.name).join(", ")}`);
db.close();
