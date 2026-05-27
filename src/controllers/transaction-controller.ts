import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import { listTransactions } from "../services/transaction-service.js";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const result = await listTransactions({
    userId: req.user!.id,
    page,
    limit,
    type: req.query.type as string | undefined,
    status: req.query.status as string | undefined,
    fromDate: req.query.fromDate as string | undefined,
    toDate: req.query.toDate as string | undefined,
  });
  sendResponse(res, 200, "Transactions", result);
});
