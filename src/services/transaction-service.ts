import { Transaction } from "../models/Transaction.js";

export async function listTransactions(payload: {
  userId: string;
  page: number;
  limit: number;
  type?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const skip = (payload.page - 1) * payload.limit;
  const query: Record<string, unknown> = { userId: payload.userId };

  if (payload.type) {
    query.type = payload.type;
  }

  if (payload.status) {
    query.status = payload.status;
  }

  if (payload.fromDate || payload.toDate) {
    query.createdAt = {};
    if (payload.fromDate) {
      (query.createdAt as Record<string, Date>).$gte = new Date(
        payload.fromDate,
      );
    }
    if (payload.toDate) {
      (query.createdAt as Record<string, Date>).$lte = new Date(payload.toDate);
    }
  }

  const [items, total] = await Promise.all([
    Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(payload.limit)
      .populate("routeId")
      .populate("tripId")
      .lean(),
    Transaction.countDocuments(query),
  ]);

  return {
    items,
    total,
    page: payload.page,
    totalPages: Math.max(1, Math.ceil(total / payload.limit)),
  };
}
