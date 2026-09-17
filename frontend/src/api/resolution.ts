import { apiRequest } from "./client.ts";

export type ResolutionStatus = "OPEN" | "CLARIFICATION_REQUESTED" | "RESOLVED";

export type ResolutionHistoryEntry = {
  id: number;
  action: "REQUEST_CLARIFICATION" | "MARK_RESOLVED";
  previousStatus: ResolutionStatus;
  newStatus: ResolutionStatus;
  officerUserId: number;
  createdAt: string;
};

export type FindingResolution = {
  findingId: number;
  requirementName: string;
  tenderClause: string;
  complianceStatus: string;
  resolutionStatus: ResolutionStatus;
  guidance: {
    whatHappened: string;
    whyIssue: string;
    evidenceUsed: string;
    nextVerify: string;
  };
  history: ResolutionHistoryEntry[];
};

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function listResolutions(
  token: string,
  applicationId: number
): Promise<FindingResolution[]> {
  const result = await apiRequest<{ items: FindingResolution[] }>(
    `/api/officer/applications/${applicationId}/resolutions`,
    { headers: authHeaders(token) }
  );
  return result.items;
}

export async function requestClarification(
  token: string,
  applicationId: number,
  findingId: number
): Promise<FindingResolution[]> {
  const result = await apiRequest<{ items: FindingResolution[] }>(
    `/api/officer/applications/${applicationId}/resolutions/${findingId}/clarify`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
  return result.items;
}

export async function markResolved(
  token: string,
  applicationId: number,
  findingId: number
): Promise<FindingResolution[]> {
  const result = await apiRequest<{ items: FindingResolution[] }>(
    `/api/officer/applications/${applicationId}/resolutions/${findingId}/resolve`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
  return result.items;
}
