import mongoose, { type Types } from "mongoose";

const { Schema, model, models } = mongoose;

export interface BusDocument {
  operatorId: Types.ObjectId;
  name: string;
  type: string;
  totalSeats: number;
  amenities: string[];
  images: string[];
}

const BusSchema = new Schema<BusDocument>(
  {
    operatorId: {
      type: Schema.Types.ObjectId,
      ref: "BusOperator",
      required: true,
    },
    name: { type: String, required: true },
    type: { type: String, required: true },
    totalSeats: { type: Number, required: true },
    amenities: [{ type: String }],
    images: [{ type: String }],
  },
  { timestamps: true },
);

BusSchema.index({ operatorId: 1 });

export const Bus = models.Bus || model<BusDocument>("Bus", BusSchema);
