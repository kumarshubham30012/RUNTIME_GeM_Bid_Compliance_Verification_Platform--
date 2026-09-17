import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { env } from "../config/env";
import { applySafeMigrations } from "./migrate";

let db: Database.Database | null = null;

function resolveDatabasePath(): string {
  return path.resolve(process.cwd(), env.databasePath);
}

function resolveSchemaPath(): string {
  return path.join(__dirname, "schema.sql");
}

export function initializeDatabase(): Database.Database {
  const databasePath = resolveDatabasePath();
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const connection = new Database(databasePath);
  connection.pragma("journal_mode = WAL");
  connection.pragma("foreign_keys = ON");

  const schemaSql = fs.readFileSync(resolveSchemaPath(), "utf8");
  connection.exec(schemaSql);
  applySafeMigrations(connection);

  return connection;
}

export function getDb(): Database.Database {
  if (!db) {
    db = initializeDatabase();
  }
  return db;
}
