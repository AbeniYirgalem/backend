import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { sendResponse } from "../utils/response.js";
import { createReview, getReviews } from "../services/review-service.js";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const review = await createReview({
    userId: req.user!.id,
    busId: req.body.busId,
    rating: req.body.rating,
    comment: req.body.comment,
  });
  sendResponse(res, 201, "Review created", review);
});

export const listByBus = asyncHandler(async (req: Request, res: Response) => {
  const reviews = await getReviews(req.params.busId);
  sendResponse(res, 200, "Reviews", reviews);
});
