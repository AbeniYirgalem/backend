import mongoose, { type Types } from "mongoose";

const { Schema, model, models } = mongoose;

export interface FaultDocument {
  title: string;
  faultType?:
    | "ENGINE_FAILURE"
    | "FLAT_TIRE"
    | "FUEL_SHORTAGE"
    | "TRAFFIC_DELAY"
    | "ACCIDENT"
    | "GPS_FAILURE"
    | "OVERHEATING"
    | "BRAKE_ISSUE"
    | "ROAD_BLOCK"
    | "WEATHER_ISSUE";
  category: "rfid" | "congestion" | "gps" | "delay" | "network" | "outage";
  severity: "low" | "medium" | "high" | "critical";
  severityLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "open" | "investigating" | "resolved";
  resolved?: boolean;
  busId?: string;
  stationName?: string;
  routeId?: Types.ObjectId;
  vehicleId?: string;
  cardId?: Types.ObjectId;
  description: string;
  suggestion?: string;
  detectedAt: Date;
  timestamp?: Date;
  resolvedAt?: Date | null;
  signals: Record<string, unknown>;
}

const FaultSchema = new Schema<FaultDocument>(
  {
    title: { type: String, required: true },
    faultType: {
      type: String,
      enum: [
        "ENGINE_FAILURE",
        "FLAT_TIRE",
        "FUEL_SHORTAGE",
        "TRAFFIC_DELAY",
        "ACCIDENT",
        "GPS_FAILURE",
        "OVERHEATING",
        "BRAKE_ISSUE",
        "ROAD_BLOCK",
        "WEATHER_ISSUE",
      ],
      index: true,
    },
    category: {
      type: String,
      enum: ["rfid", "congestion", "gps", "delay", "network", "outage"],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
      index: true,
    },
    severityLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    },
    status: {
      type: String,
      enum: ["open", "investigating", "resolved"],
      default: "open",
      index: true,
    },
    resolved: { type: Boolean, default: false, index: true },
    busId: { type: String, index: true },
    stationName: { type: String, index: true },
    routeId: { type: Schema.Types.ObjectId, ref: "Route" },
    vehicleId: { type: String, index: true },
    cardId: { type: Schema.Types.ObjectId, ref: "Card" },
    description: { type: String, required: true },
    suggestion: { type: String },
    detectedAt: { type: Date, required: true, default: Date.now, index: true },
    timestamp: { type: Date, default: Date.now },
    resolvedAt: { type: Date, default: null },
    signals: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

FaultSchema.index({ category: 1, severity: 1, detectedAt: -1 });

export const Fault = models.Fault || model<FaultDocument>("Fault", FaultSchema);
