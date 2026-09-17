import { API_BASE_URL, ApiError, apiRequest } from "./client.ts";
import type { TenderStatus } from "./tenders.ts";

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

export type OfficerDocument = {
  id: number;
  requirementId: number;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
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
  documents: OfficerDocument[];
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

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

function reviewErrorMessage(error: ApiError): string {
  if (error.status === 401) {
    return "Authentication required. Please sign in again.";
  }
  if (error.status === 403) {
    return "You do not have permission to review applications.";
  }
  if (error.status === 404) {
    return "Application not found.";
  }
  if (error.status >= 500) {
    return "Unexpected server failure. Please try again.";
  }
  return error.message;
}

export { reviewErrorMessage };

export async function fetchOfficerApplications(token: string): Promise<OfficerApplicationListItem[]> {
  const result = await apiRequest<{ applications: OfficerApplicationListItem[] }>(
    "/api/officer/applications",
    { headers: authHeaders(token) }
  );
  return result.applications;
}

export async function fetchOfficerApplication(
  token: string,
  applicationId: number
): Promise<OfficerApplicationDetail> {
  return apiRequest(`/api/officer/applications/${applicationId}`, {
    headers: authHeaders(token),
  });
}

export async function downloadOfficerDocument(
  token: string,
  applicationId: number,
  documentId: number
): Promise<{ blob: Blob; filename: string }> {
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/api/officer/applications/${applicationId}/documents/${documentId}`,
      { headers: authHeaders(token) }
    );
  } catch {
    throw new ApiError(0, "Backend unavailable");
  }

  if (!response.ok) {
    const data: unknown = await response.json().catch(() => ({}));
    const extra = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
    const message =
      typeof extra.error === "string"
        ? extra.error
        : typeof extra.message === "string"
          ? extra.message
          : "Request failed";
    throw new ApiError(response.status, message, extra);
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const blob = await response.blob();
  return { blob, filename: match?.[1] ?? "document" };
}
