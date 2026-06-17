import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import {
  createBus,
  deleteBus,
  getBusById,
  getBuses,
  updateBus,
} from "../services/bus-service.js";
import { Bus } from "../models/Bus.js";
import { GPSLog } from "../models/GPSLog.js";
import {
  saveGpsCoordinates,
  getLatestBusStatus,
} from "../services/firebase-service.js";

export const create = asyncHandler(async (req: Request, res: Response) => {
  // Force operatorId to the authenticated user (operators can only create for themselves)
  const operatorId = req.user!.role === "admin" ? req.body.operatorId : req.user!.id;
  const bus = await createBus({ ...req.body, operatorId });
  sendResponse(res, 201, "Bus created", bus);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const buses = await getBuses(req.user?.id, req.user?.role);
  sendResponse(res, 200, "Buses", buses);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const bus = await getBusById(req.params.id, req.user?.id, req.user?.role);
  if (!bus) {
    return sendResponse(res, 404, "Bus not found or access denied", null);
  }
  sendResponse(res, 200, "Bus", bus);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const bus = await updateBus(req.params.id, req.body, req.user!.id, req.user!.role);
  if (!bus) {
    return sendResponse(res, 403, "Access denied. You do not own this bus.", null);
  }
  sendResponse(res, 200, "Bus updated", bus);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const bus = await deleteBus(req.params.id, req.user!.id, req.user!.role);
  if (!bus) {
    return sendResponse(res, 403, "Access denied. You do not own this bus.", null);
  }
  sendResponse(res, 200, "Bus deleted", bus);
});

/**
 * POST /api/buses/location
 *
 * Accepts a GPS update from the ESP32 (or backend relay).
 * Writes coordinates to Firebase RTDB and persists a GPSLog record.
 * Also updates the Bus document status to "online".
 *
 * Body: { bus_id, latitude, longitude, speed?, heading?, timestamp? }
 */
export const updateLocation = asyncHandler(async (req: Request, res: Response) => {
  const { bus_id, latitude, longitude, speed, heading, timestamp } = req.body as {
    bus_id?: string;
    latitude?: number;
    longitude?: number;
    speed?: number;
    heading?: number;
    timestamp?: number;
  };

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

  const ts = timestamp ?? Math.floor(Date.now() / 1000);

  // 1. Write to Firebase RTDB (real-time dashboard update)
  await saveGpsCoordinates({ bus_id, latitude, longitude, speed, heading, timestamp: ts });

  // 2. Persist to MongoDB GPS history log
  void GPSLog.create({
    busId: bus_id.toUpperCase(),
    latitude,
    longitude,
    speedKmh: speed ?? 0,
    heading: heading ?? 0,
    timestamp: ts,
  }).catch(() => undefined);

  // 3. Mark bus as online
  void Bus.findOneAndUpdate(
    { busId: bus_id.toUpperCase() },
    { status: "online" },
  ).catch(() => undefined);

  sendResponse(res, 200, "Location updated", { bus_id, latitude, longitude });
});

/**
 * GET /api/buses/live
 *
 * Returns all known buses enriched with their latest Firebase GPS snapshot
 * and passenger statistics. Used by the Live Transit Map dashboard.
 */
export const getLive = asyncHandler(async (_req: Request, res: Response) => {
  // Get all buses from MongoDB
  const buses = await Bus.find()
    .populate("routeId", "name from to")
    .lean();

  // Fetch Firebase snapshots in parallel (one per bus)
  const enriched = await Promise.all(
    buses.map(async (bus) => {
      try {
        const fbStatus = await getLatestBusStatus(bus.busId);
        return {
          ...bus,
          live: {
            gps: fbStatus.gps,
            passengers: fbStatus.passengers,
          },
        };
      } catch {
        return { ...bus, live: { gps: null, passengers: null } };
      }
    }),
  );

  sendResponse(res, 200, "Live bus fleet", { buses: enriched, total: enriched.length });
});
