import { User } from "../models/User.js";
import { BusOperator } from "../models/BusOperator.js";

export async function listUsers() {
  return User.find().select("-password").lean();
}

export async function approveOperator(payload: {
  userId: string;
  verified: boolean;
}) {
  return BusOperator.findOneAndUpdate(
    { userId: payload.userId },
    { verified: payload.verified },
    { returnDocument: "after" },
  ).lean();
}
