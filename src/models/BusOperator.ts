import mongoose, { type Types } from "mongoose";

const { Schema, model, models } = mongoose;

export interface BusOperatorDocument {
  userId: Types.ObjectId;
  companyName: string;
  verified: boolean;
}

const BusOperatorSchema = new Schema<BusOperatorDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    companyName: { type: String, required: true },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const BusOperator =
  models.BusOperator ||
  model<BusOperatorDocument>("BusOperator", BusOperatorSchema);
