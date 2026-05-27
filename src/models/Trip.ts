import mongoose, { type Types } from "mongoose";

const { Schema, model, models } = mongoose;

export interface TripDocument {
  userId: Types.ObjectId;
  cardId: Types.ObjectId;
  routeId?: Types.ObjectId;
  originStopId?: Types.ObjectId;
  destinationStopId?: Types.ObjectId;
  fare: number;
  status: "completed" | "failed";
  tappedAt: Date;
  completedAt?: Date | null;
}

const TripSchema = new Schema<TripDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    cardId: { type: Schema.Types.ObjectId, ref: "Card", required: true },
    routeId: { type: Schema.Types.ObjectId, ref: "Route" },
    originStopId: { type: Schema.Types.ObjectId, ref: "Stop" },
    destinationStopId: { type: Schema.Types.ObjectId, ref: "Stop" },
    fare: { type: Number, required: true },
    status: { type: String, enum: ["completed", "failed"], required: true },
    tappedAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

TripSchema.index({ userId: 1, tappedAt: -1 });
TripSchema.index({ cardId: 1, tappedAt: -1 });

export const Trip = models.Trip || model<TripDocument>("Trip", TripSchema);
