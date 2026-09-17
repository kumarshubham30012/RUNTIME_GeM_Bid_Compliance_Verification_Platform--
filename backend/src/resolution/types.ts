import type { StoredEvidenceFinding } from "../evidence/types";

export const RESOLUTION_STATUSES = ["OPEN", "CLARIFICATION_REQUESTED", "RESOLVED"] as const;
export type ResolutionStatus = (typeof RESOLUTION_STATUSES)[number];

export const RESOLUTION_ACTIONS = ["REQUEST_CLARIFICATION", "MARK_RESOLVED"] as const;
export type ResolutionAction = (typeof RESOLUTION_ACTIONS)[number];

export type ResolutionGuidance = {
  whatHappened: string;
  whyIssue: string;
  evidenceUsed: string;
  nextVerify: string;
};

export type ResolutionHistoryEntry = {
  id: number;
  action: ResolutionAction;
  previousStatus: ResolutionStatus;
  newStatus: ResolutionStatus;
  officerUserId: number;
  createdAt: string;
};

export type FindingResolutionView = {
  findingId: number;
  requirementName: string;
  tenderClause: string;
  complianceStatus: string;
  resolutionStatus: ResolutionStatus;
  guidance: ResolutionGuidance;
  history: ResolutionHistoryEntry[];
};

export function buildResolutionGuidance(finding: StoredEvidenceFinding): ResolutionGuidance {
  const evidenceUsed = [
    finding.evidenceSources,
    finding.submittedValue ? `Submitted value: ${finding.submittedValue}` : "",
    finding.verifiedValue ? `Verified value: ${finding.verifiedValue}` : "",
  ]
    .filter((part) => part.length > 0)
    .join(" | ");

  return {
    whatHappened: finding.reasoning,
    whyIssue: whyIssue(finding),
    evidenceUsed: evidenceUsed || "No stored evidence sources are available for this finding.",
    nextVerify: nextVerify(finding),
  };
}

function whyIssue(finding: StoredEvidenceFinding): string {
  if (finding.status === "FAIL") {
    return `Compliance status is FAIL for "${finding.requirementName}". The stored evidence contradicts or does not satisfy the tender clause.`;
  }
  if (finding.status === "PENDING") {
    return `Compliance status is PENDING for "${finding.requirementName}". Required evidence is not yet sufficient to finish evaluation.`;
  }
  if (finding.status === "REVIEW") {
    return `Compliance status is REVIEW for "${finding.requirementName}". A human check is required before treating this as pass or fail.`;
  }
  return `Compliance status is ${finding.status} for "${finding.requirementName}".`;
}

function nextVerify(finding: StoredEvidenceFinding): string {
  const reasoning = finding.reasoning;
  if (reasoning.includes("no document is stored")) {
    return "Confirm whether the required document was uploaded. If it is missing, request the bidder to submit it, then regenerate evidence.";
  }
  if (reasoning.includes("no sandbox verification result is stored")) {
    return "Run sandbox verification for this requirement, then regenerate evidence.";
  }
  if (reasoning.includes("NOT_FOUND")) {
    return "Confirm the submitted identifier against the application, then re-run sandbox verification. Do not treat NOT_FOUND as fraud.";
  }
  if (reasoning.includes("INSUFFICIENT_DATA")) {
    return "Check that GSTIN, OEM, Udyam, or documents needed for this requirement are stored, then re-run verification.";
  }
  if (reasoning.includes("does not match")) {
    return "Compare the stored submitted value with the stored verified value and request clarification if the application value needs correction.";
  }
  if (reasoning.includes("POSSIBLE_MISMATCH")) {
    return "Review the stored entity-resolution pair. Request clarification of the legal/OEM name rather than treating this as an automatic failure.";
  }
  if (reasoning.includes("STRONG_MISMATCH")) {
    return "Confirm the stored identifier values from the application and verification result, then request a corrected value if needed.";
  }
  if (reasoning.includes("insufficient")) {
    return "Identify which stored source is empty, collect that value, then re-run entity resolution and evidence generation.";
  }
  if (reasoning.includes("requires officer review")) {
    return "Inspect the tender clause and any stored documents for this requirement, then request clarification or mark resolved.";
  }
  if (finding.status === "PENDING") {
    return "Obtain the missing stored evidence for this requirement, re-run compliance, and regenerate evidence.";
  }
  if (finding.status === "FAIL") {
    return "Re-check the stored submitted and verified values, then request clarification or mark resolved after the officer review.";
  }
  return "Review the stored evidence listed for this finding, then request clarification or mark resolved.";
}
