import "./adminTestEnv";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import bcrypt from "bcryptjs";
import { createApp } from "../app";
import { signAuthToken } from "../auth/jwt";
import { createDraftApplication } from "../applications/applicationRepository";
import { getDb } from "../db/client";
import { createOfficerTender } from "../tenders/tenderRepository";
import { findUserByEmail, upsertDemoUser } from "../users/userRepository";
import { DEMO_GSTIN, lookupDemoGst } from "../verification/demoDatabase";

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
let adminId = 0;
let officerId = 0;
let otherOfficerId = 0;
let bidderId = 0;
const originalLegalName = lookupDemoGst(DEMO_GSTIN)?.legalName ?? "";

before(() => {
  getDb();
  adminId = insertUser("admin-a@admin.test", "admin", "Admin A");
  officerId = insertUser("officer-a@admin.test", "officer", "Officer A");
  otherOfficerId = insertUser("officer-b@admin.test", "officer", "Officer B");
  bidderId = insertUser("bidder-a@admin.test", "bidder", "Bidder A");

  const tenderA = createOfficerTender({
    title: "Officer A tender",
    department: "Health",
    openingDate: "2020-01-01",
    closingDate: "2099-01-01",
    officerId,
  });
  createDraftApplication(tenderA.id, bidderId);
  createOfficerTender({
    title: "Officer B tender",
    department: "Education",
    openingDate: "2020-01-01",
    closingDate: "2099-01-01",
    officerId: otherOfficerId,
  });

  server = app.listen(0);
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  const original = lookupDemoGst(DEMO_GSTIN);
  if (original && originalLegalName) {
    original.legalName = originalLegalName;
  }
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

test("admin can create officer", async () => {
  const token = signAuthToken(adminId, "admin");
  const response = await fetch(`${baseUrl}/api/admin/users`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "new-officer@admin.test",
      password: "NewOfficer123!",
      fullName: "New Officer",
      role: "officer",
    }),
  });
  assert.equal(response.status, 201);
  const body = (await response.json()) as { user: { email: string; role: string } };
  assert.equal(body.user.email, "new-officer@admin.test");
  assert.equal(body.user.role, "officer");
  assert.ok(findUserByEmail("new-officer@admin.test"));
});

test("admin can create admin", async () => {
  const token = signAuthToken(adminId, "admin");
  const response = await fetch(`${baseUrl}/api/admin/users`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "new-admin@admin.test",
      password: "NewAdmin123!",
      fullName: "New Admin",
      role: "admin",
    }),
  });
  assert.equal(response.status, 201);
  const body = (await response.json()) as { user: { role: string } };
  assert.equal(body.user.role, "admin");
});

test("admin cannot remove own account", async () => {
  const token = signAuthToken(adminId, "admin");
  const response = await fetch(`${baseUrl}/api/admin/users/${adminId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 400);
  assert.ok(findUserByEmail("admin-a@admin.test"));
});

test("admin can remove eligible officer", async () => {
  const token = signAuthToken(adminId, "admin");
  const created = await fetch(`${baseUrl}/api/admin/users`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "temp-officer@admin.test",
      password: "TempOfficer123!",
      fullName: "Temp Officer",
      role: "officer",
    }),
  });
  const createdBody = (await created.json()) as { user: { id: number } };
  const response = await fetch(`${baseUrl}/api/admin/users/${createdBody.user.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  assert.equal(findUserByEmail("temp-officer@admin.test"), null);
});

test("officer and bidder cannot access admin APIs", async () => {
  const officerToken = signAuthToken(officerId, "officer");
  const bidderToken = signAuthToken(bidderId, "bidder");
  const officerResponse = await fetch(`${baseUrl}/api/admin/users`, {
    headers: { Authorization: `Bearer ${officerToken}` },
  });
  const bidderResponse = await fetch(`${baseUrl}/api/admin/users`, {
    headers: { Authorization: `Bearer ${bidderToken}` },
  });
  assert.equal(officerResponse.status, 403);
  assert.equal(bidderResponse.status, 403);
});

test("unauthenticated admin request is 401", async () => {
  const response = await fetch(`${baseUrl}/api/admin/users`);
  assert.equal(response.status, 401);
});

test("admin can see cross-officer tenders", async () => {
  const token = signAuthToken(adminId, "admin");
  const response = await fetch(`${baseUrl}/api/admin/tenders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    tenders: Array<{ officerName: string; title: string; applicationCount: number }>;
  };
  const titles = body.tenders.map((row) => row.title);
  assert.ok(titles.includes("Officer A tender"));
  assert.ok(titles.includes("Officer B tender"));
  const officerA = body.tenders.find((row) => row.title === "Officer A tender");
  assert.equal(officerA?.applicationCount, 1);
});

test("admin can edit sandbox GST data used by Phase 8 provider", async () => {
  const token = signAuthToken(adminId, "admin");
  const response = await fetch(`${baseUrl}/api/admin/sandbox/gst/${DEMO_GSTIN}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ legalName: "Admin Edited Supplies Pvt Ltd" }),
  });
  assert.equal(response.status, 200);
  const body = (await response.json()) as { record: { legalName: string; gstin: string } };
  assert.equal(body.record.gstin, DEMO_GSTIN);
  assert.equal(body.record.legalName, "Admin Edited Supplies Pvt Ltd");
  const lookedUp = lookupDemoGst(DEMO_GSTIN);
  assert.equal(lookedUp?.legalName, "Admin Edited Supplies Pvt Ltd");
});
