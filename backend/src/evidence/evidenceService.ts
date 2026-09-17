import type { PublicUser } from "../auth/types";
import { listOwnedCompliance, runOwnedCompliance } from "../compliance/complianceService";
import { listDocumentsForApplication } from "../documents/documentRepository";
import { listEntityResolutionResults } from "../entityResolution/entityResolutionRepository";
import { resolveOwnedApplication } from "../verification/verificationService";
import { listVerificationResults } from "../verification/verificationRepository";
import { buildEvidenceFinding } from "./buildFinding";
import { listEvidenceFindings, replaceEvidenceFindings } from "./evidenceRepository";
import type { StoredEvidenceFinding } from "./types";

export function listOwnedEvidence(
  user: PublicUser,
  applicationId: number
): StoredEvidenceFinding[] | "forbidden" | "missing" {
  if (user.role !== "bidder" && user.role !== "officer") {
    return "forbidden";
  }

  const application = resolveOwnedApplication(user, applicationId);
  if (!application) {
    return "missing";
  }

  return listEvidenceFindings(application.id);
}

export function generateOwnedEvidence(
  user: PublicUser,
  applicationId: number
): StoredEvidenceFinding[] | "forbidden" | "missing" {
  if (user.role !== "bidder" && user.role !== "officer") {
    return "forbidden";
  }

  const application = resolveOwnedApplication(user, applicationId);
  if (!application) {
    return "missing";
  }

  let compliance = listOwnedCompliance(user, applicationId);
  if (compliance === "forbidden" || compliance === "missing") {
    return compliance;
  }
  if (compliance.length === 0) {
    compliance = runOwnedCompliance(user, applicationId);
    if (compliance === "forbidden" || compliance === "missing") {
      return compliance;
    }
  }

  const documents = listDocumentsForApplication(application.id);
  const verifications = listVerificationResults(application.id);
  const entities = listEntityResolutionResults(application.id);

  const findings = compliance
    .filter((result) => result.status !== "PASS")
    .map((result) => {
      const verification = verifications.find((item) => item.requirementId === result.requirementId) ?? null;
      const documentNames = documents
        .filter((document) => document.requirementId === result.requirementId)
        .map((document) => document.originalFilename);

      const draft = buildEvidenceFinding({
        requirementName: result.requirementName,
        tenderClause: result.tenderClause,
        verificationMethod: result.verificationMethod,
        ruleType: result.ruleType,
        status: result.status,
        reasonCode: result.reasonCode,
        application: {
          gstin: application.gstin,
          pan: application.pan,
          oem: application.oem,
          udyam: application.udyam,
        },
        documentNames,
        verification: verification
          ? {
              status: verification.status,
              method: verification.method,
              summary: verification.summary,
              data: verification.data,
            }
          : null,
        entityResults: entities.map((item) => ({
          field: item.field,
          sourceA: item.sourceA,
          valueA: item.valueA,
          sourceB: item.sourceB,
          valueB: item.valueB,
          classification: item.classification,
        })),
      });

      return { ...draft, requirementId: result.requirementId };
    });

  return replaceEvidenceFindings(application.id, findings);
}
