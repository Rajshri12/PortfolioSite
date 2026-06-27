import mongoose, { Schema, Document } from "mongoose";

export interface IJournalEntry extends Document {
  userId: string;
  date: string; // YYYY-MM-DD
  content: string; // JSON-encoded: {"_v":1,"mood":"good","tags":["Learning"],"text":"..."}
  entryType: 'thought' | 'summary' | 'issue' | 'general';
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const JournalEntrySchema = new Schema<IJournalEntry>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    content: { type: String, required: true, default: "" },
    entryType: { type: String, enum: ['thought', 'summary', 'issue', 'general'], default: 'general' },
    isPrivate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.JournalEntry ||
  mongoose.model<IJournalEntry>("JournalEntry", JournalEntrySchema);
