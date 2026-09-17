import { apiRequest } from "./client.ts";
import type { TenderStatus } from "./tenders.ts";

export type BidderTender = {
  id: number;
  title: string;
  department: string;
  openingDate: string;
  closingDate: string;
  status: TenderStatus;
  applicationStatus: "DRAFT" | null;
  applicationId: number | null;
};

export type BidderRequirement = {
  id: number;
  name: string;
  tenderClause: string;
  mandatory: boolean;
  verificationMethod: string;
  ruleType: string;
};

export type Application = {
  id: number;
  tenderId: number;
  bidderUserId: number;
  status: "DRAFT";
  gstin: string;
  pan: string;
  oem: string;
  createdAt: string;
  updatedAt: string;
  tender: {
    id: number;
    title: string;
    department: string;
    openingDate: string;
    closingDate: string;
    status: TenderStatus;
  } | null;
};

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function listOpenTenders(token: string): Promise<BidderTender[]> {
  const result = await apiRequest<{ tenders: BidderTender[] }>("/api/bidder/tenders", {
    headers: authHeaders(token),
  });
  return result.tenders;
}

export async function getOpenTender(
  token: string,
  tenderId: number
): Promise<{ tender: BidderTender; requirements: BidderRequirement[] }> {
  return apiRequest(`/api/bidder/tenders/${tenderId}`, {
    headers: authHeaders(token),
  });
}

export async function startApplication(token: string, tenderId: number): Promise<Application> {
  const result = await apiRequest<{ application: Application }>(
    `/api/bidder/tenders/${tenderId}/application`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
  return result.application;
}

export async function getApplication(token: string, applicationId: number): Promise<Application> {
  const result = await apiRequest<{ application: Application }>(
    `/api/bidder/applications/${applicationId}`,
    { headers: authHeaders(token) }
  );
  return result.application;
}

export async function saveApplicationDraft(
  token: string,
  applicationId: number,
  input: { gstin: string; pan: string; oem: string }
): Promise<Application> {
  const result = await apiRequest<{ application: Application }>(
    `/api/bidder/applications/${applicationId}`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(input),
    }
  );
  return result.application;
}
