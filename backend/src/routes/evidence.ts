import { Router } from "express";
import { requireAuth } from "../auth/middleware";
import { sendError } from "../http/errors";
import { parsePositiveInt } from "../http/ids";
import { generateOwnedEvidence, listOwnedEvidence } from "../evidence/evidenceService";

export const evidenceRouter = Router();

evidenceRouter.use(requireAuth);

evidenceRouter.get("/applications/:applicationId", (req, res) => {
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

  const findings = listOwnedEvidence(user, applicationId);
  if (findings === "forbidden") {
    sendError(res, 403, "Insufficient permissions");
    return;
  }
  if (findings === "missing") {
    sendError(res, 404, "Application not found");
    return;
  }

  res.json({ applicationId, findings });
});

evidenceRouter.post("/applications/:applicationId/generate", (req, res) => {
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

  const findings = generateOwnedEvidence(user, applicationId);
  if (findings === "forbidden") {
    sendError(res, 403, "Insufficient permissions");
    return;
  }
  if (findings === "missing") {
    sendError(res, 404, "Application not found");
    return;
  }

  res.json({ applicationId, findings });
});
