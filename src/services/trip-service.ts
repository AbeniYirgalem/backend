import { Trip } from "../models/Trip.js";

export async function listTrips(payload: {
  userId: string;
  page: number;
  limit: number;
  status?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const skip = (payload.page - 1) * payload.limit;
  const query: Record<string, unknown> = { userId: payload.userId };

  if (payload.status) {
    query.status = payload.status;
  }

  if (payload.fromDate || payload.toDate) {
    query.tappedAt = {};
    if (payload.fromDate) {
      (query.tappedAt as Record<string, Date>).$gte = new Date(
        payload.fromDate,
      );
    }
    if (payload.toDate) {
      (query.tappedAt as Record<string, Date>).$lte = new Date(payload.toDate);
    }
  }

  const [items, total] = await Promise.all([
    Trip.find(query)
      .sort({ tappedAt: -1 })
      .skip(skip)
      .limit(payload.limit)
      .populate("routeId")
      .populate("originStopId")
      .populate("destinationStopId")
      .lean(),
    Trip.countDocuments(query),
  ]);

  return {
    items,
    total,
    page: payload.page,
    totalPages: Math.max(1, Math.ceil(total / payload.limit)),
  };
}
