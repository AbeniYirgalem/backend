import { z } from "zod";

export const reviewSchema = z.object({
  busId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(2).optional(),
});
