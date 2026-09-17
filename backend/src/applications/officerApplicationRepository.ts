import { getDb } from "../db/client";
import {
  findDocumentForApplication,
  listDocumentsForApplication,
  toPublicDocument,
  type DocumentRecord,
  type PublicDocument,
} from "../documents/documentRepository";
import { deriveTenderStatus, type TenderStatus } from "../tenders/status";

export type OfficerApplicationListItem = {
  id: number;
  tenderId: number;
  tenderTitle: string;
  bidNumber: string | null;
  bidderUserId: number;
  bidderName: string;
  status: string;
  gstin: string;
  pan: string;
  oem: string;
  createdAt: string;
  updatedAt: string;
};

export type OfficerTenderSummary = {
  id: number;
  title: string;
  bidNumber: string | null;
  description: string | null;
  department: string;
  openingDate: string;
  closingDate: string;
  status: TenderStatus;
};

export type OfficerBidderSummary = {
  id: number;
  name: string;
  email: string;
};

export type OfficerRequirementReview = {
  id: number;
  name: string;
  tenderClause: string;
  mandatory: boolean;
  verificationMethod: string;
  ruleType: string;
  requirementText: string;
  category: string | null;
  sortOrder: number;
  documents: PublicDocument[];
};

export type OfficerApplicationDetail = {
  application: {
    id: number;
    status: string;
    gstin: string;
    pan: string;
    oem: string;
    createdAt: string;
    updatedAt: string;
  };
  tender: OfficerTenderSummary;
  bidder: OfficerBidderSummary;
  requirements: OfficerRequirementReview[];
};

type ListRow = {
  id: number;
  tender_id: number;
  tender_title: string;
  bid_number: string | null;
  bidder_user_id: number;
  bidder_name: string;
  status: string;
  gstin: string;
  pan: string;
  oem: string;
  created_at: string;
  updated_at: string;
};

type DetailRow = ListRow & {
  department: string;
  description: string | null;
  opening_date: string;
  closing_date: string;
  bidder_email: string;
};

type RequirementRow = {
  id: number;
  name: string;
  tender_clause: string;
  is_mandatory: number;
  verification_method: string;
  rule_type: string;
  requirement_text: string;
  category: string | null;
  sort_order: number;
};

const listSelect = `
  SELECT
    a.id,
    a.tender_id,
    t.title AS tender_title,
    t.bid_number,
    a.bidder_user_id,
    COALESCE(u.full_name, '') AS bidder_name,
    a.status,
    a.gstin,
    a.pan,
    a.oem,
    a.created_at,
    a.updated_at
  FROM applications a
  INNER JOIN tenders t ON t.id = a.tender_id
  INNER JOIN users u ON u.id = a.bidder_user_id
`;

function mapListItem(row: ListRow): OfficerApplicationListItem {
  return {
    id: row.id,
    tenderId: row.tender_id,
    tenderTitle: row.tender_title,
    bidNumber: row.bid_number,
    bidderUserId: row.bidder_user_id,
    bidderName: row.bidder_name,
    status: row.status,
    gstin: row.gstin,
    pan: row.pan,
    oem: row.oem,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listApplicationsForOfficer(officerId: number): OfficerApplicationListItem[] {
  const rows = getDb()
    .prepare(
      `${listSelect}
       WHERE t.created_by_user_id = ?
       ORDER BY a.updated_at DESC, a.id DESC`
    )
    .all(officerId) as ListRow[];

  return rows.map(mapListItem);
}

export function findApplicationForOfficer(
  applicationId: number,
  officerId: number
): OfficerApplicationDetail | null {
  const row = getDb()
    .prepare(
      `SELECT
         a.id,
         a.tender_id,
         t.title AS tender_title,
         t.bid_number,
         t.department,
         t.description,
         t.opening_date,
         t.closing_date,
         a.bidder_user_id,
         COALESCE(u.full_name, '') AS bidder_name,
         COALESCE(u.email, '') AS bidder_email,
         a.status,
         a.gstin,
         a.pan,
         a.oem,
         a.created_at,
         a.updated_at
       FROM applications a
       INNER JOIN tenders t ON t.id = a.tender_id
       INNER JOIN users u ON u.id = a.bidder_user_id
       WHERE a.id = ?
         AND t.created_by_user_id = ?
       LIMIT 1`
    )
    .get(applicationId, officerId) as DetailRow | undefined;

  if (!row) {
    return null;
  }

  const requirementRows = getDb()
    .prepare(
      `SELECT
         id,
         name,
         tender_clause,
         is_mandatory,
         verification_method,
         rule_type,
         requirement_text,
         category,
         sort_order
       FROM tender_requirements
       WHERE tender_id = ?
       ORDER BY sort_order ASC, id ASC`
    )
    .all(row.tender_id) as RequirementRow[];

  const documents = listDocumentsForApplication(row.id);

  return {
    application: {
      id: row.id,
      status: row.status,
      gstin: row.gstin,
      pan: row.pan,
      oem: row.oem,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    tender: {
      id: row.tender_id,
      title: row.tender_title,
      bidNumber: row.bid_number,
      description: row.description,
      department: row.department,
      openingDate: row.opening_date,
      closingDate: row.closing_date,
      status: deriveTenderStatus(row.opening_date, row.closing_date),
    },
    bidder: {
      id: row.bidder_user_id,
      name: row.bidder_name,
      email: row.bidder_email,
    },
    requirements: requirementRows.map((requirement) => ({
      id: requirement.id,
      name: requirement.name,
      tenderClause: requirement.tender_clause,
      mandatory: requirement.is_mandatory === 1,
      verificationMethod: requirement.verification_method,
      ruleType: requirement.rule_type,
      requirementText: requirement.requirement_text,
      category: requirement.category,
      sortOrder: requirement.sort_order,
      documents: documents
        .filter((document) => document.requirementId === requirement.id)
        .map(toPublicDocument),
    })),
  };
}

export function findOwnedDocumentForOfficer(
  applicationId: number,
  documentId: number,
  officerId: number
): DocumentRecord | null {
  const owned = getDb()
    .prepare(
      `SELECT a.id
       FROM applications a
       INNER JOIN tenders t ON t.id = a.tender_id
       WHERE a.id = ? AND t.created_by_user_id = ?
       LIMIT 1`
    )
    .get(applicationId, officerId) as { id: number } | undefined;

  if (!owned) {
    return null;
  }

  return findDocumentForApplication(applicationId, documentId);
}
