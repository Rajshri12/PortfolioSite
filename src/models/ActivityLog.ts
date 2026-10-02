import mongoose, { Schema, Document } from "mongoose";

export type ActivityEvent = "login" | "logout" | "page_view" | "heartbeat";

export interface IActivityLog extends Document {
  userId: string;
  event: ActivityEvent;
  page: string;
  userAgent: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: String, required: true, index: true },
    event: {
      type: String,
      enum: ["login", "logout", "page_view", "heartbeat"],
      required: true,
    },
    page: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

// TTL: auto-delete raw pings after 90 days (page_views/heartbeats accumulate fast;
// login/logout summary lives in this same window too — bump if needed)
ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);
