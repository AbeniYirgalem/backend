import mongoose, { type Types } from "mongoose";

const { Schema, model, models } = mongoose;

export interface CongestionDataDocument {
  stationName: string;
  stopId?: Types.ObjectId;
  latitude: number;
  longitude: number;
  density: number;
  queueLength: number;
  waitMinutes: number;
  level: "low" | "medium" | "high" | "critical";
  source: "simulated" | "sensor" | "operator";
  sampledAt: Date;
}

const CongestionDataSchema = new Schema<CongestionDataDocument>(
  {
    stationName: { type: String, required: true, index: true },
    stopId: { type: Schema.Types.ObjectId, ref: "Stop" },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    density: { type: Number, required: true, min: 0, max: 100 },
    queueLength: { type: Number, required: true, min: 0 },
    waitMinutes: { type: Number, required: true, min: 0 },
    level: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["simulated", "sensor", "operator"],
      default: "simulated",
    },
    sampledAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: true },
);

CongestionDataSchema.index({ stationName: 1, sampledAt: -1 });

export const CongestionData =
  models.CongestionData ||
  model<CongestionDataDocument>("CongestionData", CongestionDataSchema);
