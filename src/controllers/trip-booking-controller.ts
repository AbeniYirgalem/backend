import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import {
  bookTrip,
  getUserTripBookings,
  cancelTripBooking,
  getTripBookingById,
} from "../services/trip-booking-service.js";
import { getLiveTrackingData } from "../services/tracking-service.js";
import { logActivity } from "../services/activity-service.js";
import { Notification } from "../models/Notification.js";

export const book = asyncHandler(async (req: Request, res: Response) => {
  const result = await bookTrip({
    userId: req.user!.id,
    routeId: req.body.routeId,
    originStop: req.body.originStop,
    destinationStop: req.body.destinationStop,
    fare: req.body.fare,
    estimatedDuration: req.body.estimatedDuration,
    congestionLevel: req.body.congestionLevel || "low",
    selectedRouteType: req.body.selectedRouteType || "direct",
    paymentMethod: req.body.paymentMethod || "card_balance",
  });

  // Persist: booking activity log
  logActivity(
    req.user!.id,
    "BOOK_TRIP",
    {
      bookingId: result._id.toString(),
      routeId: req.body.routeId,
      originStop: req.body.originStop,
      destinationStop: req.body.destinationStop,
      fare: req.body.fare,
      paymentMethod: req.body.paymentMethod || "card_balance",
    },
    req,
  );

  // Persist: in-app notification for passenger
  void Notification.create({
    userId: req.user!.id,
    title: "Trip Booked",
    message: `Your trip from ${req.body.originStop} to ${req.body.destinationStop} has been confirmed. Fare: ${req.body.fare} ETB.`,
    type: "success",
    audience: "passenger",
    read: false,
  }).catch(() => undefined);

  sendResponse(res, 201, "Trip booked", result);
});

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string | undefined;
  const result = await getUserTripBookings({
    userId: req.user!.id,
    page,
    limit,
    status,
  });
  sendResponse(res, 200, "Trip bookings", result);
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const result = await cancelTripBooking(req.params.id, req.user!.id);

  // Persist: cancellation log
  logActivity(
    req.user!.id,
    "CANCEL_TRIP",
    {
      bookingId: req.params.id,
      refundAmount: result.refundAmount,
      status: result.status,
    },
    req,
  );

  // Persist: cancellation notification
  void Notification.create({
    userId: req.user!.id,
    title: "Trip Cancelled",
    message: `Your trip has been cancelled.${(result.refundAmount ?? 0) > 0 ? ` Refund of ${result.refundAmount} ETB has been processed.` : ""}`,
    type: "info",
    audience: "passenger",
    read: false,
  }).catch(() => undefined);

  sendResponse(res, 200, "Trip cancelled", result);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const result = await getTripBookingById(req.params.id, req.user!.id);
  if (!result) {
    return sendResponse(res, 404, "Booking not found", null);
  }
  sendResponse(res, 200, "Trip booking", result);
});

/** GET /api/trip-bookings/:id/live */
export const getLiveTracking = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await getLiveTrackingData(req.params.id, req.user!.id);

    // Persist: tracking view event (fire-and-forget, no await)
    logActivity(
      req.user!.id,
      "TRACK_VIEW",
      {
        bookingId: req.params.id,
        from: data.from,
        to: data.to,
      },
      req,
    );

    sendResponse(res, 200, "Live tracking data", data);
  },
);
