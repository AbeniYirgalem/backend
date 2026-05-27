import { Card } from "../models/Card.js";
import { CongestionData } from "../models/CongestionData.js";
import { Fault } from "../models/Fault.js";
import { Notification } from "../models/Notification.js";
import { Route } from "../models/Route.js";
import { Stop } from "../models/Stop.js";
import { Transaction } from "../models/Transaction.js";
import { Trip } from "../models/Trip.js";
import { User } from "../models/User.js";
import { VehicleLocation } from "../models/VehicleLocation.js";

type Level = "low" | "medium" | "high";
type CongestionLevel = Level | "critical";

const FAULT_SUGGESTIONS: Record<string, string> = {
  TRAFFIC_DELAY:
    "Suggest alternative routes or nearby buses to reduce wait time.",
  ENGINE_FAILURE:
    "Wait for a replacement bus or switch to the next available trip.",
  ROAD_BLOCK: "Reroute via a nearby corridor to avoid the blockage.",
  ACCIDENT: "Expect delays and consider a different route or trip.",
  GPS_FAILURE: "Verify vehicle device and confirm position manually.",
  WEATHER_ISSUE: "Expect slower travel; consider delaying the trip.",
  FLAT_TIRE: "Dispatch roadside support and send a replacement bus.",
  FUEL_SHORTAGE: "Refuel the vehicle or swap to a standby bus.",
  OVERHEATING: "Pull over safely and request mechanical support.",
  BRAKE_ISSUE: "Stop service immediately and dispatch replacement.",
  rfid: "Open an RFID reader health check and route passengers to backup validators.",
  congestion: "Dispatch standby buses and recommend alternate routes.",
  gps: "Ping vehicle device, verify network status, and assign manual location confirmation.",
  delay: "Broadcast delay notice and recommend alternate routes.",
  network: "Escalate to operations control and monitor service impact.",
  outage: "Escalate immediately and notify affected passengers.",
};

const STATIONS = [
  { name: "Central Station", lat: -1.2864, lng: 36.8172 },
  { name: "Westlands", lat: -1.2676, lng: 36.8108 },
  { name: "Kasarani", lat: -1.2297, lng: 36.8944 },
  { name: "Airport Junction", lat: -1.3192, lng: 36.9278 },
  { name: "Kibera Terminal", lat: -1.3133, lng: 36.7839 },
];

