import { Router } from "express";
import { requireAuth } from "../auth/middleware";
import { sendError } from "../http/errors";
import { parsePositiveInt, parsePositiveIntValue } from "../http/ids";
import { listOwnedVerificationResults, runOwnedVerification } from "../verification/verificationService";

export const verificationRouter = Router();

verificationRouter.use(requireAuth);

verificationRouter.get("/applications/:applicationId", (req, res) => {
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

  const results = listOwnedVerificationResults(user, applicationId);
  if (results === "forbidden") {
    sendError(res, 403, "Insufficient permissions");
    return;
  }
  if (results === "missing") {
    sendError(res, 404, "Application not found");
    return;
  }

  res.json({ results });
});

verificationRouter.post("/applications/:applicationId", (req, res) => {
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

  const body = (req.body ?? {}) as Record<string, unknown>;
  const requirementId = parsePositiveIntValue(body.requirementId);
  if (requirementId === null) {
    sendError(res, 400, "Requirement id is required");
    return;
  }

  const result = runOwnedVerification(user, applicationId, requirementId, res);
  if (!result) {
    return;
  }

  res.json({ result });
});
