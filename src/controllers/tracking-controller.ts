import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import { getLiveTrackingData } from "../services/tracking-service.js";

/** GET /api/trip-bookings/:id/live — live tracking snapshot for a booking */
export const getLiveTracking = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await getLiveTrackingData(req.params.id, req.user!.id);
    sendResponse(res, 200, "Live tracking data", data);
  },
);
