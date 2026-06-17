/**
 * Firebase controller.
 *
 * Location: backend/src/controllers/firebase-controller.ts
 *
 * Express controller functions that handle HTTP requests for Firebase operations.
 * Each function validates the request body, delegates to the firebase-service,
 * and formats the response using the project's standard sendResponse / asyncHandler.
 */

import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import {
  saveBusLog,
  saveRfidTap,
  saveGpsCoordinates,
  savePassengerCount,
  saveEmergencyAlert,
  getAllTelemetry,
  getLatestBusStatus,
  getEmergencyAlerts,
  getPassengerStatistics,
  acknowledgeEmergencyAlert,
} from "../services/firebase-service.js";

// ─── Write Endpoints ──────────────────────────────────────────────────────────

/**
 * POST /api/firebase/telemetry
 * Save a raw telemetry event from an ESP32 device.
 *
 * Body: { event_type, card_uid?, passenger_count?, latitude?, longitude?,
 *          bus_id?, route_id?, timestamp? }
 */
export const saveTelemetry = asyncHandler(async (req: Request, res: Response) => {
  const { event_type, ...rest } = req.body as Record<string, unknown>;

  if (!event_type || typeof event_type !== "string") {
    const err = new Error("event_type is required") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  const key = await saveBusLog({
    event_type: event_type as import("../types/firebase.js").EventType,
    ...rest,
  } as import("../types/firebase.js").SaveTelemetryPayload);

  sendResponse(res, 201, "Telemetry saved", { key });
});

/**
 * POST /api/firebase/rfid-tap
 * Save an RFID card tap event. Intended to be called directly by the ESP32
 * or by the backend after processing a card scan.
 *
 * Body: { card_uid, bus_id?, route_id?, passenger_count?, latitude?, longitude?, timestamp? }
 */
export const saveRfidTapEvent = asyncHandler(async (req: Request, res: Response) => {
  const { card_uid, bus_id, route_id, passenger_count, latitude, longitude, timestamp } =
    req.body as Record<string, unknown>;

  if (!card_uid || typeof card_uid !== "string") {
    const err = new Error("card_uid is required") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  const key = await saveRfidTap({
    card_uid: card_uid as string,
    bus_id: bus_id as string | undefined,
    route_id: route_id as string | undefined,
    passenger_count: passenger_count as number | undefined,
    latitude: latitude as number | undefined,
    longitude: longitude as number | undefined,
    timestamp: timestamp as number | undefined,
  });

  sendResponse(res, 201, "RFID tap saved", { key });
});

/**
 * POST /api/firebase/gps
 * Save or update GPS coordinates for a bus.
 *
 * Body: { bus_id, latitude, longitude, speed?, heading?, timestamp? }
 */
export const saveGps = asyncHandler(async (req: Request, res: Response) => {
  const { bus_id, latitude, longitude, speed, heading, timestamp } =
    req.body as Record<string, unknown>;

  if (!bus_id || typeof bus_id !== "string") {
    const err = new Error("bus_id is required") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    const err = new Error("latitude and longitude must be numbers") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  await saveGpsCoordinates({
    bus_id: bus_id as string,
    latitude: latitude as number,
    longitude: longitude as number,
    speed: speed as number | undefined,
    heading: heading as number | undefined,
    timestamp: timestamp as number | undefined,
  });

  sendResponse(res, 200, "GPS coordinates saved", { bus_id });
});

/**
 * POST /api/firebase/passenger-count
 * Save or update passenger count for a bus.
 *
 * Body: { bus_id, current_count, capacity, peak_count?, total_boardings?, timestamp? }
 */
export const savePassengers = asyncHandler(async (req: Request, res: Response) => {
  const { bus_id, current_count, capacity, peak_count, total_boardings, timestamp } =
    req.body as Record<string, unknown>;

  if (!bus_id || typeof bus_id !== "string") {
    const err = new Error("bus_id is required") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }
  if (typeof current_count !== "number" || typeof capacity !== "number") {
    const err = new Error("current_count and capacity must be numbers") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  await savePassengerCount({
    bus_id: bus_id as string,
    current_count: current_count as number,
    capacity: capacity as number,
    peak_count: peak_count as number | undefined,
    total_boardings: total_boardings as number | undefined,
    timestamp: timestamp as number | undefined,
  });

  const occupancy_pct =
    capacity > 0 ? Math.min(100, Math.round(((current_count as number) / (capacity as number)) * 100)) : 0;

  sendResponse(res, 200, "Passenger count saved", { bus_id, current_count, capacity, occupancy_pct });
});

/**
 * POST /api/firebase/emergency
 * Save an emergency alert raised by the driver or ESP32 device.
 *
 * Body: { bus_id, severity, message, latitude?, longitude?, timestamp? }
 */
export const saveEmergency = asyncHandler(async (req: Request, res: Response) => {
  const { bus_id, severity, message, latitude, longitude, timestamp } =
    req.body as Record<string, unknown>;

  if (!bus_id || typeof bus_id !== "string") {
    const err = new Error("bus_id is required") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }
  if (!severity || !["low", "medium", "high", "critical"].includes(severity as string)) {
    const err = new Error("severity must be one of: low, medium, high, critical") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }
  if (!message || typeof message !== "string") {
    const err = new Error("message is required") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  const key = await saveEmergencyAlert({
    bus_id: bus_id as string,
    severity: severity as "low" | "medium" | "high" | "critical",
    message: message as string,
    latitude: latitude as number | undefined,
    longitude: longitude as number | undefined,
    timestamp: timestamp as number | undefined,
  });

  sendResponse(res, 201, "Emergency alert saved", { key, bus_id, severity });
});

// ─── Read Endpoints ───────────────────────────────────────────────────────────

/**
 * GET /api/firebase/telemetry?limit=200
 * Fetch all telemetry records, newest first.
 */
export const getTelemetry = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(500, Math.max(1, Number(req.query.limit || 200)));
  const records = await getAllTelemetry(limit);
  sendResponse(res, 200, "Telemetry records", { records, count: records.length });
});

/**
 * GET /api/firebase/bus/:busId/status
 * Fetch the latest GPS and passenger status for a specific bus.
 */
export const getBusStatus = asyncHandler(async (req: Request, res: Response) => {
  const { busId } = req.params;
  if (!busId) {
    const err = new Error("busId param is required") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  const status = await getLatestBusStatus(busId);
  sendResponse(res, 200, "Bus status", status);
});

/**
 * GET /api/firebase/emergency?unacknowledged=true
 * Fetch all (or only unacknowledged) emergency alerts.
 */
export const getAlerts = asyncHandler(async (req: Request, res: Response) => {
  const onlyUnacknowledged = req.query.unacknowledged === "true";
  const alerts = await getEmergencyAlerts(onlyUnacknowledged);
  sendResponse(res, 200, "Emergency alerts", { alerts, count: alerts.length });
});

/**
 * GET /api/firebase/bus/:busId/passengers
 * Fetch passenger statistics for a specific bus.
 */
export const getPassengers = asyncHandler(async (req: Request, res: Response) => {
  const { busId } = req.params;
  if (!busId) {
    const err = new Error("busId param is required") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  const stats = await getPassengerStatistics(busId);
  if (!stats) {
    return sendResponse(res, 404, "No passenger data found for this bus", null);
  }
  sendResponse(res, 200, "Passenger statistics", stats);
});

/**
 * PATCH /api/firebase/emergency/:alertKey/acknowledge
 * Mark an emergency alert as acknowledged.
 */
export const acknowledgeAlert = asyncHandler(async (req: Request, res: Response) => {
  const { alertKey } = req.params;
  if (!alertKey) {
    const err = new Error("alertKey param is required") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  await acknowledgeEmergencyAlert(alertKey);
  sendResponse(res, 200, "Alert acknowledged", { alertKey });
});
