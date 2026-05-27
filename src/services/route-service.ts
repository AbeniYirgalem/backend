import { Route } from "../models/Route.js";

export async function createRoute(payload: {
  name?: string;
  fromLocation?: string;
  toLocation?: string;
  from: string;
  to: string;
  distance: number;
  estimatedTime?: number;
  fare?: number;
  coordinates?: Array<{ lat: number; lng: number }>;
}) {
  return Route.create(payload);
}

export async function getRoutes() {
  return Route.find().lean();
}
