/**
 * Transaction Routes.
 *
 * Location: backend/src/routes/transaction-routes.ts
 *
 * Passengers: GET /api/transactions        — own transactions only
 * Passengers: GET /api/transactions/:id    — own transaction by id
 * Admins:     GET /api/transactions        — all transactions (add ?userId=... to filter)
 * Admins:     GET /api/transactions/:id    — any transaction
 * Admins:     GET /api/transactions/summary/stats — aggregate revenue stats
 */

import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireVerified } from "../middleware/require-verified.js";
import { roleMiddleware } from "../middleware/role.js";
import { list, getById, getStats } from "../controllers/transaction-controller.js";

const router = Router();

router.use(authMiddleware, requireVerified);

// Stats — admin only
router.get(
  "/summary/stats",
  roleMiddleware(["admin"]),
  getStats,
);

// List — passengers see own; admins can see all
router.get("/", list);

// By ID — passengers see own; admins see any
router.get("/:id", getById);

export default router;
