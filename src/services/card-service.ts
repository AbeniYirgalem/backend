import mongoose from "mongoose";
import { Card } from "../models/Card.js";
import { Fault } from "../models/Fault.js";
import { Transaction } from "../models/Transaction.js";
import { Trip } from "../models/Trip.js";

function createHttpError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

export async function registerCard(payload: {
  userId: string;
  cardUid: string;
  initialBalance?: number;
}) {
  const existing = await Card.findOne({ cardUid: payload.cardUid }).lean();
  if (existing) {
    throw createHttpError("Card already registered", 409);
  }

  const balance = payload.initialBalance || 0;
  const card = await Card.create({
    userId: payload.userId,
    cardUid: payload.cardUid,
    balance,
  });

  if (balance > 0) {
    await Transaction.create({
      userId: payload.userId,
      cardId: card._id,
      type: "recharge",
      amount: balance,
      balanceBefore: 0,
      balanceAfter: balance,
      status: "success",
      note: "Initial card funding",
    });
  }

  return card;
}

export async function rechargeCard(payload: {
  userId: string;
  cardUid: string;
  amount: number;
}) {
  const card = await Card.findOne({
    cardUid: payload.cardUid,
    userId: payload.userId,
  });
  if (!card) {
    throw createHttpError("Card not found", 404);
  }

  const balanceBefore = card.balance;
  card.balance = balanceBefore + payload.amount;
  await card.save();

  const transaction = await Transaction.create({
    userId: payload.userId,
    cardId: card._id,
    type: "recharge",
    amount: payload.amount,
    balanceBefore,
    balanceAfter: card.balance,
    status: "success",
  });

  return { card, transaction };
}

export async function tapCard(payload: {
  userId: string;
  cardUid: string;
  fare: number;
  routeId?: string;
  originStopId?: string;
  destinationStopId?: string;
}) {
  const card = await Card.findOne({
    cardUid: payload.cardUid,
    userId: payload.userId,
  });
  if (!card) {
    await Fault.create({
      title: "Invalid RFID card tap",
      category: "rfid",
      severity: "medium",
      description: `Unknown RFID UID ${payload.cardUid} attempted a fare tap.`,
      detectedAt: new Date(),
      signals: { cardUid: payload.cardUid, routeId: payload.routeId },
    });
    throw createHttpError("Invalid card", 404);
  }

  if (card.status !== "active") {
    await Fault.create({
      title: "Inactive RFID card tap",
      category: "rfid",
      severity: "medium",
      cardId: card._id,
      description: `Card ${payload.cardUid} is ${card.status} and cannot be used for fare payment.`,
      detectedAt: new Date(),
      signals: { cardUid: payload.cardUid, status: card.status },
    });
    throw createHttpError("Card is not active", 403);
  }

  const balanceBefore = card.balance;
  if (balanceBefore < payload.fare) {
    await Transaction.create({
      userId: payload.userId,
      cardId: card._id,
      type: "fare",
      amount: payload.fare,
      balanceBefore,
      balanceAfter: balanceBefore,
      status: "failed",
      routeId: payload.routeId,
      note: "Insufficient balance",
    });

    await Trip.create({
      userId: payload.userId,
      cardId: card._id,
      routeId: payload.routeId,
      originStopId: payload.originStopId,
      destinationStopId: payload.destinationStopId,
      fare: payload.fare,
      status: "failed",
      tappedAt: new Date(),
      completedAt: null,
    });

    await Fault.create({
      title: "Insufficient RFID balance",
      category: "rfid",
      severity: "low",
      cardId: card._id,
      description: `Card balance ${balanceBefore} is below fare ${payload.fare}.`,
      detectedAt: new Date(),
      signals: { balanceBefore, fare: payload.fare },
    });

    throw createHttpError("Insufficient balance", 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    card.balance = balanceBefore - payload.fare;
    card.lastTapAt = new Date();
    await card.save({ session });

    const trip = await Trip.create(
      [
        {
          userId: payload.userId,
          cardId: card._id,
          routeId: payload.routeId,
          originStopId: payload.originStopId,
          destinationStopId: payload.destinationStopId,
          fare: payload.fare,
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
          userId: payload.userId,
          cardId: card._id,
          type: "fare",
          amount: payload.fare,
          balanceBefore,
          balanceAfter: card.balance,
          status: "success",
          routeId: payload.routeId,
          tripId: trip[0]._id,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    return { card, trip: trip[0], transaction: transaction[0] };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function getCardById(cardId: string, userId: string) {
  const card = await Card.findOne({ _id: cardId, userId }).lean();
  if (!card) {
    throw createHttpError("Card not found", 404);
  }
  return card;
}
