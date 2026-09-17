import { getDb } from "../db/client";
import { findDatedTender, type PublicTender } from "../tenders/tenderRepository";

export const APPLICATION_STATUS_DRAFT = "DRAFT";
export const APPLICATION_STATUS_SUBMITTED = "SUBMITTED";

export type ApplicationStatus = typeof APPLICATION_STATUS_DRAFT | typeof APPLICATION_STATUS_SUBMITTED;

export type ApplicationRecord = {
  id: number;
  tenderId: number;
  bidderUserId: number;
  status: ApplicationStatus;
  gstin: string;
  pan: string;
  oem: string;
  udyam: string;
  createdAt: string;
  updatedAt: string;
  tender: PublicTender | null;
};

type ApplicationRow = {
  id: number;
  tender_id: number;
  bidder_user_id: number;
  status: string;
  gstin: string;
  pan: string;
  oem: string;
  udyam: string;
  created_at: string;
  updated_at: string;
};

const applicationSelect = `
  SELECT id, tender_id, bidder_user_id, status, gstin, pan, oem, udyam, created_at, updated_at
  FROM applications
`;

function mapStatus(value: string): ApplicationStatus {
  return value === APPLICATION_STATUS_SUBMITTED ? APPLICATION_STATUS_SUBMITTED : APPLICATION_STATUS_DRAFT;
}

function mapApplication(row: ApplicationRow): ApplicationRecord {
  return {
    id: row.id,
    tenderId: row.tender_id,
    bidderUserId: row.bidder_user_id,
    status: mapStatus(row.status),
    gstin: row.gstin,
    pan: row.pan,
    oem: row.oem,
    udyam: row.udyam,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tender: findDatedTender(row.tender_id),
  };
}

export function findApplicationByTenderAndBidder(
  tenderId: number,
  bidderUserId: number
): ApplicationRecord | null {
  const row = getDb()
    .prepare(`${applicationSelect} WHERE tender_id = ? AND bidder_user_id = ? LIMIT 1`)
    .get(tenderId, bidderUserId) as ApplicationRow | undefined;

  return row ? mapApplication(row) : null;
}

export function findApplicationForBidder(
  applicationId: number,
  bidderUserId: number
): ApplicationRecord | null {
  const row = getDb()
    .prepare(`${applicationSelect} WHERE id = ? AND bidder_user_id = ? LIMIT 1`)
    .get(applicationId, bidderUserId) as ApplicationRow | undefined;

  return row ? mapApplication(row) : null;
}

export function findApplicationOwnedByOfficer(
  applicationId: number,
  officerId: number
): ApplicationRecord | null {
  const row = getDb()
    .prepare(
      `SELECT a.id, a.tender_id, a.bidder_user_id, a.status, a.gstin, a.pan, a.oem, a.udyam, a.created_at, a.updated_at
       FROM applications a
       INNER JOIN tenders t ON t.id = a.tender_id
       WHERE a.id = ? AND t.created_by_user_id = ?
       LIMIT 1`
    )
    .get(applicationId, officerId) as ApplicationRow | undefined;

  return row ? mapApplication(row) : null;
}

export function createDraftApplication(tenderId: number, bidderUserId: number): ApplicationRecord {
  const existing = findApplicationByTenderAndBidder(tenderId, bidderUserId);
  if (existing) {
    return existing;
  }

  try {
    const result = getDb()
      .prepare(
        `INSERT INTO applications (tender_id, bidder_user_id, status)
         VALUES (?, ?, ?)`
      )
      .run(tenderId, bidderUserId, APPLICATION_STATUS_DRAFT);

    const created = findApplicationForBidder(Number(result.lastInsertRowid), bidderUserId);
    if (!created) {
      throw new Error("Failed to load created application");
    }
    return created;
  } catch (error) {
    const raced = findApplicationByTenderAndBidder(tenderId, bidderUserId);
    if (raced) {
      return raced;
    }
    throw error;
  }
}

export function updateDraftApplication(
  applicationId: number,
  bidderUserId: number,
  fields: { gstin?: string; pan?: string; oem?: string; udyam?: string }
): ApplicationRecord | null {
  const existing = findApplicationForBidder(applicationId, bidderUserId);
  if (!existing) {
    return null;
  }

  const gstin = fields.gstin ?? existing.gstin;
  const pan = fields.pan ?? existing.pan;
  const oem = fields.oem ?? existing.oem;
  const udyam = fields.udyam ?? existing.udyam;

  getDb()
    .prepare(
      `UPDATE applications
       SET gstin = ?, pan = ?, oem = ?, udyam = ?, updated_at = datetime('now')
       WHERE id = ? AND bidder_user_id = ? AND status = ?`
    )
    .run(gstin, pan, oem, udyam, applicationId, bidderUserId, APPLICATION_STATUS_DRAFT);

  return findApplicationForBidder(applicationId, bidderUserId);
}

export function submitDraftApplication(
  applicationId: number,
  bidderUserId: number
): ApplicationRecord | null {
  getDb()
    .prepare(
      `UPDATE applications
       SET status = ?, updated_at = datetime('now')
       WHERE id = ? AND bidder_user_id = ? AND status = ?`
    )
    .run(APPLICATION_STATUS_SUBMITTED, applicationId, bidderUserId, APPLICATION_STATUS_DRAFT);

  return findApplicationForBidder(applicationId, bidderUserId);
}
