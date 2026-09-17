import { getDb } from "../db/client";
import type { RuleType, VerificationMethod } from "./constants";

export type RequirementRecord = {
  id: number;
  tenderId: number;
  name: string;
  tenderClause: string;
  mandatory: boolean;
  verificationMethod: VerificationMethod;
  ruleType: RuleType;
  createdAt: string;
  updatedAt: string;
};

type RequirementRow = {
  id: number;
  tender_id: number;
  name: string;
  tender_clause: string;
  is_mandatory: number;
  verification_method: string;
  rule_type: string;
  created_at: string;
  updated_at: string;
};

const requirementSelect = `
  SELECT
    id,
    tender_id,
    name,
    tender_clause,
    is_mandatory,
    verification_method,
    rule_type,
    created_at,
    updated_at
  FROM tender_requirements
`;

function mapRequirement(row: RequirementRow): RequirementRecord {
  return {
    id: row.id,
    tenderId: row.tender_id,
    name: row.name,
    tenderClause: row.tender_clause,
    mandatory: row.is_mandatory === 1,
    verificationMethod: row.verification_method as VerificationMethod,
    ruleType: row.rule_type as RuleType,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listRequirementsForTender(tenderId: number): RequirementRecord[] {
  const rows = getDb()
    .prepare(`${requirementSelect} WHERE tender_id = ? ORDER BY sort_order ASC, id ASC`)
    .all(tenderId) as RequirementRow[];

  return rows.map(mapRequirement);
}

export function findRequirementForTender(
  tenderId: number,
  requirementId: number
): RequirementRecord | null {
  const row = getDb()
    .prepare(`${requirementSelect} WHERE id = ? AND tender_id = ? LIMIT 1`)
    .get(requirementId, tenderId) as RequirementRow | undefined;

  return row ? mapRequirement(row) : null;
}

export function createRequirement(input: {
  tenderId: number;
  name: string;
  tenderClause: string;
  mandatory: boolean;
  verificationMethod: VerificationMethod;
  ruleType: RuleType;
}): RequirementRecord {
  const db = getDb();
  const nextOrderRow = db
    .prepare(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM tender_requirements WHERE tender_id = ?`)
    .get(input.tenderId) as { next_order: number };

  const result = db
    .prepare(
      `INSERT INTO tender_requirements (
         tender_id,
         name,
         tender_clause,
         requirement_text,
         is_mandatory,
         verification_method,
         rule_type,
         sort_order
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.tenderId,
      input.name,
      input.tenderClause,
      input.tenderClause,
      input.mandatory ? 1 : 0,
      input.verificationMethod,
      input.ruleType,
      nextOrderRow.next_order
    );

  const created = findRequirementForTender(input.tenderId, Number(result.lastInsertRowid));
  if (!created) {
    throw new Error("Failed to load created requirement");
  }

  return created;
}

export function updateRequirement(input: {
  tenderId: number;
  requirementId: number;
  name: string;
  tenderClause: string;
  mandatory: boolean;
  verificationMethod: VerificationMethod;
  ruleType: RuleType;
}): RequirementRecord | null {
  const existing = findRequirementForTender(input.tenderId, input.requirementId);
  if (!existing) {
    return null;
  }

  getDb()
    .prepare(
      `UPDATE tender_requirements
       SET name = ?,
           tender_clause = ?,
           requirement_text = ?,
           is_mandatory = ?,
           verification_method = ?,
           rule_type = ?,
           updated_at = datetime('now')
       WHERE id = ? AND tender_id = ?`
    )
    .run(
      input.name,
      input.tenderClause,
      input.tenderClause,
      input.mandatory ? 1 : 0,
      input.verificationMethod,
      input.ruleType,
      input.requirementId,
      input.tenderId
    );

  return findRequirementForTender(input.tenderId, input.requirementId);
}

export function deleteRequirement(tenderId: number, requirementId: number): boolean {
  const result = getDb()
    .prepare(`DELETE FROM tender_requirements WHERE id = ? AND tender_id = ?`)
    .run(requirementId, tenderId);

  return result.changes > 0;
}
