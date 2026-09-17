import { listRequirementsForTender } from "../requirements/requirementRepository";
import { listDocumentsForApplication } from "./documentRepository";

export type MissingMandatoryRequirement = {
  id: number;
  name: string;
};

export type SubmissionStatus = {
  canSubmit: boolean;
  missingMandatoryRequirements: MissingMandatoryRequirement[];
};

export function getSubmissionStatus(applicationId: number, tenderId: number): SubmissionStatus {
  const requirements = listRequirementsForTender(tenderId);
  const documents = listDocumentsForApplication(applicationId);
  const uploadedRequirementIds = new Set(documents.map((document) => document.requirementId));

  const missingMandatoryRequirements = requirements
    .filter((requirement) => requirement.mandatory && !uploadedRequirementIds.has(requirement.id))
    .map((requirement) => ({ id: requirement.id, name: requirement.name }));

  return {
    canSubmit: missingMandatoryRequirements.length === 0,
    missingMandatoryRequirements,
  };
}
