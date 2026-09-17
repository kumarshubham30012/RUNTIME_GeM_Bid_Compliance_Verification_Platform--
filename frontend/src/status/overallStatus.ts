import type { ComplianceResult, ComplianceStatus } from "../api/compliance.ts";

export type OverallBidderStatus = "QUALIFIED" | "NEEDS_MORE_WORK" | "UNDER_REVIEW";

export type OverallStatusResult = {
  status: OverallBidderStatus;
  explanation: string;
  counts: Record<ComplianceStatus, number>;
};

const EMPTY_COUNTS: Record<ComplianceStatus, number> = {
  PASS: 0,
  FAIL: 0,
  REVIEW: 0,
  NOT_APPLICABLE: 0,
  PENDING: 0,
};

export function deriveOverallBidderStatus(results: ComplianceResult[]): OverallStatusResult {
  const counts = { ...EMPTY_COUNTS };
  for (const result of results) {
    counts[result.status] += 1;
  }

  const applicable = results.filter((result) => result.status !== "NOT_APPLICABLE");

  if (results.length === 0) {
    return {
      status: "UNDER_REVIEW",
      explanation: "No compliance results are stored yet. Run a compliance check to evaluate this application.",
      counts,
    };
  }

  if (applicable.length === 0) {
    return {
      status: "UNDER_REVIEW",
      explanation: "No applicable requirements were evaluated, so this application is not qualified yet.",
      counts,
    };
  }

  const hasFail = applicable.some((result) => result.status === "FAIL");
  const hasRequiredGap = applicable.some(
    (result) =>
      result.mandatory &&
      (result.status === "PENDING" || result.reasonCode === "REQUIRED_DOCUMENT_MISSING")
  );

  if (hasFail || hasRequiredGap) {
    return {
      status: "NEEDS_MORE_WORK",
      explanation: hasFail
        ? "At least one requirement failed. Review the compliance results and evidence findings, then update the application."
        : "Required evidence is still missing. Submit the outstanding documents or complete sandbox verification.",
      counts,
    };
  }

  if (applicable.some((result) => result.status === "REVIEW" || result.status === "PENDING")) {
    return {
      status: "UNDER_REVIEW",
      explanation: "Some requirements still need officer review or are waiting on evidence. This is not a pass or fail decision.",
      counts,
    };
  }

  return {
    status: "QUALIFIED",
    explanation: "Every applicable requirement passed the deterministic compliance rules.",
    counts,
  };
}
