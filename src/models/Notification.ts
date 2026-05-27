import mongoose, { type Types } from "mongoose";

const { Schema, model, models } = mongoose;

export interface NotificationDocument {
  userId?: Types.ObjectId;
  title: string;
  message: string;
  type: "info" | "warning" | "critical" | "success";
  eventType?: "ARRIVAL" | "FAULT" | "DELAY";
  audience: "passenger" | "operator" | "admin" | "all";
  read: boolean;
  metadata?: Record<string, unknown>;
}

const NotificationSchema = new Schema<NotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["info", "warning", "critical", "success"],
      default: "info",
      index: true,
    },
    eventType: {
      type: String,
      enum: ["ARRIVAL", "FAULT", "DELAY"],
      index: true,
    },
    audience: {
      type: String,
      enum: ["passenger", "operator", "admin", "all"],
      default: "all",
      index: true,
    },
    read: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

NotificationSchema.index({ userId: 1, read: 1 });
NotificationSchema.index({ audience: 1, createdAt: -1 });

export const Notification =
  models.Notification ||
  model<NotificationDocument>("Notification", NotificationSchema);
