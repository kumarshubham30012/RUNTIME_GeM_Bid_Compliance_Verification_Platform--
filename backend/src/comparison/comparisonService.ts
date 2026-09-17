import type { PublicUser } from "../auth/types";
import { listComplianceResults } from "../compliance/complianceRepository";
import { getDb } from "../db/client";
import { findOfficerTender } from "../tenders/tenderRepository";
import { deriveOfficerScore, type OfficerRiskLevel } from "./score";

export type ComparisonRow = {
  applicationId: number;
  bidderUserId: number;
  bidderName: string;
  bidderEmail: string;
  applicationStatus: string;
  score: number | null;
  risk: OfficerRiskLevel;
  counts: {
    PASS: number;
    FAIL: number;
    REVIEW: number;
    PENDING: number;
    NOT_APPLICABLE: number;
  };
};

export type TenderComparison = {
  tenderId: number;
  tenderTitle: string;
  bidders: ComparisonRow[];
};

type ApplicationRow = {
  id: number;
  bidder_user_id: number;
  bidder_name: string;
  bidder_email: string;
  status: string;
};

export function getOwnedTenderComparison(
  user: PublicUser,
  tenderId: number
): TenderComparison | "forbidden" | "missing" {
  if (user.role !== "officer") {
    return "forbidden";
  }

  const tender = findOfficerTender(tenderId, user.id);
  if (!tender) {
    return "missing";
  }

  const applications = getDb()
    .prepare(
      `SELECT
         a.id,
         a.bidder_user_id,
         COALESCE(u.full_name, '') AS bidder_name,
         COALESCE(u.email, '') AS bidder_email,
         a.status
       FROM applications a
       INNER JOIN users u ON u.id = a.bidder_user_id
       WHERE a.tender_id = ?
       ORDER BY a.id ASC`
    )
    .all(tenderId) as ApplicationRow[];

  const bidders = applications.map((application) => {
    const report = deriveOfficerScore(listComplianceResults(application.id, false));
    return {
      applicationId: application.id,
      bidderUserId: application.bidder_user_id,
      bidderName: application.bidder_name,
      bidderEmail: application.bidder_email,
      applicationStatus: application.status,
      score: report.score,
      risk: report.risk,
      counts: report.counts,
    };
  });

  return {
    tenderId: tender.id,
    tenderTitle: tender.title,
    bidders,
  };
}
