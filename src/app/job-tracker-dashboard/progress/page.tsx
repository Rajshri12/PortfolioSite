"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Flame,
  Target,
  CheckCircle2,
  BarChart2,
  ChevronDown,
  Loader2,
  Lock,
  Clock,
  Coins,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

interface UserState {
  coins: number;
  level: number;
  coinsPerLevel: number;
  streak: number;
  maxStreak: number;
  jokerTokens: number;
  jokerUsedThisWeek: boolean;
  weeklyStake: {
    active: boolean;
    stakedAt: string | null;
    amount: number;
    weekStartDate: string;
  } | null;
}

interface ProgressData {
  ai_completion_pct: number;
  ai_topics_completed: number;
  ai_topics_total: number;
  dsa_topics_completed: number;
  dsa_topics_total: number;
  streak: number;
  coins: number;
  level: number;
  tasks_done_total: number;
}

interface BadgeEntry {
  slug: string;
  title: string;
  emoji: string;
  earned: boolean;
  earnedAt: string | null;
}

interface Transaction {
  _id: string;
  amount: number;
  reason: string;
  event?: string;
  happyHour: boolean;
  createdAt: string;
}

interface Reward {
  _id: string;
  label: string;
  emoji: string;
  description?: string;
  coinCost?: number;
  coinStep?: number;
  isActive: boolean;
  isComingSoon: boolean;
}

interface Redemption {
  _id: string;
  rewardLabel: string;
  coinsRequested: number;
  status: "pending" | "approved" | "rejected" | "fulfilled";
  adminNote?: string;
  requestedAt: string;
}

function RingChart({ pct, color, size = 96 }: { pct: number; color: string; size?: number }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="11" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth="11" strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
    </svg>
  );
}

const STREAK_MILESTONES = [
  { days: 3,  label: "3d",  title: "Rising Star",      emoji: "🌟", coins: 0 },
  { days: 7,  label: "7d",  title: "Week Warrior",     emoji: "🔥", coins: 0 },
  { days: 14, label: "14d", title: "Fortnight Legend", emoji: "⚡", coins: 100 },
  { days: 30, label: "30d", title: "Unstoppable",      emoji: "🚀", coins: 500 },
  { days: 60, label: "60d", title: "Iron Mind",        emoji: "🏆", coins: 1500 },
  { days: 90, label: "90d", title: "Phoenix Born",     emoji: "🦅", coins: 0 },
];

const REASON_LABELS: Record<string, string> = {
  task_complete:   "Task completed",
  all_tasks_bonus: "All tasks done bonus",
  topic_complete:  "Roadmap topic completed",
  journal_entry:   "Journal entry",
  journal_summary: "Daily summary",
  journal_issue:   "Issue logged",
  vault_saved:     "Vault item saved",
  stake_win:       "Weekly stake — WON",
  stake_loss:      "Weekly stake placed",
  badge_bonus:     "Badge bonus",
  admin_adjust:    "Admin adjustment",
  joker_earned:    "Joker token earned",
  streak_milestone:"Streak milestone",
};

