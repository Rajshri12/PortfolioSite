import mongoose, { Schema, Document } from 'mongoose';

export type JobStatus = 'new' | 'applied' | 'oa' | 'phone_screen' | 'interview' | 'final_round' | 'offer' | 'rejected';
export type JobSource = 'scraper' | 'manual' | 'referral' | 'cold_email';
export type ReferralStatus = 'planning' | 'asked' | 'received' | 'declined';
export type Priority = 'dream' | 'high' | 'medium' | 'low';

export interface IJob extends Document {
  title: string;
  company: string;
  url: string;
  source: JobSource;
  status: JobStatus;
  priority: Priority;
  reasoning?: string;
  notes?: string;
  location?: string;
  salary?: string;
  tags: string[];
  appliedAt?: Date;
  followUpDate?: Date;
  rejectionStage?: JobStatus;
  stageHistory: { stage: JobStatus; date: Date; notes?: string }[];
  referral?: {
    referrerName: string;
    referrerLinkedIn?: string;
    referrerEmail?: string;
    relationship: string;
    status: ReferralStatus;
    askedAt?: Date;
    notes?: string;
  };
  recruiter?: {
    name: string;
    email?: string;
    linkedIn?: string;
    title?: string;
  };
  coldEmail?: {
    subject: string;
    body: string;
    generatedAt: Date;
    sent: boolean;
    sentAt?: Date;
  };
  createdAt: Date;
}

const StageEventSchema = new Schema(
  { stage: String, date: { type: Date, default: Date.now }, notes: String },
  { _id: false }
);

const JobSchema: Schema = new Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  url: { type: String, required: true },
  source: { type: String, enum: ['scraper', 'manual', 'referral', 'cold_email'], default: 'manual' },
  status: {
    type: String,
    enum: ['new', 'applied', 'oa', 'phone_screen', 'interview', 'final_round', 'offer', 'rejected'],
    default: 'new',
  },
  priority: { type: String, enum: ['dream', 'high', 'medium', 'low'], default: 'medium' },
  reasoning: String,
  notes: String,
  location: String,
  salary: String,
  tags: [String],
  appliedAt: Date,
  followUpDate: Date,
  rejectionStage: String,
  stageHistory: [StageEventSchema],
  referral: {
    referrerName: String,
    referrerLinkedIn: String,
    referrerEmail: String,
    relationship: String,
    status: { type: String, enum: ['planning', 'asked', 'received', 'declined'], default: 'planning' },
    askedAt: Date,
    notes: String,
  },
  recruiter: { name: String, email: String, linkedIn: String, title: String },
  coldEmail: {
    subject: String,
    body: String,
    generatedAt: Date,
    sent: { type: Boolean, default: false },
    sentAt: Date,
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);
