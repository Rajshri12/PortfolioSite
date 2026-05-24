import mongoose, { Schema, Document } from "mongoose";

export interface IUserStats extends Document {
  key: string; // singleton: "main"
  streakCount: number;
  streakLastDate: string; // YYYY-MM-DD
  freezeCountThisMonth: number;
  freezeMonthKey: string; // YYYY-MM, resets when month changes
  updatedAt: Date;
}

const UserStatsSchema = new Schema<IUserStats>(
  {
    key: { type: String, default: "main", unique: true },
    streakCount: { type: Number, default: 0 },
    streakLastDate: { type: String, default: "" },
    freezeCountThisMonth: { type: Number, default: 0 },
    freezeMonthKey: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.UserStats ||
  mongoose.model<IUserStats>("UserStats", UserStatsSchema);
