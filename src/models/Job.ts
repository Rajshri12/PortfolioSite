import mongoose, { Schema, Document } from 'mongoose';

export interface IJob extends Document {
  title: string;
  company: string;
  url: string;
  source: 'scraper' | 'manual';
  status: 'new' | 'applied' | 'interviewing' | 'rejected' | 'offer';
  reasoning?: string;
  notes?: string;
  appliedAt?: Date;
  createdAt: Date;
}

const JobSchema: Schema = new Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  url: { type: String, required: true },
  source: { type: String, enum: ['scraper', 'manual'], default: 'manual' },
  status: { type: String, enum: ['new', 'applied', 'interviewing', 'rejected', 'offer'], default: 'new' },
  reasoning: { type: String },
  notes: { type: String },
  appliedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);
