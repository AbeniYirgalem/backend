import { z } from "zod";

const coordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const routeSchema = z.object({
  name: z.string().min(3).optional(),
  fromLocation: z.string().min(2).optional(),
  toLocation: z.string().min(2).optional(),
  from: z.string().min(2),
  to: z.string().min(2),
  distance: z.number().positive(),
  estimatedTime: z.number().positive().optional(),
  fare: z.number().min(0).optional(),
  coordinates: z.array(coordinateSchema).min(2).optional(),
});
