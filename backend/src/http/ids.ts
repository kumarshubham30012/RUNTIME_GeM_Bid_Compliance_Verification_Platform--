export function parsePositiveInt(value: string | string[] | undefined): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function parsePositiveIntValue(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  if (typeof value === "string") {
    return parsePositiveInt(value);
  }
  return null;
}
