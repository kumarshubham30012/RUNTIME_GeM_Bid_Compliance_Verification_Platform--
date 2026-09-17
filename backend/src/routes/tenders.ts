import { Router } from "express";
import { requireAuth, requireRole } from "../auth/middleware";
import { sendError } from "../http/errors";
import { parseDateOnly } from "../tenders/status";
import {
  createOfficerTender,
  findOfficerTender,
  listTendersForOfficer,
} from "../tenders/tenderRepository";
import { registerRequirementRoutes } from "./requirements";

export const tendersRouter = Router();

tendersRouter.use(requireAuth, requireRole("officer"));
registerRequirementRoutes(tendersRouter);

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readDateField(body: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (body[key] !== undefined) {
      return body[key];
    }
  }
  return undefined;
}

tendersRouter.get("/", (req, res) => {
  const officerId = req.currentUser?.id;
  if (!officerId) {
    sendError(res, 401, "Authentication required");
    return;
  }

  res.json({ tenders: listTendersForOfficer(officerId) });
});

tendersRouter.post("/", (req, res) => {
  const officerId = req.currentUser?.id;
  if (!officerId) {
    sendError(res, 401, "Authentication required");
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const title = readString(body.title);
  const department = readString(body.department);
  const openingDate = parseDateOnly(readDateField(body, ["openingDate", "opening_date", "startDate"]));
  const closingDate = parseDateOnly(readDateField(body, ["closingDate", "closing_date", "endDate"]));

  if (!title) {
    sendError(res, 400, "Title is required");
    return;
  }

  if (!department) {
    sendError(res, 400, "Department is required");
    return;
  }

  const openingProvided = readDateField(body, ["openingDate", "opening_date", "startDate"]);
  const closingProvided = readDateField(body, ["closingDate", "closing_date", "endDate"]);

  if (openingProvided === undefined || openingProvided === null || readString(openingProvided) === "") {
    sendError(res, 400, "Opening date is required");
    return;
  }

  if (closingProvided === undefined || closingProvided === null || readString(closingProvided) === "") {
    sendError(res, 400, "Closing date is required");
    return;
  }

  if (!openingDate) {
    sendError(res, 400, "Opening date is invalid");
    return;
  }

  if (!closingDate) {
    sendError(res, 400, "Closing date is invalid");
    return;
  }

  if (closingDate < openingDate) {
    sendError(res, 400, "Closing date must not be before opening date");
    return;
  }

  const tender = createOfficerTender({
    title,
    department,
    openingDate,
    closingDate,
    officerId,
  });

  res.status(201).json({ tender });
});

tendersRouter.get("/:id", (req, res) => {
  const officerId = req.currentUser?.id;
  if (!officerId) {
    sendError(res, 401, "Authentication required");
    return;
  }

  const tenderId = Number(req.params.id);
  if (!Number.isInteger(tenderId) || tenderId <= 0) {
    sendError(res, 400, "Tender id is invalid");
    return;
  }

  const tender = findOfficerTender(tenderId, officerId);
  if (!tender) {
    sendError(res, 404, "Tender not found");
    return;
  }

  res.json({ tender });
});
