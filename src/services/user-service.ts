import { User } from "../models/User.js";

export async function getUserById(id: string) {
  return User.findById(id)
    .select("-password -verificationToken -verificationTokenExpiry")
    .lean();
}

export async function updateUser(
  id: string,
  payload: { name?: string; phone?: string },
) {
  return User.findByIdAndUpdate(id, payload, {
    returnDocument: "after",
  })
    .select("-password -verificationToken -verificationTokenExpiry")
    .lean();
}
