import mongoose, { type Types } from "mongoose";

const { Schema, model, models } = mongoose;

export interface StopDocument {
  name: string;
  code: string;
  routeId: Types.ObjectId;
  latitude?: number;
  longitude?: number;
  active: boolean;
}

const StopSchema = new Schema<StopDocument>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, index: true },
    routeId: { type: Schema.Types.ObjectId, ref: "Route", required: true },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

StopSchema.index({ routeId: 1, name: 1 });
StopSchema.index({ active: 1, code: 1 });

export const Stop = models.Stop || model<StopDocument>("Stop", StopSchema);
