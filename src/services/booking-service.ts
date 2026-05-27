import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Schedule } from "../models/Schedule.js";
import { Seat } from "../models/Seat.js";
import { Ticket } from "../models/Ticket.js";

export async function createBooking(payload: {
  userId: string;
  scheduleId: string;
  seats: string[];
}) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const schedule = await Schedule.findById(payload.scheduleId).session(
      session,
    );
    if (!schedule) {
      throw new Error("Schedule not found");
    }

    if (schedule.availableSeats < payload.seats.length) {
      throw new Error("Not enough seats available");
    }

    const bookedSeats = await Seat.find({
      busId: schedule.busId,
      seatNumber: { $in: payload.seats },
      isBooked: true,
    }).session(session);

    if (bookedSeats.length > 0) {
      throw new Error("Some seats are already booked");
    }

    await Seat.updateMany(
      { busId: schedule.busId, seatNumber: { $in: payload.seats } },
      { $set: { isBooked: true } },
      { session },
    );

    schedule.availableSeats -= payload.seats.length;
    await schedule.save({ session });

    const booking = await Booking.create(
      [
        {
          userId: payload.userId,
          scheduleId: payload.scheduleId,
          seats: payload.seats,
          totalPrice: schedule.price * payload.seats.length,
        },
      ],
      { session },
    );

    const ticket = await Ticket.create(
      [
        {
          bookingId: booking[0]._id,
          qrCode: `TICKET-${booking[0]._id.toString()}`,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    return { booking: booking[0], ticket: ticket[0] };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function getUserBookings(userId: string) {
  return Booking.find({ userId }).populate("scheduleId").lean();
}

export async function cancelBooking(id: string, userId: string) {
  return Booking.findOneAndUpdate(
    { _id: id, userId },
    { status: "cancelled" },
    { returnDocument: "after" },
  ).lean();
}
