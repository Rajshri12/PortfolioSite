import mongoose, { Schema, Document } from "mongoose";

export type TopicStatus = "not_started" | "in_progress" | "completed";

export interface ITopicProgress extends Document {
  topicId: string; // stable string key, e.g. "ai-s1-t1"
  status: TopicStatus;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TopicProgressSchema = new Schema<ITopicProgress>(
  {
    topicId: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
    },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.TopicProgress ||
  mongoose.model<ITopicProgress>("TopicProgress", TopicProgressSchema);
