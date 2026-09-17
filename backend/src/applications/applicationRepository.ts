import { getDb } from "../db/client";
import { findDatedTender, type PublicTender } from "../tenders/tenderRepository";

export const APPLICATION_STATUS_DRAFT = "DRAFT";

export type ApplicationRecord = {
  id: number;
  tenderId: number;
  bidderUserId: number;
  status: typeof APPLICATION_STATUS_DRAFT;
  gstin: string;
  pan: string;
  oem: string;
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
  created_at: string;
  updated_at: string;
};

const applicationSelect = `
  SELECT id, tender_id, bidder_user_id, status, gstin, pan, oem, created_at, updated_at
  FROM applications
`;

function mapApplication(row: ApplicationRow): ApplicationRecord {
  return {
    id: row.id,
    tenderId: row.tender_id,
    bidderUserId: row.bidder_user_id,
    status: APPLICATION_STATUS_DRAFT,
    gstin: row.gstin,
    pan: row.pan,
    oem: row.oem,
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
  fields: { gstin?: string; pan?: string; oem?: string }
): ApplicationRecord | null {
  const existing = findApplicationForBidder(applicationId, bidderUserId);
  if (!existing) {
    return null;
  }

  const gstin = fields.gstin ?? existing.gstin;
  const pan = fields.pan ?? existing.pan;
  const oem = fields.oem ?? existing.oem;

  getDb()
    .prepare(
      `UPDATE applications
       SET gstin = ?, pan = ?, oem = ?, status = ?, updated_at = datetime('now')
       WHERE id = ? AND bidder_user_id = ?`
    )
    .run(gstin, pan, oem, APPLICATION_STATUS_DRAFT, applicationId, bidderUserId);

  return findApplicationForBidder(applicationId, bidderUserId);
}
