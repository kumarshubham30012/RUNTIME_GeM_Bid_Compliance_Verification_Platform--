import { Router } from "express";
import { requireAuth } from "../auth/middleware";
import { sendError } from "../http/errors";
import { parsePositiveInt } from "../http/ids";
import {
  listOwnedEntityResolution,
  runOwnedEntityResolution,
} from "../entityResolution/entityResolutionService";

export const entityResolutionRouter = Router();

entityResolutionRouter.use(requireAuth);

entityResolutionRouter.get("/applications/:applicationId", (req, res) => {
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

  const results = listOwnedEntityResolution(user, applicationId);
  if (results === "forbidden") {
    sendError(res, 403, "Insufficient permissions");
    return;
  }
  if (results === "missing") {
    sendError(res, 404, "Application not found");
    return;
  }

  res.json({ applicationId, results });
});

entityResolutionRouter.post("/applications/:applicationId/run", (req, res) => {
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

  const results = runOwnedEntityResolution(user, applicationId);
  if (results === "forbidden") {
    sendError(res, 403, "Insufficient permissions");
    return;
  }
  if (results === "missing") {
    sendError(res, 404, "Application not found");
    return;
  }

  res.json({ applicationId, results });
});
