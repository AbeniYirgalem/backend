import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import { listTrips } from "../services/trip-service.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const result = await listTrips({
    userId: req.user!.id,
    page,
    limit,
    status: req.query.status as string | undefined,
    fromDate: req.query.fromDate as string | undefined,
    toDate: req.query.toDate as string | undefined,
  });
  sendResponse(res, 200, "Trips", result);
});
