import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import { getTicketByBooking } from "../services/ticket-service.js";

export const getByBooking = asyncHandler(
  async (req: Request, res: Response) => {
    const ticket = await getTicketByBooking(req.params.bookingId);
    sendResponse(res, 200, "Ticket", ticket);
  },
);
