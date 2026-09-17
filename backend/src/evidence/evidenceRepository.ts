import { getDb } from "../db/client";
import type { ComplianceStatus } from "../compliance/types";
import type { EvidenceFindingDraft, StoredEvidenceFinding } from "./types";

type FindingRow = {
  id: number;
  application_id: number;
  requirement_id: number;
  requirement_name: string;
  tender_clause: string;
  compliance_status: string;
  submitted_value: string;
  verified_value: string;
  evidence_sources: string;
  reasoning: string;
  generated_at: string;
};

function mapRow(row: FindingRow): StoredEvidenceFinding {
  return {
    id: row.id,
    applicationId: row.application_id,
    requirementId: row.requirement_id,
    requirementName: row.requirement_name,
    tenderClause: row.tender_clause,
    status: row.compliance_status as ComplianceStatus,
    submittedValue: row.submitted_value,
    verifiedValue: row.verified_value,
    evidenceSources: row.evidence_sources,
    reasoning: row.reasoning,
    generatedAt: row.generated_at,
  };
}

export function listEvidenceFindings(applicationId: number): StoredEvidenceFinding[] {
  const rows = getDb()
    .prepare(
      `SELECT
         id,
         application_id,
         requirement_id,
         requirement_name,
         tender_clause,
         compliance_status,
         submitted_value,
         verified_value,
         evidence_sources,
         reasoning,
         generated_at
       FROM evidence_findings
       WHERE application_id = ?
       ORDER BY requirement_id ASC, id ASC`
    )
    .all(applicationId) as FindingRow[];

  return rows.map(mapRow);
}

export function replaceEvidenceFindings(
  applicationId: number,
  findings: Array<EvidenceFindingDraft & { requirementId: number }>
): StoredEvidenceFinding[] {
  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO evidence_findings (
       application_id,
       requirement_id,
       requirement_name,
       tender_clause,
       compliance_status,
       submitted_value,
       verified_value,
       evidence_sources,
       reasoning,
       generated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(application_id, requirement_id) DO UPDATE SET
       requirement_name = excluded.requirement_name,
       tender_clause = excluded.tender_clause,
       compliance_status = excluded.compliance_status,
       submitted_value = excluded.submitted_value,
       verified_value = excluded.verified_value,
       evidence_sources = excluded.evidence_sources,
       reasoning = excluded.reasoning,
       generated_at = datetime('now'),
       updated_at = datetime('now')`
  );

  const tx = db.transaction(() => {
    const keepIds = findings.map((finding) => finding.requirementId);
    if (keepIds.length === 0) {
      db.prepare(`DELETE FROM evidence_findings WHERE application_id = ?`).run(applicationId);
      return;
    }

    const placeholders = keepIds.map(() => "?").join(", ");
    db.prepare(
      `DELETE FROM evidence_findings WHERE application_id = ? AND requirement_id NOT IN (${placeholders})`
    ).run(applicationId, ...keepIds);

    for (const finding of findings) {
      upsert.run(
        applicationId,
        finding.requirementId,
        finding.requirementName,
        finding.tenderClause,
        finding.status,
        finding.submittedValue,
        finding.verifiedValue,
        finding.evidenceSources,
        finding.reasoning
      );
    }
  });
  tx();

  return listEvidenceFindings(applicationId);
}
