import mongoose, { type Types } from "mongoose";

const { Schema, model, models } = mongoose;

export interface CardDocument {
  userId: Types.ObjectId;
  cardUid: string;
  balance: number;
  status: "active" | "blocked" | "lost";
  lastTapAt?: Date | null;
}

const CardSchema = new Schema<CardDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    cardUid: { type: String, required: true, unique: true, index: true },
    balance: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ["active", "blocked", "lost"],
      default: "active",
    },
    lastTapAt: { type: Date, default: null },
  },
  { timestamps: true },
);

CardSchema.index({ userId: 1, status: 1 });

export const Card = models.Card || model<CardDocument>("Card", CardSchema);
