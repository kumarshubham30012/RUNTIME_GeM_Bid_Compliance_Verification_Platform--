import { Router, type Request, type Response } from "express";
import { requireAuth, requireRole } from "../auth/middleware";
import { sendError } from "../http/errors";
import { parsePositiveInt } from "../http/ids";
import { actOnOwnedFinding, listOwnedResolutions } from "../resolution/resolutionService";
import type { ResolutionAction } from "../resolution/types";

export const resolutionRouter = Router();

resolutionRouter.use(requireAuth, requireRole("officer"));

resolutionRouter.get("/applications/:applicationId/resolutions", (req, res) => {
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

  const items = listOwnedResolutions(user, applicationId);
  if (items === "forbidden") {
    sendError(res, 403, "Insufficient permissions");
    return;
  }
  if (items === "missing") {
    sendError(res, 404, "Application not found");
    return;
  }

  res.json({ applicationId, items });
});

resolutionRouter.post("/applications/:applicationId/resolutions/:findingId/clarify", (req, res) => {
  handleAction(req, res, "REQUEST_CLARIFICATION");
});

resolutionRouter.post("/applications/:applicationId/resolutions/:findingId/resolve", (req, res) => {
  handleAction(req, res, "MARK_RESOLVED");
});

function handleAction(req: Request, res: Response, action: ResolutionAction): void {
  const user = req.currentUser;
  if (!user) {
    sendError(res, 401, "Authentication required");
    return;
  }

  const applicationId = parsePositiveInt(req.params.applicationId);
  const findingId = parsePositiveInt(req.params.findingId);
  if (applicationId === null || findingId === null) {
    sendError(res, 400, "Finding id is invalid");
    return;
  }

  const items = actOnOwnedFinding(user, applicationId, findingId, action);
  if (items === "forbidden") {
    sendError(res, 403, "Insufficient permissions");
    return;
  }
  if (items === "missing") {
    sendError(res, 404, "Application not found");
    return;
  }
  if (items === "not_found") {
    sendError(res, 404, "Finding not found");
    return;
  }

  res.json({ applicationId, items });
}
