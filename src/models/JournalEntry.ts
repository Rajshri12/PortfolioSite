import mongoose, { Schema, Document } from "mongoose";

export interface IJournalEntry extends Document {
  date: string; // YYYY-MM-DD
  content: string; // JSON-encoded: {"_v":1,"mood":"good","tags":["Learning"],"text":"..."}
  createdAt: Date;
  updatedAt: Date;
}

const JournalEntrySchema = new Schema<IJournalEntry>(
  {
    date: { type: String, required: true, index: true },
    content: { type: String, required: true, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.JournalEntry ||
  mongoose.model<IJournalEntry>("JournalEntry", JournalEntrySchema);
