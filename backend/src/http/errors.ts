import type { Response } from "express";

export function sendError(res: Response, status: number, error: string): void {
  res.status(status).json({ error });
}
