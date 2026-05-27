import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import { Card } from "../models/Card.js";
import { Transaction } from "../models/Transaction.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { Trip } from "../models/Trip.js";
import { logActivity } from "../services/activity-service.js";
import mongoose from "mongoose";

function createHttpError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

/** GET /api/rfid/card — Get the authenticated user's RFID card */
export const getMyCard = asyncHandler(async (req: Request, res: Response) => {
  const card = await Card.findOne({ userId: req.user!.id }).lean();
  if (!card) {
    return sendResponse(res, 404, "No RFID card found for this user", null);
  }
  sendResponse(res, 200, "RFID Card", card);
});

/** GET /api/rfid/balance — Get the authenticated user's RFID balance */
export const getBalance = asyncHandler(async (req: Request, res: Response) => {
  const card = await Card.findOne({ userId: req.user!.id })
    .select("cardUid balance status lastTapAt")
    .lean();
  if (!card) {
    return sendResponse(res, 404, "No RFID card found", null);
  }
  sendResponse(res, 200, "RFID Balance", {
    cardUid: card.cardUid,
    balance: card.balance,
    status: card.status,
    lastTapAt: card.lastTapAt,
  });
});

/** GET /api/rfid/history — Get paginated transaction history */
export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 15)));
  const type = req.query.type as string | undefined;
  const skip = (page - 1) * limit;

  const card = await Card.findOne({ userId: req.user!.id }).lean();
  if (!card) {
    return sendResponse(res, 404, "No RFID card found", null);
  }

  const query: Record<string, unknown> = { cardId: card._id };
  if (type && (type === "recharge" || type === "fare")) {
    query.type = type;
  }

  const [items, total] = await Promise.all([
    Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("routeId")
      .lean(),
    Transaction.countDocuments(query),
  ]);

  sendResponse(res, 200, "Transaction History", {
    items,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

/** POST /api/rfid/recharge — Recharge the authenticated user's RFID card */
export const rechargeMyCard = asyncHandler(async (req: Request, res: Response) => {
  const { amount } = req.body;
  if (!amount || typeof amount !== "number" || amount < 10 || amount > 10000) {
    throw createHttpError("Amount must be between 10 and 10,000 ETB", 400);
  }

  const card = await Card.findOne({ userId: req.user!.id });
  if (!card) {
    throw createHttpError("No RFID card found", 404);
  }
  if (card.status !== "active") {
    throw createHttpError("Card is not active", 403);
  }

  const balanceBefore = card.balance;
  card.balance = balanceBefore + amount;
  await card.save();

  const transaction = await Transaction.create({
    userId: req.user!.id,
    cardId: card._id,
    type: "recharge",
    amount,
    balanceBefore,
    balanceAfter: card.balance,
    status: "success",
    note: "In-app recharge",
  });

  // Persist: recharge activity log
  logActivity(req.user!.id, "RFID_RECHARGE", {
    cardUid: card.cardUid,
    amount,
    balanceBefore,
    balanceAfter: card.balance,
  }, req);

  // Persist: in-app notification
  void Notification.create({
    userId: req.user!.id,
    title: "RFID Card Recharged",
    message: `Your RFID card has been recharged with ${amount} ETB. New balance: ${card.balance} ETB.`,
    type: "success",
    audience: "passenger",
    read: false,
  }).catch(() => undefined);

  sendResponse(res, 200, "Card recharged", { card, transaction });
});

/** POST /api/rfid/scan — Operator scans an RFID card for fare deduction */
export const scanCard = asyncHandler(async (req: Request, res: Response) => {
  const { cardUid, fare, routeId } = req.body;

  if (!cardUid) {
    throw createHttpError("RFID Card UID is required", 400);
  }
  if (!fare || typeof fare !== "number" || fare <= 0) {
    throw createHttpError("Valid fare amount is required", 400);
  }

  const card = await Card.findOne({ cardUid });
  if (!card) {
    throw createHttpError("Invalid RFID card", 404);
  }

  if (card.status !== "active") {
    throw createHttpError(`Card is ${card.status}. Cannot process fare.`, 403);
  }

  // Check for duplicate scan (within 2 minutes)
  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
  const recentTap = await Transaction.findOne({
    cardId: card._id,
    type: "fare",
    status: "success",
    createdAt: { $gte: twoMinAgo },
  }).lean();
  if (recentTap) {
    throw createHttpError("Duplicate scan detected. Please wait before scanning again.", 429);
  }

  const balanceBefore = card.balance;
  if (balanceBefore < fare) {
    // Record failed transaction
    await Transaction.create({
      userId: card.userId,
      cardId: card._id,
      type: "fare",
      amount: fare,
      balanceBefore,
      balanceAfter: balanceBefore,
      status: "failed",
      routeId: routeId || undefined,
      note: "Insufficient balance",
    });
    throw createHttpError(
      `Insufficient balance. Current: ${balanceBefore} ETB, Required: ${fare} ETB. Please recharge your RFID card.`,
      400,
    );
  }

  // Deduct fare in a transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    card.balance = balanceBefore - fare;
    card.lastTapAt = new Date();
    await card.save({ session });

    const trip = await Trip.create(
      [
        {
          userId: card.userId,
          cardId: card._id,
          routeId: routeId || undefined,
          fare,
          status: "completed",
          tappedAt: new Date(),
          completedAt: new Date(),
        },
      ],
      { session },
    );

    const transaction = await Transaction.create(
      [
        {
          userId: card.userId,
          cardId: card._id,
          type: "fare",
          amount: fare,
          balanceBefore,
          balanceAfter: card.balance,
          status: "success",
          routeId: routeId || undefined,
          tripId: trip[0]._id,
          note: `Scanned by operator ${req.user!.id}`,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    // Get passenger info for operator display
    const passenger = await User.findById(card.userId)
      .select("name email phone")
      .lean();

    // Persist: RFID scan activity log (operator action on passenger's card)
    logActivity(req.user!.id, "RFID_SCAN", {
      cardUid,
      fare,
      routeId: routeId || null,
      passengerId: card.userId.toString(),
      balanceBefore,
      balanceAfter: card.balance,
    }, req);

    // Persist: payment activity log on the passenger's own record
    logActivity(card.userId.toString(), "RFID_PAYMENT", {
      cardUid,
      fare,
      routeId: routeId || null,
      balanceBefore,
      balanceAfter: card.balance,
      scannedBy: req.user!.id,
    });

    sendResponse(res, 200, "Fare deducted", {
      passenger: passenger
        ? { name: passenger.name, email: passenger.email }
        : null,
      card: {
        cardUid: card.cardUid,
        balanceBefore,
        balanceAfter: card.balance,
        fareDeducted: fare,
      },
      transaction: transaction[0],
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

/** GET /api/rfid/stats — Operator-only system-wide RFID analytics */
export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalCards,
    activeCards,
    suspendedCards,
    totalBalanceResult,
    todayRechargeResult,
    todayScanCount,
    todayRevenueResult,
    recentActivity,
  ] = await Promise.all([
    Card.countDocuments(),
    Card.countDocuments({ status: "active" }),
    Card.countDocuments({ status: { $in: ["blocked", "lost"] } }),
    Card.aggregate([{ $group: { _id: null, total: { $sum: "$balance" } } }]),
    Transaction.aggregate([
      { $match: { type: "recharge", status: "success", createdAt: { $gte: today } } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ]),
    Transaction.countDocuments({ type: "fare", createdAt: { $gte: today } }),
    Transaction.aggregate([
      { $match: { type: "fare", status: "success", createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Transaction.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("type amount status createdAt cardId")
      .populate({ path: "cardId", select: "cardUid" })
      .lean(),
  ]);

  sendResponse(res, 200, "RFID System Stats", {
    totalCards,
    activeCards,
    suspendedCards,
    expiredCards: totalCards - activeCards - suspendedCards,
    totalBalanceCirculation: totalBalanceResult[0]?.total ?? 0,
    todayRevenue: todayRevenueResult[0]?.total ?? 0,
    todayRecharges: todayRechargeResult[0]?.count ?? 0,
    todayRechargeAmount: todayRechargeResult[0]?.total ?? 0,
    todayScans: todayScanCount,
    recentActivity: recentActivity.map((a) => ({
      type: a.type,
      amount: a.amount,
      status: a.status,
      card: (a.cardId as { cardUid?: string })?.cardUid ?? "Unknown",
      time: a.createdAt,
    })),
  });
});
