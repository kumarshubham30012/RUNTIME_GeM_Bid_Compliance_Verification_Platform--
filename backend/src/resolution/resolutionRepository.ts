import { getDb } from "../db/client";
import type { ResolutionAction, ResolutionHistoryEntry, ResolutionStatus } from "./types";

type StateRow = {
  finding_id: number;
  status: string;
};

type HistoryRow = {
  id: number;
  action: string;
  previous_status: string;
  new_status: string;
  officer_user_id: number;
  created_at: string;
};

export function getResolutionStatus(findingId: number): ResolutionStatus {
  const row = getDb()
    .prepare(`SELECT finding_id, status FROM finding_resolutions WHERE finding_id = ? LIMIT 1`)
    .get(findingId) as StateRow | undefined;
  return row ? (row.status as ResolutionStatus) : "OPEN";
}

export function listResolutionHistory(findingId: number): ResolutionHistoryEntry[] {
  const rows = getDb()
    .prepare(
      `SELECT id, action, previous_status, new_status, officer_user_id, created_at
       FROM finding_resolution_history
       WHERE finding_id = ?
       ORDER BY created_at ASC, id ASC`
    )
    .all(findingId) as HistoryRow[];

  return rows.map((row) => ({
    id: row.id,
    action: row.action as ResolutionAction,
    previousStatus: row.previous_status as ResolutionStatus,
    newStatus: row.new_status as ResolutionStatus,
    officerUserId: row.officer_user_id,
    createdAt: row.created_at,
  }));
}

export function applyResolutionAction(
  findingId: number,
  applicationId: number,
  officerUserId: number,
  action: ResolutionAction,
  newStatus: ResolutionStatus
): void {
  const previousStatus = getResolutionStatus(findingId);
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO finding_resolutions (finding_id, application_id, status, updated_by_user_id)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(finding_id) DO UPDATE SET
         status = excluded.status,
         updated_by_user_id = excluded.updated_by_user_id,
         updated_at = datetime('now')`
    ).run(findingId, applicationId, newStatus, officerUserId);

    db.prepare(
      `INSERT INTO finding_resolution_history (
         finding_id, application_id, action, previous_status, new_status, officer_user_id
       ) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(findingId, applicationId, action, previousStatus, newStatus, officerUserId);
  });
  tx();
}
