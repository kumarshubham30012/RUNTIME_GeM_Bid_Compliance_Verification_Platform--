import "./comparisonTestEnv";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import bcrypt from "bcryptjs";
import { createApp } from "../app";
import { signAuthToken } from "../auth/jwt";
import { createDraftApplication } from "../applications/applicationRepository";
import { upsertComplianceResults } from "../compliance/complianceRepository";
import { getDb } from "../db/client";
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
let bidderTwoId = 0;
let tenderId = 0;
let otherTenderId = 0;
let passReqId = 0;
let reviewReqId = 0;
let failReqId = 0;
let appOneId = 0;
let appTwoId = 0;

before(() => {
  getDb();
  officerId = insertUser("officer-a@comparison.test", "officer", "Officer A");
  otherOfficerId = insertUser("officer-b@comparison.test", "officer", "Officer B");
  bidderId = insertUser("bidder-a@comparison.test", "bidder", "Alpha Bidder");
  bidderTwoId = insertUser("bidder-b@comparison.test", "bidder", "Beta Bidder");

  const tender = createOfficerTender({
    title: "Comparison tender",
    department: "Demo",
    openingDate: "2020-01-01",
    closingDate: "2099-01-01",
    officerId,
  });
  tenderId = tender.id;
  passReqId = createRequirement({
    tenderId,
    name: "Document exists",
    tenderClause: "Brochure",
    mandatory: true,
    verificationMethod: "DOCUMENT",
    ruleType: "EXISTS",
  }).id;
  reviewReqId = createRequirement({
    tenderId,
    name: "Manual review",
    tenderClause: "Inspect",
    mandatory: false,
    verificationMethod: "MANUAL",
    ruleType: "MANUAL_REVIEW",
  }).id;
  failReqId = createRequirement({
    tenderId,
    name: "GST match",
    tenderClause: "GSTIN",
    mandatory: true,
    verificationMethod: "GST",
    ruleType: "EXACT_MATCH",
  }).id;

  appOneId = createDraftApplication(tenderId, bidderId).id;
  appTwoId = createDraftApplication(tenderId, bidderTwoId).id;

  upsertComplianceResults(
    appOneId,
    [
      { requirementId: passReqId, status: "PASS", reasonCode: "REQUIRED_DOCUMENT_PRESENT" },
      { requirementId: reviewReqId, status: "REVIEW", reasonCode: "MANUAL_REVIEW_REQUIRED" },
      { requirementId: failReqId, status: "PASS", reasonCode: "EXACT_VALUE_MATCH" },
    ],
    false
  );
  upsertComplianceResults(
    appTwoId,
    [
      { requirementId: passReqId, status: "PENDING", reasonCode: "REQUIRED_DOCUMENT_MISSING" },
      { requirementId: reviewReqId, status: "REVIEW", reasonCode: "MANUAL_REVIEW_REQUIRED" },
      { requirementId: failReqId, status: "FAIL", reasonCode: "EXACT_VALUE_MISMATCH" },
    ],
    false
  );

  otherTenderId = createOfficerTender({
    title: "Other officer tender",
    department: "Other",
    openingDate: "2020-01-01",
    closingDate: "2099-01-01",
    officerId: otherOfficerId,
  }).id;

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

test("officer can access comparison with score risk and counts", async () => {
  const token = signAuthToken(officerId, "officer");
  const response = await fetch(`${baseUrl}/api/officer/tenders/${tenderId}/comparison`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    tenderId: number;
    bidders: Array<{
      applicationId: number;
      bidderName: string;
      score: number | null;
      risk: string;
      counts: Record<string, number>;
    }>;
  };
  assert.equal(body.tenderId, tenderId);
  assert.equal(body.bidders.length, 2);

  const alpha = body.bidders.find((row) => row.applicationId === appOneId);
  const beta = body.bidders.find((row) => row.applicationId === appTwoId);
  assert.ok(alpha);
  assert.ok(beta);
  assert.equal(alpha.bidderName, "Alpha Bidder");
  assert.equal(alpha.score, 83.3);
  assert.equal(alpha.risk, "LOW");
  assert.equal(alpha.counts.PASS, 2);
  assert.equal(alpha.counts.REVIEW, 1);
  assert.equal(alpha.counts.FAIL, 0);
  assert.equal(beta.score, 16.7);
  assert.equal(beta.risk, "HIGH");
  assert.equal(beta.counts.FAIL, 1);
  assert.equal(beta.counts.PENDING, 1);
  assert.equal(beta.counts.REVIEW, 1);
});

test("bidder token is rejected", async () => {
  const token = signAuthToken(bidderId, "bidder");
  const response = await fetch(`${baseUrl}/api/officer/tenders/${tenderId}/comparison`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 403);
});

test("unauthenticated request is rejected", async () => {
  const response = await fetch(`${baseUrl}/api/officer/tenders/${tenderId}/comparison`);
  assert.equal(response.status, 401);
});

test("unauthorized officer is rejected", async () => {
  const token = signAuthToken(officerId, "officer");
  const response = await fetch(`${baseUrl}/api/officer/tenders/${otherTenderId}/comparison`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 404);
});
