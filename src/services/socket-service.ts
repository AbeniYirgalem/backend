import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "../config/env.js";
import {
  getArrivalPrediction,
  getAvailability,
  getCongestionMap,
  getStationQueue,
  getVehicleLocations,
  runFaultMonitoring,
} from "./intelligence-service.js";
import {
  simulateBusPosition,
  isNearDestination,
  getRoutePath,
} from "./tracking-service.js";
import { TripBooking } from "../models/TripBooking.js";
import { Fault } from "../models/Fault.js";
import { Notification } from "../models/Notification.js";

// Track which booking IDs have already fired an arrival notification this session
const arrivedBookings = new Set<string>();
// Track which booking IDs have already fired a delay notification
const delayedBookings = new Set<string>();
// Track recent fault emissions to avoid spamming the same booking
const lastFaultByBooking = new Map<string, number>();

const FAULT_TYPES = [
  "ENGINE_FAILURE",
  "FLAT_TIRE",
  "FUEL_SHORTAGE",
  "TRAFFIC_DELAY",
  "ACCIDENT",
  "GPS_FAILURE",
  "OVERHEATING",
  "BRAKE_ISSUE",
  "ROAD_BLOCK",
  "WEATHER_ISSUE",
] as const;

const FAULT_CATEGORY: Record<(typeof FAULT_TYPES)[number], string> = {
  ENGINE_FAILURE: "outage",
  FLAT_TIRE: "delay",
  FUEL_SHORTAGE: "delay",
  TRAFFIC_DELAY: "delay",
  ACCIDENT: "delay",
  GPS_FAILURE: "gps",
  OVERHEATING: "outage",
  BRAKE_ISSUE: "outage",
  ROAD_BLOCK: "delay",
  WEATHER_ISSUE: "delay",
};

const FAULT_SEVERITY: Record<
  (typeof FAULT_TYPES)[number],
  "low" | "medium" | "high" | "critical"
> = {
  ENGINE_FAILURE: "critical",
  FLAT_TIRE: "medium",
  FUEL_SHORTAGE: "high",
  TRAFFIC_DELAY: "medium",
  ACCIDENT: "critical",
  GPS_FAILURE: "medium",
  OVERHEATING: "high",
  BRAKE_ISSUE: "critical",
  ROAD_BLOCK: "high",
  WEATHER_ISSUE: "medium",
};

const FAULT_SUGGESTION: Record<(typeof FAULT_TYPES)[number], string> = {
  TRAFFIC_DELAY: "Suggest an alternative route or nearby bus.",
  ENGINE_FAILURE: "Wait for a replacement bus on the same route.",
  ROAD_BLOCK: "Reroute via a nearby corridor.",
  ACCIDENT: "Expect delay; consider a different trip.",
  GPS_FAILURE: "Verify vehicle device and confirm location manually.",
  WEATHER_ISSUE: "Expect slower travel; consider delaying the trip.",
  FLAT_TIRE: "Dispatch roadside support and a replacement bus.",
  FUEL_SHORTAGE: "Refuel the vehicle or swap to a standby bus.",
  OVERHEATING: "Stop service and request mechanical support.",
  BRAKE_ISSUE: "Stop service immediately and dispatch replacement.",
};

