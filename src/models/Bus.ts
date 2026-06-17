import mongoose, { type Types } from "mongoose";

const { Schema, model, models } = mongoose;

export interface BusDocument {
  /** Human-readable bus identifier sent by the ESP32 hardware (e.g. "BUS001") */
  busId: string;
  operatorId: Types.ObjectId;
  name: string;
  type: string;
  /** Maximum passenger capacity — used to compute occupancy % */
  capacity: number;
  totalSeats: number;
  amenities: string[];
  images: string[];
  /** Optional active route reference */
  routeId?: Types.ObjectId;
  /** Driver name shown on the live map sidebar */
  driverName?: string;
  /** Operational status of the bus */
  status: "online" | "offline" | "maintenance";
  /** Plate number for reference */
  plateNumber?: string;
}

const BusSchema = new Schema<BusDocument>(
  {
    busId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
      trim: true,
    },
    operatorId: {
      type: Schema.Types.ObjectId,
      ref: "BusOperator",
      required: true,
    },
    name: { type: String, required: true },
    type: { type: String, required: true, default: "standard" },
    capacity: { type: Number, required: true, default: 45 },
    totalSeats: { type: Number, required: true, default: 45 },
    amenities: [{ type: String }],
    images: [{ type: String }],
    routeId: { type: Schema.Types.ObjectId, ref: "Route" },
    driverName: { type: String },
    status: {
      type: String,
      enum: ["online", "offline", "maintenance"],
      default: "offline",
      index: true,
    },
    plateNumber: { type: String },
  },
  { timestamps: true },
);

BusSchema.index({ operatorId: 1 });
BusSchema.index({ status: 1, routeId: 1 });

export const Bus = models.Bus || model<BusDocument>("Bus", BusSchema);
