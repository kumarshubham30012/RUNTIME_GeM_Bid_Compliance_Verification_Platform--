import "./decisionTestEnv";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import bcrypt from "bcryptjs";
import { createApp } from "../app";
import { signAuthToken } from "../auth/jwt";
import type { PublicUser } from "../auth/types";
import { createDraftApplication } from "../applications/applicationRepository";
import { upsertComplianceResults } from "../compliance/complianceRepository";
import { getDb } from "../db/client";
import { replaceEvidenceFindings } from "../evidence/evidenceRepository";
import { createRequirement } from "../requirements/requirementRepository";
import { actOnOwnedFinding } from "../resolution/resolutionService";
import { createOfficerTender } from "../tenders/tenderRepository";
import { upsertDemoUser } from "../users/userRepository";
import { getOfficerDecision } from "./decisionRepository";
import { OFFICER_DECISIONS } from "./types";

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
  officerId = insertUser("officer-a@decision.test", "officer", "Officer A");
  otherOfficerId = insertUser("officer-b@decision.test", "officer", "Officer B");
  bidderId = insertUser("bidder-a@decision.test", "bidder", "Bidder A");

  const tender = createOfficerTender({
    title: "Decision tender",
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

  getDb()
    .prepare(
      `INSERT INTO application_documents (
         application_id, requirement_id, original_filename, stored_filename, mime_type, file_size, storage_path
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(applicationId, requirementId, "gst.pdf", "stored-gst.pdf", "application/pdf", 12, "/tmp/gst.pdf");

  upsertComplianceResults(
    applicationId,
    [{ requirementId, status: "FAIL", reasonCode: "EXACT_VALUE_MISMATCH" }],
    false
  );
  const findings = replaceEvidenceFindings(applicationId, [
    {
      requirementId,
      requirementName: "GSTIN exact match",
      tenderClause: "GSTIN must match",
      status: "FAIL",
      submittedValue: "27SANDBOX0001Z5",
      verifiedValue: "27SANDBOX0002Z5",
      evidenceSources: "APPLICATION GST: 27SANDBOX0001Z5",
      reasoning: 'Requirement "GSTIN exact match" is FAIL because the submitted value does not match.',
    },
  ]);
  findingId = findings[0].id;

  const officer: PublicUser = {
    id: officerId,
    email: "officer-a@decision.test",
    name: "Officer A",
    role: "officer",
  };
  actOnOwnedFinding(officer, applicationId, findingId, "REQUEST_CLARIFICATION");

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

test("authorized officer can create and update decision", async () => {
  const token = signAuthToken(officerId, "officer");
  const created = await fetch(`${baseUrl}/api/officer/applications/${applicationId}/decision`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "KEEP_UNDER_REVIEW", reason: "Need more review" }),
  });
  assert.equal(created.status, 200);
  const createdBody = (await created.json()) as { decision: { decision: string; reason: string } };
  assert.equal(createdBody.decision.decision, "KEEP_UNDER_REVIEW");
  assert.equal(createdBody.decision.reason, "Need more review");

  const updated = await fetch(`${baseUrl}/api/officer/applications/${applicationId}/decision`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "APPROVE", reason: "Officer approved after review" }),
  });
  assert.equal(updated.status, 200);
  const updatedBody = (await updated.json()) as { decision: { decision: string } };
  assert.equal(updatedBody.decision.decision, "APPROVE");

  const stored = getOfficerDecision(applicationId);
  assert.equal(stored?.decision, "APPROVE");
  assert.equal(stored?.reason, "Officer approved after review");
});

test("all four decision types are accepted", async () => {
  const token = signAuthToken(officerId, "officer");
  for (const decision of OFFICER_DECISIONS) {
    const response = await fetch(`${baseUrl}/api/officer/applications/${applicationId}/decision`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as { decision: { decision: string } };
    assert.equal(body.decision.decision, decision);
  }
});

test("bidder is rejected", async () => {
  const token = signAuthToken(bidderId, "bidder");
  const response = await fetch(`${baseUrl}/api/officer/applications/${applicationId}/decision`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "APPROVE" }),
  });
  assert.equal(response.status, 403);
});

test("unauthenticated request is rejected", async () => {
  const response = await fetch(`${baseUrl}/api/officer/applications/${applicationId}/decision`);
  assert.equal(response.status, 401);
});

test("unauthorized officer is rejected", async () => {
  const token = signAuthToken(officerId, "officer");
  const response = await fetch(`${baseUrl}/api/officer/applications/${otherApplicationId}/decision`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "REJECT" }),
  });
  assert.equal(response.status, 404);
});

test("audit events are chronological and include Phase 15 actions", async () => {
  const token = signAuthToken(officerId, "officer");
  await fetch(`${baseUrl}/api/officer/applications/${applicationId}/decision`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "REQUEST_CLARIFICATION", reason: "Ask bidder" }),
  });

  const response = await fetch(`${baseUrl}/api/officer/applications/${applicationId}/audit`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    events: Array<{ eventType: string; description: string; timestamp: string }>;
  };
  assert.ok(body.events.length >= 4);
  const types = body.events.map((event) => event.eventType);
  assert.ok(types.includes("DOCUMENT_UPLOAD"));
  assert.ok(types.includes("COMPLIANCE"));
  assert.ok(types.includes("EVIDENCE"));
  assert.ok(types.includes("RESOLUTION_ACTION"));
  assert.ok(types.includes("OFFICER_DECISION"));
  assert.ok(body.events.some((event) => event.eventType === "RESOLUTION_ACTION" && event.description.includes("REQUEST_CLARIFICATION")));

  const timestamps = body.events.map((event) => event.timestamp);
  const sorted = [...timestamps].sort();
  assert.deepEqual(timestamps, sorted);
});
