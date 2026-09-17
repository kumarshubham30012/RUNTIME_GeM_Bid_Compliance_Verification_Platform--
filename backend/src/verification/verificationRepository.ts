import { getDb } from "../db/client";
import { VERIFICATION_ENVIRONMENT, type VerificationResult } from "./types";

export type StoredVerificationResult = VerificationResult & {
  id: number;
  applicationId: number;
  requirementId: number;
};

type ResultRow = {
  id: number;
  application_id: number;
  requirement_id: number;
  provider: string;
  environment: string;
  status: string;
  summary: string;
  result_json: string;
  created_at: string;
  updated_at: string;
};

function parseData(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }
  return {};
}

function mapRow(row: ResultRow): StoredVerificationResult {
  const payload = parseData(row.result_json);
  const method = typeof payload.method === "string" ? payload.method : "";
  return {
    id: row.id,
    applicationId: row.application_id,
    requirementId: row.requirement_id,
    method: method as StoredVerificationResult["method"],
    provider: row.provider,
    environment: VERIFICATION_ENVIRONMENT,
    status: row.status as StoredVerificationResult["status"],
    checkedAt: row.updated_at,
    summary: row.summary,
    data: typeof payload.data === "object" && payload.data !== null && !Array.isArray(payload.data)
      ? (payload.data as Record<string, unknown>)
      : {},
  };
}

export function listVerificationResults(applicationId: number): StoredVerificationResult[] {
  const rows = getDb()
    .prepare(
      `SELECT id, application_id, requirement_id, provider, environment, status, summary, result_json, created_at, updated_at
       FROM verification_results
       WHERE application_id = ?
       ORDER BY requirement_id ASC, id ASC`
    )
    .all(applicationId) as ResultRow[];

  return rows.map(mapRow);
}

export function upsertVerificationResult(input: {
  applicationId: number;
  requirementId: number;
  result: VerificationResult;
}): StoredVerificationResult {
  const resultJson = JSON.stringify({
    method: input.result.method,
    data: input.result.data,
    checkedAt: input.result.checkedAt,
  });

  getDb()
    .prepare(
      `INSERT INTO verification_results (
         application_id, requirement_id, provider, environment, status, summary, result_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(application_id, requirement_id) DO UPDATE SET
         provider = excluded.provider,
         environment = excluded.environment,
         status = excluded.status,
         summary = excluded.summary,
         result_json = excluded.result_json,
         updated_at = datetime('now')`
    )
    .run(
      input.applicationId,
      input.requirementId,
      input.result.provider,
      input.result.environment,
      input.result.status,
      input.result.summary,
      resultJson
    );

  const row = getDb()
    .prepare(
      `SELECT id, application_id, requirement_id, provider, environment, status, summary, result_json, created_at, updated_at
       FROM verification_results
       WHERE application_id = ? AND requirement_id = ?
       LIMIT 1`
    )
    .get(input.applicationId, input.requirementId) as ResultRow;

  return mapRow(row);
}
