import type { NextFunction, Request, Response } from "express";
import { sendError } from "../http/errors";
import { findUserById, toPublicUser } from "../users/userRepository";
import { verifyAuthToken } from "./jwt";
import type { Role } from "./types";

function readBearerToken(req: Request): string | null {
  const header = req.header("authorization");
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = readBearerToken(req);
  if (!token) {
    sendError(res, 401, "Authentication required");
    return;
  }

  try {
    const payload = verifyAuthToken(token);
    const user = findUserById(payload.userId);

    if (!user || user.role !== payload.role) {
      sendError(res, 401, "Authentication required");
      return;
    }

    req.auth = { userId: user.id, role: user.role };
    req.currentUser = toPublicUser(user);
    next();
  } catch {
    sendError(res, 401, "Authentication required");
  }
}

export function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.currentUser) {
      sendError(res, 401, "Authentication required");
      return;
    }

    if (req.currentUser.role !== role) {
      sendError(res, 403, "Insufficient permissions");
      return;
    }

    next();
  };
}
