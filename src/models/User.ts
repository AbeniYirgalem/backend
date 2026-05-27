import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

export type UserRole = "passenger" | "operator" | "admin";

export interface UserDocument {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  isVerified: boolean;
  verificationToken?: string | null;
  verificationTokenExpiry?: Date | null;
}

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["passenger", "operator", "admin"],
      default: "passenger",
    },
    phone: { type: String },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: null },
    verificationTokenExpiry: { type: Date, default: null },
  },
  { timestamps: true },
);

export const User = models.User || model<UserDocument>("User", UserSchema);
