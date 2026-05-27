import mongoose, { type Types } from "mongoose";

const { Schema, model, models } = mongoose;

export interface SeatDocument {
  busId: Types.ObjectId;
  seatNumber: string;
  isBooked: boolean;
}

const SeatSchema = new Schema<SeatDocument>(
  {
    busId: { type: Schema.Types.ObjectId, ref: "Bus", required: true },
    seatNumber: { type: String, required: true },
    isBooked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

SeatSchema.index({ busId: 1, seatNumber: 1 }, { unique: true });

export const Seat = models.Seat || model<SeatDocument>("Seat", SeatSchema);
