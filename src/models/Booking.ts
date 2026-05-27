import mongoose, { type Types } from "mongoose";

const { Schema, model, models } = mongoose;

export interface BookingDocument {
  userId: Types.ObjectId;
  scheduleId: Types.ObjectId;
  seats: string[];
  totalPrice: number;
  status: "booked" | "cancelled";
}

const BookingSchema = new Schema<BookingDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    scheduleId: {
      type: Schema.Types.ObjectId,
      ref: "Schedule",
      required: true,
    },
    seats: [{ type: String, required: true }],
    totalPrice: { type: Number, required: true },
    status: { type: String, enum: ["booked", "cancelled"], default: "booked" },
  },
  { timestamps: true },
);

BookingSchema.index({ userId: 1, scheduleId: 1 });

export const Booking =
  models.Booking || model<BookingDocument>("Booking", BookingSchema);
