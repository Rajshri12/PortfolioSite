import mongoose, { Schema, Document } from "mongoose";

export interface ICoinTransaction extends Document {
  userId: string;
  amount: number; // positive = earn, negative = spend/penalty
  reason: string; // 'task_complete' | 'all_tasks_bonus' | 'topic_complete' | 'streak_milestone' | 'stake_win' | 'stake_loss' | 'weekly_chest' | 'journal_entry' | 'vault_saved' | 'cold_email' | 'admin_adjust' | 'badge_bonus'
  adminNote: string;
  happyHour: boolean;
  event: string; // machine key for the triggering event
  createdAt: Date;
}

const CoinTransactionSchema = new Schema<ICoinTransaction>(
  {
    userId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    adminNote: { type: String, default: "" },
    happyHour: { type: Boolean, default: false },
    event: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.CoinTransaction ||
  mongoose.model<ICoinTransaction>("CoinTransaction", CoinTransactionSchema);
