import "./resolutionTestEnv";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import bcrypt from "bcryptjs";
import { createApp } from "../app";
import { signAuthToken } from "../auth/jwt";
import { createDraftApplication } from "../applications/applicationRepository";
import { getDb } from "../db/client";
import { replaceEvidenceFindings } from "../evidence/evidenceRepository";
import { createRequirement } from "../requirements/requirementRepository";
import { createOfficerTender } from "../tenders/tenderRepository";
import { upsertDemoUser } from "../users/userRepository";

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
let applicationId = 0;
let otherApplicationId = 0;
let findingId = 0;

before(() => {
  getDb();
  officerId = insertUser("officer-a@resolution.test", "officer", "Officer A");
  otherOfficerId = insertUser("officer-b@resolution.test", "officer", "Officer B");
  bidderId = insertUser("bidder-a@resolution.test", "bidder", "Bidder A");

  const tender = createOfficerTender({
    title: "Resolution tender",
    department: "Demo",
    openingDate: "2020-01-01",
    closingDate: "2099-01-01",
    officerId,
  });
  const requirementId = createRequirement({
    tenderId: tender.id,
    name: "GSTIN exact match",
    tenderClause: "GSTIN must match",
    mandatory: true,
    verificationMethod: "GST",
    ruleType: "EXACT_MATCH",
  }).id;
  applicationId = createDraftApplication(tender.id, bidderId).id;
  const findings = replaceEvidenceFindings(applicationId, [
    {
      requirementId,
      requirementName: "GSTIN exact match",
      tenderClause: "GSTIN must match",
      status: "FAIL",
      submittedValue: "27SANDBOX0001Z5",
      verifiedValue: "27SANDBOX0002Z5",
      evidenceSources: "APPLICATION GST: 27SANDBOX0001Z5 | VERIFICATION GST (VERIFIED): 27SANDBOX0002Z5",
      reasoning:
        'Requirement "GSTIN exact match" is FAIL because the submitted value (27SANDBOX0001Z5) does not match the verified value (27SANDBOX0002Z5).',
    },
  ]);
  findingId = findings[0].id;

  const otherTender = createOfficerTender({
    title: "Other tender",
    department: "Other",
    openingDate: "2020-01-01",
    closingDate: "2099-01-01",
    officerId: otherOfficerId,
  });
  otherApplicationId = createDraftApplication(otherTender.id, bidderId).id;

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

type ResolutionResponse = {
  items: Array<{
    findingId: number;
    resolutionStatus: string;
    guidance: { whatHappened: string; whyIssue: string; evidenceUsed: string; nextVerify: string };
    history: Array<{
      id: number;
      action: string;
      previousStatus: string;
      newStatus: string;
      officerUserId: number;
      createdAt: string;
    }>;
  }>;
};

test("officer can view guidance", async () => {
  const token = signAuthToken(officerId, "officer");
  const response = await fetch(`${baseUrl}/api/officer/applications/${applicationId}/resolutions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as ResolutionResponse;
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].findingId, findingId);
  assert.equal(body.items[0].resolutionStatus, "OPEN");
  assert.match(body.items[0].guidance.whatHappened, /does not match/);
  assert.match(body.items[0].guidance.whyIssue, /FAIL/);
  assert.match(body.items[0].guidance.evidenceUsed, /27SANDBOX0001Z5/);
  assert.match(body.items[0].guidance.nextVerify, /submitted value/);
  assert.equal(body.items[0].history.length, 0);
});

test("bidder is rejected", async () => {
  const token = signAuthToken(bidderId, "bidder");
  const response = await fetch(`${baseUrl}/api/officer/applications/${applicationId}/resolutions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 403);
});

test("unauthenticated access is rejected", async () => {
  const response = await fetch(`${baseUrl}/api/officer/applications/${applicationId}/resolutions`);
  assert.equal(response.status, 401);
});

test("unauthorized officer is rejected", async () => {
  const token = signAuthToken(officerId, "officer");
  const response = await fetch(`${baseUrl}/api/officer/applications/${otherApplicationId}/resolutions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 404);
});

test("Request Clarification and Mark Resolved update status and chronological history", async () => {
  const token = signAuthToken(officerId, "officer");
  const clarify = await fetch(
    `${baseUrl}/api/officer/applications/${applicationId}/resolutions/${findingId}/clarify`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  assert.equal(clarify.status, 200);
  const afterClarify = (await clarify.json()) as ResolutionResponse;
  const clarified = afterClarify.items.find((item) => item.findingId === findingId);
  assert.equal(clarified?.resolutionStatus, "CLARIFICATION_REQUESTED");
  assert.equal(clarified?.history.length, 1);
  assert.equal(clarified?.history[0].action, "REQUEST_CLARIFICATION");
  assert.equal(clarified?.history[0].previousStatus, "OPEN");
  assert.equal(clarified?.history[0].newStatus, "CLARIFICATION_REQUESTED");
  assert.equal(clarified?.history[0].officerUserId, officerId);

  const resolved = await fetch(
    `${baseUrl}/api/officer/applications/${applicationId}/resolutions/${findingId}/resolve`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  assert.equal(resolved.status, 200);
  const afterResolve = (await resolved.json()) as ResolutionResponse;
  const item = afterResolve.items.find((entry) => entry.findingId === findingId);
  assert.equal(item?.resolutionStatus, "RESOLVED");
  assert.equal(item?.history.length, 2);
  assert.equal(item?.history[0].action, "REQUEST_CLARIFICATION");
  assert.equal(item?.history[1].action, "MARK_RESOLVED");
  assert.equal(item?.history[1].previousStatus, "CLARIFICATION_REQUESTED");
  assert.equal(item?.history[1].newStatus, "RESOLVED");
  assert.ok(item && item.history[0].createdAt <= item.history[1].createdAt);
  assert.ok(item && item.history[0].id < item.history[1].id);
});
