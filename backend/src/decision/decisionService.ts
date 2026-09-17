import type { PublicUser } from "../auth/types";
import { findApplicationForOfficer } from "../applications/officerApplicationRepository";
import { listAuditEvents } from "./auditRepository";
import { getOfficerDecision, upsertOfficerDecision } from "./decisionRepository";
import type { AuditEvent, OfficerDecisionType, StoredOfficerDecision } from "./types";

export function getOwnedOfficerDecision(
  user: PublicUser,
  applicationId: number
): StoredOfficerDecision | null | "forbidden" | "missing" {
  if (user.role !== "officer") {
    return "forbidden";
  }

  const detail = findApplicationForOfficer(applicationId, user.id);
  if (!detail) {
    return "missing";
  }

  return getOfficerDecision(detail.application.id);
}

export function saveOwnedOfficerDecision(
  user: PublicUser,
  applicationId: number,
  decision: OfficerDecisionType,
  reason: string
): StoredOfficerDecision | "forbidden" | "missing" {
  if (user.role !== "officer") {
    return "forbidden";
  }

  const detail = findApplicationForOfficer(applicationId, user.id);
  if (!detail) {
    return "missing";
  }

  return upsertOfficerDecision({
    applicationId: detail.application.id,
    officerUserId: user.id,
    decision,
    reason,
  });
}

export function getOwnedAuditTrail(
  user: PublicUser,
  applicationId: number
): AuditEvent[] | "forbidden" | "missing" {
  if (user.role !== "officer") {
    return "forbidden";
  }

  const detail = findApplicationForOfficer(applicationId, user.id);
  if (!detail) {
    return "missing";
  }

  return listAuditEvents(detail.application.id);
}
