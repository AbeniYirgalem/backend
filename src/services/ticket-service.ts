import { Ticket } from "../models/Ticket.js";

export async function getTicketByBooking(bookingId: string) {
  return Ticket.findOne({ bookingId }).lean();
}
