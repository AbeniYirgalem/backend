import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import {
  createSchedule,
  getSchedules,
  searchSchedules,
} from "../services/schedule-service.js";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const schedule = await createSchedule(req.body);
  sendResponse(res, 201, "Schedule created", schedule);
});

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const schedules = await getSchedules();
  sendResponse(res, 200, "Schedules", schedules);
});

export const search = asyncHandler(async (req: Request, res: Response) => {
  const schedules = await searchSchedules(
    req.query as { from: string; to: string; date: string },
  );
  sendResponse(res, 200, "Schedules", schedules);
});
