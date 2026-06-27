import mongoose, { Schema, Document } from "mongoose";

export type VaultCategory = "course" | "job" | "tool" | "checkpoint" | "free";
export type VaultStatus = "active" | "done" | "later";

export interface IVaultItem extends Document {
  userId: string;
  category: VaultCategory;
  title: string;
  url: string;
  notes: string;
  status: VaultStatus;
  tags: string[];
  expiresAt?: string; // ISO date string
  createdAt: Date;
  updatedAt: Date;
}

const VaultItemSchema = new Schema<IVaultItem>(
  {
    userId: { type: String, required: true, index: true },
    category: {
      type: String,
      enum: ["course", "job", "tool", "checkpoint", "free"],
      required: true,
    },
    title: { type: String, required: true },
    url: { type: String, default: "" },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["active", "done", "later"],
      default: "active",
    },
    tags: { type: [String], default: [] },
    expiresAt: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.VaultItem ||
  mongoose.model<IVaultItem>("VaultItem", VaultItemSchema);
