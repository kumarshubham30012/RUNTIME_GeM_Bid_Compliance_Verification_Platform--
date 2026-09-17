import { getDb } from "../db/client";
import { listDecisionHistory } from "./decisionRepository";
import type { AuditEvent } from "./types";

type TimedRow = {
  id: number;
  timestamp: string;
  description: string;
  actor_user_id: number | null;
};

function add(
  events: AuditEvent[],
  eventType: string,
  rows: TimedRow[]
): void {
  for (const row of rows) {
    events.push({
      eventType,
      description: row.description,
      actorUserId: row.actor_user_id,
      timestamp: row.timestamp,
      entityId: row.id,
    });
  }
}

export function listAuditEvents(applicationId: number): AuditEvent[] {
  const db = getDb();
  const events: AuditEvent[] = [];

  add(
    events,
    "DOCUMENT_UPLOAD",
    db
      .prepare(
        `SELECT d.id, d.created_at AS timestamp, d.original_filename AS description, a.bidder_user_id AS actor_user_id
         FROM application_documents d
         INNER JOIN applications a ON a.id = d.application_id
         WHERE d.application_id = ?`
      )
      .all(applicationId) as TimedRow[]
  );

  add(
    events,
    "VERIFICATION",
    db
      .prepare(
        `SELECT id, updated_at AS timestamp,
                ('Sandbox verification ' || status || ' via ' || provider) AS description,
                NULL AS actor_user_id
         FROM verification_results
         WHERE application_id = ?`
      )
      .all(applicationId) as TimedRow[]
  );

  add(
    events,
    "ENTITY_RESOLUTION",
    db
      .prepare(
        `SELECT id, created_at AS timestamp,
                ('Entity resolution ' || classification || ' for ' || field_name) AS description,
                NULL AS actor_user_id
         FROM entity_resolution_results
         WHERE application_id = ?`
      )
      .all(applicationId) as TimedRow[]
  );

  add(
    events,
    "COMPLIANCE",
    db
      .prepare(
        `SELECT id, evaluated_at AS timestamp,
                ('Compliance ' || status || ' (' || reason_code || ')') AS description,
                NULL AS actor_user_id
         FROM compliance_results
         WHERE application_id = ?`
      )
      .all(applicationId) as TimedRow[]
  );

  add(
    events,
    "EVIDENCE",
    db
      .prepare(
        `SELECT id, generated_at AS timestamp,
                ('Evidence finding ' || compliance_status || ' for ' || requirement_name) AS description,
                NULL AS actor_user_id
         FROM evidence_findings
         WHERE application_id = ?`
      )
      .all(applicationId) as TimedRow[]
  );

  add(
    events,
    "RESOLUTION_ACTION",
    db
      .prepare(
        `SELECT id, created_at AS timestamp,
                ('Finding resolution ' || action || ' (' || previous_status || ' → ' || new_status || ')') AS description,
                officer_user_id AS actor_user_id
         FROM finding_resolution_history
         WHERE application_id = ?`
      )
      .all(applicationId) as TimedRow[]
  );

  for (const entry of listDecisionHistory(applicationId)) {
    events.push({
      eventType: "OFFICER_DECISION",
      description: entry.reason
        ? `Officer decision ${entry.decision}: ${entry.reason}`
        : `Officer decision ${entry.decision}`,
      actorUserId: entry.officerUserId,
      timestamp: entry.createdAt,
      entityId: entry.id,
    });
  }

  return events.sort((left, right) => {
    if (left.timestamp < right.timestamp) {
      return -1;
    }
    if (left.timestamp > right.timestamp) {
      return 1;
    }
    if (left.eventType < right.eventType) {
      return -1;
    }
    if (left.eventType > right.eventType) {
      return 1;
    }
    return (left.entityId ?? 0) - (right.entityId ?? 0);
  });
}
