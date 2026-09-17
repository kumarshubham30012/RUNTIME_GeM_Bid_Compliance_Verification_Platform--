import type { Request, Response, Router } from "express";
import { sendError } from "../http/errors";
import { isRuleType, isVerificationMethod } from "../requirements/constants";
import {
  createRequirement,
  deleteRequirement,
  findRequirementForTender,
  listRequirementsForTender,
  updateRequirement,
} from "../requirements/requirementRepository";
import { findOfficerTender } from "../tenders/tenderRepository";

function parsePositiveInt(value: string | string[] | undefined): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readField(body: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (body[key] !== undefined) {
      return body[key];
    }
  }
  return undefined;
}

function requireOwnedTender(req: Request, res: Response) {
  const officerId = req.currentUser?.id;
  if (!officerId) {
    sendError(res, 401, "Authentication required");
    return null;
  }

  const tenderId = parsePositiveInt(req.params.id);
  if (tenderId === null) {
    sendError(res, 400, "Tender id is invalid");
    return null;
  }

  const tender = findOfficerTender(tenderId, officerId);
  if (!tender) {
    sendError(res, 404, "Tender not found");
    return null;
  }

  return tender;
}

function parseRequirementBody(body: Record<string, unknown>): {
  name: string;
  tenderClause: string;
  mandatory: boolean;
  verificationMethod: string;
  ruleType: string;
  errors: string[];
} {
  const name = readString(readField(body, ["name"]));
  const tenderClause = readString(readField(body, ["tenderClause", "tender_clause"]));
  const verificationMethod = readString(readField(body, ["verificationMethod", "verification_method"]));
  const ruleType = readString(readField(body, ["ruleType", "rule_type"]));
  const mandatoryValue = readField(body, ["mandatory"]);

  const errors: string[] = [];

  if (!name) {
    errors.push("Name is required");
  }

  if (!tenderClause) {
    errors.push("Tender clause is required");
  }

  if (mandatoryValue === undefined) {
    errors.push("Mandatory is required");
  } else if (typeof mandatoryValue !== "boolean") {
    errors.push("Mandatory must be a boolean");
  }

  if (!verificationMethod) {
    errors.push("Verification method is required");
  } else if (!isVerificationMethod(verificationMethod)) {
    errors.push("Verification method is invalid");
  }

  if (!ruleType) {
    errors.push("Rule type is required");
  } else if (!isRuleType(ruleType)) {
    errors.push("Rule type is invalid");
  }

  return {
    name,
    tenderClause,
    mandatory: typeof mandatoryValue === "boolean" ? mandatoryValue : false,
    verificationMethod,
    ruleType,
    errors,
  };
}

export function registerRequirementRoutes(router: Router): void {
  router.get("/:id/requirements", (req, res) => {
    const tender = requireOwnedTender(req, res);
    if (!tender) {
      return;
    }

    res.json({ requirements: listRequirementsForTender(tender.id) });
  });

  router.post("/:id/requirements", (req, res) => {
    const tender = requireOwnedTender(req, res);
    if (!tender) {
      return;
    }

    const parsed = parseRequirementBody((req.body ?? {}) as Record<string, unknown>);
    if (parsed.errors.length > 0) {
      sendError(res, 400, parsed.errors[0] ?? "Invalid request");
      return;
    }

    if (!isVerificationMethod(parsed.verificationMethod) || !isRuleType(parsed.ruleType)) {
      sendError(res, 400, "Invalid request");
      return;
    }

    const requirement = createRequirement({
      tenderId: tender.id,
      name: parsed.name,
      tenderClause: parsed.tenderClause,
      mandatory: parsed.mandatory,
      verificationMethod: parsed.verificationMethod,
      ruleType: parsed.ruleType,
    });

    res.status(201).json({ requirement });
  });

  router.patch("/:id/requirements/:requirementId", (req, res) => {
    const tender = requireOwnedTender(req, res);
    if (!tender) {
      return;
    }

    const requirementId = parsePositiveInt(req.params.requirementId);
    if (requirementId === null) {
      sendError(res, 400, "Requirement id is invalid");
      return;
    }

    const parsed = parseRequirementBody((req.body ?? {}) as Record<string, unknown>);
    if (parsed.errors.length > 0) {
      sendError(res, 400, parsed.errors[0] ?? "Invalid request");
      return;
    }

    if (!isVerificationMethod(parsed.verificationMethod) || !isRuleType(parsed.ruleType)) {
      sendError(res, 400, "Invalid request");
      return;
    }

    const requirement = updateRequirement({
      tenderId: tender.id,
      requirementId,
      name: parsed.name,
      tenderClause: parsed.tenderClause,
      mandatory: parsed.mandatory,
      verificationMethod: parsed.verificationMethod,
      ruleType: parsed.ruleType,
    });

    if (!requirement) {
      sendError(res, 404, "Requirement not found");
      return;
    }

    res.json({ requirement });
  });

  router.delete("/:id/requirements/:requirementId", (req, res) => {
    const tender = requireOwnedTender(req, res);
    if (!tender) {
      return;
    }

    const requirementId = parsePositiveInt(req.params.requirementId);
    if (requirementId === null) {
      sendError(res, 400, "Requirement id is invalid");
      return;
    }

    const existing = findRequirementForTender(tender.id, requirementId);
    if (!existing) {
      sendError(res, 404, "Requirement not found");
      return;
    }

    deleteRequirement(tender.id, requirementId);
    res.json({ ok: true });
  });
}
