import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import { Notification } from "../models/Notification.js";
import { logActivity } from "../services/activity-service.js";

/** GET /api/notifications — Paginated notifications for authenticated user */
export const listMyNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const unreadOnly = req.query.unread === "true";

    const filter: Record<string, unknown> = {
      $or: [
        { userId: req.user!.id },
        { audience: "all" },
        { audience: "passenger" },
      ],
    };

    if (unreadOnly) filter.read = false;

    const [items, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...filter, read: false }),
    ]);

    sendResponse(res, 200, "Notifications", {
      items,
      total,
      unreadCount,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  },
);

/** PATCH /api/notifications/:id/read — Mark a single notification as read */
export const markRead = asyncHandler(async (req: Request, res: Response) => {
  await Notification.updateOne({ _id: req.params.id }, { read: true });

  logActivity(req.user!.id, "NOTIFICATION_READ", {
    notificationId: req.params.id,
  });

  sendResponse(res, 200, "Marked as read", null);
});

/** PATCH /api/notifications/read-all — Mark all user notifications as read */
export const markAllRead = asyncHandler(
  async (req: Request, res: Response) => {
    await Notification.updateMany(
      {
        $or: [{ userId: req.user!.id }, { audience: "passenger" }],
        read: false,
      },
      { read: true },
    );

    logActivity(req.user!.id, "NOTIFICATION_READ", { all: true });

    sendResponse(res, 200, "All notifications marked as read", null);
  },
);

/** GET /api/notifications/unread-count — Lightweight count for badge */
export const getUnreadCount = asyncHandler(
  async (req: Request, res: Response) => {
    const count = await Notification.countDocuments({
      $or: [
        { userId: req.user!.id, read: false },
        { audience: "passenger", read: false },
        { audience: "all", read: false },
      ],
    });
    sendResponse(res, 200, "Unread count", { count });
  },
);
