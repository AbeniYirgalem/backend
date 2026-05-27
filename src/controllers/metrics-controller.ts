import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import { getEtaPrediction, getQueueStatus } from "../services/metrics-service.js";

export const queueStatus = asyncHandler(async (req: Request, res: Response) => {
  const station = (req.query.station as string) || "Central Station";
  const data = getQueueStatus(station);
  sendResponse(res, 200, "Queue status", data);
});

export const etaPrediction = asyncHandler(
  async (req: Request, res: Response) => {
    const routeId = (req.query.routeId as string) || "route";
    const data = getEtaPrediction(routeId);
    sendResponse(res, 200, "ETA prediction", data);
  },
);
