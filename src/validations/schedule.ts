import { z } from "zod";

export const scheduleSchema = z.object({
  busId: z.string(),
  routeId: z.string(),
  departureTime: z.string(),
  arrivalTime: z.string(),
  price: z.number().positive(),
  availableSeats: z.number().int().nonnegative(),
});

export const scheduleSearchSchema = z.object({
  from: z.string().min(2),
  to: z.string().min(2),
  date: z.string().min(2),
});
