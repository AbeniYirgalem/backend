/**
 * GPSLog model.
 *
 * Persists a historical GPS snapshot for every ESP32 location update.
 * Firebase keeps only the *latest* fix per bus (gps_tracking/{bus_id}).
 * This MongoDB collection provides historical GPS trails, route replay,
 * and analytics without querying Firebase.
 */
import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

export interface GPSLogDocument {
  /** ESP32 bus identifier string (e.g. "BUS001") */
  busId: string;
  latitude: number;
  longitude: number;
  /** Speed in km/h as reported by the ESP32 GPS module */
  speedKmh: number;
  /** Compass heading in degrees 0-359 */
  heading: number;
  /** Unix epoch seconds (matches Firebase convention) */
  timestamp: number;
  /** Optional reference to the route this bus was serving */
  routeId?: mongoose.Types.ObjectId;
}

const GPSLogSchema = new Schema<GPSLogDocument>(
  {
    busId: { type: String, required: true, index: true },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    speedKmh: { type: Number, default: 0, min: 0 },
    heading: { type: Number, default: 0, min: 0, max: 359 },
    timestamp: { type: Number, required: true, index: true },
    routeId: { type: Schema.Types.ObjectId, ref: "Route" },
  },
  {
    // No timestamps — we use the hardware-sourced `timestamp` field instead
    timestamps: false,
    // Expire GPS logs after 30 days to keep collection size manageable
    expireAfterSeconds: 30 * 24 * 60 * 60,
  },
);

// Compound index for efficient per-bus history queries
GPSLogSchema.index({ busId: 1, timestamp: -1 });

export const GPSLog = models.GPSLog || model<GPSLogDocument>("GPSLog", GPSLogSchema);
