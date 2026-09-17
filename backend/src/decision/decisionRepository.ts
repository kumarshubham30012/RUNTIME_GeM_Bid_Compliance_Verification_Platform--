import { getDb } from "../db/client";
import type { OfficerDecisionType, StoredOfficerDecision } from "./types";

type DecisionRow = {
  application_id: number;
  officer_user_id: number;
  decision: string;
  reason: string;
  decided_at: string;
};

export function getOfficerDecision(applicationId: number): StoredOfficerDecision | null {
  const row = getDb()
    .prepare(
      `SELECT application_id, officer_user_id, decision, reason, decided_at
       FROM officer_decisions
       WHERE application_id = ?
       LIMIT 1`
    )
    .get(applicationId) as DecisionRow | undefined;

  if (!row) {
    return null;
  }

  return {
    applicationId: row.application_id,
    officerUserId: row.officer_user_id,
    decision: row.decision as OfficerDecisionType,
    reason: row.reason,
    decidedAt: row.decided_at,
  };
}

export function upsertOfficerDecision(input: {
  applicationId: number;
  officerUserId: number;
  decision: OfficerDecisionType;
  reason: string;
}): StoredOfficerDecision {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO officer_decisions (application_id, officer_user_id, decision, reason, decided_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(application_id) DO UPDATE SET
         officer_user_id = excluded.officer_user_id,
         decision = excluded.decision,
         reason = excluded.reason,
         decided_at = datetime('now'),
         updated_at = datetime('now')`
    ).run(input.applicationId, input.officerUserId, input.decision, input.reason);

    db.prepare(
      `INSERT INTO officer_decision_history (application_id, officer_user_id, decision, reason)
       VALUES (?, ?, ?, ?)`
    ).run(input.applicationId, input.officerUserId, input.decision, input.reason);
  });
  tx();

  const stored = getOfficerDecision(input.applicationId);
  if (!stored) {
    throw new Error("Failed to persist officer decision");
  }
  return stored;
}

export function listDecisionHistory(applicationId: number): Array<{
  id: number;
  officerUserId: number;
  decision: OfficerDecisionType;
  reason: string;
  createdAt: string;
}> {
  const rows = getDb()
    .prepare(
      `SELECT id, officer_user_id, decision, reason, created_at
       FROM officer_decision_history
       WHERE application_id = ?
       ORDER BY created_at ASC, id ASC`
    )
    .all(applicationId) as Array<{
    id: number;
    officer_user_id: number;
    decision: string;
    reason: string;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    officerUserId: row.officer_user_id,
    decision: row.decision as OfficerDecisionType,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}
