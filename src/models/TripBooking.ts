import mongoose, { type Types } from "mongoose";

const { Schema, model, models } = mongoose;

export type TripBookingStatus =
  | "pending"
  | "confirmed"
  | "in_transit"
  | "completed"
  | "cancelled"
  | "refunded";

export interface TripBookingDocument {
  userId: Types.ObjectId;
  routeId: Types.ObjectId;
  originStop: string;
  destinationStop: string;
  fare: number;
  estimatedDuration: number;
  congestionLevel: "low" | "medium" | "high" | "critical";
  selectedRouteType: "direct" | "alternative";
  status: TripBookingStatus;
  bookedAt: Date;
  cancelledAt?: Date | null;
  refundAmount?: number;
  paymentMethod: "card_balance" | "telebirr";
}

const TripBookingSchema = new Schema<TripBookingDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    routeId: { type: Schema.Types.ObjectId, ref: "Route", required: true },
    originStop: { type: String, required: true },
    destinationStop: { type: String, required: true },
    fare: { type: Number, required: true, min: 0 },
    estimatedDuration: { type: Number, required: true, min: 1 },
    congestionLevel: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low",
    },
    selectedRouteType: {
      type: String,
      enum: ["direct", "alternative"],
      default: "direct",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "in_transit", "completed", "cancelled", "refunded"],
      default: "confirmed",
      index: true,
    },
    bookedAt: { type: Date, default: Date.now },
    cancelledAt: { type: Date, default: null },
    refundAmount: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["card_balance", "telebirr"],
      default: "card_balance",
    },
  },
  { timestamps: true },
);

TripBookingSchema.index({ userId: 1, bookedAt: -1 });
TripBookingSchema.index({ userId: 1, status: 1 });

export const TripBooking =
  models.TripBooking || model<TripBookingDocument>("TripBooking", TripBookingSchema);
