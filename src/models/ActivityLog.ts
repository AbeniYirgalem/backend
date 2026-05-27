import mongoose, { type Types } from "mongoose";

const { Schema, model, models } = mongoose;

// All meaningful action types across the platform
export type ActivityActionType =
  | "REGISTER"
  | "LOGIN"
  | "LOGOUT"
  | "PROFILE_UPDATE"
  | "EMAIL_VERIFY"
  | "BOOK_TRIP"
  | "CANCEL_TRIP"
  | "TRACK_VIEW"
  | "RFID_RECHARGE"
  | "RFID_PAYMENT"
  | "RFID_SCAN"
  | "CARD_REGISTER"
  | "BUS_CREATE"
  | "ROUTE_CREATE"
  | "NOTIFICATION_READ";

export interface ActivityLogDocument {
  userId: Types.ObjectId;
  actionType: ActivityActionType;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

const ActivityLogSchema = new Schema<ActivityLogDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actionType: {
      type: String,
      enum: [
        "REGISTER", "LOGIN", "LOGOUT", "PROFILE_UPDATE", "EMAIL_VERIFY",
        "BOOK_TRIP", "CANCEL_TRIP", "TRACK_VIEW",
        "RFID_RECHARGE", "RFID_PAYMENT", "RFID_SCAN", "CARD_REGISTER",
        "BUS_CREATE", "ROUTE_CREATE", "NOTIFICATION_READ",
      ],
      required: true,
      index: true,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    // No timestamps — timestamp field IS the record time
    versionKey: false,
  },
);

ActivityLogSchema.index({ userId: 1, timestamp: -1 });
ActivityLogSchema.index({ userId: 1, actionType: 1, timestamp: -1 });

export const ActivityLog =
  models.ActivityLog ||
  model<ActivityLogDocument>("ActivityLog", ActivityLogSchema);
