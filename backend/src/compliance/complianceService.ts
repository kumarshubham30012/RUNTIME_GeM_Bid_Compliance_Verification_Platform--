import type { PublicUser } from "../auth/types";
import { listDocumentsForApplication } from "../documents/documentRepository";
import { listEntityResolutionResults } from "../entityResolution/entityResolutionRepository";
import { listRequirementsForTender } from "../requirements/requirementRepository";
import { listVerificationResults } from "../verification/verificationRepository";
import { resolveOwnedApplication } from "../verification/verificationService";
import { evaluateRequirement } from "./rules";
import { listComplianceResults, upsertComplianceResults } from "./complianceRepository";
import type { StoredComplianceResult } from "./types";

function applicationUsesSandbox(applicationId: number): boolean {
  return listVerificationResults(applicationId).some((result) => result.environment === "SANDBOX");
}

export function listOwnedCompliance(
  user: PublicUser,
  applicationId: number
): StoredComplianceResult[] | "forbidden" | "missing" {
  if (user.role !== "bidder" && user.role !== "officer") {
    return "forbidden";
  }

  const application = resolveOwnedApplication(user, applicationId);
  if (!application) {
    return "missing";
  }

  return listComplianceResults(application.id, applicationUsesSandbox(application.id));
}

export function runOwnedCompliance(
  user: PublicUser,
  applicationId: number
): StoredComplianceResult[] | "forbidden" | "missing" {
  if (user.role !== "bidder" && user.role !== "officer") {
    return "forbidden";
  }

  const application = resolveOwnedApplication(user, applicationId);
  if (!application) {
    return "missing";
  }

  const requirements = listRequirementsForTender(application.tenderId);
  const documents = listDocumentsForApplication(application.id);
  const verifications = listVerificationResults(application.id);
  const entities = listEntityResolutionResults(application.id);
  const sandbox = verifications.some((result) => result.environment === "SANDBOX");

  const evaluated = requirements.map((requirement) => {
    const verification = verifications.find((result) => result.requirementId === requirement.id) ?? null;
    const output = evaluateRequirement({
      requirement: {
        id: requirement.id,
        name: requirement.name,
        tenderClause: requirement.tenderClause,
        mandatory: requirement.mandatory,
        verificationMethod: requirement.verificationMethod,
        ruleType: requirement.ruleType,
      },
      application: {
        gstin: application.gstin,
        pan: application.pan,
        oem: application.oem,
        udyam: application.udyam,
      },
      verificationResult: verification
        ? { status: verification.status, method: verification.method, data: verification.data }
        : null,
      entityResolutionResults: entities.map((item) => ({
        field: item.field,
        sourceA: item.sourceA,
        sourceB: item.sourceB,
        classification: item.classification,
      })),
      documentCount: documents.filter((document) => document.requirementId === requirement.id).length,
    });

    return {
      requirementId: requirement.id,
      status: output.status,
      reasonCode: output.reasonCode,
    };
  });

  return upsertComplianceResults(application.id, evaluated, sandbox);
}
