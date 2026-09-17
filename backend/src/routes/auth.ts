import { Router } from "express";
import bcrypt from "bcryptjs";
import { requireAuth } from "../auth/middleware";
import { signAuthToken } from "../auth/jwt";
import { sendError } from "../http/errors";
import { findUserByEmail, toPublicUser } from "../users/userRepository";

export const authRouter = Router();

authRouter.post("/login", (req, res) => {
  const body = req.body as { email?: unknown; username?: unknown; password?: unknown };
  const email =
    typeof body.email === "string"
      ? body.email.trim()
      : typeof body.username === "string"
        ? body.username.trim()
        : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    sendError(res, 400, "Email and password are required");
    return;
  }

  const user = findUserByEmail(email);
  if (!user || !user.password_hash) {
    sendError(res, 401, "Invalid credentials");
    return;
  }

  const passwordMatches = bcrypt.compareSync(password, user.password_hash);
  if (!passwordMatches) {
    sendError(res, 401, "Invalid credentials");
    return;
  }

  const publicUser = toPublicUser(user);
  const token = signAuthToken(user.id, user.role);

  res.json({
    token,
    user: publicUser,
  });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.currentUser });
});
