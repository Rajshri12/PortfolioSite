import mongoose, { Schema, Document } from "mongoose";

export interface IRewardConfig {
  type: "coins" | "custom";
  coins?: number;
  rewardId?: string;
  rewardLabel?: string;
  quantity?: number;
}

export interface IStage extends Document {
  stageId: string;
  track: string;
  orderIndex: number;
  title: string;
  description: string;
  doList: string[];
  dontList: string[];
  projectSpec: string;
  rewardConfig?: IRewardConfig;
  createdAt: Date;
  updatedAt: Date;
}

const RewardConfigSchema = new Schema(
  {
    type: { type: String, enum: ["coins", "custom"], default: "coins" },
    coins: { type: Number },
    rewardId: { type: String },
    rewardLabel: { type: String },
    quantity: { type: Number },
  },
  { _id: false }
);

const StageSchema = new Schema<IStage>(
  {
    stageId: { type: String, required: true, unique: true, index: true },
    track: { type: String, required: true },
    orderIndex: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    doList: { type: [String], default: [] },
    dontList: { type: [String], default: [] },
    projectSpec: { type: String, default: "" },
    rewardConfig: { type: RewardConfigSchema },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== "production" && mongoose.models.Stage) {
  delete mongoose.models.Stage;
}

export default mongoose.models.Stage ||
  mongoose.model<IStage>("Stage", StageSchema);
