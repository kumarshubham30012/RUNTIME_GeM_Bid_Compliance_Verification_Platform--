export const ENTITY_SOURCES = [
  "APPLICATION",
  "DOCUMENT",
  "GST_VERIFICATION",
  "UDYAM_VERIFICATION",
  "OEM_VERIFICATION",
] as const;

export type EntitySource = (typeof ENTITY_SOURCES)[number];

export const ENTITY_FIELDS = ["company_name", "gstin", "pan", "udyam", "oem"] as const;

export type EntityField = (typeof ENTITY_FIELDS)[number];

export const ENTITY_CLASSIFICATIONS = [
  "EXACT_MATCH",
  "LIKELY_SAME_ENTITY",
  "POSSIBLE_MISMATCH",
  "STRONG_MISMATCH",
  "INSUFFICIENT_EVIDENCE",
] as const;

export type EntityClassification = (typeof ENTITY_CLASSIFICATIONS)[number];

export type EntityValue = {
  source: EntitySource;
  value: string;
  sandbox: boolean;
};

export type EntityComparison = {
  field: EntityField;
  sourceA: EntitySource;
  valueA: string;
  sourceB: EntitySource;
  valueB: string;
  classification: EntityClassification;
  confidence: number;
  reasoning: string;
  sandbox: boolean;
};

export type StoredEntityComparison = EntityComparison & {
  id: number;
  applicationId: number;
  createdAt: string;
  updatedAt: string;
};
