import { z } from "zod";

export const bookingSchema = z.object({
  scheduleId: z.string(),
  seats: z.array(z.string()).min(1),
});
