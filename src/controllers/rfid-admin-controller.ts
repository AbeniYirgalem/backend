/**
 * Admin RFID Card Management Controller.
 *
 * Location: backend/src/controllers/rfid-admin-controller.ts
 *
 * Admin-only endpoints for the full card lifecycle:
 *  - List all cards with populated user info
 *  - Assign a new RFID card UID to a user
 *  - Replace a user's existing card (deactivate old, create new)
 *  - Revoke (block) a card
 *  - List users who have no active card
 */

import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import { Card } from "../models/Card.js";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";
import mongoose from "mongoose";

function createHttpError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

// ─── GET /api/admin/rfid/cards ─────────────────────────────────────────────
/**
 * List all RFID cards with owner user info.
 * Supports filtering by status and pagination.
 *
 * Query params:
 *   status  — "active" | "blocked" | "lost" (optional)
 *   page    — page number (default 1)
 *   limit   — results per page (default 20, max 100)
 *   search  — search by cardUid or user name/email
 */
export const listAllCards = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const skip = (page - 1) * limit;
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;

  const query: Record<string, unknown> = {};
  if (status && ["active", "blocked", "lost"].includes(status)) {
    query.status = status;
  }

  // If a search term was supplied, match against cardUid first,
  // then augment with a user lookup so the admin can search by name/email.
  let userIdFilter: mongoose.Types.ObjectId[] | undefined;
  if (search) {
    const searchRegex = new RegExp(search, "i");
    // Also search cards by UID
    query.$or = [{ cardUid: searchRegex }];

    // Find matching users to include cards by those users
    const matchingUsers = await User.find({
      $or: [{ name: searchRegex }, { email: searchRegex }],
    })
      .select("_id")
      .lean();
    if (matchingUsers.length > 0) {
      userIdFilter = matchingUsers.map((u) => u._id as mongoose.Types.ObjectId);
      query.$or = [
        { cardUid: searchRegex },
        { userId: { $in: userIdFilter } },
      ];
    }
  }

  const [cards, total] = await Promise.all([
    Card.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email phone role isVerified")
      .lean(),
    Card.countDocuments(query),
  ]);

  sendResponse(res, 200, "RFID Cards", {
    items: cards,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

// ─── GET /api/admin/rfid/unassigned-users ─────────────────────────────────
/**
 * List users who do NOT have any active RFID card.
 * Used in the assign-card dialog to pick a user.
 */
export const listUnassignedUsers = asyncHandler(async (_req: Request, res: Response) => {
  // Find all userIds that already have an active card
  const assignedUserIds = await Card.distinct("userId", { status: "active" });

  const users = await User.find({
    _id: { $nin: assignedUserIds },
    role: "passenger",
  })
    .select("name email phone isVerified")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  sendResponse(res, 200, "Users without active RFID card", { users, total: users.length });
});

// ─── POST /api/admin/rfid/assign ──────────────────────────────────────────
/**
 * Assign a new RFID card UID to a user.
 *
 * Body: { userId, cardUid, initialBalance? }
 *
 * Rules:
 *  - One active card per user
 *  - Card UID must be globally unique
 */
export const assignCard = asyncHandler(async (req: Request, res: Response) => {
  const { userId, cardUid, initialBalance } = req.body as {
    userId?: string;
    cardUid?: string;
    initialBalance?: number;
  };

  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw createHttpError("Valid userId is required", 400);
  }
  if (!cardUid || typeof cardUid !== "string" || cardUid.trim().length < 4) {
    throw createHttpError("Valid card UID is required (minimum 4 characters)", 400);
  }

  const normalizedUid = cardUid.trim().toUpperCase();

  // Check if user already has an active card
  const existingCard = await Card.findOne({ userId, status: "active" }).lean();
  if (existingCard) {
    throw createHttpError(
      "User already has an active RFID card. Use the Replace Card endpoint instead.",
      409,
    );
  }

  // Check if the UID is already taken
  const takenCard = await Card.findOne({ cardUid: normalizedUid }).lean();
  if (takenCard) {
    throw createHttpError("This card UID is already registered to another account.", 409);
  }

  // Check user exists
  const user = await User.findById(userId).select("name email").lean();
  if (!user) {
    throw createHttpError("User not found", 404);
  }

  const balance = typeof initialBalance === "number" && initialBalance >= 0
    ? initialBalance
    : 0;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [card] = await Card.create(
      [{ userId, cardUid: normalizedUid, balance, status: "active" }],
      { session },
    );

    // If an initial balance was provided, record it as a recharge transaction
    if (balance > 0) {
      await Transaction.create(
        [
          {
            userId,
            cardId: card._id,
            type: "recharge",
            amount: balance,
            balanceBefore: 0,
            balanceAfter: balance,
            status: "success",
            note: "Initial card funding by admin",
          },
        ],
        { session },
      );
    }

    await session.commitTransaction();

    sendResponse(res, 201, "RFID card assigned", {
      card,
      user: { name: user.name, email: user.email },
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

// ─── PUT /api/admin/rfid/replace ──────────────────────────────────────────
/**
 * Replace a user's RFID card with a new UID.
 * The old card is set to "blocked" and a new active card is created,
 * transferring the remaining balance from the old card.
 *
 * Body: { userId, newCardUid }
 */
export const replaceCard = asyncHandler(async (req: Request, res: Response) => {
  const { userId, newCardUid } = req.body as {
    userId?: string;
    newCardUid?: string;
  };

  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw createHttpError("Valid userId is required", 400);
  }
  if (!newCardUid || typeof newCardUid !== "string" || newCardUid.trim().length < 4) {
    throw createHttpError("Valid new card UID is required (minimum 4 characters)", 400);
  }

  const normalizedUid = newCardUid.trim().toUpperCase();

  // Find the user's current active card
  const oldCard = await Card.findOne({ userId, status: "active" });
  if (!oldCard) {
    throw createHttpError("No active card found for this user", 404);
  }

  // Check the new UID isn't already taken
  const takenCard = await Card.findOne({ cardUid: normalizedUid }).lean();
  if (takenCard) {
    throw createHttpError("The new card UID is already registered to another account.", 409);
  }

  const transferredBalance = oldCard.balance;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Deactivate old card
    oldCard.status = "blocked";
    oldCard.balance = 0;
    await oldCard.save({ session });

    // Create new card with transferred balance
    const [newCard] = await Card.create(
      [
        {
          userId,
          cardUid: normalizedUid,
          balance: transferredBalance,
          status: "active",
        },
      ],
      { session },
    );

    // Record the balance transfer as a recharge transaction on the new card
    if (transferredBalance > 0) {
      await Transaction.create(
        [
          {
            userId,
            cardId: newCard._id,
            type: "recharge",
            amount: transferredBalance,
            balanceBefore: 0,
            balanceAfter: transferredBalance,
            status: "success",
            note: `Balance transferred from replaced card ${oldCard.cardUid}`,
          },
        ],
        { session },
      );
    }

    await session.commitTransaction();

    sendResponse(res, 200, "Card replaced successfully", {
      oldCard: { cardUid: oldCard.cardUid, status: "blocked" },
      newCard,
      transferredBalance,
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

// ─── PATCH /api/admin/rfid/:cardId/revoke ─────────────────────────────────
/**
 * Revoke (block) an RFID card.
 * Sets card.status = "blocked" without deleting the record for audit history.
 *
 * Params: cardId — MongoDB ObjectId of the card
 * Body: { reason? } — optional revocation reason for the log
 */
export const revokeCard = asyncHandler(async (req: Request, res: Response) => {
  const { cardId } = req.params;
  const { reason } = req.body as { reason?: string };

  if (!cardId || !mongoose.isValidObjectId(cardId)) {
    throw createHttpError("Valid cardId param is required", 400);
  }

  const card = await Card.findById(cardId);
  if (!card) {
    throw createHttpError("Card not found", 404);
  }
  if (card.status === "blocked") {
    throw createHttpError("Card is already blocked", 409);
  }

  card.status = "blocked";
  await card.save();

  sendResponse(res, 200, "Card revoked", {
    cardId,
    cardUid: card.cardUid,
    status: card.status,
    reason: reason ?? "Revoked by admin",
  });
});

// ─── PATCH /api/admin/rfid/:cardId/restore ────────────────────────────────
/**
 * Restore (re-activate) a previously blocked card.
 */
export const restoreCard = asyncHandler(async (req: Request, res: Response) => {
  const { cardId } = req.params;

  if (!cardId || !mongoose.isValidObjectId(cardId)) {
    throw createHttpError("Valid cardId param is required", 400);
  }

  const card = await Card.findById(cardId);
  if (!card) {
    throw createHttpError("Card not found", 404);
  }
  if (card.status === "active") {
    throw createHttpError("Card is already active", 409);
  }

  // Ensure user doesn't already have another active card
  const activeConflict = await Card.findOne({
    userId: card.userId,
    status: "active",
    _id: { $ne: card._id },
  }).lean();
  if (activeConflict) {
    throw createHttpError(
      "User already has an active card. Revoke it first before restoring this one.",
      409,
    );
  }

  card.status = "active";
  await card.save();

  sendResponse(res, 200, "Card restored", {
    cardId,
    cardUid: card.cardUid,
    status: card.status,
  });
});

// ─── GET /api/admin/rfid/stats/overview ───────────────────────────────────
/**
 * Quick stats for the admin RFID management header.
 */
export const adminRfidOverview = asyncHandler(async (_req: Request, res: Response) => {
  const [total, active, blocked, lost, noCard] = await Promise.all([
    Card.countDocuments(),
    Card.countDocuments({ status: "active" }),
    Card.countDocuments({ status: "blocked" }),
    Card.countDocuments({ status: "lost" }),
    User.countDocuments({
      role: "passenger",
      _id: { $nin: await Card.distinct("userId", { status: "active" }) },
    }),
  ]);

  sendResponse(res, 200, "Admin RFID overview", { total, active, blocked, lost, noCard });
});
