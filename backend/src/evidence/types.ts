import type { ComplianceReasonCode, ComplianceStatus } from "../compliance/types";

export type EvidenceFindingInput = {
  requirementName: string;
  tenderClause: string;
  verificationMethod: string;
  ruleType: string;
  status: ComplianceStatus;
  reasonCode: ComplianceReasonCode | string;
  application: {
    gstin: string;
    pan: string;
    oem: string;
    udyam: string;
  };
  documentNames: string[];
  verification: {
    status: string;
    method: string;
    summary: string;
    data: Record<string, unknown>;
  } | null;
  entityResults: Array<{
    field: string;
    sourceA: string;
    valueA: string;
    sourceB: string;
    valueB: string;
    classification: string;
  }>;
};

export type EvidenceFindingDraft = {
  requirementName: string;
  tenderClause: string;
  status: ComplianceStatus;
  submittedValue: string;
  verifiedValue: string;
  evidenceSources: string;
  reasoning: string;
};

export type StoredEvidenceFinding = EvidenceFindingDraft & {
  id: number;
  applicationId: number;
  requirementId: number;
  generatedAt: string;
};
