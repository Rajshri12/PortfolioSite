import mongoose, { Schema, Document } from "mongoose";

export interface IRewardRedemption extends Document {
  userId: string;
  rewardId: string;
  rewardLabel: string;
  coinsRequested: number;
  quantity?: number;
  status: "pending" | "approved" | "rejected" | "fulfilled";
  adminNote: string;
  requestedAt: Date;
  resolvedAt: Date | null;
}

const RewardRedemptionSchema = new Schema<IRewardRedemption>(
  {
    userId:         { type: String, required: true, index: true },
    rewardId:       { type: String, required: true },
    rewardLabel:    { type: String, required: true },
    coinsRequested: { type: Number, required: true },
    quantity:       { type: Number, default: 1 },
    status:         { type: String, enum: ["pending", "approved", "rejected", "fulfilled"], default: "pending" },
    adminNote:      { type: String, default: "" },
    requestedAt:    { type: Date, default: () => new Date() },
    resolvedAt:     { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.RewardRedemption ||
  mongoose.model<IRewardRedemption>("RewardRedemption", RewardRedemptionSchema);
