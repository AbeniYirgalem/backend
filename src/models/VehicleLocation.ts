import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

export interface VehicleLocationDocument {
  vehicleId: string;
  routeId?: mongoose.Types.ObjectId;
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading: number;
  availability: "low" | "medium" | "high";
  lastGpsAt: Date;
}

const VehicleLocationSchema = new Schema<VehicleLocationDocument>(
  {
    vehicleId: { type: String, required: true, index: true },
    routeId: { type: Schema.Types.ObjectId, ref: "Route" },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    speedKmh: { type: Number, required: true, min: 0 },
    heading: { type: Number, required: true, min: 0, max: 359 },
    availability: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
      index: true,
    },
    lastGpsAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: true },
);

VehicleLocationSchema.index({ vehicleId: 1, lastGpsAt: -1 });

export const VehicleLocation =
  models.VehicleLocation ||
  model<VehicleLocationDocument>("VehicleLocation", VehicleLocationSchema);
