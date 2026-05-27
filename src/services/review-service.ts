import { Review } from "../models/Review.js";

export async function createReview(payload: {
  userId: string;
  busId: string;
  rating: number;
  comment?: string;
}) {
  return Review.create(payload);
}

export async function getReviews(busId: string) {
  return Review.find({ busId }).lean();
}
