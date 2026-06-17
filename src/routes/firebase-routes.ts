/**
 * Firebase routes.
 *
 * Location: backend/src/routes/firebase-routes.ts
 *
 * Mounts all ESP32 telemetry endpoints under /api/firebase/.
 * Write endpoints are intentionally left without auth middleware so that
 * ESP32 devices (which don't carry JWT tokens) can POST directly.
 * Read endpoints are also open — add authenticate middleware if needed.
 */

import { Router } from "express";
import {
  saveTelemetry,
  saveRfidTapEvent,
  saveGps,
  savePassengers,
  saveEmergency,
  getTelemetry,
  getBusStatus,
  getAlerts,
  getPassengers,
  acknowledgeAlert,
} from "../controllers/firebase-controller.js";

const router = Router();

// ── Write endpoints (ESP32 → Backend → Firebase) ─────────────────────────────

/**
 * POST /api/firebase/telemetry
 * Generic telemetry event (card tap, GPS, passenger count, emergency, heartbeat).
 */
router.post("/telemetry", saveTelemetry);

/**
 * POST /api/firebase/rfid-tap
 * RFID card tap event — dedicated shortcut for card_tap event type.
 */
router.post("/rfid-tap", saveRfidTapEvent);

/**
 * POST /api/firebase/gps
 * GPS coordinate update for a bus.
 */
router.post("/gps", saveGps);

/**
 * POST /api/firebase/passenger-count
 * Passenger boarding count update for a bus.
 */
router.post("/passenger-count", savePassengers);

/**
 * POST /api/firebase/emergency
 * Emergency alert raised by driver or device.
 */
router.post("/emergency", saveEmergency);

// ── Read endpoints (Frontend → Backend → Firebase) ───────────────────────────

/**
 * GET /api/firebase/telemetry?limit=200
 * Fetch all recent telemetry records.
 */
router.get("/telemetry", getTelemetry);

/**
 * GET /api/firebase/bus/:busId/status
 * Latest GPS + passenger snapshot for a specific bus.
 */
router.get("/bus/:busId/status", getBusStatus);

/**
 * GET /api/firebase/emergency?unacknowledged=true
 * Fetch emergency alerts.
 */
router.get("/emergency", getAlerts);

/**
 * GET /api/firebase/bus/:busId/passengers
 * Passenger statistics for a specific bus.
 */
router.get("/bus/:busId/passengers", getPassengers);

/**
 * PATCH /api/firebase/emergency/:alertKey/acknowledge
 * Operator acknowledges an emergency alert.
 */
router.patch("/emergency/:alertKey/acknowledge", acknowledgeAlert);

export default router;
