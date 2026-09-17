import { getDb } from "../db/client";
import { deriveTenderStatus, type TenderStatus } from "./status";

export type TenderRecord = {
  id: number;
  title: string;
  department: string;
  openingDate: string;
  closingDate: string;
  status: TenderStatus;
  createdByUserId: number;
  createdByName: string;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
  bidderCount: number;
  pendingReviews: number;
  completedReviews: number;
  statsPlaceholder: true;
};

type TenderRow = {
  id: number;
  title: string;
  department: string;
  opening_date: string;
  closing_date: string;
  created_by_user_id: number;
  created_by_name: string;
  created_by_email: string;
  created_at: string;
  updated_at: string;
};

const tenderSelect = `
  SELECT
    t.id,
    t.title,
    t.department,
    t.opening_date,
    t.closing_date,
    t.created_by_user_id,
    COALESCE(u.full_name, '') AS created_by_name,
    COALESCE(u.email, '') AS created_by_email,
    t.created_at,
    t.updated_at
  FROM tenders t
  LEFT JOIN users u ON u.id = t.created_by_user_id
`;

function mapTender(row: TenderRow): TenderRecord {
  return {
    id: row.id,
    title: row.title,
    department: row.department,
    openingDate: row.opening_date,
    closingDate: row.closing_date,
    status: deriveTenderStatus(row.opening_date, row.closing_date),
    createdByUserId: row.created_by_user_id,
    createdByName: row.created_by_name,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    bidderCount: 0,
    pendingReviews: 0,
    completedReviews: 0,
    statsPlaceholder: true,
  };
}

export function listTendersForOfficer(officerId: number): TenderRecord[] {
  const rows = getDb()
    .prepare(
      `${tenderSelect}
       WHERE t.created_by_user_id = ?
         AND t.opening_date IS NOT NULL
         AND t.closing_date IS NOT NULL
       ORDER BY t.created_at DESC, t.id DESC`
    )
    .all(officerId) as TenderRow[];

  return rows.map(mapTender);
}

export function findOfficerTender(tenderId: number, officerId: number): TenderRecord | null {
  const row = getDb()
    .prepare(
      `${tenderSelect}
       WHERE t.id = ?
         AND t.created_by_user_id = ?
         AND t.opening_date IS NOT NULL
         AND t.closing_date IS NOT NULL
       LIMIT 1`
    )
    .get(tenderId, officerId) as TenderRow | undefined;

  return row ? mapTender(row) : null;
}

export type PublicTender = {
  id: number;
  title: string;
  department: string;
  openingDate: string;
  closingDate: string;
  status: TenderStatus;
};

function toPublicTender(tender: TenderRecord): PublicTender {
  return {
    id: tender.id,
    title: tender.title,
    department: tender.department,
    openingDate: tender.openingDate,
    closingDate: tender.closingDate,
    status: tender.status,
  };
}

export function listDatedTenders(): PublicTender[] {
  const rows = getDb()
    .prepare(
      `${tenderSelect}
       WHERE t.opening_date IS NOT NULL
         AND t.closing_date IS NOT NULL
       ORDER BY t.created_at DESC, t.id DESC`
    )
    .all() as TenderRow[];

  return rows.map(mapTender).map(toPublicTender);
}

export function findDatedTender(tenderId: number): PublicTender | null {
  const row = getDb()
    .prepare(
      `${tenderSelect}
       WHERE t.id = ?
         AND t.opening_date IS NOT NULL
         AND t.closing_date IS NOT NULL
       LIMIT 1`
    )
    .get(tenderId) as TenderRow | undefined;

  return row ? toPublicTender(mapTender(row)) : null;
}

export function listOpenTenders(): PublicTender[] {
  return listDatedTenders().filter((tender) => tender.status === "open");
}

export function createOfficerTender(input: {
  title: string;
  department: string;
  openingDate: string;
  closingDate: string;
  officerId: number;
}): TenderRecord {
  const result = getDb()
    .prepare(
      `INSERT INTO tenders (
         title,
         department,
         opening_date,
         closing_date,
         created_by_user_id
       ) VALUES (?, ?, ?, ?, ?)`
    )
    .run(input.title, input.department, input.openingDate, input.closingDate, input.officerId);

  const created = findOfficerTender(Number(result.lastInsertRowid), input.officerId);
  if (!created) {
    throw new Error("Failed to load created tender");
  }

  return created;
}
