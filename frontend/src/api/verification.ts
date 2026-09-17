import { apiRequest } from "./client.ts";

export type VerificationStatus = "VERIFIED" | "NOT_FOUND" | "INSUFFICIENT_DATA" | "MANUAL_REVIEW";

export type VerificationResult = {
  id: number;
  applicationId: number;
  requirementId: number;
  method: string;
  provider: string;
  environment: "SANDBOX";
  status: VerificationStatus;
  checkedAt: string;
  summary: string;
  data: Record<string, unknown>;
};

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function listVerificationResults(
  token: string,
  applicationId: number
): Promise<VerificationResult[]> {
  const result = await apiRequest<{ results: VerificationResult[] }>(
    `/api/verification/applications/${applicationId}`,
    { headers: authHeaders(token) }
  );
  return result.results;
}

export async function runVerification(
  token: string,
  applicationId: number,
  requirementId: number
): Promise<VerificationResult> {
  const result = await apiRequest<{ result: VerificationResult }>(
    `/api/verification/applications/${applicationId}`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ requirementId }),
    }
  );
  return result.result;
}