function toSeverityLevel(severity: "low" | "medium" | "high" | "critical") {
  return severity.toUpperCase() as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export function createSocketServer(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: env.allowedOrigins,
      credentials: true,
    },
  });

  // ── Connection handler ──────────────────────────────────────────────────────
  io.on("connection", (socket) => {
    socket.emit("transport:connected", { connectedAt: new Date() });

    // Passenger joins a room scoped to their booking for private updates
    socket.on("tracking:join", ({ bookingId }: { bookingId: string }) => {
      if (typeof bookingId === "string" && bookingId.length > 0) {
        void socket.join(`booking:${bookingId}`);
        socket.emit("tracking:joined", { bookingId });
      }
    });

    socket.on("tracking:leave", ({ bookingId }: { bookingId: string }) => {
      void socket.leave(`booking:${bookingId}`);
    });
  });

  // ── Global transport dashboard updates (every 15s) ──────────────────────────
  setInterval(async () => {
    try {
      const [congestion, vehicles, availability, faults] = await Promise.all([
        getCongestionMap(),
        getVehicleLocations(),
        getAvailability("Central Station"),
        runFaultMonitoring(),
      ]);

      io.emit("transport:update", {
        queue: getStationQueue("Central Station"),
        eta: getArrivalPrediction("central-westlands"),
        availability,
        congestion,
        vehicles,
        faults,
        updatedAt: new Date(),
      });

      // If there are critical faults, broadcast a status notification
      const criticalFaults = faults.filter(
        (f) => f && (f as Record<string, unknown>)["severity"] === "critical",
      );
      if (criticalFaults.length > 0) {
        io.emit("busStatusUpdate", {
          type: "fault",
          severity: "critical",
          message:
            "Critical system fault detected — some routes may be affected.",
          updatedAt: new Date(),
        });
      }
    } catch {
      // Silently ignore emission errors
    }
  }, 15000);

  // ── Per-booking live tracking updates (every 3s) ────────────────────────────
  setInterval(async () => {
    try {
      // Find all active bookings to push updates
      const activeBookings = await TripBooking.find({
        status: { $in: ["confirmed", "in_transit"] },
      })
        .select("_id userId originStop destinationStop status")
        .lean();

      for (const booking of activeBookings) {
        const bookingId = booking._id.toString();
        const room = `booking:${bookingId}`;

        // Only emit if someone is in the room
        const roomSockets = await io.in(room).fetchSockets();
        if (roomSockets.length === 0) continue;

        const pos = simulateBusPosition(
          bookingId,
          booking.originStop,
          booking.destinationStop,
        );
        const path = getRoutePath(booking.originStop, booking.destinationStop);
        const etaMinutes = Math.max(1, Math.round((1 - pos.progress) * 30));

        // Emit live location to the booking room
        io.to(room).emit("busLocationUpdate", {
          bookingId,
          lat: pos.lat,
          lng: pos.lng,
          speed: pos.speed,
          heading: pos.heading,
          progress: pos.progress,
          etaMinutes,
          routePath: path,
          updatedAt: new Date(),
        });

        // ── Arrival notification ─────────────────────────────────────────────
        if (
          isNearDestination(pos.lat, pos.lng, booking.destinationStop) &&
          !arrivedBookings.has(bookingId)
        ) {
          arrivedBookings.add(bookingId);
          const arrivalMessage = `Your bus has arrived at ${booking.destinationStop}`;
          const notification = await Notification.create({
            userId: booking.userId,
            title: "Bus Arrival",
            message: arrivalMessage,
            type: "success",
            eventType: "ARRIVAL",
            audience: "passenger",
            read: false,
            metadata: { bookingId, destination: booking.destinationStop },
          });

          io.to(room).emit("busStatusUpdate", {
            bookingId,
            type: "arrival",
            message: arrivalMessage,
            updatedAt: new Date(),
          });
          io.to(room).emit("bus_arrival", {
            bookingId,
            notification,
          });

          // Auto-mark as completed
          await TripBooking.updateOne(
            { _id: booking._id },
            { status: "completed" },
          );
        }

        // ── Simulated random delay notification (once per booking) ───────────
        if (!delayedBookings.has(bookingId) && Math.random() < 0.003) {
          delayedBookings.add(bookingId);
          const messages = [
            "Bus delayed due to traffic congestion",
            "Slight delay — bus rerouting around blocked road",
            "Bus running 5 minutes behind schedule",
          ];
          const message = messages[Math.floor(Math.random() * messages.length)];
          const notification = await Notification.create({
            userId: booking.userId,
            title: "Bus Delay",
            message,
            type: "warning",
            eventType: "DELAY",
            audience: "passenger",
            read: false,
            metadata: { bookingId },
          });

          io.to(room).emit("busStatusUpdate", {
            bookingId,
            type: "delay",
            message,
            updatedAt: new Date(),
          });
          io.to(room).emit("bus_delay", {
            bookingId,
            notification,
          });
        }
      }
    } catch {
      // Silently ignore
    }
  }, 3000);

  // ── Simulated fault notifications (every 20s) ─────────────────────────────
  setInterval(async () => {
    try {
      const activeBookings = await TripBooking.find({
        status: { $in: ["confirmed", "in_transit"] },
      })
        .select("_id userId routeId originStop destinationStop")
        .lean();

      if (activeBookings.length === 0) return;

      const candidate =
        activeBookings[Math.floor(Math.random() * activeBookings.length)];
      const bookingId = candidate._id.toString();
      const lastFaultAt = lastFaultByBooking.get(bookingId) || 0;
      if (Date.now() - lastFaultAt < 5 * 60 * 1000) return;

      if (Math.random() < 0.08) {
        const faultType =
          FAULT_TYPES[Math.floor(Math.random() * FAULT_TYPES.length)];
        const severity = FAULT_SEVERITY[faultType];
        const severityLevel = toSeverityLevel(severity);
        const suggestion = FAULT_SUGGESTION[faultType];
        const busId = `BUS-${bookingId.slice(-4).toUpperCase()}`;

        const fault = await Fault.create({
          title: `${faultType.replace(/_/g, " ")} on ${busId}`,
          faultType,
          category: FAULT_CATEGORY[faultType],
          severity,
          severityLevel,
          status: "open",
          resolved: false,
          busId,
          routeId: candidate.routeId,
          description: `Bus ${busId} reported ${faultType.replace(/_/g, " ")}.`,
          suggestion,
          detectedAt: new Date(),
          signals: {
            bookingId,
            origin: candidate.originStop,
            destination: candidate.destinationStop,
          },
        });

        const notification = await Notification.create({
          userId: candidate.userId,
          title: "Bus Fault Detected",
          message: `Bus delayed due to ${faultType.replace(/_/g, " ")}. ${suggestion}`,
          type: severity === "critical" ? "critical" : "warning",
          eventType: "FAULT",
          audience: "passenger",
          read: false,
          metadata: { bookingId, faultId: fault._id, faultType },
        });

        lastFaultByBooking.set(bookingId, Date.now());

        const room = `booking:${bookingId}`;
        io.to(room).emit("bus_fault", { bookingId, fault, notification });
        io.to(room).emit("busStatusUpdate", {
          bookingId,
          type: "fault",
          severity,
          message: notification.message,
          updatedAt: new Date(),
        });
      }
    } catch {
      // Ignore fault simulation errors
    }
  }, 20000);

  return io;
}
