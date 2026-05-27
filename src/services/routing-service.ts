import { Route } from "../models/Route.js";
import { CongestionData } from "../models/CongestionData.js";
import { Schedule } from "../models/Schedule.js";

function estimateDurationMinutes(distance: number) {
  const averageSpeedKmh = 42;
  return Math.max(5, Math.round((distance / averageSpeedKmh) * 60));
}

function randomCongestion(): { score: number; level: "low" | "medium" | "high" | "critical" } {
  const score = Math.floor(Math.random() * 100);
  const level = score < 25 ? "low" : score < 50 ? "medium" : score < 75 ? "high" : "critical";
  return { score, level };
}

export interface RouteOption {
  id: string;
  from: string;
  to: string;
  distance: number;
  fare: number;
  durationMinutes: number;
  congestionScore: number;
  congestionLevel: "low" | "medium" | "high" | "critical";
  availableBuses: number;
  waitTimeMinutes: number;
  routeType: "direct" | "alternative";
  transferStops: string[];
}

export async function getRouteOptions(payload: {
  from: string;
  to: string;
}): Promise<RouteOption[]> {
  const { from, to } = payload;

  // Find direct route
  const direct = await Route.findOne({ from, to, active: true }).lean();

  // Find alternatives: routes from origin or to destination
  const alternates = await Route.find({
    active: true,
    $or: [{ from }, { to }],
  })
    .limit(6)
    .lean();

  const options: RouteOption[] = [];

  if (direct) {
    const cong = randomCongestion();
    options.push({
      id: direct._id.toString(),
      from: direct.from,
      to: direct.to,
      distance: direct.distance,
      fare: direct.baseFare,
      durationMinutes: direct.averageDurationMinutes || estimateDurationMinutes(direct.distance),
      congestionScore: cong.score,
      congestionLevel: cong.level,
      availableBuses: Math.floor(Math.random() * 5) + 1,
      waitTimeMinutes: Math.floor(Math.random() * 12) + 2,
      routeType: "direct",
      transferStops: [],
    });
  }

  for (const route of alternates) {
    if (direct && route._id.toString() === direct._id.toString()) continue;
    const cong = randomCongestion();
    const transfers: string[] = [];
    if (route.from !== from) transfers.push(route.from);
    if (route.to !== to) transfers.push(route.to);

    options.push({
      id: route._id.toString(),
      from: route.from,
      to: route.to,
      distance: route.distance,
      fare: route.baseFare,
      durationMinutes: (route.averageDurationMinutes || estimateDurationMinutes(route.distance)) + (transfers.length * 8),
      congestionScore: cong.score,
      congestionLevel: cong.level,
      availableBuses: Math.floor(Math.random() * 4) + 1,
      waitTimeMinutes: Math.floor(Math.random() * 15) + 3,
      routeType: "alternative",
      transferStops: transfers,
    });
  }

  return options.slice(0, 6);
}

export async function getRouteRecommendations(payload: {
  from?: string;
  to?: string;
}) {
  const { from, to } = payload;
  const query: Record<string, unknown> = {};
  if (from) query.from = from;
  if (to) query.to = to;

  const direct = await Route.findOne(query).lean();
  const alternates = await Route.find(
    from && to ? { $or: [{ from }, { to }] } : {},
  )
    .limit(4)
    .lean();

  const normalize = (
    route: { _id: unknown; from: string; to: string; distance: number },
    isAlternate: boolean,
  ) => ({
    id: route._id,
    from: route.from,
    to: route.to,
    distance: route.distance,
    durationMinutes: estimateDurationMinutes(route.distance),
    isAlternate,
  });

  const recommendations = [] as ReturnType<typeof normalize>[];
  if (direct) {
    recommendations.push(normalize(direct, false));
  }

  alternates
    .filter(
      (route) => !direct || route._id.toString() !== direct._id.toString(),
    )
    .forEach((route) => recommendations.push(normalize(route, true)));

  return recommendations.slice(0, 5);
}
