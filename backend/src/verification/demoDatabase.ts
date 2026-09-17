/**
 * Local SANDBOX registry only. These records are fictional demo data.
 * They are not government GST / Udyam / OEM records and must never be presented as such.
 */

export const DEMO_GSTIN = "27SANDBOX0001Z5";
export const UNKNOWN_GSTIN = "99UNKNOWN0000X1";

export const DEMO_UDYAM = "UDYAM-DEMO-00-0000001";
export const UNKNOWN_UDYAM = "UDYAM-UNKNOWN-99-9999999";

export const DEMO_OEM = "Sandbox Medical Devices";
export const UNKNOWN_OEM = "Unknown Widget Works";
/** Additional fictional OEM used for Phase 9 mismatch demonstrations. */
export const DEMO_OEM_MISMATCH = "Different Medical Devices Pvt Ltd";

export type DemoGstRecord = {
  gstin: string;
  legalName: string;
  registrationStatus: string;
  state: string;
};

export type DemoUdyamRecord = {
  udyamNumber: string;
  enterpriseName: string;
  enterpriseType: string;
  registrationStatus: string;
};

export type DemoOemRecord = {
  oemName: string;
  manufacturerCode: string;
  authorizationStatus: string;
};

const GST_RECORDS: Record<string, DemoGstRecord> = {
  [DEMO_GSTIN]: {
    gstin: DEMO_GSTIN,
    legalName: "Sandbox Supplies Pvt Ltd",
    registrationStatus: "ACTIVE (DEMO)",
    state: "Demo State",
  },
};

const UDYAM_RECORDS: Record<string, DemoUdyamRecord> = {
  [DEMO_UDYAM]: {
    udyamNumber: DEMO_UDYAM,
    enterpriseName: "Sandbox Micro Enterprise",
    enterpriseType: "Micro (DEMO)",
    registrationStatus: "ACTIVE (DEMO)",
  },
};

const OEM_RECORDS: Record<string, DemoOemRecord> = {
  [DEMO_OEM.toLowerCase()]: {
    oemName: DEMO_OEM,
    manufacturerCode: "OEM-SANDBOX-001",
    authorizationStatus: "LISTED (DEMO)",
  },
  [DEMO_OEM_MISMATCH.toLowerCase()]: {
    oemName: DEMO_OEM_MISMATCH,
    manufacturerCode: "OEM-SANDBOX-002",
    authorizationStatus: "LISTED (DEMO)",
  },
};

export function normalizeGstin(value: string): string {
  return value.trim().toUpperCase();
}

export function normalizeUdyam(value: string): string {
  return value.trim().toUpperCase();
}

export function lookupDemoGst(gstin: string): DemoGstRecord | null {
  return GST_RECORDS[normalizeGstin(gstin)] ?? null;
}

export function listDemoGstRecords(): DemoGstRecord[] {
  return Object.values(GST_RECORDS).sort((left, right) => left.gstin.localeCompare(right.gstin));
}

export function updateDemoGstRecord(
  gstin: string,
  fields: { legalName?: string; registrationStatus?: string; state?: string }
): DemoGstRecord | null {
  const key = normalizeGstin(gstin);
  const existing = GST_RECORDS[key];
  if (!existing) {
    return null;
  }

  if (typeof fields.legalName === "string" && fields.legalName.trim()) {
    existing.legalName = fields.legalName.trim();
  }
  if (typeof fields.registrationStatus === "string" && fields.registrationStatus.trim()) {
    existing.registrationStatus = fields.registrationStatus.trim();
  }
  if (typeof fields.state === "string" && fields.state.trim()) {
    existing.state = fields.state.trim();
  }

  return { ...existing };
}

export function lookupDemoUdyam(udyam: string): DemoUdyamRecord | null {
  return UDYAM_RECORDS[normalizeUdyam(udyam)] ?? null;
}

export function lookupDemoOem(oem: string): DemoOemRecord | null {
  const key = oem.trim().toLowerCase();
  return key ? (OEM_RECORDS[key] ?? null) : null;
}
