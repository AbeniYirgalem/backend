import { z } from "zod";

export const busSchema = z.object({
  operatorId: z.string(),
  name: z.string().min(2),
  type: z.string().min(2),
  totalSeats: z.number().int().positive(),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
});
