import type { PublicUser } from "../auth/types";
import { resolveOwnedApplication } from "../verification/verificationService";
import { listVerificationResults } from "../verification/verificationRepository";
import { compareSourcePair } from "./compare";
import { replaceEntityResolutionResults, listEntityResolutionResults } from "./entityResolutionRepository";
import {
  ENTITY_SOURCES,
  type EntityComparison,
  type EntityField,
  type EntitySource,
  type EntityValue,
  type StoredEntityComparison,
} from "./types";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sourceRank(source: EntitySource): number {
  return ENTITY_SOURCES.indexOf(source);
}

function addValue(bucket: EntityValue[], source: EntitySource, value: string, sandbox: boolean): void {
  const trimmed = value.trim();
  if (!trimmed) {
    return;
  }
  if (bucket.some((entry) => entry.source === source && entry.value === trimmed)) {
    return;
  }
  bucket.push({ source, value: trimmed, sandbox });
}

function collectFieldValues(
  application: { gstin: string; pan: string; oem: string; udyam: string },
  verifications: ReturnType<typeof listVerificationResults>
): Record<EntityField, EntityValue[]> {
  const values: Record<EntityField, EntityValue[]> = {
    company_name: [],
    gstin: [],
    pan: [],
    udyam: [],
    oem: [],
  };

  addValue(values.gstin, "APPLICATION", application.gstin, false);
  addValue(values.pan, "APPLICATION", application.pan, false);
  addValue(values.udyam, "APPLICATION", application.udyam, false);
  addValue(values.oem, "APPLICATION", application.oem, false);

  for (const result of verifications) {
    if (result.status !== "VERIFIED") {
      continue;
    }

    const sandbox = result.environment === "SANDBOX";
    if (result.method === "GST") {
      addValue(values.gstin, "GST_VERIFICATION", asString(result.data.gstin), sandbox);
      addValue(values.company_name, "GST_VERIFICATION", asString(result.data.legalName), sandbox);
    }
    if (result.method === "UDYAM") {
      addValue(values.udyam, "UDYAM_VERIFICATION", asString(result.data.udyamNumber), sandbox);
      addValue(values.company_name, "UDYAM_VERIFICATION", asString(result.data.enterpriseName), sandbox);
    }
    if (result.method === "OEM") {
      addValue(values.oem, "OEM_VERIFICATION", asString(result.data.oemName), sandbox);
      addValue(values.company_name, "OEM_VERIFICATION", asString(result.data.oemName), sandbox);
    }
  }

  return values;
}

function pairValues(field: EntityField, entries: EntityValue[]): EntityComparison[] {
  const ordered = [...entries].sort((left, right) => sourceRank(left.source) - sourceRank(right.source));
  const comparisons: EntityComparison[] = [];

  for (let i = 0; i < ordered.length; i += 1) {
    for (let j = i + 1; j < ordered.length; j += 1) {
      comparisons.push(compareSourcePair(field, ordered[i], ordered[j]));
    }
  }

  return comparisons;
}

export function listOwnedEntityResolution(
  user: PublicUser,
  applicationId: number
): StoredEntityComparison[] | "forbidden" | "missing" {
  if (user.role !== "bidder" && user.role !== "officer") {
    return "forbidden";
  }

  const application = resolveOwnedApplication(user, applicationId);
  if (!application) {
    return "missing";
  }

  return listEntityResolutionResults(application.id);
}

export function runOwnedEntityResolution(
  user: PublicUser,
  applicationId: number
): StoredEntityComparison[] | "forbidden" | "missing" {
  if (user.role !== "bidder" && user.role !== "officer") {
    return "forbidden";
  }

  const application = resolveOwnedApplication(user, applicationId);
  if (!application) {
    return "missing";
  }

  const fieldValues = collectFieldValues(application, listVerificationResults(application.id));
  const comparisons = (Object.keys(fieldValues) as EntityField[]).flatMap((field) =>
    pairValues(field, fieldValues[field])
  );

  return replaceEntityResolutionResults(application.id, comparisons);
}
