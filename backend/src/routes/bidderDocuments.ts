import fs from "node:fs";
import type { Request, Response, Router } from "express";
import multer from "multer";
import path from "node:path";
import {
  APPLICATION_STATUS_DRAFT,
  APPLICATION_STATUS_SUBMITTED,
  findApplicationForBidder,
  submitDraftApplication,
} from "../applications/applicationRepository";
import {
  createDocument,
  deleteDocument,
  findDocumentForApplication,
  listDocumentsForApplication,
  toPublicDocument,
} from "../documents/documentRepository";
import { getSubmissionStatus } from "../documents/submission";
import {
  MAX_UPLOAD_BYTES,
  createStoredFilename,
  isAllowedMimeType,
  removeStoredFile,
  resolveUploadDir,
  sanitizeOriginalFilename,
} from "../documents/storage";
import { sendError } from "../http/errors";
import { parsePositiveInt } from "../http/ids";
import { findRequirementForTender, listRequirementsForTender } from "../requirements/requirementRepository";

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, resolveUploadDir());
    },
    filename: (_req, file, callback) => {
      callback(null, `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

function requireBidderApplication(req: Request, res: Response) {
  const bidderId = req.currentUser?.id;
  if (!bidderId) {
    sendError(res, 401, "Authentication required");
    return null;
  }

  const applicationId = parsePositiveInt(req.params.applicationId);
  if (applicationId === null) {
    sendError(res, 400, "Application id is invalid");
    return null;
  }

  const application = findApplicationForBidder(applicationId, bidderId);
  if (!application) {
    sendError(res, 404, "Application not found");
    return null;
  }

  return application;
}

export function registerBidderDocumentRoutes(router: Router): void {
  router.get("/applications/:applicationId/requirements", (req, res) => {
    const application = requireBidderApplication(req, res);
    if (!application) {
      return;
    }

    const documents = listDocumentsForApplication(application.id);
    const requirements = listRequirementsForTender(application.tenderId).map((requirement) => {
      const requirementDocuments = documents
        .filter((document) => document.requirementId === requirement.id)
        .map(toPublicDocument);

      return {
        id: requirement.id,
        name: requirement.name,
        tenderClause: requirement.tenderClause,
        mandatory: requirement.mandatory,
        verificationMethod: requirement.verificationMethod,
        ruleType: requirement.ruleType,
        documentUploaded: requirementDocuments.length > 0,
        documents: requirementDocuments,
      };
    });

    res.json({ requirements });
  });

  router.get("/applications/:applicationId/documents", (req, res) => {
    const application = requireBidderApplication(req, res);
    if (!application) {
      return;
    }

    res.json({ documents: listDocumentsForApplication(application.id).map(toPublicDocument) });
  });

  router.post("/applications/:applicationId/documents", (req, res) => {
    upload.single("file")(req, res, (multerError: unknown) => {
      const uploadedPath = req.file?.path;

      if (multerError) {
        if (uploadedPath) {
          removeStoredFile(uploadedPath);
        }
        const code =
          typeof multerError === "object" && multerError !== null && "code" in multerError
            ? multerError.code
            : null;
        if (code === "LIMIT_FILE_SIZE") {
          sendError(res, 400, "File exceeds 10 MB");
          return;
        }
        sendError(res, 400, "File upload failed");
        return;
      }

      const application = requireBidderApplication(req, res);
      if (!application) {
        if (uploadedPath) {
          removeStoredFile(uploadedPath);
        }
        return;
      }

      if (application.status !== APPLICATION_STATUS_DRAFT) {
        if (uploadedPath) {
          removeStoredFile(uploadedPath);
        }
        sendError(res, 409, "Application has already been submitted");
        return;
      }

      if (!req.file) {
        sendError(res, 400, "File is required");
        return;
      }

      const requirementId = parsePositiveInt(
        typeof req.body.requirementId === "string" ? req.body.requirementId : undefined
      );
      if (requirementId === null) {
        removeStoredFile(req.file.path);
        sendError(res, 400, "Requirement id is required");
        return;
      }

      const requirement = findRequirementForTender(application.tenderId, requirementId);
      if (!requirement) {
        removeStoredFile(req.file.path);
        sendError(res, 400, "Requirement does not belong to this application tender");
        return;
      }

      if (!isAllowedMimeType(req.file.mimetype)) {
        removeStoredFile(req.file.path);
        sendError(res, 400, "File type is not supported");
        return;
      }

      const storedFilename = createStoredFilename(application.id, requirement.id, req.file.mimetype);
      const finalPath = path.join(resolveUploadDir(), storedFilename);
      fs.renameSync(req.file.path, finalPath);

      const document = createDocument({
        applicationId: application.id,
        requirementId: requirement.id,
        originalFilename: sanitizeOriginalFilename(req.file.originalname),
        storedFilename,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        storagePath: finalPath,
      });

      res.status(201).json({ document: toPublicDocument(document) });
    });
  });

  router.delete("/applications/:applicationId/documents/:documentId", (req, res) => {
    const application = requireBidderApplication(req, res);
    if (!application) {
      return;
    }

    if (application.status !== APPLICATION_STATUS_DRAFT) {
      sendError(res, 409, "Application has already been submitted");
      return;
    }

    const documentId = parsePositiveInt(req.params.documentId);
    if (documentId === null) {
      sendError(res, 400, "Document id is invalid");
      return;
    }

    const existing = findDocumentForApplication(application.id, documentId);
    if (!existing) {
      sendError(res, 404, "Document not found");
      return;
    }

    deleteDocument(application.id, documentId);
    removeStoredFile(existing.storagePath);
    res.json({ ok: true });
  });

  router.get("/applications/:applicationId/submission-status", (req, res) => {
    const application = requireBidderApplication(req, res);
    if (!application) {
      return;
    }

    const status = getSubmissionStatus(application.id, application.tenderId);
    res.json({
      canSubmit: application.status === APPLICATION_STATUS_DRAFT && status.canSubmit,
      missingMandatoryRequirements: status.missingMandatoryRequirements,
      applicationStatus: application.status,
    });
  });

  router.post("/applications/:applicationId/submit", (req, res) => {
    const application = requireBidderApplication(req, res);
    if (!application) {
      return;
    }

    if (application.status === APPLICATION_STATUS_SUBMITTED) {
      sendError(res, 409, "Application has already been submitted");
      return;
    }

    const status = getSubmissionStatus(application.id, application.tenderId);
    if (!status.canSubmit) {
      sendError(res, 400, "Mandatory documents are missing", {
        message: "Mandatory documents are missing",
        missingMandatoryRequirements: status.missingMandatoryRequirements,
      });
      return;
    }

    const submitted = submitDraftApplication(application.id, application.bidderUserId);
    if (!submitted || submitted.status !== APPLICATION_STATUS_SUBMITTED) {
      sendError(res, 409, "Application has already been submitted");
      return;
    }

    res.json({ application: submitted });
  });
}
