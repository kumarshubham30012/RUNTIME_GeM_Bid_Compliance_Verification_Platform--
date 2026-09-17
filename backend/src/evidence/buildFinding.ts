import type { EvidenceFindingDraft, EvidenceFindingInput } from "./types";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function submittedValue(input: EvidenceFindingInput): string {
  const method = input.verificationMethod;
  if (method === "DOCUMENT") {
    return input.documentNames.join(", ");
  }
  if (method === "GST") {
    return input.application.gstin.trim();
  }
  if (method === "UDYAM") {
    return input.application.udyam.trim();
  }
  if (method === "OEM") {
    return input.application.oem.trim();
  }
  return "";
}

function verifiedValue(input: EvidenceFindingInput): string {
  if (!input.verification) {
    return "";
  }
  const data = input.verification.data;
  if (input.verificationMethod === "GST") {
    return asString(data.gstin) || asString(data.legalName);
  }
  if (input.verificationMethod === "UDYAM") {
    return asString(data.udyamNumber) || asString(data.enterpriseName);
  }
  if (input.verificationMethod === "OEM") {
    return asString(data.oemName);
  }
  if (input.verificationMethod === "DOCUMENT") {
    return input.verification.status;
  }
  return input.verification.status;
}

function evidenceSources(input: EvidenceFindingInput): string {
  const parts: string[] = [];
  const submitted = submittedValue(input);
  if (input.verificationMethod === "DOCUMENT" && input.documentNames.length > 0) {
    parts.push(`DOCUMENT: ${input.documentNames.join(", ")}`);
  } else if (submitted && input.verificationMethod !== "DOCUMENT") {
    parts.push(`APPLICATION ${input.verificationMethod}: ${submitted}`);
  }

  if (input.verification) {
    const verified = verifiedValue(input);
    const detail = verified ? `: ${verified}` : ` status ${input.verification.status}`;
    parts.push(`VERIFICATION ${input.verification.method} (${input.verification.status})${detail}`);
  }

  for (const result of input.entityResults) {
    parts.push(
      `ENTITY_RESOLUTION ${result.field} ${result.sourceA}=${result.valueA || "(empty)"} vs ${result.sourceB}=${result.valueB || "(empty)"}: ${result.classification}`
    );
  }

  return parts.join(" | ");
}

function reasoning(input: EvidenceFindingInput): string {
  const submitted = submittedValue(input) || "(none stored)";
  const verified = verifiedValue(input) || "(none stored)";
  const code = input.reasonCode;

  if (code === "REQUIRED_DOCUMENT_MISSING") {
    return `Requirement "${input.requirementName}" is ${input.status} because no document is stored for this clause.`;
  }
  if (code === "VERIFICATION_PENDING") {
    return `Requirement "${input.requirementName}" is ${input.status} because no sandbox verification result is stored. Submitted value: ${submitted}.`;
  }
  if (code === "VERIFICATION_NOT_FOUND") {
    return `Requirement "${input.requirementName}" is ${input.status} because sandbox verification status is NOT_FOUND. Submitted value: ${submitted}. This is not a fraud determination.`;
  }
  if (code === "VERIFICATION_INSUFFICIENT_DATA") {
    return `Requirement "${input.requirementName}" is ${input.status} because sandbox verification status is INSUFFICIENT_DATA. Submitted value: ${submitted}.`;
  }
  if (code === "EXACT_VALUE_MISMATCH") {
    return `Requirement "${input.requirementName}" is ${input.status} because the submitted value (${submitted}) does not match the verified value (${verified}).`;
  }
  if (code === "ENTITY_POSSIBLE_MISMATCH") {
    return `Requirement "${input.requirementName}" is ${input.status} because entity resolution classified compared values as POSSIBLE_MISMATCH. Submitted: ${submitted}. Verified: ${verified}. This is not an automatic failure.`;
  }
  if (code === "ENTITY_LIKELY_SAME") {
    return `Requirement "${input.requirementName}" is ${input.status} because entity resolution classified compared values as LIKELY_SAME_ENTITY. Submitted: ${submitted}. Verified: ${verified}.`;
  }
  if (code === "ENTITY_STRONG_MISMATCH") {
    return `Requirement "${input.requirementName}" is ${input.status} because entity resolution classified compared values as STRONG_MISMATCH. Submitted: ${submitted}. Verified: ${verified}.`;
  }
  if (code === "ENTITY_INSUFFICIENT_EVIDENCE") {
    return `Requirement "${input.requirementName}" is ${input.status} because entity-resolution evidence is insufficient. Submitted: ${submitted}. Verified: ${verified}.`;
  }
  if (code === "MANUAL_REVIEW_REQUIRED") {
    return `Requirement "${input.requirementName}" is ${input.status} because the configured rule type requires officer review.`;
  }
  if (code === "UNSUPPORTED_RULE_TYPE" || code === "UNSUPPORTED_VERIFICATION_METHOD") {
    return `Requirement "${input.requirementName}" is ${input.status} because the stored configuration is not supported by the rules engine (${code}).`;
  }

  return `Requirement "${input.requirementName}" is ${input.status} (${code}). Submitted: ${submitted}. Verified: ${verified}.`;
}

export function buildEvidenceFinding(input: EvidenceFindingInput): EvidenceFindingDraft {
  return {
    requirementName: input.requirementName,
    tenderClause: input.tenderClause,
    status: input.status,
    submittedValue: submittedValue(input),
    verifiedValue: verifiedValue(input),
    evidenceSources: evidenceSources(input),
    reasoning: reasoning(input),
  };
}
