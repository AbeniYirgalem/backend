import type { Request } from "express";
import { ActivityLog, type ActivityActionType } from "../models/ActivityLog.js";

/**
 * Fire-and-forget activity logger.
 * Never throws — failures are swallowed so they never affect API responses.
 */
export function logActivity(
  userId: string,
  actionType: ActivityActionType,
  metadata: Record<string, unknown> = {},
  req?: Request,
): void {
  void ActivityLog.create({
    userId,
    actionType,
    metadata,
    ipAddress: req
      ? (req.headers["x-forwarded-for"] as string) || req.socket?.remoteAddress
      : undefined,
    userAgent: req ? req.headers["user-agent"] : undefined,
    timestamp: new Date(),
  }).catch(() => {
    // Intentionally silent — activity logging must never break the main flow
  });
}

/** Get paginated activity log for a specific user */
export async function getUserActivityLog(
  userId: string,
  page = 1,
  limit = 20,
  actionType?: string,
) {
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = { userId };
  if (actionType) filter.actionType = actionType;

  const [items, total] = await Promise.all([
    ActivityLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ActivityLog.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
