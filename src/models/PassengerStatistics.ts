/**
 * PassengerStatistics model.
 *
 * Stores daily aggregate passenger boarding statistics per bus.
 * Firebase holds a live real-time count snapshot; this collection
 * provides historical statistics, reporting, and trend analysis.
 */
import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

export interface PassengerStatisticsDocument {
  /** ESP32 bus identifier string (e.g. "BUS001") */
  busId: string;
  /** Snapshot date — normalized to midnight UTC */
  date: Date;
  /** Passenger count at time of snapshot */
  currentCount: number;
  /** Maximum bus capacity */
  capacity: number;
  /** Occupancy percentage 0-100 */
  occupancyPct: number;
  /** Peak passenger count recorded during the day */
  peakCount: number;
  /** Total boardings since start of service day */
  totalBoardings: number;
  /** Optional route this snapshot belongs to */
  routeId?: mongoose.Types.ObjectId;
}

const PassengerStatisticsSchema = new Schema<PassengerStatisticsDocument>(
  {
    busId: { type: String, required: true, index: true },
    date: {
      type: Date,
      required: true,
      default: () => {
        const d = new Date();
        d.setUTCHours(0, 0, 0, 0);
        return d;
      },
      index: true,
    },
    currentCount: { type: Number, required: true, default: 0, min: 0 },
    capacity: { type: Number, required: true, default: 45, min: 1 },
    occupancyPct: { type: Number, required: true, default: 0, min: 0, max: 100 },
    peakCount: { type: Number, default: 0, min: 0 },
    totalBoardings: { type: Number, default: 0, min: 0 },
    routeId: { type: Schema.Types.ObjectId, ref: "Route" },
  },
  { timestamps: true },
);

// One document per bus per date — upsert pattern used in service
PassengerStatisticsSchema.index({ busId: 1, date: -1 }, { unique: false });

export const PassengerStatistics =
  models.PassengerStatistics ||
  model<PassengerStatisticsDocument>("PassengerStatistics", PassengerStatisticsSchema);
