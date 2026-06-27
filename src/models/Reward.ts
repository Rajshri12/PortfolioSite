import mongoose, { Schema, Document } from "mongoose";

export interface IReward extends Document {
  label: string;
  emoji: string;
  description: string;
  coinCost?: number;
  coinStep?: number;
  isActive: boolean;
  isComingSoon: boolean;
  createdAt: Date;
}

const RewardSchema = new Schema<IReward>(
  {
    label:       { type: String, required: true },
    emoji:       { type: String, default: "🎁" },
    description: { type: String, default: "" },
    coinCost:    { type: Number },
    coinStep:    { type: Number },
    isActive:    { type: Boolean, default: true },
    isComingSoon:{ type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Reward ||
  mongoose.model<IReward>("Reward", RewardSchema);
