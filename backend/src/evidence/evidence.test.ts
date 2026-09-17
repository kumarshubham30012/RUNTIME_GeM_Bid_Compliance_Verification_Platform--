import "./evidenceTestEnv";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import bcrypt from "bcryptjs";
import { createApp } from "../app";
import { signAuthToken } from "../auth/jwt";
import type { PublicUser } from "../auth/types";
import { createDraftApplication, updateDraftApplication } from "../applications/applicationRepository";
import { runOwnedCompliance } from "../compliance/complianceService";
import { getDb } from "../db/client";
import { createRequirement } from "../requirements/requirementRepository";
import { createOfficerTender } from "../tenders/tenderRepository";
import { upsertDemoUser } from "../users/userRepository";
import { sandboxResult } from "../verification/types";
import { upsertVerificationResult } from "../verification/verificationRepository";
import { DEMO_GSTIN } from "../verification/demoDatabase";
import { generateOwnedEvidence, listOwnedEvidence } from "./evidenceService";
import { listEvidenceFindings } from "./evidenceRepository";
import { buildEvidenceFinding } from "./buildFinding";

function publicUser(id: number, role: PublicUser["role"], email: string, name: string): PublicUser {
  return { id, email, name, role };
}

function insertUser(email: string, role: "bidder" | "officer" | "admin", name: string): number {
  upsertDemoUser({
    email,
    passwordHash: bcrypt.hashSync("TestPass123!", 4),
    fullName: name,
    role,
  });
  const row = getDb().prepare(`SELECT id FROM users WHERE email = ?`).get(email) as { id: number };
  return row.id;
}

const app = createApp();
let server: ReturnType<typeof app.listen>;
let baseUrl = "";
let officerId = 0;
let otherOfficerId = 0;
let bidderId = 0;
let otherBidderId = 0;
let adminId = 0;
let applicationId = 0;
let otherApplicationId = 0;
let gstReqId = 0;
let manualReqId = 0;

before(() => {
  getDb();
  officerId = insertUser("officer-a@evidence.test", "officer", "Officer A");
  otherOfficerId = insertUser("officer-b@evidence.test", "officer", "Officer B");
  bidderId = insertUser("bidder-a@evidence.test", "bidder", "Bidder A");
  otherBidderId = insertUser("bidder-b@evidence.test", "bidder", "Bidder B");
  adminId = insertUser("admin@evidence.test", "admin", "Admin");

  const tender = createOfficerTender({
    title: "Evidence tender",
    department: "Demo",
    openingDate: "2020-01-01",
    closingDate: "2099-01-01",
    officerId,
  });
  gstReqId = createRequirement({
    tenderId: tender.id,
    name: "GSTIN exact match",
    tenderClause: "GSTIN must match verified GST",
    mandatory: true,
    verificationMethod: "GST",
    ruleType: "EXACT_MATCH",
  }).id;
  manualReqId = createRequirement({
    tenderId: tender.id,
    name: "Officer inspection",
    tenderClause: "Manual review",
    mandatory: false,
    verificationMethod: "MANUAL",
    ruleType: "MANUAL_REVIEW",
  }).id;

  const owned = createDraftApplication(tender.id, bidderId);
  updateDraftApplication(owned.id, bidderId, {
    gstin: DEMO_GSTIN,
    pan: "",
    oem: "",
    udyam: "",
  });
  applicationId = owned.id;
  upsertVerificationResult({
    applicationId,
    requirementId: gstReqId,
    result: sandboxResult({
      method: "GST",
      provider: "DemoGSTProvider",
      status: "VERIFIED",
      summary: "demo",
      data: { gstin: "27SANDBOX0002Z5", legalName: "Other Supplies Pvt Ltd" },
    }),
  });
  runOwnedCompliance(publicUser(bidderId, "bidder", "bidder-a@evidence.test", "Bidder A"), applicationId);

  const otherTender = createOfficerTender({
    title: "Other tender",
    department: "Other",
    openingDate: "2020-01-01",
    closingDate: "2099-01-01",
    officerId: otherOfficerId,
  });
  otherApplicationId = createDraftApplication(otherTender.id, otherBidderId).id;

  server = app.listen(0);
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
});

