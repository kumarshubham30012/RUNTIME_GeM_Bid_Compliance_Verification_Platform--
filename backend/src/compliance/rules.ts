import { compareValues } from "../entityResolution/compare";
import type { EntityClassification, EntityField } from "../entityResolution/types";
import { isRuleType, isVerificationMethod } from "../requirements/constants";
import type {
  ComplianceEntityInput,
  ComplianceReasonCode,
  ComplianceStatus,
  EvaluateRequirementInput,
  EvaluateRequirementOutput,
} from "./types";

function decision(status: ComplianceStatus, reasonCode: ComplianceReasonCode): EvaluateRequirementOutput {
  return { status, reasonCode };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function relevantClassifications(
  method: string,
  results: ComplianceEntityInput[]
): EntityClassification[] {
  const source =
    method === "GST"
      ? "GST_VERIFICATION"
      : method === "UDYAM"
        ? "UDYAM_VERIFICATION"
        : method === "OEM"
          ? "OEM_VERIFICATION"
          : null;
  const field: EntityField | null =
    method === "GST" ? "gstin" : method === "UDYAM" ? "udyam" : method === "OEM" ? "oem" : null;

  return results
    .filter((result) => {
      const involvesSource = source
        ? result.sourceA === source || result.sourceB === source
        : false;
      const involvesField = field ? result.field === field || result.field === "company_name" : false;
      return involvesSource && involvesField;
    })
    .map((result) => result.classification as EntityClassification);
}

function evaluateExists(input: EvaluateRequirementInput): EvaluateRequirementOutput {
  const method = input.requirement.verificationMethod;

  if (method === "DOCUMENT") {
    return input.documentCount > 0
      ? decision("PASS", "REQUIRED_DOCUMENT_PRESENT")
      : decision("PENDING", "REQUIRED_DOCUMENT_MISSING");
  }

  if (method === "MANUAL") {
    return decision("REVIEW", "MANUAL_REVIEW_REQUIRED");
  }

  if (!input.verificationResult) {
    return decision("PENDING", "VERIFICATION_PENDING");
  }

  if (input.verificationResult.status === "VERIFIED") {
    return decision("PASS", "VERIFICATION_PRESENT");
  }
  if (input.verificationResult.status === "NOT_FOUND") {
    return decision("PENDING", "VERIFICATION_NOT_FOUND");
  }
  if (input.verificationResult.status === "INSUFFICIENT_DATA") {
    return decision("PENDING", "VERIFICATION_INSUFFICIENT_DATA");
  }
  if (input.verificationResult.status === "MANUAL_REVIEW") {
    return decision("REVIEW", "MANUAL_REVIEW_REQUIRED");
  }

  return decision("PENDING", "VERIFICATION_PENDING");
}

function applicationValue(method: string, application: EvaluateRequirementInput["application"]): string {
  if (method === "GST") {
    return application.gstin;
  }
  if (method === "UDYAM") {
    return application.udyam;
  }
  if (method === "OEM") {
    return application.oem;
  }
  if (method === "MANUAL") {
    return "";
  }
  return "";
}

function verificationCompareValue(method: string, data: Record<string, unknown>): string {
  if (method === "GST") {
    return asString(data.gstin);
  }
  if (method === "UDYAM") {
    return asString(data.udyamNumber);
  }
  if (method === "OEM") {
    return asString(data.oemName);
  }
  return "";
}

function evaluateExactMatch(input: EvaluateRequirementInput): EvaluateRequirementOutput {
  if (input.requirement.verificationMethod === "MANUAL") {
    return decision("REVIEW", "MANUAL_REVIEW_REQUIRED");
  }
  if (input.requirement.verificationMethod === "DOCUMENT") {
    return decision("PENDING", "ENTITY_INSUFFICIENT_EVIDENCE");
  }

  if (!input.verificationResult) {
    return decision("PENDING", "VERIFICATION_PENDING");
  }
  if (input.verificationResult.status === "INSUFFICIENT_DATA") {
    return decision("PENDING", "VERIFICATION_INSUFFICIENT_DATA");
  }
  if (input.verificationResult.status === "NOT_FOUND") {
    return decision("PENDING", "VERIFICATION_NOT_FOUND");
  }
  if (input.verificationResult.status === "MANUAL_REVIEW") {
    return decision("REVIEW", "MANUAL_REVIEW_REQUIRED");
  }
  if (input.verificationResult.status !== "VERIFIED") {
    return decision("PENDING", "VERIFICATION_PENDING");
  }

  const method = input.requirement.verificationMethod;
  const field = method === "OEM" ? "oem" : method === "UDYAM" ? "udyam" : "gstin";
  const left = applicationValue(method, input.application);
  const right = verificationCompareValue(method, input.verificationResult.data);
  const compared = compareValues(field, "APPLICATION", left, "GST_VERIFICATION", right, true);

  if (compared.classification === "INSUFFICIENT_EVIDENCE") {
    return decision("PENDING", "ENTITY_INSUFFICIENT_EVIDENCE");
  }
  if (compared.classification === "EXACT_MATCH") {
    return decision("PASS", "EXACT_VALUE_MATCH");
  }
  if (compared.classification === "LIKELY_SAME_ENTITY") {
    return decision("REVIEW", "ENTITY_LIKELY_SAME");
  }
  if (compared.classification === "POSSIBLE_MISMATCH") {
    return decision("REVIEW", "ENTITY_POSSIBLE_MISMATCH");
  }
  return decision("FAIL", "EXACT_VALUE_MISMATCH");
}

function evaluateMatch(input: EvaluateRequirementInput): EvaluateRequirementOutput {
  if (input.requirement.verificationMethod === "MANUAL") {
    return decision("REVIEW", "MANUAL_REVIEW_REQUIRED");
  }
  if (input.requirement.verificationMethod === "DOCUMENT") {
    return decision("PENDING", "ENTITY_INSUFFICIENT_EVIDENCE");
  }

  if (!input.verificationResult) {
    return decision("PENDING", "VERIFICATION_PENDING");
  }
  if (input.verificationResult.status === "INSUFFICIENT_DATA") {
    return decision("PENDING", "VERIFICATION_INSUFFICIENT_DATA");
  }
  if (input.verificationResult.status === "NOT_FOUND") {
    return decision("PENDING", "VERIFICATION_NOT_FOUND");
  }
  if (input.verificationResult.status === "MANUAL_REVIEW") {
    return decision("REVIEW", "MANUAL_REVIEW_REQUIRED");
  }

  const classifications = relevantClassifications(
    input.requirement.verificationMethod,
    input.entityResolutionResults
  );

  if (classifications.includes("STRONG_MISMATCH")) {
    return decision("FAIL", "ENTITY_STRONG_MISMATCH");
  }
  if (classifications.includes("POSSIBLE_MISMATCH")) {
    return decision("REVIEW", "ENTITY_POSSIBLE_MISMATCH");
  }
  if (classifications.includes("LIKELY_SAME_ENTITY")) {
    return decision("REVIEW", "ENTITY_LIKELY_SAME");
  }
  if (classifications.includes("EXACT_MATCH")) {
    return decision("PASS", "ENTITY_EXACT_MATCH");
  }
  if (classifications.includes("INSUFFICIENT_EVIDENCE") || classifications.length === 0) {
    return decision("PENDING", "ENTITY_INSUFFICIENT_EVIDENCE");
  }

  return decision("PENDING", "ENTITY_INSUFFICIENT_EVIDENCE");
}

export function evaluateRequirement(input: EvaluateRequirementInput): EvaluateRequirementOutput {
  if (!isVerificationMethod(input.requirement.verificationMethod)) {
    return decision("REVIEW", "UNSUPPORTED_VERIFICATION_METHOD");
  }

  if (!isRuleType(input.requirement.ruleType)) {
    return decision("REVIEW", "UNSUPPORTED_RULE_TYPE");
  }

  if (input.requirement.ruleType === "MANUAL_REVIEW") {
    return decision("REVIEW", "MANUAL_REVIEW_REQUIRED");
  }
  if (input.requirement.ruleType === "EXISTS") {
    return evaluateExists(input);
  }
  if (input.requirement.ruleType === "EXACT_MATCH") {
    return evaluateExactMatch(input);
  }
  return evaluateMatch(input);
}
