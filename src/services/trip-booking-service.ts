import mongoose from "mongoose";
import { TripBooking } from "../models/TripBooking.js";
import { Card } from "../models/Card.js";
import { Transaction } from "../models/Transaction.js";

function createHttpError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

export async function bookTrip(payload: {
  userId: string;
  routeId: string;
  originStop: string;
  destinationStop: string;
  fare: number;
  estimatedDuration: number;
  congestionLevel: "low" | "medium" | "high" | "critical";
  selectedRouteType: "direct" | "alternative";
  paymentMethod?: "card_balance" | "telebirr";
}) {
  const method = payload.paymentMethod || "card_balance";

  // ── card_balance: validate balance and deduct atomically ─────────────────
  if (method === "card_balance") {
    const card = await Card.findOne({ userId: payload.userId });
    if (!card) {
      throw createHttpError("No RFID card found. Please register a card first.", 404);
    }
    if (card.status !== "active") {
      throw createHttpError("Your RFID card is not active.", 403);
    }

    const balanceBefore = card.balance;
    if (balanceBefore < payload.fare) {
      throw createHttpError(
        `Insufficient RFID balance. Current: ${balanceBefore} ETB, Required: ${payload.fare} ETB.`,
        400,
      );
    }

    // Atomic session: deduct balance + create booking + create transaction record
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      card.balance = balanceBefore - payload.fare;
      await card.save({ session });

      const [booking] = await TripBooking.create(
        [
          {
            userId: payload.userId,
            routeId: payload.routeId,
            originStop: payload.originStop,
            destinationStop: payload.destinationStop,
            fare: payload.fare,
            estimatedDuration: payload.estimatedDuration,
            congestionLevel: payload.congestionLevel,
            selectedRouteType: payload.selectedRouteType,
            status: "confirmed",
            bookedAt: new Date(),
            paymentMethod: method,
          },
        ],
        { session },
      );

      // Persist payment as a Transaction record (for history/audit)
      await Transaction.create(
        [
          {
            userId: payload.userId,
            cardId: card._id,
            type: "fare",
            amount: payload.fare,
            balanceBefore,
            balanceAfter: card.balance,
            status: "success",
            tripId: booking._id,
            note: `Trip booking: ${payload.originStop} → ${payload.destinationStop}`,
          },
        ],
        { session },
      );

      await session.commitTransaction();
      return booking;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ── telebirr: just create the booking (external payment handled elsewhere) ─
  const booking = await TripBooking.create({
    userId: payload.userId,
    routeId: payload.routeId,
    originStop: payload.originStop,
    destinationStop: payload.destinationStop,
    fare: payload.fare,
    estimatedDuration: payload.estimatedDuration,
    congestionLevel: payload.congestionLevel,
    selectedRouteType: payload.selectedRouteType,
    status: "confirmed",
    bookedAt: new Date(),
    paymentMethod: method,
  });

  return booking;
}

export async function getUserTripBookings(payload: {
  userId: string;
  page: number;
  limit: number;
  status?: string;
}) {
  const skip = (payload.page - 1) * payload.limit;
  const query: Record<string, unknown> = { userId: payload.userId };

  if (payload.status && payload.status !== "all") {
    query.status = payload.status;
  }

  const [items, total] = await Promise.all([
    TripBooking.find(query)
      .sort({ bookedAt: -1 })
      .skip(skip)
      .limit(payload.limit)
      .populate("routeId", "from to distance")
      .lean(),
    TripBooking.countDocuments(query),
  ]);

  return {
    items,
    total,
    page: payload.page,
    totalPages: Math.max(1, Math.ceil(total / payload.limit)),
  };
}

export async function cancelTripBooking(bookingId: string, userId: string) {
  const booking = await TripBooking.findOne({ _id: bookingId, userId });

  if (!booking) {
    throw createHttpError("Booking not found", 404);
  }

  if (booking.status === "cancelled" || booking.status === "refunded") {
    throw createHttpError("Booking is already cancelled", 400);
  }

  if (booking.status === "completed") {
    throw createHttpError("Cannot cancel a completed trip", 400);
  }

  // Calculate refund: full for pending/confirmed, 50% for in_transit
  let refundAmount = 0;
  if (booking.status === "pending" || booking.status === "confirmed") {
    refundAmount = booking.fare;
  } else if (booking.status === "in_transit") {
    refundAmount = Math.round(booking.fare * 0.5);
  }

  // Refund to RFID card if it was a card_balance payment
  if (refundAmount > 0 && booking.paymentMethod === "card_balance") {
    const card = await Card.findOne({ userId });
    if (card) {
      const balanceBefore = card.balance;
      card.balance = balanceBefore + refundAmount;
      await card.save();

      // Persist refund as a Transaction
      await Transaction.create({
        userId,
        cardId: card._id,
        type: "recharge",
        amount: refundAmount,
        balanceBefore,
        balanceAfter: card.balance,
        status: "success",
        note: `Refund for cancelled booking ${bookingId}`,
      });
    }
  }

  booking.status = refundAmount > 0 ? "refunded" : "cancelled";
  booking.cancelledAt = new Date();
  booking.refundAmount = refundAmount;
  await booking.save();

  return booking;
}

export async function getTripBookingById(bookingId: string, userId: string) {
  return TripBooking.findOne({ _id: bookingId, userId })
    .populate("routeId", "from to distance")
    .lean();
}
