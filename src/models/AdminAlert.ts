import mongoose, { Schema, Document } from "mongoose";

export type AlertType =
  | "mood_drop"
  | "stake_result"
  | "joker_used"
  | "streak_broken"
  | "stuck_help"
  | "manual";

export interface IAdminAlert extends Document {
  type: AlertType;
  userId: string;
  message: string;
  resolved: boolean;
  resolvedAt: Date | null;
  createdAt: Date;
}

const AdminAlertSchema = new Schema<IAdminAlert>(
  {
    type: {
      type: String,
      enum: ["mood_drop", "stake_result", "joker_used", "streak_broken", "stuck_help", "manual"],
      required: true,
    },
    userId: { type: String, required: true, index: true },
    message: { type: String, required: true },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.AdminAlert ||
  mongoose.model<IAdminAlert>("AdminAlert", AdminAlertSchema);
