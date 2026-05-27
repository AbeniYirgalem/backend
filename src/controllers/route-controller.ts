import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import { createRoute, getRoutes } from "../services/route-service.js";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const route = await createRoute(req.body);
  sendResponse(res, 201, "Route created", route);
});

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const routes = await getRoutes();
  if (!routes.length) {
    return sendResponse(res, 404, "No routes found", []);
  }
  sendResponse(res, 200, "Routes", routes);
});
