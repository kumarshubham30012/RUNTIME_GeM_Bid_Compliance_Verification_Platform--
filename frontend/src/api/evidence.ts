import { apiRequest } from "./client.ts";
import type { ComplianceStatus } from "./compliance.ts";

export type EvidenceFinding = {
  id: number;
  applicationId: number;
  requirementId: number;
  requirementName: string;
  tenderClause: string;
  status: ComplianceStatus;
  submittedValue: string;
  verifiedValue: string;
  evidenceSources: string;
  reasoning: string;
  generatedAt: string;
};

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function listEvidenceFindings(
  token: string,
  applicationId: number
): Promise<EvidenceFinding[]> {
  const result = await apiRequest<{ findings: EvidenceFinding[] }>(
    `/api/evidence/applications/${applicationId}`,
    { headers: authHeaders(token) }
  );
  return result.findings;
}

export async function generateEvidenceFindings(
  token: string,
  applicationId: number
): Promise<EvidenceFinding[]> {
  const result = await apiRequest<{ findings: EvidenceFinding[] }>(
    `/api/evidence/applications/${applicationId}/generate`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
  return result.findings;
}
