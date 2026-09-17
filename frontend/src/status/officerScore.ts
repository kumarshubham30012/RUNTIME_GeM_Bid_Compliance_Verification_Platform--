import type { ComplianceResult, ComplianceStatus } from "../api/compliance.ts";

export type OfficerRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type OfficerScoreReport = {
  score: number | null;
  earnedPoints: number;
  applicableCount: number;
  failCount: number;
  risk: OfficerRiskLevel;
  riskReasons: string[];
  counts: Record<ComplianceStatus, number>;
};

const EMPTY_COUNTS: Record<ComplianceStatus, number> = {
  PASS: 0,
  FAIL: 0,
  REVIEW: 0,
  NOT_APPLICABLE: 0,
  PENDING: 0,
};

function pointsFor(status: ComplianceStatus): number | null {
  if (status === "NOT_APPLICABLE") {
    return null;
  }
  if (status === "PASS") {
    return 1;
  }
  if (status === "REVIEW") {
    return 0.5;
  }
  return 0;
}

export function deriveOfficerScore(results: ComplianceResult[]): OfficerScoreReport {
  const counts = { ...EMPTY_COUNTS };
  for (const result of results) {
    counts[result.status] += 1;
  }

  let earnedPoints = 0;
  let applicableCount = 0;
  for (const result of results) {
    const points = pointsFor(result.status);
    if (points === null) {
      continue;
    }
    applicableCount += 1;
    earnedPoints += points;
  }

  const failCount = counts.FAIL;
  const score =
    applicableCount === 0 ? null : Math.round((earnedPoints / applicableCount) * 1000) / 10;

  const riskReasons: string[] = [];
  if (results.length === 0) {
    riskReasons.push("No compliance results are stored for this application.");
  }
  if (applicableCount === 0 && results.length > 0) {
    riskReasons.push("Every stored requirement is NOT_APPLICABLE, so no score could be calculated.");
  }
  if (score !== null && score < 60) {
    riskReasons.push(`Score is ${score}, which is below 60.`);
  }
  if (failCount >= 2) {
    riskReasons.push(`${failCount} requirements have status FAIL.`);
  }
  for (const result of results) {
    if (result.status === "FAIL") {
      riskReasons.push(`FAIL: ${result.requirementName} (${result.reasonCode}).`);
    }
    if (result.status === "PENDING") {
      riskReasons.push(`PENDING: ${result.requirementName} (${result.reasonCode}).`);
    }
    if (result.status === "REVIEW") {
      riskReasons.push(`REVIEW: ${result.requirementName} (${result.reasonCode}).`);
    }
  }

  let risk: OfficerRiskLevel = "HIGH";
  if (score !== null && score >= 80 && failCount === 0) {
    risk = "LOW";
  } else if (score !== null && score >= 60 && failCount <= 1) {
    risk = "MEDIUM";
  }

  if (score === null) {
    risk = "HIGH";
  }

  return {
    score,
    earnedPoints,
    applicableCount,
    failCount,
    risk,
    riskReasons,
    counts,
  };
}
