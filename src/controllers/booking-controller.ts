import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import {
  cancelBooking,
  createBooking,
  getUserBookings,
} from "../services/booking-service.js";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = await createBooking({
    userId: req.user!.id,
    scheduleId: req.body.scheduleId,
    seats: req.body.seats,
  });
  sendResponse(res, 201, "Booking created", result);
});

export const listUserBookings = asyncHandler(
  async (req: Request, res: Response) => {
    // Always scope to the authenticated user's own bookings
    const bookings = await getUserBookings(req.user!.id);
    sendResponse(res, 200, "Bookings", bookings);
  },
);

export const remove = asyncHandler(async (req: Request, res: Response) => {
  // cancelBooking already filters by userId to ensure ownership
  const booking = await cancelBooking(req.params.id, req.user!.id);
  if (!booking) {
    return sendResponse(res, 403, "Access denied. You do not own this booking.", null);
  }
  sendResponse(res, 200, "Booking cancelled", booking);
});
