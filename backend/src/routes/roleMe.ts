import { Router } from "express";
import { requireAuth, requireRole } from "../auth/middleware";
import type { Role } from "../auth/types";

export function createRoleMeRouter(role: Role): Router {
  const router = Router();

  router.get("/me", requireAuth, requireRole(role), (req, res) => {
    res.json({ user: req.currentUser });
  });

  return router;
}
