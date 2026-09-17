import { Router } from "express";
import { requireAuth, requireRole } from "../auth/middleware";
import {
  APPLICATION_STATUS_DRAFT,
  createDraftApplication,
  findApplicationByTenderAndBidder,
  findApplicationForBidder,
  updateDraftApplication,
} from "../applications/applicationRepository";
import { sendError } from "../http/errors";
import { parsePositiveInt } from "../http/ids";
import { listRequirementsForTender } from "../requirements/requirementRepository";
import { findDatedTender, listOpenTenders } from "../tenders/tenderRepository";
import { registerBidderDocumentRoutes } from "./bidderDocuments";

export const bidderRouter = Router();

bidderRouter.use(requireAuth, requireRole("bidder"));
registerBidderDocumentRoutes(bidderRouter);

function readOptionalString(body: Record<string, unknown>, key: string): string | undefined | "invalid" {
  if (!(key in body)) {
    return undefined;
  }

  const value = body[key];
  if (typeof value !== "string") {
    return "invalid";
  }

  return value.trim();
}

bidderRouter.get("/me", (req, res) => {
  res.json({ user: req.currentUser });
});

bidderRouter.get("/tenders", (req, res) => {
  const bidderId = req.currentUser?.id;
  if (!bidderId) {
    sendError(res, 401, "Authentication required");
    return;
  }

  const tenders = listOpenTenders().map((tender) => {
    const application = findApplicationByTenderAndBidder(tender.id, bidderId);
    return {
      ...tender,
      applicationStatus: application ? application.status : null,
      applicationId: application ? application.id : null,
    };
  });

  res.json({ tenders });
});

bidderRouter.get("/tenders/:tenderId", (req, res) => {
  const bidderId = req.currentUser?.id;
  if (!bidderId) {
    sendError(res, 401, "Authentication required");
    return;
  }

  const tenderId = parsePositiveInt(req.params.tenderId);
  if (tenderId === null) {
    sendError(res, 400, "Tender id is invalid");
    return;
  }

  const tender = findDatedTender(tenderId);
  if (!tender) {
    sendError(res, 404, "Tender not found");
    return;
  }

  if (tender.status !== "open") {
    sendError(res, 400, "Tender is not open");
    return;
  }

  const application = findApplicationByTenderAndBidder(tender.id, bidderId);
  res.json({
    tender: {
      ...tender,
      applicationStatus: application ? application.status : null,
      applicationId: application ? application.id : null,
    },
    requirements: listRequirementsForTender(tender.id),
  });
});

bidderRouter.post("/tenders/:tenderId/application", (req, res) => {
  const bidderId = req.currentUser?.id;
  if (!bidderId) {
    sendError(res, 401, "Authentication required");
    return;
  }

  const tenderId = parsePositiveInt(req.params.tenderId);
  if (tenderId === null) {
    sendError(res, 400, "Tender id is invalid");
    return;
  }

  const tender = findDatedTender(tenderId);
  if (!tender) {
    sendError(res, 404, "Tender not found");
    return;
  }

  if (tender.status !== "open") {
    sendError(res, 400, "Tender is not open");
    return;
  }

  const existing = findApplicationByTenderAndBidder(tender.id, bidderId);
  const application = existing ?? createDraftApplication(tender.id, bidderId);
  res.status(existing ? 200 : 201).json({ application });
});

bidderRouter.get("/applications/:applicationId", (req, res) => {
  const bidderId = req.currentUser?.id;
  if (!bidderId) {
    sendError(res, 401, "Authentication required");
    return;
  }

  const applicationId = parsePositiveInt(req.params.applicationId);
  if (applicationId === null) {
    sendError(res, 400, "Application id is invalid");
    return;
  }

  const application = findApplicationForBidder(applicationId, bidderId);
  if (!application) {
    sendError(res, 404, "Application not found");
    return;
  }

  res.json({ application });
});

bidderRouter.patch("/applications/:applicationId", (req, res) => {
  const bidderId = req.currentUser?.id;
  if (!bidderId) {
    sendError(res, 401, "Authentication required");
    return;
  }

  const applicationId = parsePositiveInt(req.params.applicationId);
  if (applicationId === null) {
    sendError(res, 400, "Application id is invalid");
    return;
  }

  const existing = findApplicationForBidder(applicationId, bidderId);
  if (!existing) {
    sendError(res, 404, "Application not found");
    return;
  }

  if (existing.status !== APPLICATION_STATUS_DRAFT) {
    sendError(res, 409, "Application has already been submitted");
    return;
  }

  if (req.body === null || typeof req.body !== "object" || Array.isArray(req.body)) {
    sendError(res, 400, "Invalid request body");
    return;
  }

  const body = req.body as Record<string, unknown>;
  const gstin = readOptionalString(body, "gstin");
  const pan = readOptionalString(body, "pan");
  const oem = readOptionalString(body, "oem");
  const udyam = readOptionalString(body, "udyam");

  if (gstin === "invalid" || pan === "invalid" || oem === "invalid" || udyam === "invalid") {
    sendError(res, 400, "GSTIN, PAN, OEM, and Udyam must be strings");
    return;
  }

  if (gstin === undefined && pan === undefined && oem === undefined && udyam === undefined) {
    sendError(res, 400, "No updatable fields were provided");
    return;
  }

  const application = updateDraftApplication(applicationId, bidderId, {
    ...(gstin !== undefined ? { gstin } : {}),
    ...(pan !== undefined ? { pan } : {}),
    ...(oem !== undefined ? { oem } : {}),
    ...(udyam !== undefined ? { udyam } : {}),
  });

  if (!application || application.status !== APPLICATION_STATUS_DRAFT) {
    sendError(res, 409, "Application has already been submitted");
    return;
  }

  res.json({ application });
});
