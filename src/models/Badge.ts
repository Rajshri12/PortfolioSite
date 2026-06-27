import mongoose, { Schema, Document } from "mongoose";

export interface IBadge extends Document {
  userId: string;
  slug: string;
  earnedAt: Date;
  seenAt: Date | null;
}

const BadgeSchema = new Schema<IBadge>(
  {
    userId: { type: String, required: true, index: true },
    slug: { type: String, required: true },
    earnedAt: { type: Date, default: Date.now },
    seenAt: { type: Date, default: null },
  },
  { timestamps: false }
);

BadgeSchema.index({ userId: 1, slug: 1 }, { unique: true });

export default mongoose.models.Badge ||
  mongoose.model<IBadge>("Badge", BadgeSchema);
