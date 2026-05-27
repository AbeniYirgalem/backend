import mongoose, { type Types } from "mongoose";

const { Schema, model, models } = mongoose;

export interface TicketDocument {
  bookingId: Types.ObjectId;
  qrCode: string;
  issuedAt: Date;
}

const TicketSchema = new Schema<TicketDocument>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    qrCode: { type: String, required: true },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

TicketSchema.index({ bookingId: 1 }, { unique: true });

export const Ticket =
  models.Ticket || model<TicketDocument>("Ticket", TicketSchema);
