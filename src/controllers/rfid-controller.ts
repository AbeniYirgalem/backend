/**
 * RFID Controller.
 *
 * Location: backend/src/controllers/rfid-controller.ts
 *
 * Handles all RFID-related HTTP endpoints:
 *  - Passenger self-service (view card, balance, history, recharge)
 *  - Operator scan (manual fare deduction via app)
 *  - ESP32 hardware scan (unauthenticated IoT endpoint with API key)
 *  - Admin analytics (system-wide stats)
 *
 * The ESP32 scan endpoint is the architectural bridge: it receives the raw
 * hardware payload, runs all MongoDB business logic first, then pushes
 * real-time updates to Firebase RTDB so the frontend dashboard stays live.
 */

import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import { Card } from "../models/Card.js";
import { Transaction } from "../models/Transaction.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { Trip } from "../models/Trip.js";
import { Bus } from "../models/Bus.js";
import { GPSLog } from "../models/GPSLog.js";
import { PassengerStatistics } from "../models/PassengerStatistics.js";
import { logActivity } from "../services/activity-service.js";
import {
  saveRfidTap,
  saveGpsCoordinates,
  savePassengerCount,
} from "../services/firebase-service.js";
import mongoose from "mongoose";

function createHttpError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

function nowTs(): number {
  return Math.floor(Date.now() / 1000);
}

// ─── Passenger self-service ───────────────────────────────────────────────────

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

// ─── Operator scan (JWT-authenticated) ───────────────────────────────────────

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

  // Deduct fare in a MongoDB transaction
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

    // Persist: activity logs
    logActivity(req.user!.id, "RFID_SCAN", {
      cardUid,
      fare,
      routeId: routeId || null,
      passengerId: card.userId.toString(),
      balanceBefore,
      balanceAfter: card.balance,
    }, req);

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

// ─── ESP32 hardware scan (API key authenticated) ──────────────────────────────

/**
 * POST /api/rfid/esp32-scan
 *
 * Unauthenticated endpoint for ESP32 RFID reader hardware.
 * Authentication is handled via the esp32AuthMiddleware (X-ESP32-Key header).
 *
 * ESP32 payload:
 * {
 *   "card_uid": "A1B2C3D4",
 *   "bus_id": "BUS001",
 *   "latitude": 9.032145,
 *   "longitude": 38.763245,
 *   "passenger_count": 27,     // optional — current board count from counter sensor
 *   "speed": 35,               // optional — km/h from GPS module
 *   "heading": 180             // optional — compass heading 0-359
 * }
 */
