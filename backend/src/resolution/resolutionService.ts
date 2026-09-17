import type { PublicUser } from "../auth/types";
import { findApplicationForOfficer } from "../applications/officerApplicationRepository";
import { listEvidenceFindings } from "../evidence/evidenceRepository";
import { applyResolutionAction, getResolutionStatus, listResolutionHistory } from "./resolutionRepository";
import { buildResolutionGuidance } from "./types";
import type { FindingResolutionView, ResolutionAction, ResolutionStatus } from "./types";

function nextStatus(action: ResolutionAction): ResolutionStatus {
  return action === "REQUEST_CLARIFICATION" ? "CLARIFICATION_REQUESTED" : "RESOLVED";
}

export function listOwnedResolutions(
  user: PublicUser,
  applicationId: number
): FindingResolutionView[] | "forbidden" | "missing" {
  if (user.role !== "officer") {
    return "forbidden";
  }

  const detail = findApplicationForOfficer(applicationId, user.id);
  if (!detail) {
    return "missing";
  }

  return listEvidenceFindings(detail.application.id).map((finding) => ({
    findingId: finding.id,
    requirementName: finding.requirementName,
    tenderClause: finding.tenderClause,
    complianceStatus: finding.status,
    resolutionStatus: getResolutionStatus(finding.id),
    guidance: buildResolutionGuidance(finding),
    history: listResolutionHistory(finding.id),
  }));
}

export function actOnOwnedFinding(
  user: PublicUser,
  applicationId: number,
  findingId: number,
  action: ResolutionAction
): FindingResolutionView[] | "forbidden" | "missing" | "not_found" {
  if (user.role !== "officer") {
    return "forbidden";
  }

  const detail = findApplicationForOfficer(applicationId, user.id);
  if (!detail) {
    return "missing";
  }

  const finding = listEvidenceFindings(detail.application.id).find((item) => item.id === findingId);
  if (!finding) {
    return "not_found";
  }

  applyResolutionAction(finding.id, detail.application.id, user.id, action, nextStatus(action));
  return listOwnedResolutions(user, applicationId);
}
