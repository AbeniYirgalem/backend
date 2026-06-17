/**
 * RFID Routes.
 *
 * Location: backend/src/routes/rfid-routes.ts
 *
 * Two authentication paths:
 *  - JWT (passengers/operators/admins)  — standard app endpoints
 *  - X-ESP32-Key header                 — hardware IoT endpoint
 */

import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { requireVerified } from "../middleware/require-verified.js";
import { roleMiddleware } from "../middleware/role.js";
import { esp32AuthMiddleware } from "../middleware/esp32-auth.js";
import {
  getMyCard,
  getBalance,
  getHistory,
  rechargeMyCard,
  scanCard,
  scanCardEsp32,
  getStats,
} from "../controllers/rfid-controller.js";

const router = Router();

// ── ESP32 hardware endpoint (no JWT — uses X-ESP32-Key header) ──────────────
/**
 * POST /api/rfid/esp32-scan
 *
 * Primary ingestion endpoint for ESP32 RFID reader hardware.
 * Business logic runs here (MongoDB), then Firebase gets real-time updates.
 *
 * Required headers:
 *   X-ESP32-Key: <your ESP32_API_KEY from .env>
 *
 * Body: { card_uid, bus_id, latitude, longitude, passenger_count?, speed?, heading? }
 */
router.post("/esp32-scan", esp32AuthMiddleware, scanCardEsp32);

// ── Authenticated endpoints (JWT required) ──────────────────────────────────
router.use(authMiddleware, requireVerified);

// Passenger-only
router.get("/card", roleMiddleware(["passenger"]), getMyCard);
router.get("/balance", roleMiddleware(["passenger"]), getBalance);
router.get("/history", roleMiddleware(["passenger"]), getHistory);
router.post("/recharge", roleMiddleware(["passenger"]), rechargeMyCard);

// Operator / Admin — manual scan from the app (operator carries a phone/tablet)
router.post("/scan", roleMiddleware(["operator", "admin"]), scanCard);

// Analytics — operator or admin
router.get("/stats", roleMiddleware(["operator", "admin"]), getStats);

export default router;
