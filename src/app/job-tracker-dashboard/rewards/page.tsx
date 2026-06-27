"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gift, History, CheckCircle2, Clock, XCircle, Loader2,
  ChevronLeft, ArrowRight, Sparkles, Trophy, Lock,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { apiFetch } from "@/lib/backend";

interface Reward {
  _id: string;
  label: string;
  emoji: string;
  description: string;
  isActive: boolean;
  isComingSoon: boolean;
}

interface Redemption {
  _id: string;
  rewardLabel: string;
  coinsRequested: number;
  quantity: number;
  status: "pending" | "approved" | "rejected" | "fulfilled";
  adminNote: string;
  requestedAt: string;
  resolvedAt: string | null;
}

interface CoinTx {
  _id: string;
  amount: number;
  reason: string;
  adminNote: string;
  happyHour: boolean;
  createdAt: string;
}

interface BadgeEntry {
  slug: string;
  title: string;
  emoji: string;
  earned: boolean;
  earnedAt: string | null;
  seenAt: string | null;
}

const STATUS_META: Record<Redemption["status"], { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  pending:   { label: "Pending",   color: "text-amber-600",  bg: "bg-amber-50",   icon: Clock },
  approved:  { label: "Approved",  color: "text-blue-600",   bg: "bg-blue-50",    icon: CheckCircle2 },
  fulfilled: { label: "Fulfilled", color: "text-emerald-600",bg: "bg-emerald-50", icon: CheckCircle2 },
  rejected:  { label: "Rejected",  color: "text-rose-600",   bg: "bg-rose-50",    icon: XCircle },
};

const REASON_LABELS: Record<string, string> = {
  task_complete:        "Task completed",
  all_tasks_bonus:      "All tasks bonus",
  topic_complete:       "Topic completed",
  stage_complete:       "Stage completed",
  streak_milestone_14:  "14-day streak",
  streak_milestone_30:  "30-day streak",
  streak_milestone_60:  "60-day streak",
  stake_win:            "Weekly stake win",
  stake_loss:           "Weekly stake loss",
  weekly_chest:         "Weekly chest",
  journal_entry:        "Journal entry",
  vault_saved:          "Resource saved",
  cold_email:           "Cold email sent",
  admin_adjust:         "Admin adjustment",
  badge_bonus:          "Badge bonus",
  redemption:           "Reward redeemed",
};

