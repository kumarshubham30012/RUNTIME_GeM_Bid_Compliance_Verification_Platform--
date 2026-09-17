import { getDb } from "../db/client";
import type { ComplianceReasonCode, ComplianceStatus, StoredComplianceResult } from "./types";

type ResultRow = {
  id: number;
  application_id: number;
  requirement_id: number;
  status: string;
  reason_code: string;
  evaluated_at: string;
  created_at: string;
  updated_at: string;
  name: string;
  tender_clause: string;
  is_mandatory: number;
  verification_method: string;
  rule_type: string;
};

function mapRow(row: ResultRow, sandbox: boolean): StoredComplianceResult {
  return {
    id: row.id,
    applicationId: row.application_id,
    requirementId: row.requirement_id,
    status: row.status as ComplianceStatus,
    reasonCode: row.reason_code as ComplianceReasonCode,
    requirementName: row.name,
    tenderClause: row.tender_clause,
    mandatory: row.is_mandatory === 1,
    verificationMethod: row.verification_method,
    ruleType: row.rule_type,
    sandbox,
    evaluatedAt: row.evaluated_at,
  };
}

export function listComplianceResults(applicationId: number, sandbox: boolean): StoredComplianceResult[] {
  const rows = getDb()
    .prepare(
      `SELECT
         c.id,
         c.application_id,
         c.requirement_id,
         c.status,
         c.reason_code,
         c.evaluated_at,
         c.created_at,
         c.updated_at,
         r.name,
         r.tender_clause,
         r.is_mandatory,
         r.verification_method,
         r.rule_type
       FROM compliance_results c
       INNER JOIN tender_requirements r ON r.id = c.requirement_id
       WHERE c.application_id = ?
       ORDER BY r.sort_order ASC, r.id ASC`
    )
    .all(applicationId) as ResultRow[];

  return rows.map((row) => mapRow(row, sandbox));
}

export function upsertComplianceResults(
  applicationId: number,
  results: Array<{
    requirementId: number;
    status: ComplianceStatus;
    reasonCode: ComplianceReasonCode;
  }>,
  sandbox: boolean
): StoredComplianceResult[] {
  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO compliance_results (application_id, requirement_id, status, reason_code, evaluated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(application_id, requirement_id) DO UPDATE SET
       status = excluded.status,
       reason_code = excluded.reason_code,
       evaluated_at = datetime('now'),
       updated_at = datetime('now')`
  );

  const tx = db.transaction(() => {
    for (const result of results) {
      upsert.run(applicationId, result.requirementId, result.status, result.reasonCode);
    }
  });
  tx();

  return listComplianceResults(applicationId, sandbox);
}
