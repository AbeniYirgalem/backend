import { z } from "zod";

export const registerCardSchema = z.object({
  cardUid: z.string().min(6),
  initialBalance: z.number().min(0).optional(),
});

export const rechargeCardSchema = z.object({
  cardUid: z.string().min(6),
  amount: z.number().positive(),
});

export const tapCardSchema = z.object({
  cardUid: z.string().min(6),
  fare: z.number().positive(),
  routeId: z.string().optional(),
  originStopId: z.string().optional(),
  destinationStopId: z.string().optional(),
});
