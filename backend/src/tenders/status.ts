export type TenderStatus = "upcoming" | "open" | "closed";

export function parseDateOnly(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return trimmed;
}

export function deriveTenderStatus(
  openingDate: string,
  closingDate: string,
  now = new Date()
): TenderStatus {
  const start = Date.parse(`${openingDate}T00:00:00.000Z`);
  const end = Date.parse(`${closingDate}T23:59:59.999Z`);
  const current = now.getTime();

  if (current < start) {
    return "upcoming";
  }

  if (current > end) {
    return "closed";
  }

  return "open";
}
