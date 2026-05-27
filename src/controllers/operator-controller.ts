import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import { getOperatorOverview } from "../services/operator-analytics-service.js";

export const operatorOverview = asyncHandler(
  async (_req: Request, res: Response) => {
    const data = await getOperatorOverview();
    sendResponse(res, 200, "Operator overview", data);
  },
);
