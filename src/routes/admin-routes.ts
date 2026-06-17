/**
 * Admin Routes.
 *
 * Location: backend/src/routes/admin-routes.ts
 *
 * All routes require JWT authentication and the "admin" role.
 * Mounted at /api/admin.
 */

import { Router } from "express";
import { approveOperatorHandler, users } from "../controllers/admin-controller.js";
import {
  listAllCards,
  listUnassignedUsers,
  assignCard,
  replaceCard,
  revokeCard,
  restoreCard,
  adminRfidOverview,
} from "../controllers/rfid-admin-controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { roleMiddleware } from "../middleware/role.js";

const router = Router();

// All admin routes require a valid JWT with role = "admin"
router.use(authMiddleware, roleMiddleware(["admin"]));

// ── User management ─────────────────────────────────────────────────────────
router.get("/users", users);
router.put("/approve-operator", approveOperatorHandler);

// ── RFID card management ────────────────────────────────────────────────────

/**
 * GET /api/admin/rfid/overview
 * Quick aggregate counts for the management page header.
 */
router.get("/rfid/overview", adminRfidOverview);

/**
 * GET /api/admin/rfid/cards?status=active&search=abeni&page=1&limit=20
 * Paginated list of all RFID cards with populated user info.
 */
router.get("/rfid/cards", listAllCards);

/**
 * GET /api/admin/rfid/unassigned-users
 * Passengers who do not yet have an active RFID card.
 */
router.get("/rfid/unassigned-users", listUnassignedUsers);

/**
 * POST /api/admin/rfid/assign
 * Assign a new card UID to a user.
 * Body: { userId, cardUid, initialBalance? }
 */
router.post("/rfid/assign", assignCard);

/**
 * PUT /api/admin/rfid/replace
 * Replace user's existing card, transferring balance.
 * Body: { userId, newCardUid }
 */
router.put("/rfid/replace", replaceCard);

/**
 * PATCH /api/admin/rfid/:cardId/revoke
 * Block a card.
 */
router.patch("/rfid/:cardId/revoke", revokeCard);

/**
 * PATCH /api/admin/rfid/:cardId/restore
 * Re-activate a blocked card.
 */
router.patch("/rfid/:cardId/restore", restoreCard);

export default router;
