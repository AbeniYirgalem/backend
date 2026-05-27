import { Bus } from "../models/Bus.js";

export async function createBus(payload: {
  operatorId: string;
  name: string;
  type: string;
  totalSeats: number;
  amenities?: string[];
  images?: string[];
}) {
  return Bus.create(payload);
}

/** Operators see only their own buses; admins see all */
export async function getBuses(userId?: string, role?: string) {
  if (role === "operator" && userId) {
    return Bus.find({ operatorId: userId }).lean();
  }
  // admin or public listing
  return Bus.find().lean();
}

/** Validate ownership before returning */
export async function getBusById(id: string, userId?: string, role?: string) {
  const bus = await Bus.findById(id).lean();
  if (!bus) return null;
  // Operators can only view their own buses
  if (role === "operator" && userId && bus.operatorId.toString() !== userId) {
    return null;
  }
  return bus;
}

/** Only update if operator owns the bus (admin bypasses) */
export async function updateBus(
  id: string,
  payload: Partial<{
    name: string;
    type: string;
    totalSeats: number;
    amenities: string[];
    images: string[];
  }>,
  userId?: string,
  role?: string,
) {
  const query: Record<string, unknown> = { _id: id };
  if (role === "operator" && userId) {
    query.operatorId = userId;
  }
  return Bus.findOneAndUpdate(query, payload, {
    returnDocument: "after",
  }).lean();
}

/** Only delete if operator owns the bus (admin bypasses) */
export async function deleteBus(id: string, userId?: string, role?: string) {
  const query: Record<string, unknown> = { _id: id };
  if (role === "operator" && userId) {
    query.operatorId = userId;
  }
  return Bus.findOneAndDelete(query).lean();
}
