import { Router } from "express";
import { requireAuth, requireRole } from "../auth/middleware";
import {
  getOwnedAuditTrail,
  getOwnedOfficerDecision,
  saveOwnedOfficerDecision,
} from "../decision/decisionService";
import { isOfficerDecision } from "../decision/types";
import { sendError } from "../http/errors";
import { parsePositiveInt } from "../http/ids";

export const decisionRouter = Router();

decisionRouter.use(requireAuth, requireRole("officer"));

decisionRouter.get("/applications/:applicationId/decision", (req, res) => {
  const user = req.currentUser;
  if (!user) {
    sendError(res, 401, "Authentication required");
    return;
  }

  const applicationId = parsePositiveInt(req.params.applicationId);
  if (applicationId === null) {
    sendError(res, 400, "Application id is invalid");
    return;
  }

  const decision = getOwnedOfficerDecision(user, applicationId);
  if (decision === "forbidden") {
    sendError(res, 403, "Insufficient permissions");
    return;
  }
  if (decision === "missing") {
    sendError(res, 404, "Application not found");
    return;
  }

  res.json({ applicationId, decision });
});

decisionRouter.put("/applications/:applicationId/decision", (req, res) => {
  const user = req.currentUser;
  if (!user) {
    sendError(res, 401, "Authentication required");
    return;
  }

  const applicationId = parsePositiveInt(req.params.applicationId);
  if (applicationId === null) {
    sendError(res, 400, "Application id is invalid");
    return;
  }

  const body = req.body as { decision?: unknown; reason?: unknown };
  if (!isOfficerDecision(body.decision)) {
    sendError(res, 400, "Decision is invalid");
    return;
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const decision = saveOwnedOfficerDecision(user, applicationId, body.decision, reason);
  if (decision === "forbidden") {
    sendError(res, 403, "Insufficient permissions");
    return;
  }
  if (decision === "missing") {
    sendError(res, 404, "Application not found");
    return;
  }

  res.json({ applicationId, decision });
});

decisionRouter.get("/applications/:applicationId/audit", (req, res) => {
  const user = req.currentUser;
  if (!user) {
    sendError(res, 401, "Authentication required");
    return;
  }

  const applicationId = parsePositiveInt(req.params.applicationId);
  if (applicationId === null) {
    sendError(res, 400, "Application id is invalid");
    return;
  }

  const events = getOwnedAuditTrail(user, applicationId);
  if (events === "forbidden") {
    sendError(res, 403, "Insufficient permissions");
    return;
  }
  if (events === "missing") {
    sendError(res, 404, "Application not found");
    return;
  }

  res.json({ applicationId, events });
});