export default function ProgressPage() {
  const [user, setUser] = useState<UserState | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [badges, setBadges] = useState<BadgeEntry[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txOpen, setTxOpen] = useState(false);
  const [staking, setStaking] = useState(false);
  const [stakeError, setStakeError] = useState<string | null>(null);
  const [usingJoker, setUsingJoker] = useState(false);
  const [jokerError, setJokerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [redeemModal, setRedeemModal] = useState<{ reward: Reward; coins: number } | null>(null);
  const [redeemCoins, setRedeemCoins] = useState(0);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  const isMonday = new Date().getDay() === 1;

  const fetchAll = useCallback(async () => {
    try {
      const [meRes, progressRes, badgesRes, txRes, rewardsRes, redemptionsRes] = await Promise.all([
        fetch("/api/me"),
        fetch("/api/progress"),
        fetch("/api/badges"),
        fetch("/api/coins/history?limit=30"),
        fetch("/api/rewards"),
        fetch("/api/rewards/redemptions"),
      ]);
      if (meRes.ok) setUser(await meRes.json());
      if (progressRes.ok) setProgress(await progressRes.json());
      if (badgesRes.ok) {
        const d = await badgesRes.json();
        setBadges(d.badges ?? []);
      }
      if (txRes.ok) {
        const d = await txRes.json();
        setTransactions(d.transactions ?? []);
      }
      if (rewardsRes.ok) {
        const d = await rewardsRes.json();
        setRewards(d.rewards ?? []);
      }
      if (redemptionsRes.ok) {
        const d = await redemptionsRes.json();
        setRedemptions(d.redemptions ?? []);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  async function submitRedeem() {
    if (!redeemModal) return;
    setRedeemError(null);
    setRedeeming(true);
    try {
      const res = await fetch("/api/rewards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId: redeemModal.reward._id, coinsRequested: redeemCoins }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRedeemError(data.error ?? "Failed to submit");
        return;
      }
      setRedeemModal(null);
      await fetchAll();
    } catch {
      setRedeemError("Network error");
    } finally {
      setRedeeming(false);
    }
  }

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function placeStake() {
    if (staking) return;
    setStakeError(null);
    setStaking(true);
    try {
      const res = await fetch("/api/coins/stake", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setStakeError(data.error ?? "Failed to stake"); }
      else { await fetchAll(); }
    } catch { setStakeError("Network error"); }
    finally { setStaking(false); }
  }

  async function useJoker() {
    if (usingJoker) return;
    setJokerError(null);
    setUsingJoker(true);
    try {
      const res = await fetch("/api/joker", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setJokerError(data.error ?? "Failed to use joker"); }
      else { await fetchAll(); }
    } catch { setJokerError("Network error"); }
    finally { setUsingJoker(false); }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const coins = user?.coins ?? 0;
  const level = user?.level ?? 1;
  const coinsPerLevel = user?.coinsPerLevel ?? 100;
  const streak = user?.streak ?? progress?.streak ?? 0;
  const levelProgress = coinsPerLevel > 0 ? ((coins % coinsPerLevel) / coinsPerLevel) * 100 : 0;
  const coinsInLevel = coins % coinsPerLevel;

  const aiPct = progress?.ai_completion_pct ?? 0;
  const dsaPct = progress && progress.dsa_topics_total > 0
    ? Math.round((progress.dsa_topics_completed / progress.dsa_topics_total) * 100)
    : 0;

  const earnedBadges = badges.filter((b) => b.earned);

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-6xl mx-auto space-y-10" suppressHydrationWarning>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-100">
          <Trophy className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-slate-900">Gamification Hub</h1>
          <p className="text-slate-400 font-medium text-sm">Coins · Levels · Streaks · Badges · Stakes</p>
        </div>
      </motion.div>

      {/* Row 1: Level Card | Streak Timeline | Joker Tokens */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Level + Coins */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm flex flex-col items-center gap-4"
        >
          <div className="relative">
            <RingChart pct={levelProgress} color="#f59e0b" size={120} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-amber-600">Lv {level}</span>
              <span className="text-[10px] font-bold text-slate-400">Level</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-slate-900">🪙 {coins.toLocaleString()}</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Coins</p>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${levelProgress}%` }}
                transition={{ duration: 0.8 }}
                className="bg-amber-400 h-full rounded-full"
              />
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1.5">
              {coinsInLevel}/{coinsPerLevel} to Level {level + 1}
            </p>
          </div>
        </motion.div>

        {/* Streak Milestone Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-5">
            <Flame className={`w-5 h-5 ${streak > 0 ? "text-orange-500" : "text-slate-300"}`} />
            <h3 className="text-base font-black text-slate-900">Streak Milestones</h3>
            <span className={`ml-auto text-lg font-black ${streak > 0 ? "text-orange-500" : "text-slate-300"}`}>
              {streak}d
            </span>
          </div>
          <div className="space-y-3">
            {STREAK_MILESTONES.map((m) => {
              const reached = streak >= m.days;
              return (
                <div key={m.days} className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all ${
                  reached ? "bg-orange-50" : "opacity-40"
                }`}>
                  <span className={`text-xl ${reached ? "" : "grayscale"}`}>{m.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-black truncate ${reached ? "text-slate-800" : "text-slate-400"}`}>
                      {m.title}
                    </p>
                    <p className={`text-[10px] font-bold ${reached ? "text-orange-500" : "text-slate-300"}`}>
                      {m.label}{m.coins > 0 ? ` · 🪙 ${m.coins}` : ""}
                    </p>
                  </div>
                  {reached ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <span className="text-[10px] font-black text-slate-300 shrink-0">
                      {m.days - streak}d left
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Joker Tokens */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🃏</span>
              <h3 className="text-base font-black text-slate-900">Joker Tokens</h3>
              <span className="ml-auto text-sm font-black text-slate-700">{user?.jokerTokens ?? 0}/3</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mb-5">
              Use a joker to skip a day without breaking your streak. Earn one every 7 days.
            </p>
            {/* Slots */}
            <div className="flex gap-3 justify-center my-4">
              {Array.from({ length: 3 }).map((_, i) => {
                const filled = i < (user?.jokerTokens ?? 0);
                return (
                  <motion.div
                    key={i}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    className={`w-16 h-24 rounded-2xl border-2 flex items-center justify-center text-3xl transition-all ${
                      filled
                        ? "border-violet-300 bg-violet-50 shadow-lg shadow-violet-100"
                        : "border-dashed border-slate-200 bg-slate-50 opacity-40"
                    }`}
                  >
                    {filled ? "🃏" : ""}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {jokerError && (
            <p className="text-xs font-bold text-rose-500 text-center mb-2">{jokerError}</p>
          )}

          <button
            onClick={useJoker}
            disabled={usingJoker || (user?.jokerTokens ?? 0) <= 0 || user?.jokerUsedThisWeek}
            className="w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-violet-200 text-violet-600 bg-violet-50 hover:bg-violet-100 transition-all disabled:opacity-40"
          >
            {usingJoker
              ? "Using…"
              : user?.jokerUsedThisWeek
              ? "Joker used this week"
              : "Use Joker Today"}
          </button>
        </motion.div>
      </div>

      {/* Row 2: Weekly Stake | Roadmap Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Weekly Stake Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className={`glass-panel rounded-[2.5rem] p-6 border shadow-sm ${
            user?.weeklyStake?.active
              ? "bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200"
              : "bg-white border-slate-100"
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              user?.weeklyStake?.active ? "bg-indigo-100" : "bg-slate-100"
            }`}>
              <span className="text-2xl">💰</span>
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Weekly Stake</h3>
              <p className="text-[11px] text-slate-400 font-medium">Stake coins on Monday, win 3× if you complete all 7 days</p>
            </div>
          </div>

          {user?.weeklyStake?.active ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/60 rounded-2xl">
                <span className="text-xs font-bold text-slate-500">Staked</span>
                <span className="text-base font-black text-indigo-600">🪙 {user.weeklyStake.amount}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/60 rounded-2xl">
                <span className="text-xs font-bold text-slate-500">Win amount</span>
                <span className="text-base font-black text-emerald-600">🪙 {user.weeklyStake.amount * 3}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/60 rounded-2xl">
                <span className="text-xs font-bold text-slate-500">Week of</span>
                <span className="text-xs font-black text-slate-700">{user.weeklyStake.weekStartDate}</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-indigo-100/60 rounded-2xl">
                <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                <p className="text-[11px] font-bold text-indigo-700">
                  Stake active — complete all 7 days to win 3× back on Sunday night.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Default stake</span><span>🪙 50</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Win multiplier</span><span>3×</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Win amount</span><span className="text-emerald-600">🪙 150</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Condition</span><span>All 7 days done</span>
                </div>
              </div>

              {!isMonday && (
                <p className="text-[11px] text-center text-slate-400 font-bold">
                  Staking opens every Monday
                </p>
              )}
              {stakeError && (
                <p className="text-xs font-bold text-rose-500 text-center">{stakeError}</p>
              )}
              <button
                onClick={placeStake}
                disabled={staking || !isMonday || (user?.coins ?? 0) < 50}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-lg shadow-indigo-100 transition-all disabled:opacity-40"
              >
                {staking ? "Placing stake…" : isMonday ? "Stake 50 Coins This Week" : "Available Mondays Only"}
              </button>
            </div>
          )}
        </motion.div>

        {/* Roadmap Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-6">
            <Target className="w-5 h-5 text-blue-500" />
            <h3 className="text-base font-black text-slate-900">Roadmap Progress</h3>
          </div>

          <div className="flex justify-around mb-6">
            {[
              { label: "AI Track", pct: aiPct, color: "#3b82f6", done: progress?.ai_topics_completed ?? 0, total: progress?.ai_topics_total ?? 0, textColor: "text-blue-600" },
              { label: "DSA Track", pct: dsaPct, color: "#8b5cf6", done: progress?.dsa_topics_completed ?? 0, total: progress?.dsa_topics_total ?? 0, textColor: "text-violet-600" },
            ].map((track) => (
              <div key={track.label} className="flex flex-col items-center gap-2">
                <div className="relative">
                  <RingChart pct={track.pct} color={track.color} size={96} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-lg font-black ${track.textColor}`}>{track.pct}%</span>
                  </div>
                </div>
                <p className="text-xs font-black text-slate-700">{track.label}</p>
                <p className={`text-[10px] font-bold ${track.textColor}`}>{track.done}/{track.total} topics</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {[
              { label: "AI Track", completed: progress?.ai_topics_completed ?? 0, total: progress?.ai_topics_total ?? 0, color: "bg-blue-500", pct: aiPct },
              { label: "DSA Track", completed: progress?.dsa_topics_completed ?? 0, total: progress?.dsa_topics_total ?? 0, color: "bg-violet-500", pct: dsaPct },
            ].map((track, i) => (
              <div key={track.label}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-600">{track.label}</span>
                  <span className="text-xs font-black text-slate-500">{track.completed}/{track.total}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className={`h-2 rounded-full ${track.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${track.pct}%` }}
                    transition={{ delay: i * 0.1 + 0.3, duration: 0.9, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>

          {progress && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-[11px] font-bold text-slate-400">
              <span>Tasks completed total</span>
              <span className="text-slate-700 font-black">{progress.tasks_done_total}</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Badge Gallery */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Trophy className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Badge Gallery</h3>
            <p className="text-[11px] text-slate-400 font-medium">{earnedBadges.length} of {badges.length} earned</p>
          </div>
          <div className="ml-auto flex gap-2 items-center">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[10px] font-bold text-slate-400">Earned</span>
            <div className="w-2 h-2 rounded-full bg-slate-200 ml-2" />
            <span className="text-[10px] font-bold text-slate-400">Locked</span>
          </div>
        </div>

        {badges.length === 0 ? (
          <p className="text-slate-400 text-sm font-medium text-center py-8">No badges yet. Run the seed script first.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[...badges.filter(b => b.earned), ...badges.filter(b => !b.earned)].map((badge, i) => (
              <motion.div
                key={badge.slug}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.03 }}
                className={`rounded-2xl p-4 text-center border transition-all ${
                  badge.earned
                    ? "bg-amber-50 border-amber-200 shadow-sm shadow-amber-50"
                    : "bg-slate-50 border-slate-100 grayscale opacity-40"
                }`}
              >
                <div className="text-3xl mb-2">{badge.emoji}</div>
                <p className="text-xs font-black text-slate-800 leading-tight mb-1">
                  {badge.earned ? badge.title : "???"}
                </p>
                {badge.earned ? (
                  badge.earnedAt ? (
                    <p className="text-[9px] text-amber-600 font-bold">
                      {format(new Date(badge.earnedAt), "MMM d")}
                    </p>
                  ) : (
                    <div className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-full">
                      <Trophy className="w-2.5 h-2.5" /> Earned
                    </div>
                  )
                ) : (
                  <div className="inline-flex items-center gap-1 text-[9px] font-black text-slate-400">
                    <Lock className="w-2.5 h-2.5" /> Locked
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Rewards Vault */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <span className="text-xl">🎁</span>
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Rewards Vault</h3>
            <p className="text-[11px] text-slate-400 font-medium">Spend your coins on real rewards</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Reward Catalogue */}
          <div className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm">
            <h4 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
              <span>🛍️</span> Reward Catalogue
            </h4>
            {rewards.length === 0 ? (
              <p className="text-slate-400 text-sm font-medium text-center py-8">No rewards available yet.</p>
            ) : (
              <div className="space-y-3">
                {rewards.map((reward, i) => {
                  const cost = reward.coinCost ?? 0;
                  const canAfford = cost === 0 || coins >= cost;
                  const pct = cost > 0 ? Math.min(100, Math.round((coins / cost) * 100)) : 100;
                  return (
                    <motion.div
                      key={reward._id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`relative rounded-2xl border p-4 transition-all ${
                        reward.isComingSoon
                          ? "border-slate-100 bg-slate-50 opacity-60"
                          : canAfford
                          ? "border-amber-200 bg-amber-50 shadow-sm shadow-amber-50"
                          : "border-slate-100 bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-3xl shrink-0">{reward.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-black text-slate-900">{reward.label}</p>
                            {reward.isComingSoon && (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 uppercase tracking-widest">Soon</span>
                            )}
                            {canAfford && !reward.isComingSoon && (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-700 uppercase tracking-widest">Affordable</span>
                            )}
                          </div>
                          {reward.description && (
                            <p className="text-[11px] text-slate-500 font-medium mb-2">{reward.description}</p>
                          )}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5">
                              {cost > 0 && <span className="text-sm font-black text-amber-600">🪙 {cost.toLocaleString()}</span>}
                              <span className="text-[10px] text-slate-400 font-medium">{cost > 0 ? "coins" : "Free"}</span>
                            </div>
                            <button
                              disabled={!canAfford || reward.isComingSoon}
                              onClick={() => {
                                setRedeemCoins(cost);
                                setRedeemError(null);
                                setRedeemModal({ reward, coins: cost });
                              }}
                              className="px-4 py-1.5 rounded-xl text-xs font-black transition-all disabled:opacity-40 bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-100 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                            >
                              Redeem
                            </button>
                          </div>
                          {!canAfford && !reward.isComingSoon && (
                            <div className="mt-2">
                              <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                                <div className="h-1 rounded-full bg-amber-300 transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <p className="text-[9px] text-slate-400 font-medium mt-0.5">{pct}% of cost saved</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* My Redemptions */}
          <div className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm">
            <h4 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
              <span>📋</span> My Redemptions
            </h4>
            {redemptions.length === 0 ? (
              <p className="text-slate-400 text-sm font-medium text-center py-8">No redemptions yet.</p>
            ) : (
              <div className="space-y-3">
                {redemptions.map((r) => {
                  const STATUS_STYLE: Record<string, string> = {
                    pending: "bg-amber-100 text-amber-700 border-amber-200",
                    approved: "bg-blue-100 text-blue-700 border-blue-200",
                    rejected: "bg-rose-100 text-rose-600 border-rose-200",
                    fulfilled: "bg-emerald-100 text-emerald-700 border-emerald-200",
                  };
                  return (
                    <div key={r._id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 truncate">{r.rewardLabel}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                            🪙 {r.coinsRequested.toLocaleString()} · {format(new Date(r.requestedAt), "MMM d, yyyy")}
                          </p>
                          {r.adminNote && (
                            <p className="text-[10px] text-slate-500 font-medium mt-1 italic">"{r.adminNote}"</p>
                          )}
                        </div>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest shrink-0 ${STATUS_STYLE[r.status] ?? ""}`}>
                          {r.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Redeem confirm modal */}
      <AnimatePresence>
        {redeemModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setRedeemModal(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel bg-white w-full max-w-sm rounded-3xl shadow-2xl relative z-10 p-8">
              <div className="text-center mb-6">
                <span className="text-5xl">{redeemModal.reward.emoji}</span>
                <h2 className="text-xl font-black text-slate-900 mt-3">{redeemModal.reward.label}</h2>
                {redeemModal.reward.description && (
                  <p className="text-sm text-slate-500 font-medium mt-1">{redeemModal.reward.description}</p>
                )}
              </div>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500">Coins to redeem</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRedeemCoins(Math.max(redeemModal.reward.coinCost ?? 0, redeemCoins - (redeemModal.reward.coinStep ?? 1)))}
                      className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-sm transition-colors"
                    >−</button>
                    <span className="text-sm font-black text-amber-600 w-16 text-center">🪙 {redeemCoins.toLocaleString()}</span>
                    <button
                      onClick={() => setRedeemCoins(Math.min(coins, redeemCoins + (redeemModal.reward.coinStep ?? 1)))}
                      className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-sm transition-colors"
                    >+</button>
                  </div>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Current balance</span>
                  <span className="text-slate-700">🪙 {coins.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>After redemption</span>
                  <span className={coins - redeemCoins < 0 ? "text-rose-500" : "text-emerald-600"}>
                    🪙 {(coins - redeemCoins).toLocaleString()}
                  </span>
                </div>
              </div>
              {redeemError && (
                <p className="text-xs font-bold text-rose-500 text-center mb-3">{redeemError}</p>
              )}
              <p className="text-[10px] text-slate-400 text-center mb-4 font-medium">
                Coins are only deducted when admin approves your request.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setRedeemModal(null)}
                  className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-black transition-colors text-sm">
                  Cancel
                </button>
                <button onClick={submitRedeem} disabled={redeeming || redeemCoins < (redeemModal.reward.coinCost ?? 0) || coins < redeemCoins}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black shadow-lg shadow-amber-100 disabled:opacity-40 transition-colors text-sm">
                  {redeeming ? "Submitting…" : "Submit Request"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transaction History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="glass-panel bg-white rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden"
      >
        <button
          onClick={() => setTxOpen((o) => !o)}
          className="w-full flex items-center justify-between p-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-left">
              <h3 className="text-base font-black text-slate-900">Coin History</h3>
              <p className="text-[11px] text-slate-400 font-medium">Last {transactions.length} transactions</p>
            </div>
          </div>
          <motion.div animate={{ rotate: txOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <ChevronDown className="w-5 h-5 text-slate-400" />
          </motion.div>
        </button>

        <AnimatePresence>
          {txOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6 border-t border-slate-100">
                {transactions.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8 font-medium">No transactions yet.</p>
                ) : (
                  <div className="space-y-2 mt-4">
                    {transactions.map((tx) => (
                      <div
                        key={tx._id}
                        className="flex items-center justify-between py-3 px-4 rounded-2xl hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            tx.amount > 0 ? "bg-emerald-100" : "bg-rose-100"
                          }`}>
                            <span className="text-sm">{tx.amount > 0 ? "🪙" : "📉"}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-700 truncate">
                              {REASON_LABELS[tx.reason] ?? REASON_LABELS[tx.event ?? ""] ?? tx.reason}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {format(new Date(tx.createdAt), "MMM d, h:mm a")}
                              {tx.happyHour && (
                                <span className="ml-2 text-yellow-500 font-black">⚡ 2x</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <span className={`text-sm font-black ml-4 shrink-0 ${
                          tx.amount > 0 ? "text-emerald-600" : "text-rose-500"
                        }`}>
                          {tx.amount > 0 ? "+" : ""}{tx.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

    </div>
  );
}
