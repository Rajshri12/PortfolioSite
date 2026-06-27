import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import CoinTransaction from "@/models/CoinTransaction";
import GameConfig from "@/models/GameConfig";
import AdminAlert from "@/models/AdminAlert";
import { sendTelegram, getAdminChatId } from "@/lib/telegram";

export type CoinEvent =
  | "task_complete"
  | "all_tasks_bonus"
  | "topic_complete"
  | "streak_milestone_14"
  | "streak_milestone_30"
  | "streak_milestone_60"
  | "stake_win"
  | "stake_loss"
  | "weekly_chest"
  | "journal_entry"
  | "journal_summary"
  | "journal_issue"
  | "vault_saved"
  | "cold_email"
  | "badge_bonus"
  | "admin_adjust";

// Happy-hour-eligible events
const HAPPY_HOUR_ELIGIBLE = new Set<CoinEvent>([
  "task_complete",
  "all_tasks_bonus",
  "topic_complete",
  "journal_entry",
  "journal_summary",
  "journal_issue",
  "vault_saved",
  "cold_email",
]);

export async function getGameConfig() {
  await connectToDatabase();
  let config = await GameConfig.findOne();
  if (!config) config = await GameConfig.create({});
  return config;
}

export async function awardCoins(
  userId: string,
  baseAmount: number,
  event: CoinEvent,
  adminNote = ""
): Promise<{ awarded: number; happyHour: boolean }> {
  const config = await getGameConfig();

  let amount = baseAmount;
  let happyHour = false;

  if (HAPPY_HOUR_ELIGIBLE.has(event)) {
    const now = new Date();
    const nowHour = now.getHours();
    const dow = now.getDay(); // 0=Sun, 6=Sat
    const isWeekend = dow === 0 || dow === 6;
    const isWeekday = !isWeekend;

    const slots: Array<{ name: string; enabled: boolean; schedule: string; startHour: number; endHour: number; multiplier: number }> =
      config.happyHourSlots?.length ? config.happyHourSlots : (config.happyHour.enabled ? [{ ...config.happyHour, name: "Happy Hour", schedule: "daily" }] : []);

    for (const slot of slots) {
      if (!slot.enabled) continue;
      const scheduleMatch =
        slot.schedule === "daily" ||
        (slot.schedule === "weekends" && isWeekend) ||
        (slot.schedule === "weekdays" && isWeekday);
      if (!scheduleMatch) continue;
      if (nowHour >= slot.startHour && nowHour < slot.endHour) {
        amount = Math.round(amount * slot.multiplier);
        happyHour = true;
        break; // first matching slot wins
      }
    }
  }

  if (amount === 0) return { awarded: 0, happyHour: false };

  await Promise.all([
    User.findOneAndUpdate({ userId }, { $inc: { coins: amount } }),
    CoinTransaction.create({ userId, amount, reason: event, adminNote, happyHour, event }),
  ]);

  // After earning, check if a joker token should be awarded based on streak
  const user = await User.findOne({ userId });
  if (user) {
    const config2 = config; // same config
    const streak = user.streak ?? 0;
    if (
      streak > 0 &&
      streak % config2.jokers.earnEveryNDays === 0 &&
      user.jokerTokens < config2.jokers.maxStored
    ) {
      await User.findOneAndUpdate({ userId }, { $inc: { jokerTokens: 1 } });
    }
  }

  return { awarded: amount, happyHour };
}

export async function deductCoins(
  userId: string,
  amount: number,
  event: CoinEvent,
  adminNote = ""
): Promise<void> {
  await Promise.all([
    User.findOneAndUpdate({ userId }, { $inc: { coins: -Math.abs(amount) } }),
    CoinTransaction.create({
      userId,
      amount: -Math.abs(amount),
      reason: event,
      adminNote,
      happyHour: false,
      event,
    }),
  ]);
}

export async function settleStreak(userId: string): Promise<void> {
  const user = await User.findOne({ userId });
  if (!user) return;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (!user.streakLastDate || user.streakLastDate === todayStr) return;

  if (user.streakLastDate === yesterdayStr) return; // streak still alive

  // Missed yesterday
  if (user.jokerTokens > 0 && !user.jokerUsedThisWeek) {
    // Auto-use joker to preserve streak
    user.jokerTokens -= 1;
    user.jokerUsedThisWeek = true;
    await user.save();
    await AdminAlert.create({
      type: "joker_used",
      userId,
      message: `Joker token auto-used to preserve ${user.streak}-day streak (missed ${yesterdayStr}).`,
    });
    getAdminChatId().then((chatId) => {
      if (chatId) sendTelegram(chatId, `🃏 <b>Joker auto-used</b>\n\nSaved ${user.streak}-day streak (missed ${yesterdayStr}).\nJokers remaining: ${user.jokerTokens - 1}`);
    });
  } else {
    // Break streak
    const brokenStreak = user.streak;
    user.streak = 0;
    await user.save();
    if (brokenStreak > 0) {
      await AdminAlert.create({
        type: "streak_broken",
        userId,
        message: `Streak of ${brokenStreak} days broken. Missed: ${yesterdayStr}.`,
      });
      getAdminChatId().then((chatId) => {
        if (chatId) sendTelegram(chatId, `🔥 <b>Streak broken</b>\n\nuser1's ${brokenStreak}-day streak is gone.\nMissed: ${yesterdayStr}. No jokers left.`);
      });
    }
  }
}

export async function checkStreakMilestones(
  userId: string,
  streak: number
): Promise<void> {
  const config = await getGameConfig();
  const milestones: Array<{ days: number; coins: number; event: CoinEvent }> = [
    { days: 14, coins: config.rewards.streakMilestone14, event: "streak_milestone_14" },
    { days: 30, coins: config.rewards.streakMilestone30, event: "streak_milestone_30" },
    { days: 60, coins: config.rewards.streakMilestone60, event: "streak_milestone_60" },
  ];

  for (const m of milestones) {
    if (streak === m.days && m.coins > 0) {
      await awardCoins(userId, m.coins, m.event, `${m.days}-day streak milestone`);
    }
  }
}