function hashSeed(value: string) {
  return value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function movingValue(
  seed: number | string,
  modulo: number,
  intervalMs: number,
) {
  const numericSeed = typeof seed === "number" ? seed : hashSeed(seed);
  return (numericSeed + Math.floor(Date.now() / intervalMs)) % modulo;
}

function classifyQueue(queueLength: number): Level {
  if (queueLength >= 28) return "high";
  if (queueLength >= 13) return "medium";
  return "low";
}

function classifyCongestion(density: number): CongestionLevel {
  if (density >= 85) return "critical";
  if (density >= 65) return "high";
  if (density >= 35) return "medium";
  return "low";
}

function classifyAvailability(
  activeVehicles: number,
  queueLength: number,
): Level {
  const coverage = activeVehicles * 8 - queueLength;
  if (coverage > 28) return "high";
  if (coverage > 6) return "medium";
  return "low";
}

export function getStationQueue(station = "Central Station") {
  const seed = hashSeed(station);
  const queueLength = 4 + movingValue(seed, 38, 12000);
  const level = classifyQueue(queueLength);

  // Waiting time grows faster at high density because boarding slows down.
  const waitMinutes = Math.max(
    2,
    Math.round(queueLength * (level === "high" ? 0.85 : 0.55)),
  );

  return {
    station,
    queueLength,
    density: Math.min(100, Math.round((queueLength / 42) * 100)),
    level,
    waitMinutes,
    updatedAt: new Date(),
  };
}

export function getArrivalPrediction(routeId = "central-westlands") {
  const seed = hashSeed(routeId);
  const historicalBase = 6 + (seed % 16);
  const trafficDrift = movingValue(seed, 8, 15000);
  const etaMinutes = historicalBase + trafficDrift;

  return {
    routeId,
    etaMinutes,
    confidence: etaMinutes > 22 ? "low" : etaMinutes > 14 ? "medium" : "high",
    basis: "simulated historical traffic and dispatch cadence",
    updatedAt: new Date(),
  };
}

export async function getAvailability(station = "Central Station") {
  const queue = getStationQueue(station);
  const activeVehicles = 2 + movingValue(hashSeed(station), 8, 18000);
  const level = classifyAvailability(activeVehicles, queue.queueLength);

  return {
    station,
    activeVehicles,
    availableSeats: activeVehicles * 12 - Math.round(queue.queueLength / 3),
    level,
    queueLength: queue.queueLength,
    updatedAt: new Date(),
  };
}

export async function getCongestionMap() {
  const points = STATIONS.map((station) => {
    const queue = getStationQueue(station.name);
    const density = Math.min(
      100,
      queue.density + movingValue(hashSeed(station.name), 18, 10000),
    );
    return {
      stationName: station.name,
      latitude: station.lat,
      longitude: station.lng,
      density,
      queueLength: queue.queueLength,
      waitMinutes: queue.waitMinutes,
      level: classifyCongestion(density),
      sampledAt: new Date(),
    };
  });

  await CongestionData.insertMany(
    points.map((point) => ({ ...point, source: "simulated" })),
    { ordered: false },
  ).catch(() => undefined);

  return points;
}

export async function getRouteSuggestions(payload: {
  from?: string;
  to?: string;
}) {
  const from = payload.from || "Central Station";
  const to = payload.to || "Westlands";
  const direct = await Route.findOne({ from, to }).lean();
  const alternates = await Route.find({
    $or: [{ from }, { to }, { from: to }, { to: from }],
  })
    .limit(4)
    .lean();

  const directDistance = direct?.distance || 12 + (hashSeed(from + to) % 16);
  const directDuration = Math.round((directDistance / 32) * 60);

  const suggestions = [
    {
      id: direct?._id?.toString() || "direct-simulated",
      path: [from, to],
      type: "direct",
      distanceKm: directDistance,
      estimatedMinutes: directDuration,
      reason: "Shortest transfer path",
    },
    ...alternates.map((route, index) => ({
      id: route._id.toString(),
      path: [from, route.from === from ? route.to : route.from, to],
      type: "alternative",
      distanceKm: Number((route.distance * 1.15).toFixed(1)),
      estimatedMinutes: Math.max(6, Math.round((route.distance / 38) * 60)),
      reason:
        index % 2 === 0
          ? "Lower predicted congestion"
          : "Faster dispatch frequency",
    })),
  ];

  return suggestions.slice(0, 5);
}

export async function getVehicleLocations() {
  const vehicles = STATIONS.slice(0, 4).map((station, index) => {
    const drift = movingValue(hashSeed(station.name), 100, 5000) / 10000;
    return {
      vehicleId: `TX-${100 + index}`,
      latitude: station.lat + drift,
      longitude: station.lng - drift,
      speedKmh: 18 + movingValue(index.toString(), 42, 7000),
      heading: movingValue(station.name, 360, 5000),
      availability: (["high", "medium", "low"] as const)[
        movingValue(station.name, 3, 20000)
      ],
      lastGpsAt: new Date(),
    };
  });

  await Promise.all(
    vehicles.map((vehicle) =>
      VehicleLocation.findOneAndUpdate(
        { vehicleId: vehicle.vehicleId },
        vehicle,
        { upsert: true, returnDocument: "after" },
      ),
    ),
  );

  return vehicles;
}

export async function runFaultMonitoring() {
  const [failedScans, congestedStations, staleGpsVehicles] = await Promise.all([
    Transaction.countDocuments({
      type: "fare",
      status: "failed",
      createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
    }),
    getCongestionMap(),
    VehicleLocation.find({
      lastGpsAt: { $lte: new Date(Date.now() - 10 * 60 * 1000) },
    }).lean(),
  ]);

  const faults = [];

  if (failedScans >= 3) {
    faults.push({
      title: "Repeated RFID scan failures",
      category: "rfid" as const,
      severity: failedScans > 8 ? ("high" as const) : ("medium" as const),
      severityLevel: failedScans > 8 ? ("HIGH" as const) : ("MEDIUM" as const),
      description: `${failedScans} failed fare scans detected in the last 15 minutes.`,
      suggestion: FAULT_SUGGESTIONS.rfid,
      signals: { failedScans },
    });
  }

  congestedStations
    .filter(
      (station) => station.level === "critical" || station.level === "high",
    )
    .forEach((station) => {
      faults.push({
        title: `${station.stationName} congestion anomaly`,
        category: "congestion" as const,
        severity:
          station.level === "critical"
            ? ("critical" as const)
            : ("high" as const),
        severityLevel:
          station.level === "critical"
            ? ("CRITICAL" as const)
            : ("HIGH" as const),
        stationName: station.stationName,
        description: `Queue density is ${station.density}% with an estimated ${station.waitMinutes} minute wait.`,
        suggestion: FAULT_SUGGESTIONS.congestion,
        signals: station,
      });
    });

  staleGpsVehicles.forEach((vehicle) => {
    faults.push({
      title: `Missing GPS updates for ${vehicle.vehicleId}`,
      category: "gps" as const,
      severity: "medium" as const,
      severityLevel: "MEDIUM" as const,
      vehicleId: vehicle.vehicleId,
      description:
        "Vehicle has not sent a GPS update within the expected window.",
      suggestion: FAULT_SUGGESTIONS.gps,
      signals: { lastGpsAt: vehicle.lastGpsAt },
    });
  });

  const saved = await Promise.all(
    faults.map((fault) =>
      Fault.findOneAndUpdate(
        {
          title: fault.title,
          status: { $ne: "resolved" },
        },
        {
          ...fault,
          status: "open",
          detectedAt: new Date(),
        },
        { upsert: true, returnDocument: "after" },
      ),
    ),
  );

  return saved;
}

export async function listFaults(query: {
  page?: number;
  limit?: number;
  category?: string;
  severity?: string;
  status?: string;
}) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(50, Math.max(1, query.limit || 10));
  const filter: Record<string, unknown> = {};
  if (query.category) filter.category = query.category;
  if (query.severity) filter.severity = query.severity;
  if (query.status) filter.status = query.status;

  const [items, total] = await Promise.all([
    Fault.find(filter)
      .sort({ detectedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Fault.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getFaultAnalytics() {
  const bySeverity = await Fault.aggregate([
    { $group: { _id: "$severity", count: { $sum: 1 } } },
  ]);
  const byCategory = await Fault.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  const trend = await Fault.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$detectedAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: 14 },
  ]);

  return { bySeverity, byCategory, trend };
}

export async function getSuggestedSolutions() {
  const faults = await Fault.find({ status: { $ne: "resolved" } })
    .sort({ detectedAt: -1 })
    .limit(5)
    .lean();

  return faults.map((fault) => ({
    faultId: fault._id,
    title: fault.title,
    severity: fault.severity,
    action:
      FAULT_SUGGESTIONS[fault.faultType || fault.category] ||
      "Escalate to operations control and notify affected passengers.",
  }));
}

export async function getPassengerFlowAnalytics() {
  const [tripsByRoute, peakHours, busiestStations] = await Promise.all([
    Trip.aggregate([
      { $match: { status: "completed" } },
      {
        $group: {
          _id: "$routeId",
          passengers: { $sum: 1 },
          revenue: { $sum: "$fare" },
        },
      },
      { $sort: { passengers: -1 } },
      { $limit: 5 },
    ]),
    Trip.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: { $hour: "$tappedAt" }, passengers: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Trip.aggregate([
      { $match: { status: "completed", originStopId: { $ne: null } } },
      { $group: { _id: "$originStopId", passengers: { $sum: 1 } } },
      { $sort: { passengers: -1 } },
      { $limit: 5 },
    ]),
  ]);

  return { tripsByRoute, peakHours, busiestStations };
}

export async function getAdminOverview() {
  const [activePassengers, activeCards, liveFaults, tripsToday, transactions] =
    await Promise.all([
      User.countDocuments({ role: "passenger" }),
      Card.countDocuments({ status: "active" }),
      Fault.countDocuments({ status: { $ne: "resolved" } }),
      Trip.countDocuments({
        tappedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      Transaction.aggregate([
        { $match: { status: "success" } },
        {
          $group: {
            _id: "$type",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

  const queue = getStationQueue("Central Station");
  const eta = getArrivalPrediction("central-westlands");
  const availability = await getAvailability("Central Station");

  return {
    kpis: {
      activePassengers,
      activeCards,
      liveFaults,
      tripsToday,
    },
    queue,
    eta,
    availability,
    transactions,
  };
}

export async function createTransportNotification(payload: {
  title: string;
  message: string;
  type?: "info" | "warning" | "critical" | "success";
  audience?: "passenger" | "operator" | "admin" | "all";
}) {
  return Notification.create({
    title: payload.title,
    message: payload.message,
    type: payload.type || "info",
    audience: payload.audience || "all",
  });
}

export async function listNotifications(audience = "all") {
  return Notification.find({
    $or: [{ audience }, { audience: "all" }],
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
}

export async function seedTransportData() {
  const existingRoutes = await Route.countDocuments();
  if (existingRoutes === 0) {
    const routes = await Route.insertMany([
      { from: "Central Station", to: "Westlands", distance: 7.5 },
      { from: "Central Station", to: "Kasarani", distance: 14.2 },
      { from: "Westlands", to: "Airport Junction", distance: 21.4 },
      { from: "Kibera Terminal", to: "Central Station", distance: 8.6 },
    ]);

    await Stop.insertMany(
      routes.flatMap((route) => [
        {
          name: route.from,
          code: `${route.from.slice(0, 3).toUpperCase()}-${route._id.toString().slice(-4)}`,
          routeId: route._id,
        },
        {
          name: route.to,
          code: `${route.to.slice(0, 3).toUpperCase()}-${route._id.toString().slice(-4)}`,
          routeId: route._id,
        },
      ]),
    );
  }

  await getVehicleLocations();
  await getCongestionMap();
  return { seeded: true };
}
