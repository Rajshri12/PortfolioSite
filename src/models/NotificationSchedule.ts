import mongoose, { Schema, Document } from "mongoose";

export type ScheduleCondition =
  | "always"
  | "streak_at_risk"
  | "not_logged_in_today"
  | "happy_hour_start";

export interface INotificationSchedule extends Document {
  label: string;
  emoji: string;
  message: string;
  time: string; // 'HH:MM' in server-local time (IST on Render)
  days: number[]; // 0=Sun..6=Sat, empty = every day
  condition: ScheduleCondition;
  isActive: boolean;
  lastSentAt: Date | null;
  createdAt: Date;
}

const NotificationScheduleSchema = new Schema<INotificationSchedule>(
  {
    label: { type: String, required: true },
    emoji: { type: String, default: "🔔" },
    message: { type: String, required: true },
    time: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    days: [{ type: Number, min: 0, max: 6 }],
    condition: {
      type: String,
      enum: ["always", "streak_at_risk", "not_logged_in_today", "happy_hour_start"],
      default: "always",
    },
    isActive: { type: Boolean, default: true },
    lastSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.NotificationSchedule ||
  mongoose.model<INotificationSchedule>("NotificationSchedule", NotificationScheduleSchema);
