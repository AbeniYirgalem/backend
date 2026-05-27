import mongoose, { type Types } from "mongoose";

const { Schema, model, models } = mongoose;

export interface TransactionDocument {
  userId: Types.ObjectId;
  cardId: Types.ObjectId;
  type: "recharge" | "fare";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: "success" | "failed";
  routeId?: Types.ObjectId;
  tripId?: Types.ObjectId;
  note?: string;
}

const TransactionSchema = new Schema<TransactionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    cardId: { type: Schema.Types.ObjectId, ref: "Card", required: true },
    type: { type: String, enum: ["recharge", "fare"], required: true },
    amount: { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    status: { type: String, enum: ["success", "failed"], required: true },
    routeId: { type: Schema.Types.ObjectId, ref: "Route" },
    tripId: { type: Schema.Types.ObjectId, ref: "Trip" },
    note: { type: String },
  },
  { timestamps: true },
);

TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ cardId: 1, createdAt: -1 });

export const Transaction =
  models.Transaction ||
  model<TransactionDocument>("Transaction", TransactionSchema);
