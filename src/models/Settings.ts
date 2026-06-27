import mongoose, { Schema, Document } from "mongoose";

export interface ISettings extends Document {
  userId: string; // 'global' for app-wide settings, or specific userId
  key: string;
  value: any;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    userId: { type: String, required: true, default: "global", index: true },
    key: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

SettingsSchema.index({ userId: 1, key: 1 }, { unique: true });

export default mongoose.models.Settings ||
  mongoose.model<ISettings>("Settings", SettingsSchema);
