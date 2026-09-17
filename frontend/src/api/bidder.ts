import { apiRequest } from "./client.ts";
import type { TenderStatus } from "./tenders.ts";

export type ApplicationStatus = "DRAFT" | "SUBMITTED";

export type BidderTender = {
  id: number;
  title: string;
  department: string;
  openingDate: string;
  closingDate: string;
  status: TenderStatus;
  applicationStatus: ApplicationStatus | null;
  applicationId: number | null;
};

export type ApplicationDocument = {
  id: number;
  requirementId: number;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
};

export type BidderRequirement = {
  id: number;
  name: string;
  tenderClause: string;
  mandatory: boolean;
  verificationMethod: string;
  ruleType: string;
  documentUploaded?: boolean;
  documents?: ApplicationDocument[];
};

export type Application = {
  id: number;
  tenderId: number;
  bidderUserId: number;
  status: ApplicationStatus;
  gstin: string;
  pan: string;
  oem: string;
  udyam?: string;
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

export type SubmissionStatus = {
  canSubmit: boolean;
  missingMandatoryRequirements: Array<{ id: number; name: string }>;
  applicationStatus: ApplicationStatus;
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
  input: { gstin: string; pan: string; oem: string; udyam?: string }
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

export async function getApplicationRequirements(
  token: string,
  applicationId: number
): Promise<BidderRequirement[]> {
  const result = await apiRequest<{ requirements: BidderRequirement[] }>(
    `/api/bidder/applications/${applicationId}/requirements`,
    { headers: authHeaders(token) }
  );
  return result.requirements;
}

export async function getSubmissionStatus(
  token: string,
  applicationId: number
): Promise<SubmissionStatus> {
  return apiRequest(`/api/bidder/applications/${applicationId}/submission-status`, {
    headers: authHeaders(token),
  });
}

export async function uploadApplicationDocument(
  token: string,
  applicationId: number,
  requirementId: number,
  file: File
): Promise<ApplicationDocument> {
  const formData = new FormData();
  formData.append("requirementId", String(requirementId));
  formData.append("file", file);

  const result = await apiRequest<{ document: ApplicationDocument }>(
    `/api/bidder/applications/${applicationId}/documents`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: formData,
    }
  );
  return result.document;
}

export async function deleteApplicationDocument(
  token: string,
  applicationId: number,
  documentId: number
): Promise<void> {
  await apiRequest(`/api/bidder/applications/${applicationId}/documents/${documentId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export async function submitApplication(token: string, applicationId: number): Promise<Application> {
  const result = await apiRequest<{ application: Application }>(
    `/api/bidder/applications/${applicationId}/submit`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
  return result.application;
}