export const scanCardEsp32 = asyncHandler(async (req: Request, res: Response) => {
  const {
    card_uid,
    bus_id,
    latitude,
    longitude,
    passenger_count,
    speed,
    heading,
  } = req.body as {
    card_uid?: string;
    bus_id?: string;
    latitude?: number;
    longitude?: number;
    passenger_count?: number;
    speed?: number;
    heading?: number;
  };

  // ── Validation ──────────────────────────────────────────────────────────
  if (!card_uid || typeof card_uid !== "string") {
    throw createHttpError("card_uid is required", 400);
  }
  if (!bus_id || typeof bus_id !== "string") {
    throw createHttpError("bus_id is required", 400);
  }

  // ── Look up the card ────────────────────────────────────────────────────
  const card = await Card.findOne({ cardUid: card_uid.toUpperCase() });
  if (!card) {
    // Push a rejected event to Firebase so the dashboard sees it in real-time
    void saveRfidTap({
      card_uid,
      bus_id,
      latitude,
      longitude,
      timestamp: nowTs(),
    }).catch(() => undefined);

    return sendResponse(res, 200, "Scan processed", {
      success: false,
      message: "Card not registered",
    });
  }

  if (card.status !== "active") {
    void saveRfidTap({
      card_uid,
      bus_id,
      latitude,
      longitude,
      timestamp: nowTs(),
    }).catch(() => undefined);

    return sendResponse(res, 200, "Scan processed", {
      success: false,
      message: `Card is ${card.status}`,
    });
  }

  // ── Resolve fare from bus → route ───────────────────────────────────────
  let fare = 5; // default fare in ETB
  let busRecord: { capacity?: number; routeId?: mongoose.Types.ObjectId } | null = null;

  try {
    const busDoc = await Bus.findOne({ busId: bus_id.toUpperCase() })
      .populate("routeId")
      .lean();
    if (busDoc) {
      busRecord = busDoc as any;
      const route = (busDoc as any).routeId as { baseFare?: number } | null;
      if (route?.baseFare && route.baseFare > 0) {
        fare = route.baseFare;
      }
    }
  } catch {
    // Non-fatal: fall through with default fare
  }

  // ── Check for duplicate scan ─────────────────────────────────────────────
  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
  const recentTap = await Transaction.findOne({
    cardId: card._id,
    type: "fare",
    status: "success",
    createdAt: { $gte: twoMinAgo },
  }).lean();
  if (recentTap) {
    return sendResponse(res, 200, "Scan processed", {
      success: false,
      message: "Duplicate scan — please wait before scanning again",
    });
  }

  // ── Insufficient balance check ───────────────────────────────────────────
  const balanceBefore = card.balance;
  if (balanceBefore < fare) {
    // Persist failed transaction
    await Transaction.create({
      userId: card.userId,
      cardId: card._id,
      type: "fare",
      amount: fare,
      balanceBefore,
      balanceAfter: balanceBefore,
      status: "failed",
      note: "Insufficient balance (ESP32 scan)",
    });

    // Push rejected event to Firebase
    void saveRfidTap({ card_uid, bus_id, latitude, longitude, timestamp: nowTs() }).catch(() => undefined);

    return sendResponse(res, 200, "Scan processed", {
      success: false,
      message: "Insufficient balance",
    });
  }

  // ── Atomic MongoDB fare deduction ────────────────────────────────────────
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
          tripId: trip[0]._id,
          note: `ESP32 scan — bus ${bus_id}`,
        },
      ],
      { session },
    );

    await session.commitTransaction();

    // ── Get passenger details for response ───────────────────────────────
    const passenger = await User.findById(card.userId).select("name").lean();

    const ts = nowTs();
    const capacity = (busRecord?.capacity as number | undefined) ?? 45;
    const paxCount = typeof passenger_count === "number" ? passenger_count : undefined;

    // ── Push real-time updates to Firebase RTDB (fire-and-forget) ────────

    // 1. RFID tap event → bus_logs feed
    void saveRfidTap({
      card_uid,
      bus_id,
      latitude,
      longitude,
      passenger_count: paxCount,
      timestamp: ts,
    }).catch(() => undefined);

    // 2. GPS snapshot → gps_tracking/{bus_id}
    if (typeof latitude === "number" && typeof longitude === "number") {
      void saveGpsCoordinates({
        bus_id,
        latitude,
        longitude,
        speed,
        heading,
        timestamp: ts,
      }).catch(() => undefined);

      // 3. Persist GPS history to MongoDB
      void GPSLog.create({
        busId: bus_id.toUpperCase(),
        latitude,
        longitude,
        speedKmh: speed ?? 0,
        heading: heading ?? 0,
        timestamp: ts,
      }).catch(() => undefined);
    }

    // 4. Passenger count snapshot → passenger_statistics/{bus_id}
    if (typeof paxCount === "number") {
      void savePassengerCount({
        bus_id,
        current_count: paxCount,
        capacity,
        timestamp: ts,
      }).catch(() => undefined);

      // 5. Persist boarding stats to MongoDB (upsert today's record)
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      void PassengerStatistics.findOneAndUpdate(
        { busId: bus_id.toUpperCase(), date: today },
        {
          $set: {
            currentCount: paxCount,
            capacity,
            occupancyPct: Math.min(100, Math.round((paxCount / capacity) * 100)),
          },
          $max: { peakCount: paxCount },
          $inc: { totalBoardings: 1 },
        },
        { upsert: true },
      ).catch(() => undefined);
    }

    // 6. Log activity
    logActivity(card.userId.toString(), "RFID_PAYMENT", {
      cardUid: card_uid,
      fare,
      busId: bus_id,
      balanceBefore,
      balanceAfter: card.balance,
      source: "esp32",
    });

    // Success response — must be ESP32-parseable (small JSON)
    return sendResponse(res, 200, "Fare deducted", {
      success: true,
      userId: card.userId.toString(),
      name: passenger?.name ?? "Passenger",
      fare,
      remainingBalance: card.balance,
      transactionId: transaction[0]._id.toString(),
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

// ─── Admin analytics ──────────────────────────────────────────────────────────

/** GET /api/rfid/stats — System-wide RFID analytics (admin/operator) */
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
