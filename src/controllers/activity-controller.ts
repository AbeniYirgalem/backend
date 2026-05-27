import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import { getUserActivityLog } from "../services/activity-service.js";

/** GET /api/activity — Paginated activity log for the authenticated user */
export const getMyActivity = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const actionType = req.query.actionType as string | undefined;

    const result = await getUserActivityLog(
      req.user!.id,
      page,
      limit,
      actionType,
    );

    sendResponse(res, 200, "Activity log", result);
  },
);
