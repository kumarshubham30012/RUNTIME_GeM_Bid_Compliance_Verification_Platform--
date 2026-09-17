import type { VerificationMethod } from "../requirements/constants";

export const VERIFICATION_ENVIRONMENT = "SANDBOX" as const;

export type VerificationEnvironment = typeof VERIFICATION_ENVIRONMENT;

export const VERIFICATION_STATUSES = [
  "VERIFIED",
  "NOT_FOUND",
  "INSUFFICIENT_DATA",
  "MANUAL_REVIEW",
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export type VerificationDocumentInput = {
  id: number;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
};

export type VerificationInput = {
  applicationId: number;
  requirementId: number;
  gstin: string;
  oem: string;
  udyam: string;
  documents: VerificationDocumentInput[];
};

export type VerificationResult = {
  method: VerificationMethod;
  provider: string;
  environment: VerificationEnvironment;
  status: VerificationStatus;
  checkedAt: string;
  summary: string;
  data: Record<string, unknown>;
};

export interface VerificationProvider {
  method: VerificationMethod;
  providerName: string;
  verify(input: VerificationInput): VerificationResult;
}

export function sandboxResult(input: {
  method: VerificationMethod;
  provider: string;
  status: VerificationStatus;
  summary: string;
  data?: Record<string, unknown>;
}): VerificationResult {
  return {
    method: input.method,
    provider: input.provider,
    environment: VERIFICATION_ENVIRONMENT,
    status: input.status,
    checkedAt: new Date().toISOString(),
    summary: input.summary,
    data: input.data ?? {},
  };
}
