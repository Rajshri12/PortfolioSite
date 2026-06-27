import mongoose, { Schema, Document } from "mongoose";

export interface ITopicResource {
  label: string;
  url: string;
}

export interface IRewardConfig {
  type: "coins" | "custom";
  coins?: number;
  rewardId?: string;
  rewardLabel?: string;
  quantity?: number;
}

export interface ITopic extends Document {
  topicId: string;
  stageId: string;
  orderIndex: number;
  title: string;
  notes?: string;
  resources: ITopicResource[];
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

const TopicSchema = new Schema<ITopic>(
  {
    topicId: { type: String, required: true, unique: true, index: true },
    stageId: { type: String, required: true, index: true },
    orderIndex: { type: Number, required: true },
    title: { type: String, required: true },
    notes: { type: String, default: "" },
    resources: {
      type: [{ label: String, url: String, _id: false }],
      default: [],
    },
    rewardConfig: { type: RewardConfigSchema },
  },
  { timestamps: true }
);

// In dev, delete the cached model so schema changes take effect on hot reload
if (process.env.NODE_ENV !== "production" && mongoose.models.Topic) {
  delete mongoose.models.Topic;
}

export default mongoose.models.Topic ||
  mongoose.model<ITopic>("Topic", TopicSchema);
