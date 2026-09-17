import { apiRequest } from "./client.ts";

export const VERIFICATION_METHODS = ["DOCUMENT", "GST", "UDYAM", "OEM", "MANUAL"] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

export const RULE_TYPES = ["EXISTS", "EXACT_MATCH", "MATCH", "MANUAL_REVIEW"] as const;
export type RuleType = (typeof RULE_TYPES)[number];

export type Requirement = {
  id: number;
  tenderId: number;
  name: string;
  tenderClause: string;
  mandatory: boolean;
  verificationMethod: VerificationMethod;
  ruleType: RuleType;
  createdAt: string;
  updatedAt: string;
};

export type RequirementInput = {
  name: string;
  tenderClause: string;
  mandatory: boolean;
  verificationMethod: VerificationMethod;
  ruleType: RuleType;
};

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function listRequirements(token: string, tenderId: number): Promise<Requirement[]> {
  const result = await apiRequest<{ requirements: Requirement[] }>(
    `/api/tenders/${tenderId}/requirements`,
    { headers: authHeaders(token) }
  );
  return result.requirements;
}

export async function createRequirement(
  token: string,
  tenderId: number,
  input: RequirementInput
): Promise<Requirement> {
  const result = await apiRequest<{ requirement: Requirement }>(
    `/api/tenders/${tenderId}/requirements`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(input),
    }
  );
  return result.requirement;
}

export async function updateRequirement(
  token: string,
  tenderId: number,
  requirementId: number,
  input: RequirementInput
): Promise<Requirement> {
  const result = await apiRequest<{ requirement: Requirement }>(
    `/api/tenders/${tenderId}/requirements/${requirementId}`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify(input),
    }
  );
  return result.requirement;
}

export async function deleteRequirement(
  token: string,
  tenderId: number,
  requirementId: number
): Promise<void> {
  await apiRequest<{ ok: boolean }>(`/api/tenders/${tenderId}/requirements/${requirementId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}
