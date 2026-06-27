import mongoose, { Schema, Document } from 'mongoose';

export interface IRewardConfig {
  type: 'coins' | 'custom';
  coins?: number;
  rewardId?: string;
  rewardLabel?: string;
  quantity?: number;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}

export interface ITask extends Document {
  userId: string;
  text: string;
  category: 'learning' | 'job-search' | 'self-care';
  type: 'daily' | 'custom';
  url?: string;
  date?: string;
  recurrence: {
    type: 'none' | 'daily' | 'weekly';
    days: number[];
  };
  completedDates: string[];
  excludedDates: string[];
  endDate?: string;
  rewardConfig?: IRewardConfig;
  createdAt: Date;
}

const RewardConfigSchema = new Schema(
  {
    type: { type: String, enum: ['coins', 'custom'], default: 'coins' },
    coins: { type: Number },
    rewardId: { type: String },
    rewardLabel: { type: String },
    quantity: { type: Number },
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: null },
  },
  { _id: false }
);

const TaskSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  text: { type: String, required: true },
  category: { type: String, enum: ['learning', 'job-search', 'self-care'], required: true },
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
  rewardConfig: { type: RewardConfigSchema },
  createdAt: { type: Date, default: Date.now },
});

if (process.env.NODE_ENV !== "production" && mongoose.models.Task) {
  delete mongoose.models.Task;
}

export default mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);
