import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), "gem-compliance-"));
process.env.DATABASE_PATH = path.join(testDir, "app.db");
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "phase10-test-secret-not-for-production";
}

export const COMPLIANCE_TEST_DB_DIR = testDir;
