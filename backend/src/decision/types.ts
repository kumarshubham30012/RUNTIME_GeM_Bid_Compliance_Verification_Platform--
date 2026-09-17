export const OFFICER_DECISIONS = [
  "APPROVE",
  "REJECT",
  "REQUEST_CLARIFICATION",
  "KEEP_UNDER_REVIEW",
] as const;

export type OfficerDecisionType = (typeof OFFICER_DECISIONS)[number];

export function isOfficerDecision(value: unknown): value is OfficerDecisionType {
  return typeof value === "string" && (OFFICER_DECISIONS as readonly string[]).includes(value);
}

export type StoredOfficerDecision = {
  applicationId: number;
  officerUserId: number;
  decision: OfficerDecisionType;
  reason: string;
  decidedAt: string;
};

export type AuditEvent = {
  eventType: string;
  description: string;
  actorUserId: number | null;
  timestamp: string;
  entityId: number | null;
};
