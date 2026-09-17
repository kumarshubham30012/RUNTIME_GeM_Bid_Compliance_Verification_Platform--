import { apiRequest } from "./client.ts";

export type ComplianceStatus = "PASS" | "FAIL" | "REVIEW" | "NOT_APPLICABLE" | "PENDING";

export type ComplianceResult = {
  id: number;
  applicationId: number;
  requirementId: number;
  status: ComplianceStatus;
  reasonCode: string;
  requirementName: string;
  tenderClause: string;
  mandatory: boolean;
  verificationMethod: string;
  ruleType: string;
  sandbox: boolean;
  evaluatedAt: string;
};

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function listComplianceResults(
  token: string,
  applicationId: number
): Promise<ComplianceResult[]> {
  const result = await apiRequest<{ results: ComplianceResult[] }>(
    `/api/compliance/applications/${applicationId}`,
    { headers: authHeaders(token) }
  );
  return result.results;
}

export async function runComplianceCheck(
  token: string,
  applicationId: number
): Promise<ComplianceResult[]> {
  const result = await apiRequest<{ results: ComplianceResult[] }>(
    `/api/compliance/applications/${applicationId}/run`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
  return result.results;
}
