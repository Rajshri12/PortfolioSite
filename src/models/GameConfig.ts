import mongoose, { Schema, Document } from "mongoose";

export interface IHappyHourSlot {
  name: string;
  enabled: boolean;
  schedule: "daily" | "weekends" | "weekdays";
  startHour: number;
  endHour: number;
  multiplier: number;
}

export interface IGameConfig extends Document {
  rewards: {
    taskComplete: number;
    allTasksBonus: number;
    roadmapTopicComplete: number;
    streakMilestone7: number;
    streakMilestone14: number;
    streakMilestone30: number;
    streakMilestone60: number;
  };
  staking: {
    defaultStakeAmount: number;
    winMultiplier: number;
    maxStakeAmount: number;
  };
  happyHour: {
    enabled: boolean;
    startHour: number;
    endHour: number;
    multiplier: number;
  };
  happyHourSlots: IHappyHourSlot[];
  jokers: {
    earnEveryNDays: number;
    maxStored: number;
  };
  alerts: {
    moodDropConsecutiveDays: number;
  };
  weeklyChest: {
    requiredDays: number;
    rewardCoins: number;
  };
  bonusActions: {
    journalEntry: number;
    dailySummary: number;
    issueLogged: number;
    vaultSaved: number;
    coldEmailSent: number;
  };
  level: {
    coinsPerLevel: number;
  };
}

const GameConfigSchema = new Schema<IGameConfig>(
  {
    rewards: {
      taskComplete: { type: Number, default: 10 },
      allTasksBonus: { type: Number, default: 25 },
      roadmapTopicComplete: { type: Number, default: 50 },
      streakMilestone7: { type: Number, default: 0 },
      streakMilestone14: { type: Number, default: 100 },
      streakMilestone30: { type: Number, default: 500 },
      streakMilestone60: { type: Number, default: 1500 },
    },
    staking: {
      defaultStakeAmount: { type: Number, default: 50 },
      winMultiplier: { type: Number, default: 3 },
      maxStakeAmount: { type: Number, default: 200 },
    },
    happyHour: {
      enabled: { type: Boolean, default: true },
      startHour: { type: Number, default: 6 },
      endHour: { type: Number, default: 9 },
      multiplier: { type: Number, default: 2 },
    },
    happyHourSlots: {
      type: [{
        name: { type: String, default: "Happy Hour" },
        enabled: { type: Boolean, default: true },
        schedule: { type: String, enum: ["daily", "weekends", "weekdays"], default: "daily" },
        startHour: { type: Number, default: 6 },
        endHour: { type: Number, default: 9 },
        multiplier: { type: Number, default: 2 },
      }],
      default: [],
    },
    jokers: {
      earnEveryNDays: { type: Number, default: 7 },
      maxStored: { type: Number, default: 3 },
    },
    alerts: {
      moodDropConsecutiveDays: { type: Number, default: 3 },
    },
    weeklyChest: {
      requiredDays: { type: Number, default: 5 },
      rewardCoins: { type: Number, default: 150 },
    },
    bonusActions: {
      journalEntry: { type: Number, default: 15 },
      dailySummary: { type: Number, default: 30 },
      issueLogged: { type: Number, default: 15 },
      vaultSaved: { type: Number, default: 10 },
      coldEmailSent: { type: Number, default: 30 },
    },
    level: {
      coinsPerLevel: { type: Number, default: 100 },
    },
  },
  { timestamps: true }
);

export default mongoose.models.GameConfig ||
  mongoose.model<IGameConfig>("GameConfig", GameConfigSchema);
