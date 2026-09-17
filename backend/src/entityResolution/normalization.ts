const LEGAL_SUFFIXES = [
  "PRIVATE LIMITED",
  "PVT LIMITED",
  "PVT LTD",
  "LIMITED",
  "LTD",
  "LLP",
] as const;

export function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeDisplay(value: string): string {
  return collapseWhitespace(value);
}

export function stripPunctuation(value: string): string {
  return value.replace(/[.,/#'"`()\-]/g, " ");
}

export function stripLegalSuffixes(value: string): string {
  let result = ` ${value} `;
  for (const suffix of LEGAL_SUFFIXES) {
    result = result.replace(new RegExp(`\\s${suffix}\\s`, "g"), " ");
  }
  return collapseWhitespace(result);
}

export function normalizeEntityName(value: string): string {
  const upper = stripPunctuation(collapseWhitespace(value)).toUpperCase();
  return stripLegalSuffixes(collapseWhitespace(upper));
}

export function normalizeIdentifier(value: string): string {
  return value.replace(/[\s.\-]/g, "").toUpperCase();
}

export function significantTokens(normalizedName: string): string[] {
  return normalizedName.split(" ").filter((token) => token.length > 0);
}
