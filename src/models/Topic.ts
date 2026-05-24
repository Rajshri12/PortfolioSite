import mongoose, { Schema, Document } from "mongoose";

export interface ITopicResource {
  label: string;
  url: string;
}

export interface ITopic extends Document {
  topicId: string;
  stageId: string;
  orderIndex: number;
  title: string;
  resources: ITopicResource[];
  createdAt: Date;
  updatedAt: Date;
}

const TopicSchema = new Schema<ITopic>(
  {
    topicId: { type: String, required: true, unique: true, index: true },
    stageId: { type: String, required: true, index: true },
    orderIndex: { type: Number, required: true },
    title: { type: String, required: true },
    resources: {
      type: [{ label: String, url: String, _id: false }],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.models.Topic ||
  mongoose.model<ITopic>("Topic", TopicSchema);
