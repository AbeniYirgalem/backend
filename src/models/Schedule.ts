import mongoose, { type Types } from "mongoose";

const { Schema, model, models } = mongoose;

export interface ScheduleDocument {
  busId: Types.ObjectId;
  routeId: Types.ObjectId;
  departureTime: Date;
  arrivalTime: Date;
  price: number;
  availableSeats: number;
}

const ScheduleSchema = new Schema<ScheduleDocument>(
  {
    busId: { type: Schema.Types.ObjectId, ref: "Bus", required: true },
    routeId: { type: Schema.Types.ObjectId, ref: "Route", required: true },
    departureTime: { type: Date, required: true },
    arrivalTime: { type: Date, required: true },
    price: { type: Number, required: true },
    availableSeats: { type: Number, required: true },
  },
  { timestamps: true },
);

ScheduleSchema.index({ routeId: 1, departureTime: 1 });

export const Schedule =
  models.Schedule || model<ScheduleDocument>("Schedule", ScheduleSchema);
