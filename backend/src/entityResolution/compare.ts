import {
  collapseWhitespace,
  normalizeDisplay,
  normalizeEntityName,
  normalizeIdentifier,
  significantTokens,
} from "./normalization";
import type { EntityClassification, EntityComparison, EntityField, EntitySource, EntityValue } from "./types";

const IDENTIFIER_FIELDS = new Set<EntityField>(["gstin", "pan", "udyam"]);

export function compareValues(
  field: EntityField,
  sourceA: EntitySource,
  valueA: string,
  sourceB: EntitySource,
  valueB: string,
  sandbox = false
): EntityComparison {
  const rawA = normalizeDisplay(valueA);
  const rawB = normalizeDisplay(valueB);

  if (!rawA || !rawB) {
    return {
      field,
      sourceA,
      valueA: rawA,
      sourceB,
      valueB: rawB,
      classification: "INSUFFICIENT_EVIDENCE",
      confidence: 0,
      reasoning: "One or both values are missing, so the entities cannot be compared.",
      sandbox,
    };
  }

  if (IDENTIFIER_FIELDS.has(field)) {
    return compareIdentifiers(field, sourceA, rawA, sourceB, rawB, sandbox);
  }

  return compareNames(field, sourceA, rawA, sourceB, rawB, sandbox);
}

function compareIdentifiers(
  field: EntityField,
  sourceA: EntitySource,
  rawA: string,
  sourceB: EntitySource,
  rawB: string,
  sandbox: boolean
): EntityComparison {
    const normalizedA = normalizeIdentifier(rawA);
    const normalizedB = normalizeIdentifier(rawB);

    if (normalizedA === normalizedB) {
      return result(
        field,
        sourceA,
        rawA,
        sourceB,
        rawB,
        sandbox,
        "EXACT_MATCH",
        1,
        "Identifier values match after removing spaces and punctuation."
      );
    }

  return result(
    field,
    sourceA,
    rawA,
    sourceB,
    rawB,
    sandbox,
    "STRONG_MISMATCH",
    0.95,
    "Identifier values are both present and differ. GSTIN, PAN, and Udyam numbers are treated as unique identifiers."
  );
}

function compareNames(
  field: EntityField,
  sourceA: EntitySource,
  rawA: string,
  sourceB: EntitySource,
  rawB: string,
  sandbox: boolean
): EntityComparison {
  if (collapseWhitespace(rawA).toLowerCase() === collapseWhitespace(rawB).toLowerCase()) {
    return result(
      field,
      sourceA,
      rawA,
      sourceB,
      rawB,
      sandbox,
      "EXACT_MATCH",
      1,
      "Values are identical after trimming whitespace and ignoring capitalization."
    );
  }

  const normalizedA = normalizeEntityName(rawA);
  const normalizedB = normalizeEntityName(rawB);

  if (!normalizedA || !normalizedB) {
    return result(
      field,
      sourceA,
      rawA,
      sourceB,
      rawB,
      sandbox,
      "INSUFFICIENT_EVIDENCE",
      0,
      "After removing formatting, no comparable entity name remains."
    );
  }

  if (normalizedA === normalizedB) {
    return result(
      field,
      sourceA,
      rawA,
      sourceB,
      rawB,
      sandbox,
      "LIKELY_SAME_ENTITY",
      0.96,
      "Difference is limited to legal-suffix or formatting (for example Pvt Ltd vs Private Limited)."
    );
  }

  const tokensA = new Set(significantTokens(normalizedA));
  const tokensB = new Set(significantTokens(normalizedB));
  const intersection = [...tokensA].filter((token) => tokensB.has(token));
  const unionSize = new Set([...tokensA, ...tokensB]).size;
  const jaccard = unionSize === 0 ? 0 : intersection.length / unionSize;

  if (jaccard >= 0.5) {
    return result(
      field,
      sourceA,
      rawA,
      sourceB,
      rawB,
      sandbox,
      "POSSIBLE_MISMATCH",
      0.55,
      "Entity names share some words but also differ in ways that are not explained by legal-suffix formatting."
    );
  }

  return result(
    field,
    sourceA,
    rawA,
    sourceB,
    rawB,
    sandbox,
    "POSSIBLE_MISMATCH",
    0.4,
    "Material difference detected between the entity names; additional evidence may be required."
  );
}

function result(
  field: EntityField,
  sourceA: EntitySource,
  valueA: string,
  sourceB: EntitySource,
  valueB: string,
  sandbox: boolean,
  classification: EntityClassification,
  confidence: number,
  reasoning: string
): EntityComparison {
  return {
    field,
    sourceA,
    valueA,
    sourceB,
    valueB,
    classification,
    confidence,
    reasoning,
    sandbox,
  };
}

export function compareSourcePair(
  field: EntityField,
  left: EntityValue,
  right: EntityValue
): EntityComparison {
  return compareValues(field, left.source, left.value, right.source, right.value, left.sandbox || right.sandbox);
}
