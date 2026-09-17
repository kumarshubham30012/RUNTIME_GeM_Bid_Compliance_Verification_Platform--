import { apiRequest } from "./client.ts";

export type EntityClassification =
  | "EXACT_MATCH"
  | "LIKELY_SAME_ENTITY"
  | "POSSIBLE_MISMATCH"
  | "STRONG_MISMATCH"
  | "INSUFFICIENT_EVIDENCE";

export type EntityResolutionResult = {
  id: number;
  applicationId: number;
  field: string;
  sourceA: string;
  valueA: string;
  sourceB: string;
  valueB: string;
  classification: EntityClassification;
  confidence: number;
  reasoning: string;
  sandbox: boolean;
};

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function listEntityResolution(
  token: string,
  applicationId: number
): Promise<EntityResolutionResult[]> {
  const result = await apiRequest<{ results: EntityResolutionResult[] }>(
    `/api/entity-resolution/applications/${applicationId}`,
    { headers: authHeaders(token) }
  );
  return result.results;
}

export async function runEntityResolution(
  token: string,
  applicationId: number
): Promise<EntityResolutionResult[]> {
  const result = await apiRequest<{ results: EntityResolutionResult[] }>(
    `/api/entity-resolution/applications/${applicationId}/run`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  );
  return result.results;
}
