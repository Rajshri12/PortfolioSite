import connectToDatabase from "@/lib/mongodb";
import Badge from "@/models/Badge";
import CoinTransaction from "@/models/CoinTransaction";
import User from "@/models/User";
import JournalEntry from "@/models/JournalEntry";
import Task from "@/models/Task";
import Job from "@/models/Job";
import VaultItem from "@/models/VaultItem";
import TopicProgress from "@/models/TopicProgress";

export type BadgeEvent =
  | "task_toggled"
  | "all_tasks_done"
  | "journal_saved"
  | "topic_completed"
  | "job_added"
  | "cold_email_sent"
  | "stake_won"
  | "vault_saved"
  | "streak_updated";

interface BadgeDef {
  slug: string;
  title: string;
  emoji: string;
  bonusCoins: number;
  check: (userId: string) => Promise<boolean>;
}

const BADGE_DEFS: BadgeDef[] = [
  {
    slug: "streak_3",
    title: "Rising Star",
    emoji: "🌟",
    bonusCoins: 0,
    check: async (userId) => {
      const u = await User.findOne({ userId });
      return (u?.streak ?? 0) >= 3;
    },
  },
  {
    slug: "streak_7",
    title: "Week Warrior",
    emoji: "🔥",
    bonusCoins: 0,
    check: async (userId) => {
      const u = await User.findOne({ userId });
      return (u?.streak ?? 0) >= 7;
    },
  },
  {
    slug: "streak_14",
    title: "Fortnight Legend",
    emoji: "⚡",
    bonusCoins: 0,
    check: async (userId) => {
      const u = await User.findOne({ userId });
      return (u?.streak ?? 0) >= 14;
    },
  },
  {
    slug: "streak_30",
    title: "Unstoppable",
    emoji: "🚀",
    bonusCoins: 0,
    check: async (userId) => {
      const u = await User.findOne({ userId });
      return (u?.streak ?? 0) >= 30;
    },
  },
  {
    slug: "streak_60",
    title: "Iron Mind",
    emoji: "🏆",
    bonusCoins: 0,
    check: async (userId) => {
      const u = await User.findOne({ userId });
      return (u?.streak ?? 0) >= 60;
    },
  },
  {
    slug: "streak_90",
    title: "Phoenix Born",
    emoji: "🦅",
    bonusCoins: 0,
    check: async (userId) => {
      const u = await User.findOne({ userId });
      return (u?.streak ?? 0) >= 90;
    },
  },
  {
    slug: "first_thought",
    title: "Mind Unlocked",
    emoji: "💭",
    bonusCoins: 20,
    check: async (userId) => {
      const count = await JournalEntry.countDocuments({ userId });
      return count >= 1;
    },
  },
  {
    slug: "daily_scribe",
    title: "The Chronicler",
    emoji: "📖",
    bonusCoins: 50,
    check: async (userId) => {
      const count = await JournalEntry.countDocuments({ userId });
      return count >= 7;
    },
  },
  {
    slug: "reflection_habit",
    title: "Inner Compass",
    emoji: "🧭",
    bonusCoins: 100,
    check: async (userId) => {
      const count = await JournalEntry.countDocuments({ userId });
      return count >= 30;
    },
  },
  {
    slug: "daily_summary",
    title: "Progress Architect",
    emoji: "🏗️",
    bonusCoins: 30,
    check: async (userId) => {
      const count = await JournalEntry.countDocuments({ userId, entryType: "summary" });
      return count >= 1;
    },
  },
  {
    slug: "issue_logger",
    title: "Problem Slayer",
    emoji: "⚔️",
    bonusCoins: 15,
    check: async (userId) => {
      const count = await JournalEntry.countDocuments({ userId, entryType: "issue" });
      return count >= 1;
    },
  },
  {
    slug: "deep_thinker",
    title: "3AM Energy",
    emoji: "🌙",
    bonusCoins: 40,
    check: async (userId) => {
      const count = await JournalEntry.countDocuments({ userId, entryType: "issue" });
      return count >= 5;
    },
  },
  {
    slug: "job_hunter",
    title: "On The Hunt",
    emoji: "🎯",
    bonusCoins: 20,
    check: async (userId) => {
      const count = await Job.countDocuments({ userId });
      return count >= 1;
    },
  },
  {
    slug: "cold_blood",
    title: "Cold Blooded",
    emoji: "🧊",
    bonusCoins: 30,
    check: async (userId) => {
      const count = await Job.countDocuments({ userId, "coldEmail.sent": true });
      return count >= 1;
    },
  },
  {
    slug: "stake_winner",
    title: "All In",
    emoji: "💰",
    bonusCoins: 50,
    check: async (userId) => {
      const tx = await CoinTransaction.findOne({ userId, event: "stake_win" });
      return tx !== null;
    },
  },
  {
    slug: "vault_keeper",
    title: "The Collector",
    emoji: "🗂️",
    bonusCoins: 10,
    check: async (userId) => {
      const count = await VaultItem.countDocuments({ userId });
      return count >= 1;
    },
  },
  {
    slug: "quest_master",
    title: "Quest Master",
    emoji: "🗺️",
    bonusCoins: 30,
    check: async (userId) => {
      const count = await TopicProgress.countDocuments({ userId, status: "completed" });
      return count >= 1;
    },
  },
];

const EVENT_BADGE_MAP: Record<BadgeEvent, string[]> = {
  streak_updated: ["streak_3", "streak_7", "streak_14", "streak_30", "streak_60", "streak_90"],
  journal_saved: ["first_thought", "daily_scribe", "reflection_habit", "daily_summary", "issue_logger", "deep_thinker"],
  task_toggled: [],
  all_tasks_done: [],
  topic_completed: ["quest_master"],
  job_added: ["job_hunter"],
  cold_email_sent: ["cold_blood"],
  stake_won: ["stake_winner"],
  vault_saved: ["vault_keeper"],
};

export async function checkAndAwardBadges(
  userId: string,
  event: BadgeEvent
): Promise<Array<{ slug: string; title: string; emoji: string }>> {
  await connectToDatabase();

  const slugsToCheck = EVENT_BADGE_MAP[event] ?? [];
  const newlyEarned: Array<{ slug: string; title: string; emoji: string }> = [];

  for (const slug of slugsToCheck) {
    const def = BADGE_DEFS.find((b) => b.slug === slug);
    if (!def) continue;

    // Skip if already earned
    const alreadyEarned = await Badge.exists({ userId, slug });
    if (alreadyEarned) continue;

    // Check condition
    const qualifies = await def.check(userId);
    if (!qualifies) continue;

    // Award badge
    await Badge.create({ userId, slug, earnedAt: new Date(), seenAt: null });

    // Award bonus coins if any
    if (def.bonusCoins > 0) {
      await User.findOneAndUpdate({ userId }, { $inc: { coins: def.bonusCoins } });
      await CoinTransaction.create({
        userId,
        amount: def.bonusCoins,
        reason: "badge_bonus",
        adminNote: `Badge earned: ${def.title}`,
        happyHour: false,
        event: "badge_bonus",
      });
    }

    newlyEarned.push({ slug, title: def.title, emoji: def.emoji });
  }

  return newlyEarned;
}

export const BADGE_CATALOGUE = BADGE_DEFS.map(({ slug, title, emoji }) => ({ slug, title, emoji }));
