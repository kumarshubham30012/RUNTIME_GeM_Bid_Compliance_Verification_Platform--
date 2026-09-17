import bcrypt from "bcryptjs";
import type { PublicUser } from "../auth/types";
import { getDb } from "../db/client";
import { deriveTenderStatus } from "../tenders/status";
import {
  createStaffUser,
  deleteStaffUser,
  findUserByEmail,
  findUserById,
  listUsers,
} from "../users/userRepository";
import {
  listDemoGstRecords,
  updateDemoGstRecord,
  type DemoGstRecord,
} from "../verification/demoDatabase";

export type AdminTenderRow = {
  officerId: number;
  officerName: string;
  officerEmail: string;
  tenderId: number;
  title: string;
  department: string;
  status: string;
  applicationCount: number;
};

export function listAdminUsers(_admin: PublicUser): PublicUser[] {
  return listUsers();
}

export function createAdminStaffUser(
  _admin: PublicUser,
  input: { email: string; password: string; fullName: string; role: "officer" | "admin" }
): PublicUser | "duplicate" | "invalid" {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  const password = input.password;
  if (!email || !fullName || !password) {
    return "invalid";
  }
  if (findUserByEmail(email)) {
    return "duplicate";
  }

  return createStaffUser({
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    fullName,
    role: input.role,
  });
}

export function removeAdminStaffUser(
  admin: PublicUser,
  userId: number
): "ok" | "self" | "missing" | "forbidden_target" {
  if (userId === admin.id) {
    return "self";
  }

  const target = findUserById(userId);
  if (!target) {
    return "missing";
  }
  if (target.role !== "officer" && target.role !== "admin") {
    return "forbidden_target";
  }

  return deleteStaffUser(userId) ? "ok" : "missing";
}

export function listAdminTenderOversight(_admin: PublicUser): AdminTenderRow[] {
  const rows = getDb()
    .prepare(
      `SELECT
         u.id AS officer_id,
         COALESCE(u.full_name, '') AS officer_name,
         COALESCE(u.email, '') AS officer_email,
         t.id AS tender_id,
         t.title,
         t.department,
         t.opening_date,
         t.closing_date,
         (
           SELECT COUNT(*) FROM applications a WHERE a.tender_id = t.id
         ) AS application_count
       FROM users u
       LEFT JOIN tenders t ON t.created_by_user_id = u.id
         AND t.opening_date IS NOT NULL
         AND t.closing_date IS NOT NULL
       WHERE u.role = 'officer'
       ORDER BY u.full_name ASC, u.id ASC, t.created_at DESC, t.id DESC`
    )
    .all() as Array<{
    officer_id: number;
    officer_name: string;
    officer_email: string;
    tender_id: number | null;
    title: string | null;
    department: string | null;
    opening_date: string | null;
    closing_date: string | null;
    application_count: number;
  }>;

  return rows
    .filter((row) => row.tender_id !== null)
    .map((row) => ({
      officerId: row.officer_id,
      officerName: row.officer_name,
      officerEmail: row.officer_email,
      tenderId: Number(row.tender_id),
      title: row.title ?? "",
      department: row.department ?? "",
      status: deriveTenderStatus(row.opening_date ?? "", row.closing_date ?? ""),
      applicationCount: Number(row.application_count),
    }));
}

export function listAdminSandboxGst(_admin: PublicUser): DemoGstRecord[] {
  return listDemoGstRecords();
}

export function updateAdminSandboxGst(
  _admin: PublicUser,
  gstin: string,
  fields: { legalName?: string; registrationStatus?: string; state?: string }
): DemoGstRecord | null {
  return updateDemoGstRecord(gstin, fields);
}
