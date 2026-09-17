export const VERIFICATION_METHODS = ["DOCUMENT", "GST", "UDYAM", "OEM", "MANUAL"] as const;

export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

export const RULE_TYPES = ["EXISTS", "EXACT_MATCH", "MATCH", "MANUAL_REVIEW"] as const;

export type RuleType = (typeof RULE_TYPES)[number];

export function isVerificationMethod(value: unknown): value is VerificationMethod {
  return typeof value === "string" && (VERIFICATION_METHODS as readonly string[]).includes(value);
}

export function isRuleType(value: unknown): value is RuleType {
  return typeof value === "string" && (RULE_TYPES as readonly string[]).includes(value);
}
