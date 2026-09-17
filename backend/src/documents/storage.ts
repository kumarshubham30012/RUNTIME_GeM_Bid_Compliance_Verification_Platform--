import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "../config/env";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"] as const;

const EXTENSION_BY_MIME: Record<(typeof ALLOWED_MIME_TYPES)[number], string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
};

export function isAllowedMimeType(value: string): value is (typeof ALLOWED_MIME_TYPES)[number] {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

export function resolveUploadDir(): string {
  const directory = path.resolve(process.cwd(), env.uploadDir);
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

export function sanitizeOriginalFilename(filename: string): string {
  const base = path.basename(filename).replace(/[\u0000-\u001f\\/]/g, "_").trim();
  return (base || "document").slice(0, 255);
}

export function createStoredFilename(
  applicationId: number,
  requirementId: number,
  mimeType: (typeof ALLOWED_MIME_TYPES)[number]
): string {
  return `${applicationId}-${requirementId}-${randomUUID()}${EXTENSION_BY_MIME[mimeType]}`;
}

export function removeStoredFile(storagePath: string): void {
  try {
    fs.unlinkSync(storagePath);
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : null;
    if (code !== "ENOENT") {
      throw error;
    }
  }
}
