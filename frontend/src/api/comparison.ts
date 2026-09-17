import { apiRequest } from "./client.ts";

export type ComparisonRisk = "LOW" | "MEDIUM" | "HIGH";

export type ComparisonBidder = {
  applicationId: number;
  bidderUserId: number;
  bidderName: string;
  bidderEmail: string;
  applicationStatus: string;
  score: number | null;
  risk: ComparisonRisk;
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
  bidders: ComparisonBidder[];
};

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function fetchTenderComparison(
  token: string,
  tenderId: number
): Promise<TenderComparison> {
  return apiRequest<TenderComparison>(`/api/officer/tenders/${tenderId}/comparison`, {
    headers: authHeaders(token),
  });
}
