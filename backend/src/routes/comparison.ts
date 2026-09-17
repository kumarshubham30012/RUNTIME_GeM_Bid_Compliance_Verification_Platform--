import { Router } from "express";
import { requireAuth, requireRole } from "../auth/middleware";
import { getOwnedTenderComparison } from "../comparison/comparisonService";
import { sendError } from "../http/errors";
import { parsePositiveInt } from "../http/ids";

export const comparisonRouter = Router();

comparisonRouter.use(requireAuth, requireRole("officer"));

comparisonRouter.get("/tenders/:tenderId/comparison", (req, res) => {
  const user = req.currentUser;
  if (!user) {
    sendError(res, 401, "Authentication required");
    return;
  }

  const tenderId = parsePositiveInt(req.params.tenderId);
  if (tenderId === null) {
    sendError(res, 400, "Tender id is invalid");
    return;
  }

  const comparison = getOwnedTenderComparison(user, tenderId);
  if (comparison === "forbidden") {
    sendError(res, 403, "Insufficient permissions");
    return;
  }
  if (comparison === "missing") {
    sendError(res, 404, "Tender not found");
    return;
  }

  res.json(comparison);
});
