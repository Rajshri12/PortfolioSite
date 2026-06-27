import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  userId: string;
  email: string;
  role: "admin" | "user";
  coins: number;
  streak: number;
  maxStreak: number;
  streakLastDate: string;
  jokerTokens: number;
  jokerUsedThisWeek: boolean;
  weeklyStake: {
    active: boolean;
    stakedAt: Date | null;
    amount: number;
    weekStartDate: string;
  };
  applicationUnlocked: boolean;
  onboardingComplete: boolean;
  currentMood: "hard" | "okay" | "easy" | null;
  moodUpdatedAt: Date | null;
  consecutiveHardDays: number;
  telegramChatId?: string;
  telegramUsername?: string;
  journeyStartDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ["admin", "user"], required: true },
    coins: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    maxStreak: { type: Number, default: 0 },
    streakLastDate: { type: String, default: "" },
    jokerTokens: { type: Number, default: 0, max: 3 },
    jokerUsedThisWeek: { type: Boolean, default: false },
    weeklyStake: {
      active: { type: Boolean, default: false },
      stakedAt: { type: Date, default: null },
      amount: { type: Number, default: 0 },
      weekStartDate: { type: String, default: "" },
    },
    applicationUnlocked: { type: Boolean, default: false },
    onboardingComplete: { type: Boolean, default: false },
    currentMood: { type: String, enum: ["hard", "okay", "easy", null], default: null },
    moodUpdatedAt: { type: Date, default: null },
    consecutiveHardDays: { type: Number, default: 0 },
    telegramChatId: { type: String, default: null },
    telegramUsername: { type: String, default: null },
    journeyStartDate: { type: String, default: null },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== "production" && mongoose.models.User) {
  delete (mongoose.models as any).User;
}

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
