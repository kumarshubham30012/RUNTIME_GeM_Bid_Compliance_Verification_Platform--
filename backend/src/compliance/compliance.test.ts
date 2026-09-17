import "./complianceTestEnv";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import bcrypt from "bcryptjs";
import { createApp } from "../app";
import { signAuthToken } from "../auth/jwt";
import type { PublicUser } from "../auth/types";
import { createDraftApplication, updateDraftApplication } from "../applications/applicationRepository";
import { getDb } from "../db/client";
import { createRequirement } from "../requirements/requirementRepository";
import { createOfficerTender } from "../tenders/tenderRepository";
import { upsertDemoUser } from "../users/userRepository";
import { upsertVerificationResult } from "../verification/verificationRepository";
import { sandboxResult } from "../verification/types";
import { DEMO_GSTIN, DEMO_OEM, DEMO_OEM_MISMATCH } from "../verification/demoDatabase";
import { runOwnedEntityResolution } from "../entityResolution/entityResolutionService";
import { listOwnedCompliance, runOwnedCompliance } from "./complianceService";
import { listComplianceResults } from "./complianceRepository";

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

function addDocument(applicationId: number, requirementId: number): void {
  getDb()
    .prepare(
      `INSERT INTO application_documents (
         application_id, requirement_id, original_filename, stored_filename, mime_type, file_size, storage_path
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      applicationId,
      requirementId,
      "brochure.pdf",
      `stored-${applicationId}-${requirementId}.pdf`,
      "application/pdf",
      128,
      `/tmp/stored-${applicationId}-${requirementId}.pdf`
    );
}

const app = createApp();
let server: ReturnType<typeof app.listen>;
let baseUrl = "";

let officerId = 0;
let otherOfficerId = 0;
let bidderAId = 0;
let bidderBId = 0;
let bidderCId = 0;
let otherBidderId = 0;
let adminId = 0;
let tenderId = 0;
let otherTenderId = 0;
let documentReqId = 0;
let gstExactReqId = 0;
let oemMatchReqId = 0;
let manualReqId = 0;
let appAId = 0;
let appBId = 0;
let appCId = 0;
let otherAppId = 0;

before(() => {
  getDb();
  officerId = insertUser("officer-a@test.local", "officer", "Officer A");
  otherOfficerId = insertUser("officer-b@test.local", "officer", "Officer B");
  bidderAId = insertUser("bidder-a@test.local", "bidder", "Bidder A");
  bidderBId = insertUser("bidder-b@test.local", "bidder", "Bidder B");
  bidderCId = insertUser("bidder-c@test.local", "bidder", "Bidder C");
  otherBidderId = insertUser("bidder-other@test.local", "bidder", "Other Bidder");
  adminId = insertUser("admin@test.local", "admin", "Admin");

  const tender = createOfficerTender({
    title: "Phase 10 compliance tender",
    department: "Demo Health",
    openingDate: "2020-01-01",
    closingDate: "2099-01-01",
    officerId,
  });
  tenderId = tender.id;

  const otherTender = createOfficerTender({
    title: "Other officer tender",
    department: "Other",
    openingDate: "2020-01-01",
    closingDate: "2099-01-01",
    officerId: otherOfficerId,
  });
  otherTenderId = otherTender.id;

  documentReqId = createRequirement({
    tenderId,
    name: "Technical brochure",
    tenderClause: "Upload brochure",
    mandatory: true,
    verificationMethod: "DOCUMENT",
    ruleType: "EXISTS",
  }).id;
  gstExactReqId = createRequirement({
    tenderId,
    name: "GSTIN exact match",
    tenderClause: "GSTIN must match sandbox GST",
    mandatory: true,
    verificationMethod: "GST",
    ruleType: "EXACT_MATCH",
  }).id;
  oemMatchReqId = createRequirement({
    tenderId,
    name: "OEM entity match",
    tenderClause: "OEM name compared across sources",
    mandatory: true,
    verificationMethod: "OEM",
    ruleType: "MATCH",
  }).id;
  manualReqId = createRequirement({
    tenderId,
    name: "Officer inspection",
    tenderClause: "Manual review",
    mandatory: false,
    verificationMethod: "MANUAL",
    ruleType: "MANUAL_REVIEW",
  }).id;

  const appA = createDraftApplication(tenderId, bidderAId);
  updateDraftApplication(appA.id, bidderAId, {
    gstin: DEMO_GSTIN,
    pan: "ABCDE1234F",
    oem: DEMO_OEM,
    udyam: "",
  });
  appAId = appA.id;
  addDocument(appAId, documentReqId);
  upsertVerificationResult({
    applicationId: appAId,
    requirementId: gstExactReqId,
    result: sandboxResult({
      method: "GST",
      provider: "DemoGSTProvider",
      status: "VERIFIED",
      summary: "demo",
      data: { gstin: DEMO_GSTIN, legalName: "Sandbox Supplies Pvt Ltd" },
    }),
  });
  upsertVerificationResult({
    applicationId: appAId,
    requirementId: oemMatchReqId,
    result: sandboxResult({
      method: "OEM",
      provider: "DemoOEMProvider",
      status: "VERIFIED",
      summary: "demo",
      data: { oemName: DEMO_OEM },
    }),
  });
  runOwnedEntityResolution(publicUser(bidderAId, "bidder", "bidder-a@test.local", "Bidder A"), appAId);

  const appB = createDraftApplication(tenderId, bidderBId);
  updateDraftApplication(appB.id, bidderBId, {
    gstin: DEMO_GSTIN,
    pan: "ABCDE1234F",
    oem: DEMO_OEM_MISMATCH,
    udyam: "",
  });
  appBId = appB.id;
  addDocument(appBId, documentReqId);
  upsertVerificationResult({
    applicationId: appBId,
    requirementId: gstExactReqId,
    result: sandboxResult({
      method: "GST",
      provider: "DemoGSTProvider",
      status: "VERIFIED",
      summary: "demo",
      data: { gstin: DEMO_GSTIN, legalName: "Sandbox Supplies Pvt Ltd" },
    }),
  });
  upsertVerificationResult({
    applicationId: appBId,
    requirementId: oemMatchReqId,
    result: sandboxResult({
      method: "OEM",
      provider: "DemoOEMProvider",
      status: "VERIFIED",
      summary: "demo",
      data: { oemName: DEMO_OEM_MISMATCH },
    }),
  });
  runOwnedEntityResolution(publicUser(bidderBId, "bidder", "bidder-b@test.local", "Bidder B"), appBId);

  const appC = createDraftApplication(tenderId, bidderCId);
  appCId = appC.id;

  const otherApp = createDraftApplication(otherTenderId, otherBidderId);
  otherAppId = otherApp.id;

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

test("mostly compliant demo application is predominantly PASS", () => {
  const results = runOwnedCompliance(
    publicUser(bidderAId, "bidder", "bidder-a@test.local", "Bidder A"),
    appAId
  );
  assert.ok(Array.isArray(results));
  const byReq = Object.fromEntries(results.map((item) => [item.requirementId, item]));
  assert.equal(byReq[documentReqId].status, "PASS");
  assert.equal(byReq[gstExactReqId].status, "PASS");
  assert.equal(byReq[manualReqId].status, "REVIEW");
  assert.ok(results.filter((item) => item.status === "PASS").length >= 2);
});

test("mismatch demo maps POSSIBLE_MISMATCH to REVIEW not FAIL", () => {
  const results = runOwnedCompliance(
    publicUser(bidderBId, "bidder", "bidder-b@test.local", "Bidder B"),
    appBId
  );
  assert.ok(Array.isArray(results));
  const oem = results.find((item) => item.requirementId === oemMatchReqId);
  assert.ok(oem);
  assert.equal(oem.status, "REVIEW");
  assert.equal(oem.reasonCode, "ENTITY_POSSIBLE_MISMATCH");
});

test("missing-evidence demo is PENDING", () => {
  const results = runOwnedCompliance(
    publicUser(bidderCId, "bidder", "bidder-c@test.local", "Bidder C"),
    appCId
  );
  assert.ok(Array.isArray(results));
  const byReq = Object.fromEntries(results.map((item) => [item.requirementId, item]));
  assert.equal(byReq[documentReqId].status, "PENDING");
  assert.equal(byReq[gstExactReqId].status, "PENDING");
  assert.equal(byReq[oemMatchReqId].status, "PENDING");
  assert.ok(!results.some((item) => item.status === "PASS"));
});

test("results persist and re-run upserts without duplicates", () => {
  runOwnedCompliance(publicUser(bidderAId, "bidder", "bidder-a@test.local", "Bidder A"), appAId);
  runOwnedCompliance(publicUser(bidderAId, "bidder", "bidder-a@test.local", "Bidder A"), appAId);
  const stored = listComplianceResults(appAId, true);
  const count = getDb()
    .prepare(`SELECT COUNT(*) AS count FROM compliance_results WHERE application_id = ?`)
    .get(appAId) as { count: number };
  assert.equal(count.count, stored.length);
  assert.equal(count.count, 4);
});

test("updated verification changes the next evaluation", () => {
  upsertVerificationResult({
    applicationId: appAId,
    requirementId: gstExactReqId,
    result: sandboxResult({
      method: "GST",
      provider: "DemoGSTProvider",
      status: "VERIFIED",
      summary: "demo",
      data: { gstin: "27SANDBOX0002Z5", legalName: "Sandbox Supplies Pvt Ltd" },
    }),
  });
  const results = runOwnedCompliance(
    publicUser(bidderAId, "bidder", "bidder-a@test.local", "Bidder A"),
    appAId
  );
  assert.ok(Array.isArray(results));
  const gst = results.find((item) => item.requirementId === gstExactReqId);
  assert.equal(gst?.status, "FAIL");
  assert.equal(gst?.reasonCode, "EXACT_VALUE_MISMATCH");

  upsertVerificationResult({
    applicationId: appAId,
    requirementId: gstExactReqId,
    result: sandboxResult({
      method: "GST",
      provider: "DemoGSTProvider",
      status: "VERIFIED",
      summary: "demo",
      data: { gstin: DEMO_GSTIN, legalName: "Sandbox Supplies Pvt Ltd" },
    }),
  });
  const restored = runOwnedCompliance(
    publicUser(bidderAId, "bidder", "bidder-a@test.local", "Bidder A"),
    appAId
  );
  assert.ok(Array.isArray(restored));
  assert.equal(restored.find((item) => item.requirementId === gstExactReqId)?.status, "PASS");
});

test("admin cannot access compliance", () => {
  const listed = listOwnedCompliance(publicUser(adminId, "admin", "admin@test.local", "Admin"), appAId);
  assert.equal(listed, "forbidden");
});

test("unauthenticated GET is 401", async () => {
  const response = await fetch(`${baseUrl}/api/compliance/applications/${appAId}`);
  assert.equal(response.status, 401);
});

test("unauthenticated POST is 401", async () => {
  const response = await fetch(`${baseUrl}/api/compliance/applications/${appAId}/run`, {
    method: "POST",
  });
  assert.equal(response.status, 401);
});

test("bidder cannot access another bidder application", async () => {
  const token = signAuthToken(bidderAId, "bidder");
  const response = await fetch(`${baseUrl}/api/compliance/applications/${appBId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 404);
});

test("officer cannot access another officer application", async () => {
  const token = signAuthToken(officerId, "officer");
  const response = await fetch(`${baseUrl}/api/compliance/applications/${otherAppId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 404);
});

test("owner GET and POST succeed and ignore client status", async () => {
  const token = signAuthToken(bidderCId, "bidder");
  const run = await fetch(`${baseUrl}/api/compliance/applications/${appCId}/run`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "PASS" }),
  });
  assert.equal(run.status, 200);
  const body = (await run.json()) as { results: Array<{ status: string }> };
  assert.ok(!body.results.some((item) => item.status === "PASS"));

  const listed = await fetch(`${baseUrl}/api/compliance/applications/${appCId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(listed.status, 200);
});

test("officer owner can run compliance", async () => {
  const token = signAuthToken(officerId, "officer");
  const response = await fetch(`${baseUrl}/api/compliance/applications/${appBId}/run`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    results: Array<{ requirementId: number; status: string; reasonCode: string }>;
  };
  const oem = body.results.find((item) => item.requirementId === oemMatchReqId);
  assert.equal(oem?.status, "REVIEW");
});
