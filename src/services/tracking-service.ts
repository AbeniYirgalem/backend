import { TripBooking } from "../models/TripBooking.js";
import { VehicleLocation } from "../models/VehicleLocation.js";
import mongoose from "mongoose";

// ─── Addis Ababa route coordinate paths (lat/lng waypoints) ───────────────────
// Keyed by "from→to" pattern to loosely match stop names
const ROUTE_PATHS: Record<string, [number, number][]> = {
  default: [
    [9.0192, 38.7525],
    [9.0160, 38.7630],
    [9.0100, 38.7700],
    [9.0050, 38.7800],
  ],
  "Goro→Megenagna": [
    [8.9570, 38.8240],
    [8.9680, 38.8150],
    [8.9820, 38.8050],
    [8.9940, 38.7970],
    [9.0030, 38.7900],
    [9.0080, 38.7860],
    [9.0120, 38.7835],
  ],
  "Bole→Mexico": [
    [8.9960, 38.7840],
    [9.0010, 38.7750],
    [9.0060, 38.7660],
    [9.0100, 38.7530],
  ],
  "CMC→Piassa": [
    [9.0260, 38.8195],
    [9.0250, 38.8050],
    [9.0230, 38.7900],
    [9.0200, 38.7720],
    [9.0340, 38.7485],
  ],
  "Megenagna→CMC": [
    [9.0120, 38.7835],
    [9.0180, 38.7960],
    [9.0220, 38.8080],
    [9.0260, 38.8195],
  ],
  "Kazanchis→Saris": [
    [9.0160, 38.7710],
    [9.0100, 38.7630],
    [9.0020, 38.7580],
    [8.9820, 38.7530],
    [8.9630, 38.7530],
  ],
};

// Simulated active bus positions per booking (in-memory, resets on restart)
const busSimState = new Map<
  string,
  { pathIndex: number; lat: number; lng: number; startTime: number }
>();

export function getRoutePath(from: string, to: string): [number, number][] {
  const key = `${from}→${to}`;
  return ROUTE_PATHS[key] ?? ROUTE_PATHS.default;
}

/** Compute a simulated bus position along the route path */
export function simulateBusPosition(
  bookingId: string,
  from: string,
  to: string,
): { lat: number; lng: number; progress: number; speed: number; heading: number } {
  const path = getRoutePath(from, to);
  const totalPoints = path.length;

  if (!busSimState.has(bookingId)) {
    busSimState.set(bookingId, {
      pathIndex: 0,
      lat: path[0][0],
      lng: path[0][1],
      startTime: Date.now(),
    });
  }

  const state = busSimState.get(bookingId)!;
  const elapsed = (Date.now() - state.startTime) / 1000; // seconds

  // Advance one waypoint every ~30 seconds
  const newIndex = Math.min(
    totalPoints - 1,
    Math.floor(elapsed / 30),
  );

  const currentWaypoint = path[Math.min(newIndex, totalPoints - 1)];
  const nextWaypoint = path[Math.min(newIndex + 1, totalPoints - 1)];

  // Interpolate within segment
  const segElapsed = elapsed - newIndex * 30;
  const segFraction = Math.min(1, segElapsed / 30);
  const lat = currentWaypoint[0] + (nextWaypoint[0] - currentWaypoint[0]) * segFraction;
  const lng = currentWaypoint[1] + (nextWaypoint[1] - currentWaypoint[1]) * segFraction;

  // Add slight GPS wobble
  const wobbleLat = (Math.random() - 0.5) * 0.0003;
  const wobbleLng = (Math.random() - 0.5) * 0.0003;

  // Heading toward next waypoint
  const dlat = nextWaypoint[0] - currentWaypoint[0];
  const dlng = nextWaypoint[1] - currentWaypoint[1];
  const heading = ((Math.atan2(dlng, dlat) * 180) / Math.PI + 360) % 360;

  state.lat = lat + wobbleLat;
  state.lng = lng + wobbleLng;
  state.pathIndex = newIndex;

  const progress = newIndex / (totalPoints - 1);
  const speed = 22 + Math.round(Math.random() * 18); // 22–40 km/h

  return { lat: state.lat, lng: state.lng, progress, speed, heading };
}

/** Check if bus is within ~400m of destination (near-arrival) */
export function isNearDestination(
  busLat: number,
  busLng: number,
  to: string,
): boolean {
  const path = Object.entries(ROUTE_PATHS).find(([key]) =>
    key.endsWith(`→${to}`),
  );
  if (!path) return false;
  const destCoords = path[1][path[1].length - 1];
  const dlat = busLat - destCoords[0];
  const dlng = busLng - destCoords[1];
  const distanceDeg = Math.sqrt(dlat * dlat + dlng * dlng);
  return distanceDeg < 0.004; // ~400m
}

/** Get live tracking snapshot for a booking */
export async function getLiveTrackingData(bookingId: string, userId: string) {
  const booking = await TripBooking.findOne({
    _id: new mongoose.Types.ObjectId(bookingId),
    userId: new mongoose.Types.ObjectId(userId),
  })
    .populate("routeId")
    .lean();

  if (!booking) throw new Error("Booking not found");

  const from = booking.originStop;
  const to = booking.destinationStop;
  const busPos = simulateBusPosition(bookingId, from, to);
  const path = getRoutePath(from, to);

  // Nearby buses: all bookings on same route in_transit (simulated as static offset)
  const nearbyRaw = await TripBooking.find({
    routeId: booking.routeId,
    status: { $in: ["confirmed", "in_transit"] },
    _id: { $ne: booking._id },
  })
    .limit(3)
    .lean();

  const nearbyBuses = nearbyRaw.map((b, i) => {
    const pos = simulateBusPosition(b._id.toString(), b.originStop, b.destinationStop);
    return {
      id: `BUS-${i + 1}`,
      lat: pos.lat + (i + 1) * 0.003,
      lng: pos.lng + (i + 1) * 0.002,
      speed: pos.speed,
      status: "online",
    };
  });

  const etaMinutes = Math.max(
    1,
    Math.round((1 - busPos.progress) * 30),
  );

  return {
    bookingId,
    status: booking.status,
    from,
    to,
    bus: {
      id: `AA-${bookingId.slice(-4).toUpperCase()}`,
      lat: busPos.lat,
      lng: busPos.lng,
      speed: busPos.speed,
      heading: busPos.heading,
      progress: busPos.progress,
    },
    routePath: path,
    nearbyBuses,
    etaMinutes,
    nearDestination: isNearDestination(busPos.lat, busPos.lng, to),
  };
}
