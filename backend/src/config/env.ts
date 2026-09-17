import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(process.cwd(), ".env") });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(required("PORT", "3001")),
  frontendOrigin: required("FRONTEND_ORIGIN", "http://localhost:5173"),
  databasePath: required("DATABASE_PATH", "./data/app.db"),
};
