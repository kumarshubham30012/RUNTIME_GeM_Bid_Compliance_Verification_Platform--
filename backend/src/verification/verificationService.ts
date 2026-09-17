import type { PublicUser } from "../auth/types";
import {
  findApplicationForBidder,
  findApplicationOwnedByOfficer,
  type ApplicationRecord,
} from "../applications/applicationRepository";
import { listDocumentsForApplication, toPublicDocument } from "../documents/documentRepository";
import { sendError } from "../http/errors";
import { isVerificationMethod } from "../requirements/constants";
import { findRequirementForTender } from "../requirements/requirementRepository";
import { getVerificationProvider } from "./registry";
import { listVerificationResults, upsertVerificationResult } from "./verificationRepository";
import type { StoredVerificationResult } from "./verificationRepository";
import type { Response } from "express";

export function resolveOwnedApplication(
  user: PublicUser,
  applicationId: number
): ApplicationRecord | null {
  if (user.role === "bidder") {
    return findApplicationForBidder(applicationId, user.id);
  }

  if (user.role === "officer") {
    return findApplicationOwnedByOfficer(applicationId, user.id);
  }

  return null;
}

export function listOwnedVerificationResults(
  user: PublicUser,
  applicationId: number
): StoredVerificationResult[] | "forbidden" | "missing" {
  if (user.role !== "bidder" && user.role !== "officer") {
    return "forbidden";
  }

  const application = resolveOwnedApplication(user, applicationId);
  if (!application) {
    return "missing";
  }

  return listVerificationResults(application.id);
}

export function runOwnedVerification(
  user: PublicUser,
  applicationId: number,
  requirementId: number,
  res: Response
): StoredVerificationResult | null {
  if (user.role !== "bidder" && user.role !== "officer") {
    sendError(res, 403, "Insufficient permissions");
    return null;
  }

  const application = resolveOwnedApplication(user, applicationId);
  if (!application) {
    sendError(res, 404, "Application not found");
    return null;
  }

  const requirement = findRequirementForTender(application.tenderId, requirementId);
  if (!requirement) {
    sendError(res, 400, "Requirement does not belong to this application tender");
    return null;
  }

  if (!isVerificationMethod(requirement.verificationMethod)) {
    sendError(res, 400, "Unsupported verification method");
    return null;
  }

  const documents = listDocumentsForApplication(application.id)
    .filter((document) => document.requirementId === requirement.id)
    .map(toPublicDocument);

  const provider = getVerificationProvider(requirement.verificationMethod);
  const result = provider.verify({
    applicationId: application.id,
    requirementId: requirement.id,
    gstin: application.gstin,
    oem: application.oem,
    udyam: application.udyam,
    documents,
  });

  return upsertVerificationResult({
    applicationId: application.id,
    requirementId: requirement.id,
    result,
  });
}