export default function RewardsPage() {
  const [tab, setTab] = useState<"redeem" | "badges" | "history">("redeem");
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [coinHistory, setCoinHistory] = useState<CoinTx[]>([]);
  const [badges, setBadges] = useState<BadgeEntry[]>([]);
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/rewards").then((r) => r.json()),
      apiFetch("/api/rewards/redemptions").then((r) => r.json()),
      apiFetch("/api/coins/history?limit=100").then((r) => r.json()),
      apiFetch("/api/me").then((r) => r.json()),
      apiFetch("/api/badges").then((r) => r.json()),
    ]).then(([rw, rd, ch, me, bg]) => {
      setRewards(rw.rewards ?? []);
      setRedemptions(rd.redemptions ?? []);
      setCoinHistory(ch.transactions ?? []);
      setCoins(me.coins ?? 0);
      setBadges(bg.badges ?? []);
    }).finally(() => setLoading(false));
  }, []);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  async function redeem(reward: Reward) {
    setRedeeming(reward._id);
    try {
      const res = await apiFetch("/api/rewards/redeem", {
        method: "POST",
        body: JSON.stringify({ rewardId: reward._id, coinsRequested: 0 }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Failed", false); return; }
      showToast(`${reward.emoji} "${reward.label}" request sent! Admin will approve soon.`, true);
      const rd = await apiFetch("/api/rewards/redemptions").then((r) => r.json());
      setRedemptions(rd.redemptions ?? []);
    } finally {
      setRedeeming(null);
    }
  }

  const pendingIds = new Set(
    redemptions.filter((r) => r.status === "pending").map((r) => r.rewardLabel)
  );

  const earnedBadges = badges.filter((b) => b.earned);
  const lockedBadges = badges.filter((b) => !b.earned);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/job-tracker-dashboard"
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="p-3 bg-amber-100 rounded-xl border border-amber-200 shadow-inner">
          <Gift className="w-7 h-7 text-amber-600" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Rewards & Badges</h1>
          <p className="text-slate-500 font-medium text-sm">
            {earnedBadges.length}/{badges.length} badges · {coins.toLocaleString()} coins
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2">
          <span className="text-lg">🪙</span>
          <span className="text-xl font-black text-amber-700">{coins.toLocaleString()}</span>
          <span className="text-xs font-bold text-amber-500">coins</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-2xl w-fit">
        {(["redeem", "badges", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-black transition-all ${
              tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "redeem" && <Sparkles className="w-4 h-4" />}
            {t === "badges" && <Trophy className="w-4 h-4" />}
            {t === "history" && <History className="w-4 h-4" />}
            {t === "redeem" ? "Redeem" : t === "badges" ? "Badges" : "History"}
            {t === "badges" && earnedBadges.length > 0 && (
              <span className="ml-0.5 bg-amber-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {earnedBadges.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Redeem Tab */}
      {tab === "redeem" && (
        <div className="space-y-4">
          {rewards.length === 0 && (
            <div className="glass-panel rounded-3xl p-12 text-center">
              <Gift className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-bold">No rewards available yet. Check back soon!</p>
            </div>
          )}
          <AnimatePresence>
            {rewards.map((reward, i) => {
              const isPending = pendingIds.has(reward.label);
              return (
                <motion.div
                  key={reward._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`glass-panel bg-white rounded-2xl p-5 flex items-center gap-4 border transition-all ${
                    reward.isComingSoon ? "opacity-60 border-slate-100" : "border-slate-100 hover:border-amber-200"
                  }`}
                >
                  <div className="w-14 h-14 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center text-3xl shrink-0">
                    {reward.emoji || "🎁"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-slate-900">{reward.label}</h3>
                      {reward.isComingSoon && (
                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Coming Soon
                        </span>
                      )}
                      {isPending && (
                        <span className="text-[10px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Pending
                        </span>
                      )}
                    </div>
                    {reward.description && (
                      <p className="text-sm text-slate-500 font-medium mt-0.5 line-clamp-2">{reward.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => redeem(reward)}
                    disabled={!!reward.isComingSoon || isPending || redeeming === reward._id}
                    className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all ${
                      reward.isComingSoon || isPending
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25 disabled:opacity-50"
                    }`}
                  >
                    {redeeming === reward._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isPending ? (
                      "Requested"
                    ) : (
                      <>Redeem <ArrowRight className="w-3.5 h-3.5" /></>
                    )}
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Badges Tab */}
      {tab === "badges" && (
        <div className="space-y-8">
          {/* Earned */}
          {earnedBadges.length > 0 && (
            <div>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" /> Earned · {earnedBadges.length}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {earnedBadges.map((b, i) => (
                  <motion.div
                    key={b.slug}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass-panel bg-white border border-amber-200 rounded-2xl p-4 flex flex-col items-center text-center gap-2 hover:border-amber-400 hover:shadow-md transition-all"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-yellow-50 border-2 border-amber-300 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                      {b.emoji}
                    </div>
                    <p className="text-sm font-extrabold text-slate-900 leading-tight">{b.title}</p>
                    {b.earnedAt && (
                      <p className="text-[10px] text-amber-600 font-bold">
                        {format(new Date(b.earnedAt), "MMM d, yyyy")}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {earnedBadges.length === 0 && (
            <div className="glass-panel rounded-3xl p-10 text-center">
              <div className="text-5xl mb-3">🏆</div>
              <p className="font-extrabold text-slate-700 mb-1">No badges yet</p>
              <p className="text-sm text-slate-400 font-medium">Complete tasks, build streaks, and explore the app to earn your first badge.</p>
            </div>
          )}

          {/* Locked */}
          {lockedBadges.length > 0 && (
            <div>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4" /> Locked · {lockedBadges.length}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {lockedBadges.map((b, i) => (
                  <motion.div
                    key={b.slug}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="glass-panel bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center gap-2 opacity-60"
                  >
                    <div className="w-14 h-14 bg-slate-100 border-2 border-slate-200 rounded-2xl flex items-center justify-center text-3xl grayscale">
                      {b.emoji}
                    </div>
                    <p className="text-sm font-extrabold text-slate-500 leading-tight">{b.title}</p>
                    <Lock className="w-3 h-3 text-slate-400" />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === "history" && (
        <div className="space-y-6">
          {/* Redemption Requests */}
          <div>
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Redemption Requests</h2>
            {redemptions.length === 0 ? (
              <div className="glass-panel rounded-2xl p-8 text-center">
                <p className="text-slate-400 font-bold text-sm">No redemptions yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {redemptions.map((r) => {
                  const m = STATUS_META[r.status];
                  const Icon = m.icon;
                  return (
                    <div key={r._id} className="glass-panel bg-white rounded-2xl p-4 flex items-center gap-3 border border-slate-100">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${m.bg}`}>
                        <Icon className={`w-4 h-4 ${m.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-slate-900 text-sm">{r.rewardLabel}</p>
                        {r.adminNote && (
                          <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">{r.adminNote}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${m.bg} ${m.color}`}>
                          {m.label}
                        </span>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">
                          {format(new Date(r.requestedAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Coin Transaction Log */}
          <div>
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Coin History</h2>
            {coinHistory.length === 0 ? (
              <div className="glass-panel rounded-2xl p-8 text-center">
                <p className="text-slate-400 font-bold text-sm">No transactions yet.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {coinHistory.map((tx) => (
                  <div key={tx._id} className="glass-panel bg-white rounded-xl px-4 py-3 flex items-center gap-3 border border-slate-100">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 font-black ${
                      tx.amount > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
                    }`}>
                      {tx.amount > 0 ? "+" : "−"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 truncate">
                        {REASON_LABELS[tx.reason] ?? tx.reason}
                        {tx.happyHour && (
                          <span className="ml-1.5 text-[10px] font-black text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full">⚡ 2x</span>
                        )}
                      </p>
                      {tx.adminNote && !tx.adminNote.startsWith("task:") && (
                        <p className="text-[11px] text-slate-400 truncate">{tx.adminNote}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-black ${tx.amount > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()} 🪙
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {format(new Date(tx.createdAt), "MMM d")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16 }}
            className={`fixed bottom-6 right-6 z-[200] rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-3 max-w-sm ${
              toast.ok ? "bg-slate-900 text-white" : "bg-rose-600 text-white"
            }`}
          >
            <span className="text-xl">{toast.ok ? "✅" : "⚠️"}</span>
            <p className="text-sm font-bold">{toast.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
