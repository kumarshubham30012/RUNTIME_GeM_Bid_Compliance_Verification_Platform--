export const COMPLIANCE_STATUSES = [
  "PASS",
  "FAIL",
  "REVIEW",
  "NOT_APPLICABLE",
  "PENDING",
] as const;

export type ComplianceStatus = (typeof COMPLIANCE_STATUSES)[number];

export type ComplianceReasonCode =
  | "REQUIRED_DOCUMENT_PRESENT"
  | "REQUIRED_DOCUMENT_MISSING"
  | "VERIFICATION_PENDING"
  | "VERIFICATION_NOT_FOUND"
  | "VERIFICATION_INSUFFICIENT_DATA"
  | "VERIFICATION_PRESENT"
  | "EXACT_VALUE_MATCH"
  | "EXACT_VALUE_MISMATCH"
  | "ENTITY_EXACT_MATCH"
  | "ENTITY_LIKELY_SAME"
  | "ENTITY_POSSIBLE_MISMATCH"
  | "ENTITY_STRONG_MISMATCH"
  | "ENTITY_INSUFFICIENT_EVIDENCE"
  | "MANUAL_REVIEW_REQUIRED"
  | "UNSUPPORTED_RULE_TYPE"
  | "UNSUPPORTED_VERIFICATION_METHOD";

export type ComplianceRequirementInput = {
  id: number;
  name: string;
  tenderClause: string;
  mandatory: boolean;
  verificationMethod: string;
  ruleType: string;
};

export type ComplianceVerificationInput = {
  status: string;
  method: string;
  data: Record<string, unknown>;
} | null;

export type ComplianceEntityInput = {
  field: string;
  sourceA: string;
  sourceB: string;
  classification: string;
};

export type EvaluateRequirementInput = {
  requirement: ComplianceRequirementInput;
  application: {
    gstin: string;
    pan: string;
    oem: string;
    udyam: string;
  };
  verificationResult: ComplianceVerificationInput;
  entityResolutionResults: ComplianceEntityInput[];
  documentCount: number;
};

export type EvaluateRequirementOutput = {
  status: ComplianceStatus;
  reasonCode: ComplianceReasonCode;
};

export type StoredComplianceResult = EvaluateRequirementOutput & {
  id: number;
  applicationId: number;
  requirementId: number;
  requirementName: string;
  tenderClause: string;
  mandatory: boolean;
  verificationMethod: string;
  ruleType: string;
  sandbox: boolean;
  evaluatedAt: string;
};
