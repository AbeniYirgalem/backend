import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import { getRouteRecommendations, getRouteOptions } from "../services/routing-service.js";

export const recommendations = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await getRouteRecommendations({
      from: req.query.from as string,
      to: req.query.to as string,
    });
    sendResponse(res, 200, "Route recommendations", data);
  },
);

export const options = asyncHandler(
  async (req: Request, res: Response) => {
    const from = req.query.from as string;
    const to = req.query.to as string;
    if (!from || !to) {
      return sendResponse(res, 400, "from and to query params are required", null);
    }
    const data = await getRouteOptions({ from, to });
    sendResponse(res, 200, "Route options", data);
  },
);
