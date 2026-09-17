import type { Response } from "express";

export function sendError(
  res: Response,
  status: number,
  error: string,
  extra: Record<string, unknown> = {}
): void {
  res.status(status).json({ error, ...extra });
}
