import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import { approveOperator, listUsers } from "../services/admin-service.js";

export const users = asyncHandler(async (_req: Request, res: Response) => {
  const results = await listUsers();
  sendResponse(res, 200, "Users", results);
});

export const approveOperatorHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const operator = await approveOperator(req.body);
    sendResponse(res, 200, "Operator updated", operator);
  },
);
