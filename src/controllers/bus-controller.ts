import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import {
  createBus,
  deleteBus,
  getBusById,
  getBuses,
  updateBus,
} from "../services/bus-service.js";

export const create = asyncHandler(async (req: Request, res: Response) => {
  // Force operatorId to the authenticated user (operators can only create for themselves)
  const operatorId = req.user!.role === "admin" ? req.body.operatorId : req.user!.id;
  const bus = await createBus({ ...req.body, operatorId });
  sendResponse(res, 201, "Bus created", bus);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const buses = await getBuses(req.user?.id, req.user?.role);
  sendResponse(res, 200, "Buses", buses);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const bus = await getBusById(req.params.id, req.user?.id, req.user?.role);
  if (!bus) {
    return sendResponse(res, 404, "Bus not found or access denied", null);
  }
  sendResponse(res, 200, "Bus", bus);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const bus = await updateBus(req.params.id, req.body, req.user!.id, req.user!.role);
  if (!bus) {
    return sendResponse(res, 403, "Access denied. You do not own this bus.", null);
  }
  sendResponse(res, 200, "Bus updated", bus);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const bus = await deleteBus(req.params.id, req.user!.id, req.user!.role);
  if (!bus) {
    return sendResponse(res, 403, "Access denied. You do not own this bus.", null);
  }
  sendResponse(res, 200, "Bus deleted", bus);
});
