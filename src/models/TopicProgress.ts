import mongoose, { Schema, Document } from "mongoose";

export type TopicStatus = "not_started" | "in_progress" | "completed";

export interface ITopicProgress extends Document {
  userId: string;
  topicId: string; // stable string key, e.g. "ai-s1-t1"
  status: TopicStatus;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TopicProgressSchema = new Schema<ITopicProgress>(
  {
    userId: { type: String, required: true, index: true },
    topicId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
    },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

TopicProgressSchema.index({ userId: 1, topicId: 1 }, { unique: true });

// Drop legacy solo topicId index if it exists (left over from before userId was added)
async function ensureIndexes(model: mongoose.Model<ITopicProgress>) {
  try {
    const indexes = await model.collection.indexes();
    const legacyIdx = indexes.find(
      (idx: any) =>
        Object.keys(idx.key).length === 1 && idx.key.topicId !== undefined
    );
    if (legacyIdx) {
      await model.collection.dropIndex(legacyIdx.name);
    }
  } catch {
    // ignore — collection may not exist yet
  }
}

const TopicProgressModel =
  mongoose.models.TopicProgress ||
  mongoose.model<ITopicProgress>("TopicProgress", TopicProgressSchema);

ensureIndexes(TopicProgressModel as mongoose.Model<ITopicProgress>);

export default TopicProgressModel;
