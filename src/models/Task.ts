import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  text: string;
  category: 'learning' | 'job-search';
  type: 'daily' | 'custom'; // sub-category for job-search
  url?: string;
  date?: string; // For one-time tasks: YYYY-MM-DD
  recurrence: {
    type: 'none' | 'daily' | 'weekly';
    days: number[]; // 0-6
  };
   completedDates: string[]; // List of YYYY-MM-DD
   excludedDates: string[]; // List of YYYY-MM-DD
   endDate?: string; // YYYY-MM-DD
   createdAt: Date;
 }

const TaskSchema: Schema = new Schema({
  text: { type: String, required: true },
  category: { type: String, enum: ['learning', 'job-search'], required: true },
  type: { type: String, enum: ['daily', 'custom'], default: 'daily' },
  url: { type: String },
  date: { type: String },
  recurrence: {
    type: { type: String, enum: ['none', 'daily', 'weekly'], default: 'none' },
    days: [{ type: Number }]
  },
   completedDates: [{ type: String }],
   excludedDates: [{ type: String }],
   endDate: { type: String },
   createdAt: { type: Date, default: Date.now },
 });

export default mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
