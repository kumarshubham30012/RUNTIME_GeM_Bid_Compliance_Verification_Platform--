import { Router } from "express";
import { requireAuth, requireRole } from "../auth/middleware";
import {
  createAdminStaffUser,
  listAdminSandboxGst,
  listAdminTenderOversight,
  listAdminUsers,
  removeAdminStaffUser,
  updateAdminSandboxGst,
} from "../admin/adminService";
import { sendError } from "../http/errors";
import { parsePositiveInt } from "../http/ids";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("admin"));

adminRouter.get("/users", (req, res) => {
  const user = req.currentUser;
  if (!user) {
    sendError(res, 401, "Authentication required");
    return;
  }
  res.json({ users: listAdminUsers(user) });
});

adminRouter.post("/users", (req, res) => {
  const user = req.currentUser;
  if (!user) {
    sendError(res, 401, "Authentication required");
    return;
  }

  const body = req.body as {
    email?: unknown;
    password?: unknown;
    fullName?: unknown;
    role?: unknown;
  };
  const role = body.role === "officer" || body.role === "admin" ? body.role : null;
  if (!role) {
    sendError(res, 400, "Role must be officer or admin");
    return;
  }

  const created = createAdminStaffUser(user, {
    email: typeof body.email === "string" ? body.email : "",
    password: typeof body.password === "string" ? body.password : "",
    fullName: typeof body.fullName === "string" ? body.fullName : "",
    role,
  });
  if (created === "invalid") {
    sendError(res, 400, "Email, password, and name are required");
    return;
  }
  if (created === "duplicate") {
    sendError(res, 409, "A user with that email already exists");
    return;
  }

  res.status(201).json({ user: created });
});

adminRouter.delete("/users/:userId", (req, res) => {
  const user = req.currentUser;
  if (!user) {
    sendError(res, 401, "Authentication required");
    return;
  }

  const userId = parsePositiveInt(req.params.userId);
  if (userId === null) {
    sendError(res, 400, "User id is invalid");
    return;
  }

  const result = removeAdminStaffUser(user, userId);
  if (result === "self") {
    sendError(res, 400, "You cannot remove your own account");
    return;
  }
  if (result === "forbidden_target") {
    sendError(res, 400, "Only officer or admin accounts can be removed");
    return;
  }
  if (result === "missing") {
    sendError(res, 404, "User not found");
    return;
  }

  res.json({ removed: true });
});

adminRouter.get("/tenders", (req, res) => {
  const user = req.currentUser;
  if (!user) {
    sendError(res, 401, "Authentication required");
    return;
  }
  res.json({ tenders: listAdminTenderOversight(user) });
});

adminRouter.get("/sandbox/gst", (req, res) => {
  const user = req.currentUser;
  if (!user) {
    sendError(res, 401, "Authentication required");
    return;
  }
  res.json({ records: listAdminSandboxGst(user) });
});

adminRouter.patch("/sandbox/gst/:gstin", (req, res) => {
  const user = req.currentUser;
  if (!user) {
    sendError(res, 401, "Authentication required");
    return;
  }

  const gstin = typeof req.params.gstin === "string" ? req.params.gstin : "";
  const body = req.body as { legalName?: unknown; registrationStatus?: unknown; state?: unknown };
  const updated = updateAdminSandboxGst(user, gstin, {
    legalName: typeof body.legalName === "string" ? body.legalName : undefined,
    registrationStatus: typeof body.registrationStatus === "string" ? body.registrationStatus : undefined,
    state: typeof body.state === "string" ? body.state : undefined,
  });
  if (!updated) {
    sendError(res, 404, "Sandbox GST record not found");
    return;
  }

  res.json({ record: updated });
});
