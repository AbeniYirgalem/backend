/**
 * User Routes.
 *
 * Location: backend/src/routes/user-routes.ts
 *
 * Self-service endpoints: /api/users/me, /api/users/update
 * Admin CRUD endpoints:   /api/users, /api/users/:id
 */

import { Router } from "express";
import {
  getMe,
  updateMe,
  listUsers,
  getUserByIdAdmin,
  createUser,
  updateUserAdmin,
  deleteUser,
} from "../controllers/user-controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { roleMiddleware } from "../middleware/role.js";

const router = Router();

// ── Self-service (any authenticated user) ───────────────────────────────────
router.get("/me", authMiddleware, getMe);
router.put("/update", authMiddleware, updateMe);

// ── Admin CRUD ───────────────────────────────────────────────────────────────
router.get(
  "/",
  authMiddleware,
  roleMiddleware(["admin"]),
  listUsers,
);
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  getUserByIdAdmin,
);
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin"]),
  createUser,
);
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  updateUserAdmin,
);
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  deleteUser,
);

export default router;
