/**
 * Transaction Controller.
 *
 * Location: backend/src/controllers/transaction-controller.ts
 *
 * Provides paginated transaction listing with filters.
 * Passengers see only their own transactions.
 * Admins can list all transactions across all users.
 */

import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import { Transaction } from "../models/Transaction.js";
import { Card } from "../models/Card.js";
import mongoose from "mongoose";

/**
 * GET /api/transactions
 * Passenger: own transactions (scoped to their card).
 * Admin:     all transactions across the system (pass userId param to filter).
 *
 * Query params:
 *   page, limit, type (fare|recharge), status (success|failed),
 *   fromDate, toDate, userId (admin only)
 */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const skip = (page - 1) * limit;
  const isAdmin = req.user!.role === "admin";

  const query: Record<string, unknown> = {};

  // Scope to the requesting user unless they are admin
  if (!isAdmin) {
    query.userId = new mongoose.Types.ObjectId(req.user!.id);
  } else if (req.query.userId && mongoose.isValidObjectId(req.query.userId as string)) {
    query.userId = new mongoose.Types.ObjectId(req.query.userId as string);
  }

  const type = req.query.type as string | undefined;
  if (type && ["fare", "recharge"].includes(type)) {
    query.type = type;
  }

  const status = req.query.status as string | undefined;
  if (status && ["success", "failed"].includes(status)) {
    query.status = status;
  }

  if (req.query.fromDate || req.query.toDate) {
    query.createdAt = {} as Record<string, Date>;
    if (req.query.fromDate) {
      (query.createdAt as Record<string, Date>).$gte = new Date(req.query.fromDate as string);
    }
    if (req.query.toDate) {
      (query.createdAt as Record<string, Date>).$lte = new Date(req.query.toDate as string);
    }
  }

  const [items, total] = await Promise.all([
    Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email")
      .populate("cardId", "cardUid")
      .populate("routeId", "name from to")
      .lean(),
    Transaction.countDocuments(query),
  ]);

  sendResponse(res, 200, "Transactions", {
    items,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

/**
 * GET /api/transactions/:id
 * Fetch a single transaction by ID.
 * Passengers can only access their own. Admins can access any.
 */
export const getById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    const err = new Error("Invalid transaction id") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }

  const transaction = await Transaction.findById(id)
    .populate("userId", "name email")
    .populate("cardId", "cardUid balance")
    .populate("routeId", "name from to baseFare")
    .lean();

  if (!transaction) {
    const err = new Error("Transaction not found") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }

  // Non-admins can only view their own transactions
  const isAdmin = req.user!.role === "admin";
  if (!isAdmin && transaction.userId.toString() !== req.user!.id) {
    const err = new Error("Forbidden") as Error & { statusCode?: number };
    err.statusCode = 403;
    throw err;
  }

  sendResponse(res, 200, "Transaction", transaction);
});

/**
 * GET /api/transactions/summary/stats
 * Admin: aggregate revenue/fare/recharge stats.
 */
export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const [todayStats, monthStats, allTimeStats] = await Promise.all([
    Transaction.aggregate([
      { $match: { status: "success", createdAt: { $gte: today } } },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          total: { $sum: "$amount" },
        },
      },
    ]),
    Transaction.aggregate([
      { $match: { status: "success", createdAt: { $gte: thisMonth } } },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          total: { $sum: "$amount" },
        },
      },
    ]),
    Transaction.aggregate([
      { $match: { status: "success" } },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          total: { $sum: "$amount" },
        },
      },
    ]),
  ]);

  const toMap = (arr: { _id: string; count: number; total: number }[]) =>
    Object.fromEntries(arr.map((x) => [x._id, { count: x.count, total: x.total }]));

  sendResponse(res, 200, "Transaction stats", {
    today: toMap(todayStats),
    thisMonth: toMap(monthStats),
    allTime: toMap(allTimeStats),
  });
});
