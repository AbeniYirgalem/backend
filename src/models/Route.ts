import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

export interface RouteDocument {
  name?: string;
  fromLocation?: string;
  toLocation?: string;
  from: string;
  to: string;
  distance: number;
  estimatedTime?: number;
  fare?: number;
  coordinates?: Array<{ lat: number; lng: number }>;
  baseFare: number;
  averageDurationMinutes?: number;
  active: boolean;
}

const RouteSchema = new Schema<RouteDocument>(
  {
    name: { type: String },
    fromLocation: { type: String },
    toLocation: { type: String },
    from: { type: String, required: true },
    to: { type: String, required: true },
    distance: { type: Number, required: true, min: 0 },
    estimatedTime: { type: Number, min: 1 },
    fare: { type: Number, min: 0 },
    coordinates: [
      {
        lat: { type: Number, required: true, min: -90, max: 90 },
        lng: { type: Number, required: true, min: -180, max: 180 },
      },
    ],
    baseFare: { type: Number, required: true, min: 0, default: 50 },
    averageDurationMinutes: { type: Number, min: 1 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

RouteSchema.pre("validate", function () {
  if (!this.name && this.from && this.to) {
    this.name = `${this.from} -> ${this.to}`;
  }
  if (!this.fromLocation && this.from) {
    this.fromLocation = this.from;
  }
  if (!this.toLocation && this.to) {
    this.toLocation = this.to;
  }
  if (!this.from && this.fromLocation) {
    this.from = this.fromLocation;
  }
  if (!this.to && this.toLocation) {
    this.to = this.toLocation;
  }
  if (this.fare == null && this.baseFare != null) {
    this.fare = this.baseFare;
  }
  if (this.baseFare == null && this.fare != null) {
    this.baseFare = this.fare;
  }
  if (this.estimatedTime == null && this.averageDurationMinutes != null) {
    this.estimatedTime = this.averageDurationMinutes;
  }
  if (this.averageDurationMinutes == null && this.estimatedTime != null) {
    this.averageDurationMinutes = this.estimatedTime;
  }
});

RouteSchema.index({ from: 1, to: 1 }, { unique: true });
RouteSchema.index({ active: 1, from: 1, to: 1 });

export const Route = models.Route || model<RouteDocument>("Route", RouteSchema);
