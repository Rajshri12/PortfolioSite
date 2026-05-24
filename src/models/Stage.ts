import mongoose, { Schema, Document } from "mongoose";

export interface IStage extends Document {
  stageId: string;
  track: "ai" | "dsa";
  orderIndex: number;
  title: string;
  description: string;
  doList: string[];
  dontList: string[];
  projectSpec: string;
  createdAt: Date;
  updatedAt: Date;
}

const StageSchema = new Schema<IStage>(
  {
    stageId: { type: String, required: true, unique: true, index: true },
    track: { type: String, enum: ["ai", "dsa"], required: true },
    orderIndex: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    doList: { type: [String], default: [] },
    dontList: { type: [String], default: [] },
    projectSpec: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Stage ||
  mongoose.model<IStage>("Stage", StageSchema);