test("buildFinding uses stored values only", () => {
  const finding = buildEvidenceFinding({
    requirementName: "GSTIN exact match",
    tenderClause: "GSTIN must match verified GST",
    verificationMethod: "GST",
    ruleType: "EXACT_MATCH",
    status: "FAIL",
    reasonCode: "EXACT_VALUE_MISMATCH",
    application: { gstin: DEMO_GSTIN, pan: "", oem: "", udyam: "" },
    documentNames: [],
    verification: {
      status: "VERIFIED",
      method: "GST",
      summary: "demo",
      data: { gstin: "27SANDBOX0002Z5" },
    },
    entityResults: [],
  });
  assert.equal(finding.submittedValue, DEMO_GSTIN);
  assert.equal(finding.verifiedValue, "27SANDBOX0002Z5");
  assert.match(finding.reasoning, /does not match/);
  assert.equal(finding.reasoning.includes("fraud"), false);
});

test("generate persists findings for non-PASS results only", () => {
  const findings = generateOwnedEvidence(
    publicUser(bidderId, "bidder", "bidder-a@evidence.test", "Bidder A"),
    applicationId
  );
  assert.ok(Array.isArray(findings));
  assert.ok(findings.length >= 2);
  assert.ok(findings.every((item) => item.status !== "PASS"));
  const gst = findings.find((item) => item.requirementId === gstReqId);
  const manual = findings.find((item) => item.requirementId === manualReqId);
  assert.ok(gst);
  assert.equal(gst.status, "FAIL");
  assert.equal(gst.submittedValue, DEMO_GSTIN);
  assert.equal(gst.verifiedValue, "27SANDBOX0002Z5");
  assert.match(gst.evidenceSources, /APPLICATION GST/);
  assert.match(gst.evidenceSources, /VERIFICATION GST/);
  assert.match(gst.tenderClause, /GSTIN must match/);
  assert.ok(manual);
  assert.equal(manual.status, "REVIEW");
});

test("repeated generate upserts instead of duplicating", () => {
  generateOwnedEvidence(publicUser(bidderId, "bidder", "bidder-a@evidence.test", "Bidder A"), applicationId);
  generateOwnedEvidence(publicUser(bidderId, "bidder", "bidder-a@evidence.test", "Bidder A"), applicationId);
  const stored = listEvidenceFindings(applicationId);
  const count = getDb()
    .prepare(`SELECT COUNT(*) AS count FROM evidence_findings WHERE application_id = ?`)
    .get(applicationId) as { count: number };
  assert.equal(count.count, stored.length);
});

test("admin cannot access evidence", () => {
  const listed = listOwnedEvidence(publicUser(adminId, "admin", "admin@evidence.test", "Admin"), applicationId);
  assert.equal(listed, "forbidden");
});

test("unauthenticated GET is 401", async () => {
  const response = await fetch(`${baseUrl}/api/evidence/applications/${applicationId}`);
  assert.equal(response.status, 401);
});

test("unauthenticated POST is 401", async () => {
  const response = await fetch(`${baseUrl}/api/evidence/applications/${applicationId}/generate`, {
    method: "POST",
  });
  assert.equal(response.status, 401);
});

test("bidder cannot access another application", async () => {
  const token = signAuthToken(bidderId, "bidder");
  const response = await fetch(`${baseUrl}/api/evidence/applications/${otherApplicationId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 404);
});

test("officer cannot access another officer application", async () => {
  const token = signAuthToken(officerId, "officer");
  const response = await fetch(`${baseUrl}/api/evidence/applications/${otherApplicationId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 404);
});

test("owner generate and list succeed", async () => {
  const token = signAuthToken(officerId, "officer");
  const generated = await fetch(`${baseUrl}/api/evidence/applications/${applicationId}/generate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(generated.status, 200);
  const listed = await fetch(`${baseUrl}/api/evidence/applications/${applicationId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(listed.status, 200);
  const body = (await listed.json()) as { findings: Array<{ status: string }> };
  assert.ok(body.findings.every((item) => item.status !== "PASS"));
});
