import mongoose, { type Types } from "mongoose";

const { Schema, model, models } = mongoose;

export interface ReviewDocument {
  userId: Types.ObjectId;
  busId: Types.ObjectId;
  rating: number;
  comment?: string;
}

const ReviewSchema = new Schema<ReviewDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    busId: { type: Schema.Types.ObjectId, ref: "Bus", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
  },
  { timestamps: true },
);

ReviewSchema.index({ busId: 1, userId: 1 }, { unique: true });

export const Review =
  models.Review || model<ReviewDocument>("Review", ReviewSchema);
