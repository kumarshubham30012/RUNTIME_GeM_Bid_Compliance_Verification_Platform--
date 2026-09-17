import { Router } from "express";
import {
  findApplicationForOfficer,
  findOwnedDocumentForOfficer,
  listApplicationsForOfficer,
} from "../applications/officerApplicationRepository";
import {
  contentDispositionFilename,
  resolveTrustedStoragePath,
  storedFileExists,
} from "../documents/storage";
import { requireAuth, requireRole } from "../auth/middleware";
import { sendError } from "../http/errors";
import { parsePositiveInt } from "../http/ids";

export const officerApplicationsRouter = Router();

officerApplicationsRouter.use(requireAuth, requireRole("officer"));

officerApplicationsRouter.get("/applications", (req, res) => {
  const officerId = req.currentUser?.id;
  if (!officerId) {
    sendError(res, 401, "Authentication required");
    return;
  }

  res.json({ applications: listApplicationsForOfficer(officerId) });
});

officerApplicationsRouter.get("/applications/:applicationId", (req, res) => {
  const officerId = req.currentUser?.id;
  if (!officerId) {
    sendError(res, 401, "Authentication required");
    return;
  }

  const applicationId = parsePositiveInt(req.params.applicationId);
  if (applicationId === null) {
    sendError(res, 400, "Application id is invalid");
    return;
  }

  const detail = findApplicationForOfficer(applicationId, officerId);
  if (!detail) {
    sendError(res, 404, "Application not found");
    return;
  }

  res.json(detail);
});

officerApplicationsRouter.get("/applications/:applicationId/documents/:documentId", (req, res) => {
  const officerId = req.currentUser?.id;
  if (!officerId) {
    sendError(res, 401, "Authentication required");
    return;
  }

  const applicationId = parsePositiveInt(req.params.applicationId);
  const documentId = parsePositiveInt(req.params.documentId);
  if (applicationId === null || documentId === null) {
    sendError(res, 400, "Document id is invalid");
    return;
  }

  const document = findOwnedDocumentForOfficer(applicationId, documentId, officerId);
  if (!document) {
    sendError(res, 404, "Document not found");
    return;
  }

  const filePath = resolveTrustedStoragePath(document.storagePath);
  if (!filePath || !storedFileExists(document.storagePath)) {
    sendError(res, 404, "Document file not found");
    return;
  }

  const filename = contentDispositionFilename(document.originalFilename);
  res.setHeader("Content-Type", document.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  res.sendFile(filePath, (error) => {
    if (error && !res.headersSent) {
      sendError(res, 404, "Document file not found");
    }
  });
});
