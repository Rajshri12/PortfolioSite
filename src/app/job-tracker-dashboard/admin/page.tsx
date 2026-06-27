"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Bell,
  Coins,
  Settings,
  Users,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  Trash2,
  Plus,
  Minus,
  Flame,
  Unlock,
  Lock,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Trophy,
  UserCog,
  LogOut,
  Gift,
  Edit2,
} from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

// ── types ────────────────────────────────────────────────────────────────────

interface UserData {
  userId: string;
  email: string;
  coins: number;
  streak: number;
  maxStreak: number;
  jokerTokens: number;
  jokerUsedThisWeek: boolean;
  applicationUnlocked: boolean;
  currentMood: string | null;
  weeklyStake: { active: boolean; amount: number } | null;
  level?: number;
}

interface AlertDoc {
  _id: string;
  type: string;
  userId: string;
  message: string;
  resolved: boolean;
  createdAt: string;
}

interface Transaction {
  _id: string;
  amount: number;
  reason: string;
  adminNote?: string;
  event?: string;
  happyHour: boolean;
  createdAt: string;
  userId: string;
}

interface HappyHourSlot {
  name: string;
  enabled: boolean;
  schedule: "daily" | "weekends" | "weekdays";
  startHour: number;
  endHour: number;
  multiplier: number;
}

interface GameConfig {
  rewards: {
    taskComplete: number;
    allTasksBonus: number;
    roadmapTopicComplete: number;
    streakMilestone14: number;
    streakMilestone30: number;
    streakMilestone60: number;
  };
  staking: { defaultStakeAmount: number; winMultiplier: number };
  happyHour: { enabled: boolean; startHour: number; endHour: number; multiplier: number };
  happyHourSlots: HappyHourSlot[];
  jokers: { earnEveryNDays: number; maxStored: number };
  alerts: { moodDropConsecutiveDays: number };
  weeklyChest: { requiredDays: number; rewardCoins: number };
  bonusActions: {
    journalEntry: number;
    dailySummary: number;
    issueLogged: number;
    vaultSaved: number;
    coldEmailSent: number;
  };
  level: { coinsPerLevel: number };
}

// ── constants ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: "overview",  label: "Overview",      icon: Users },
  { key: "alerts",    label: "Alerts",        icon: Bell },
  { key: "coins",     label: "Coins",         icon: Coins },
  { key: "settings",  label: "Game Settings", icon: Settings },
  { key: "controls",  label: "User Controls", icon: Shield },
  { key: "rewards",   label: "Rewards",       icon: Gift },
] as const;

type TabKey = typeof TABS[number]["key"];

interface AdminReward {
  _id: string;
  label: string;
  emoji: string;
  description?: string;
  coinCost: number;
  coinStep: number;
  isActive: boolean;
  isComingSoon: boolean;
}

interface AdminRedemption {
  _id: string;
  userId: string;
  rewardLabel: string;
  coinsRequested: number;
  status: "pending" | "approved" | "rejected" | "fulfilled";
  adminNote?: string;
  requestedAt: string;
}

interface TaskRewardRequest {
  _id: string;
  userId: string;
  text: string;
  rewardConfig: {
    type: "coins" | "custom";
    coins?: number;
    rewardLabel?: string;
    approvalStatus: "pending" | "approved" | "rejected";
  };
  createdAt: string;
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  mood_drop: "😤 Mood Drop",
  streak_broken: "🔥 Streak Broken",
  joker_used: "🃏 Joker Used",
  stake_result: "💰 Stake Result",
  manual: "📌 Manual",
};

const TX_REASON_LABELS: Record<string, string> = {
  task_complete: "Task completed",
  all_tasks_bonus: "All tasks bonus",
  topic_complete: "Topic completed",
  journal_entry: "Journal entry",
  journal_summary: "Daily summary",
  journal_issue: "Issue logged",
  vault_saved: "Vault item saved",
  stake_win: "Stake — WON",
  stake_loss: "Stake placed",
  badge_bonus: "Badge bonus",
  admin_adjust: "Admin adjustment",
  joker_earned: "Joker earned",
  streak_milestone: "Streak milestone",
};

// ── main component ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [alerts, setAlerts] = useState<AlertDoc[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [adminRewards, setAdminRewards] = useState<AdminReward[]>([]);
  const [adminRedemptions, setAdminRedemptions] = useState<AdminRedemption[]>([]);
  const [taskRewardRequests, setTaskRewardRequests] = useState<TaskRewardRequest[]>([]);

  // check role + impersonation state
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        setRole(d.role);
        setImpersonating(d.impersonating ?? null);
        if (d.role !== "admin") router.replace("/job-tracker-dashboard");
      })
      .catch(() => router.replace("/job-tracker-dashboard"));
  }, [router]);

  async function startImpersonation() {
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user1" }),
    });
    if (res.ok) {
      setImpersonating("user1");
    }
  }

  async function stopImpersonation() {
    await fetch("/api/admin/impersonate", { method: "DELETE" });
    setImpersonating(null);
  }

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [userRes, alertsRes, txRes, configRes, rewardsRes, redemptionsRes, taskRewardsRes] = await Promise.all([
        fetch("/api/admin/user?userId=user1"),
        fetch("/api/admin/alerts?resolved=false"),
        fetch("/api/coins/history?limit=50"),
        fetch("/api/admin/game-config"),
        fetch("/api/admin/rewards"),
        fetch("/api/admin/redemptions"),
        fetch("/api/admin/task-rewards"),
      ]);
      if (userRes.ok) {
        const u = await userRes.json();
        setUserData({ ...u, level: u.coins ? Math.floor(u.coins / 100) + 1 : 1 });
      }
      if (alertsRes.ok) setAlerts((await alertsRes.json()).alerts ?? []);
      if (txRes.ok) setTransactions((await txRes.json()).transactions ?? []);
      if (configRes.ok) setGameConfig(await configRes.json());
      if (rewardsRes.ok) setAdminRewards((await rewardsRes.json()).rewards ?? []);
      if (redemptionsRes.ok) setAdminRedemptions((await redemptionsRes.json()).redemptions ?? []);
      if (taskRewardsRes.ok) setTaskRewardRequests((await taskRewardsRes.json()).tasks ?? []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (role === "admin") fetchAll(); }, [role, fetchAll]);

  if (role === null || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-6xl mx-auto space-y-8" suppressHydrationWarning>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-100">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-slate-900">Admin Panel</h1>
          <p className="text-slate-400 font-medium text-sm">Full control · {alerts.length} unresolved alert{alerts.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={fetchAll} className="ml-auto p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
          <RefreshCw className="w-5 h-5" />
        </button>
      </motion.div>

      {/* Impersonation banner */}
      <AnimatePresence>
        {impersonating && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-5 py-3 bg-amber-400 rounded-2xl shadow-lg shadow-amber-200"
          >
            <UserCog className="w-5 h-5 text-amber-900 shrink-0" />
            <span className="text-amber-900 font-black text-sm flex-1">
              Acting as <span className="underline">user1</span> — all data reads use their context. API routes will respond as this user.
            </span>
            <button
              onClick={stopImpersonation}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-900 text-amber-100 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-amber-800 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" /> Exit
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all ${
              activeTab === key
                ? "bg-slate-900 text-white shadow-lg"
                : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {key === "alerts" && alerts.length > 0 && (
              <span className="ml-1 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {alerts.length}
              </span>
            )}
            {key === "rewards" && taskRewardRequests.filter(t => t.rewardConfig?.approvalStatus === "pending").length > 0 && (
              <span className="ml-1 bg-violet-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {taskRewardRequests.filter(t => t.rewardConfig?.approvalStatus === "pending").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === "overview" && <OverviewTab userData={userData} />}
          {activeTab === "alerts" && (
            <AlertsTab alerts={alerts} onResolve={async (id) => {
              await fetch(`/api/admin/alerts/${id}`, { method: "PATCH" });
              setAlerts((prev) => prev.filter((a) => a._id !== id));
            }} />
          )}
          {activeTab === "coins" && (
            <CoinsTab
              transactions={transactions}
              onAdjust={async (amount, reason) => {
                await fetch("/api/admin/coins-adjust", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId: "user1", amount, reason }),
                });
                fetchAll();
              }}
              onDeleteTx={async (id) => {
                await fetch(`/api/admin/transactions/${id}`, { method: "DELETE" });
                fetchAll();
              }}
            />
          )}
          {activeTab === "settings" && gameConfig && (
            <SettingsTab
              config={gameConfig}
              onSave={async (updates) => {
                const res = await fetch("/api/admin/game-config", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(updates),
                });
                if (res.ok) setGameConfig(await res.json());
              }}
            />
          )}
          {activeTab === "controls" && (
            <ControlsTab
              userData={userData}
              impersonating={impersonating}
              rewards={adminRewards}
              onUpdate={async (body) => {
                const res = await fetch("/api/admin/user", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId: "user1", ...body }),
                });
                if (res.ok) fetchAll();
              }}
              onStartImpersonation={startImpersonation}
              onStopImpersonation={stopImpersonation}
            />
          )}
          {activeTab === "rewards" && (
            <RewardsTab
              rewards={adminRewards}
              redemptions={adminRedemptions}
              taskRewardRequests={taskRewardRequests}
              onRefresh={fetchAll}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ userData }: { userData: UserData | null }) {
  if (!userData) return <EmptyState text="No user data available." />;

  const stats = [
    { label: "Coins", value: userData.coins.toLocaleString(), emoji: "🪙", color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Level", value: `Lv ${userData.level ?? 1}`, emoji: "🏆", color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Streak", value: `${userData.streak}d`, emoji: "🔥", color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Max Streak", value: `${userData.maxStreak}d`, emoji: "⚡", color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Joker Tokens", value: `${userData.jokerTokens}/3`, emoji: "🃏", color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Job Orbit", value: userData.applicationUnlocked ? "Unlocked" : "Locked", emoji: userData.applicationUnlocked ? "🔓" : "🔒", color: userData.applicationUnlocked ? "text-emerald-600" : "text-slate-500", bg: userData.applicationUnlocked ? "bg-emerald-50" : "bg-slate-50" },
    { label: "Mood Today", value: userData.currentMood ?? "—", emoji: { hard: "😤", okay: "😐", easy: "😎" }[userData.currentMood ?? ""] ?? "—", color: "text-slate-600", bg: "bg-slate-50" },
    { label: "Stake Active", value: userData.weeklyStake?.active ? `🪙${userData.weeklyStake.amount}` : "None", emoji: "💰", color: userData.weeklyStake?.active ? "text-indigo-600" : "text-slate-400", bg: "bg-slate-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-xl">👤</div>
          <div>
            <p className="text-lg font-black text-slate-900">User Dashboard</p>
            <p className="text-xs text-slate-400 font-medium">{userData.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(({ label, value, emoji, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl p-4`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{emoji}</span>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
              </div>
              <p className={`text-xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Alerts Tab ────────────────────────────────────────────────────────────────

function AlertsTab({ alerts, onResolve }: { alerts: AlertDoc[]; onResolve: (id: string) => void }) {
  if (alerts.length === 0) {
    return (
      <div className="glass-panel bg-white rounded-[2.5rem] p-12 border-slate-100 shadow-sm text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
        <p className="font-black text-slate-700 text-lg">All clear!</p>
        <p className="text-slate-400 text-sm font-medium">No unresolved alerts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <motion.div
          key={alert._id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel bg-white rounded-[2rem] p-5 border-slate-100 shadow-sm flex items-start gap-4"
        >
          <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black text-rose-600 uppercase tracking-wider">
                {ALERT_TYPE_LABELS[alert.type] ?? alert.type}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                · {format(new Date(alert.createdAt), "MMM d, h:mm a")}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-700 leading-relaxed">{alert.message}</p>
          </div>
          <button
            onClick={() => onResolve(alert._id)}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-xl font-black text-xs uppercase tracking-wider transition-all"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Resolve
          </button>
        </motion.div>
      ))}
    </div>
  );
}

// ── Coins Tab ─────────────────────────────────────────────────────────────────

function CoinsTab({
  transactions, onAdjust, onDeleteTx,
}: {
  transactions: Transaction[];
  onAdjust: (amount: number, reason: string) => void;
  onDeleteTx: (id: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleAdjust() {
    const n = parseInt(amount);
    if (isNaN(n) || n === 0) { setError("Enter a non-zero amount"); return; }
    if (!reason.trim()) { setError("Reason is required"); return; }
    setError("");
    setSaving(true);
    await onAdjust(n, reason.trim());
    setAmount("");
    setReason("");
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      {/* Manual adjust */}
      <div className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm">
        <h3 className="text-base font-black text-slate-900 mb-5 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" /> Manual Coin Adjustment
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="shrink-0">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">Amount</label>
            <div className="flex gap-2">
              <button
                onClick={() => setAmount((prev) => String((parseInt(prev) || 0) - 50))}
                className="px-3 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-black hover:bg-rose-100 transition-all"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-24 bg-slate-50 border-2 border-transparent rounded-xl px-4 py-2 outline-none focus:bg-white focus:border-blue-400 font-black text-slate-800 text-center"
              />
              <button
                onClick={() => setAmount((prev) => String((parseInt(prev) || 0) + 50))}
                className="px-3 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl font-black hover:bg-emerald-100 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Bonus for finishing project chapter"
              className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-2 outline-none focus:bg-white focus:border-blue-400 font-medium text-slate-800"
            />
          </div>
        </div>
        {error && <p className="text-xs font-bold text-rose-500 mt-2 ml-1">{error}</p>}
        <button
          onClick={handleAdjust}
          disabled={saving}
          className="mt-4 px-8 py-3 bg-slate-900 hover:bg-black text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-lg transition-all disabled:opacity-50"
        >
          {saving ? "Applying…" : "Apply Adjustment"}
        </button>
      </div>

      {/* Transaction history */}
      <div className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm">
        <h3 className="text-base font-black text-slate-900 mb-5 flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-500" /> Transaction History
          <span className="ml-auto text-xs font-bold text-slate-400">{transactions.length} records</span>
        </h3>
        {transactions.length === 0 ? (
          <EmptyState text="No transactions yet." />
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx._id}
                className="flex items-center gap-3 py-3 px-4 rounded-2xl hover:bg-slate-50 group transition-colors"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  tx.amount > 0 ? "bg-emerald-100" : "bg-rose-100"
                }`}>
                  <span className="text-sm">{tx.amount > 0 ? "🪙" : "📉"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-700 truncate">
                    {TX_REASON_LABELS[tx.reason] ?? TX_REASON_LABELS[tx.event ?? ""] ?? tx.reason}
                    {tx.adminNote ? ` — ${tx.adminNote}` : ""}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {format(new Date(tx.createdAt), "MMM d, h:mm a")}
                    {tx.happyHour && <span className="ml-2 text-yellow-500 font-black">⚡ 2x</span>}
                  </p>
                </div>
                <span className={`text-sm font-black shrink-0 ${tx.amount > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount}
                </span>
                <button
                  onClick={() => onDeleteTx(tx._id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-all ml-1"
                  title="Delete transaction"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────

function SettingsTab({ config, onSave }: { config: GameConfig; onSave: (updates: Record<string, any>) => Promise<void> }) {
  const [saving, setSaving] = useState<string | null>(null);
  const [local, setLocal] = useState(config);

  async function save(key: string, value: any) {
    setSaving(key);
    await onSave({ [key]: value });
    setSaving(null);
  }

  const sections = [
    {
      title: "Default Coin Rewards", fields: [
        { key: "rewards.taskComplete", label: "Task complete (coins)", value: local.rewards.taskComplete },
        { key: "rewards.allTasksBonus", label: "All tasks bonus (coins)", value: local.rewards.allTasksBonus },
        { key: "rewards.roadmapTopicComplete", label: "Roadmap topic complete (coins)", value: local.rewards.roadmapTopicComplete },
      ],
    },
    {
      title: "Streak Milestones", fields: [
        { key: "rewards.streakMilestone14", label: "14-day streak", value: local.rewards.streakMilestone14 },
        { key: "rewards.streakMilestone30", label: "30-day streak", value: local.rewards.streakMilestone30 },
        { key: "rewards.streakMilestone60", label: "60-day streak", value: local.rewards.streakMilestone60 },
      ],
    },
    {
      title: "Bonus Actions", fields: [
        { key: "bonusActions.journalEntry", label: "Journal entry", value: local.bonusActions.journalEntry },
        { key: "bonusActions.dailySummary", label: "Daily summary", value: local.bonusActions.dailySummary },
        { key: "bonusActions.issueLogged", label: "Issue logged", value: local.bonusActions.issueLogged },
        { key: "bonusActions.vaultSaved", label: "Vault item saved", value: local.bonusActions.vaultSaved },
        { key: "bonusActions.coldEmailSent", label: "Cold email sent", value: local.bonusActions.coldEmailSent },
      ],
    },
    {
      title: "Weekly Chest", fields: [
        { key: "weeklyChest.requiredDays", label: "Days required", value: local.weeklyChest.requiredDays },
        { key: "weeklyChest.rewardCoins", label: "Chest reward coins", value: local.weeklyChest.rewardCoins },
      ],
    },
    {
      title: "Staking", fields: [
        { key: "staking.defaultStakeAmount", label: "Default stake amount", value: local.staking.defaultStakeAmount },
        { key: "staking.winMultiplier", label: "Win multiplier", value: local.staking.winMultiplier },
      ],
    },
    // Happy Hour section handled separately below
    {
      title: "Misc", fields: [
        { key: "level.coinsPerLevel", label: "Coins to level up", value: local.level.coinsPerLevel },
        { key: "alerts.moodDropConsecutiveDays", label: "Hard mood alert (days)", value: local.alerts.moodDropConsecutiveDays },
        { key: "jokers.earnEveryNDays", label: "Joker earn every N days", value: local.jokers.earnEveryNDays },
        { key: "jokers.maxStored", label: "Max jokers stored", value: local.jokers.maxStored },
      ],
    },
  ];

  function getNestedValue(obj: any, path: string) {
    return path.split(".").reduce((o, k) => o?.[k], obj);
  }

  function setNestedValue(obj: any, path: string, value: any) {
    const keys = path.split(".");
    const updated = JSON.parse(JSON.stringify(obj));
    let cur = updated;
    for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
    cur[keys[keys.length - 1]] = value;
    return updated;
  }

  const [slots, setSlots] = useState<HappyHourSlot[]>(config.happyHourSlots ?? []);
  const [savingSlots, setSavingSlots] = useState(false);

  async function saveSlots(updated: HappyHourSlot[]) {
    setSavingSlots(true);
    await onSave({ happyHourSlots: updated });
    setSavingSlots(false);
  }

  function updateSlot(i: number, patch: Partial<HappyHourSlot>) {
    setSlots(prev => prev.map((s, j) => j === i ? { ...s, ...patch } : s));
  }

  function addSlot() {
    setSlots(prev => [...prev, { name: "New Slot", enabled: true, schedule: "daily", startHour: 6, endHour: 9, multiplier: 2 }]);
  }

  function removeSlot(i: number) {
    const updated = slots.filter((_, j) => j !== i);
    setSlots(updated);
    saveSlots(updated);
  }

  const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => {
    const ampm = h < 12 ? "AM" : "PM";
    const display = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
    return { value: h, label: display };
  });

  return (
    <div className="space-y-6">
      {/* ── Happy Hour Slots ── */}
      <div className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="font-black text-slate-900">Happy Hour / Fire Hour Slots</p>
              <p className="text-[11px] text-slate-400 font-medium">Any task completed during these windows gets the multiplier. First matching slot wins.</p>
            </div>
          </div>
          <button onClick={addSlot} className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs transition-colors">
            <Plus className="w-3.5 h-3.5"/> Add Slot
          </button>
        </div>

        {slots.length === 0 && (
          <p className="text-center text-slate-400 text-sm font-medium py-4">No slots yet — add one above.</p>
        )}

        <AnimatePresence>
          {slots.map((slot, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className={`rounded-2xl border-2 p-4 space-y-3 transition-all ${slot.enabled ? "border-amber-200 bg-amber-50/40" : "border-slate-100 bg-slate-50"}`}>
              <div className="flex items-center gap-3">
                {/* Toggle */}
                <button
                  onClick={() => updateSlot(i, { enabled: !slot.enabled })}
                  className={`relative w-12 h-6 rounded-full transition-all shrink-0 ${slot.enabled ? "bg-amber-400" : "bg-slate-200"}`}
                >
                  <motion.div animate={{ x: slot.enabled ? 24 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"/>
                </button>
                {/* Name */}
                <input value={slot.name} onChange={e => updateSlot(i, { name: e.target.value })}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-black text-slate-800 outline-none focus:border-amber-400"/>
                {/* Schedule */}
                <select value={slot.schedule} onChange={e => updateSlot(i, { schedule: e.target.value as HappyHourSlot["schedule"] })}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-black text-slate-700 outline-none focus:border-amber-400">
                  <option value="daily">Every Day</option>
                  <option value="weekdays">Weekdays</option>
                  <option value="weekends">Weekends</option>
                </select>
                <button onClick={() => removeSlot(i)} className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors shrink-0">
                  <Trash2 className="w-4 h-4"/>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Start</label>
                  <select value={slot.startHour} onChange={e => updateSlot(i, { startHour: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-amber-400">
                    {HOUR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">End</label>
                  <select value={slot.endHour} onChange={e => updateSlot(i, { endHour: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-amber-400">
                    {HOUR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Multiplier</label>
                  <div className="flex items-center gap-1">
                    <input type="number" min={1} max={10} step={0.5} value={slot.multiplier}
                      onChange={e => updateSlot(i, { multiplier: Number(e.target.value) })}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-amber-400"/>
                    <span className="text-xs font-black text-amber-600">×</span>
                  </div>
                </div>
              </div>
              {/* Preview */}
              <p className="text-[11px] text-slate-400 font-medium">
                {slot.enabled ? "✅" : "⏸"} {HOUR_OPTIONS[slot.startHour]?.label} – {HOUR_OPTIONS[slot.endHour]?.label} · {slot.schedule === "daily" ? "every day" : slot.schedule} · {slot.multiplier}× reward
              </p>
            </motion.div>
          ))}
        </AnimatePresence>

        {slots.length > 0 && (
          <button onClick={() => saveSlots(slots)} disabled={savingSlots}
            className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50">
            {savingSlots ? "Saving…" : "Save All Slots"}
          </button>
        )}
      </div>

      {sections.map((section) => (
        <div key={section.title} className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">{section.title}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {section.fields.map(({ key, label }) => {
              const val = getNestedValue(local, key);
              return (
                <div key={key}>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">
                    {label}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={val}
                      onChange={(e) => setLocal(setNestedValue(local, key, Number(e.target.value)))}
                      className="flex-1 bg-slate-50 border-2 border-transparent rounded-xl px-4 py-2 outline-none focus:bg-white focus:border-blue-400 font-black text-slate-800"
                    />
                    <button
                      onClick={() => save(key, getNestedValue(local, key))}
                      disabled={saving === key}
                      className="px-3 py-2 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-xs transition-all disabled:opacity-50"
                    >
                      {saving === key ? "…" : "Save"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Assign Task Panel ─────────────────────────────────────────────────────────

type RewardConfig = { type: "coins" | "custom"; coins?: number; rewardId?: string; rewardLabel?: string; quantity?: number };

function AssignTaskPanel({ rewards }: { rewards: AdminReward[] }) {
  const EMPTY = { text: "", category: "learning" as const, type: "custom" as const, date: "" };
  const [form, setForm] = useState(EMPTY);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [rewardConfig, setRewardConfig] = useState<RewardConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.text.trim()) { setError("Task text is required"); return; }
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          date: form.date || undefined,
          rewardConfig: rewardOpen ? rewardConfig : null,
        }),
      });
      if (res.ok) {
        setForm(EMPTY); setRewardOpen(false); setRewardConfig(null);
        setDone(true); setTimeout(() => setDone(false), 2000);
      } else {
        const d = await res.json(); setError(d.error ?? "Failed");
      }
    } finally { setSaving(false); }
  }

  return (
    <div className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <Plus className="w-5 h-5 text-blue-500" />
        <div>
          <p className="font-black text-slate-900">Assign Task to User</p>
          <p className="text-[11px] text-slate-400 font-medium">Create a task directly in user's dashboard</p>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <input
          value={form.text} onChange={e => setForm({ ...form, text: e.target.value })}
          placeholder="Task description…"
          className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-4 py-3 outline-none focus:bg-white focus:border-blue-400 font-medium text-slate-800"
        />
        <div className="flex gap-3">
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as any })}
            className="flex-1 bg-slate-50 border-2 border-transparent rounded-xl px-4 py-2.5 outline-none focus:bg-white focus:border-blue-400 font-bold text-slate-800 appearance-none">
            <option value="learning">📚 Learning</option>
            <option value="job-search">💼 Job Search</option>
            <option value="self-care">🌿 Self-care</option>
          </select>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
            className="flex-1 bg-slate-50 border-2 border-transparent rounded-xl px-4 py-2.5 outline-none focus:bg-white focus:border-blue-400 font-bold text-slate-800" />
        </div>

        {/* Reward Config */}
        {!rewardOpen ? (
          <button type="button" onClick={() => { setRewardOpen(true); setRewardConfig({ type: "coins" }); }}
            className="w-full py-3 text-xs font-black text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-2xl border border-dashed border-amber-200 transition-all">
            ⚡ Set completion reward
          </button>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Completion Reward</p>
              <button type="button" onClick={() => { setRewardOpen(false); setRewardConfig(null); }} className="text-slate-300 hover:text-rose-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRewardConfig(rc => ({ ...(rc ?? {}), type: "coins" }))}
                className={`flex-1 py-2 rounded-xl text-xs font-black border-2 transition-all ${rewardConfig?.type === "coins" ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-500 border-slate-200 hover:border-amber-300"}`}>
                🪙 Coins
              </button>
              <button type="button" onClick={() => setRewardConfig(rc => ({ ...(rc ?? {}), type: "custom" }))}
                className={`flex-1 py-2 rounded-xl text-xs font-black border-2 transition-all ${rewardConfig?.type === "custom" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-500 border-slate-200 hover:border-blue-300"}`}>
                🎁 Custom
              </button>
            </div>
            {rewardConfig?.type === "coins" && (
              <input type="number" min={0} value={rewardConfig.coins ?? ""} onChange={e => setRewardConfig(rc => ({ ...(rc ?? { type: "coins" }), coins: e.target.value === "" ? undefined : Number(e.target.value) }))}
                placeholder="Coins (blank = global default)"
                className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-amber-400" />
            )}
            {rewardConfig?.type === "custom" && (
              <div className="space-y-2">
                {rewards.length > 0 ? (
                  <select value={rewardConfig.rewardId ?? ""} onChange={e => { const r = rewards.find(c => c._id === e.target.value); setRewardConfig(rc => ({ ...(rc ?? { type: "custom" }), rewardId: e.target.value, rewardLabel: r?.label })); }}
                    className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-400">
                    <option value="">— pick a reward —</option>
                    {rewards.map(r => <option key={r._id} value={r._id}>{r.emoji} {r.label}</option>)}
                  </select>
                ) : (
                  <input value={rewardConfig.rewardLabel ?? ""} onChange={e => setRewardConfig(rc => ({ ...(rc ?? { type: "custom" }), rewardLabel: e.target.value }))}
                    placeholder="Reward label e.g. Coffee break"
                    className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-400" />
                )}
                <input type="number" min={1} value={rewardConfig.quantity ?? 1} onChange={e => setRewardConfig(rc => ({ ...(rc ?? { type: "custom" }), quantity: Number(e.target.value) }))}
                  placeholder="Quantity"
                  className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-blue-400" />
              </div>
            )}
          </div>
        )}

        {error && <p className="text-xs font-bold text-rose-500">{error}</p>}
        <button type="submit" disabled={saving}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : done ? <><CheckCircle2 className="w-4 h-4" /> Assigned!</> : <><Plus className="w-4 h-4" /> Assign Task</>}
        </button>
      </form>
    </div>
  );
}

// ── Controls Tab ──────────────────────────────────────────────────────────────

function ControlsTab({
  userData,
  impersonating,
  rewards,
  onUpdate,
  onStartImpersonation,
  onStopImpersonation,
}: {
  userData: UserData | null;
  impersonating: string | null;
  rewards: AdminReward[];
  onUpdate: (body: Record<string, any>) => Promise<void>;
  onStartImpersonation: () => Promise<void>;
  onStopImpersonation: () => Promise<void>;
}) {
  const [streakVal, setStreakVal] = useState("");
  const [jokerVal, setJokerVal] = useState("1");
  const [saving, setSaving] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function act(key: string, body: Record<string, any>) {
    setSaving(key);
    await onUpdate(body);
    setDone(key);
    setSaving(null);
    setTimeout(() => setDone(null), 2000);
  }

  const pill = (key: string, label: string) =>
    done === key ? (
      <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" /> Done
      </span>
    ) : saving === key ? (
      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
    ) : null;

  return (
    <div className="space-y-5">

      {/* Override streak */}
      <div className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <Flame className="w-5 h-5 text-orange-500" />
          <div>
            <p className="font-black text-slate-900">Streak Override</p>
            <p className="text-[11px] text-slate-400 font-medium">Current: {userData?.streak ?? 0} days</p>
          </div>
        </div>
        <div className="flex gap-3">
          <input
            type="number" value={streakVal} onChange={(e) => setStreakVal(e.target.value)}
            placeholder="New streak value"
            className="flex-1 bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-3 outline-none focus:bg-white focus:border-orange-400 font-bold text-slate-800"
          />
          <button
            onClick={() => act("streak", { streakOverride: parseInt(streakVal) })}
            disabled={!streakVal || saving === "streak"}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all disabled:opacity-50"
          >
            {pill("streak", "Set") ?? "Set"}
          </button>
          <button
            onClick={() => act("streakReset", { resetStreak: true })}
            disabled={saving === "streakReset"}
            className="px-6 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-black uppercase text-xs tracking-widest rounded-2xl transition-all disabled:opacity-50"
          >
            {pill("streakReset", "Reset") ?? "Reset"}
          </button>
        </div>
      </div>

      {/* Grant joker tokens */}
      <div className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-xl">🃏</span>
          <div>
            <p className="font-black text-slate-900">Grant Joker Token</p>
            <p className="text-[11px] text-slate-400 font-medium">Current: {userData?.jokerTokens ?? 0}/3 tokens</p>
          </div>
        </div>
        <div className="flex gap-3">
          <select
            value={jokerVal}
            onChange={(e) => setJokerVal(e.target.value)}
            className="flex-1 bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-3 outline-none focus:bg-white focus:border-violet-400 font-bold text-slate-800 appearance-none"
          >
            <option value="1">+1 token</option>
            <option value="2">+2 tokens</option>
            <option value="3">+3 tokens</option>
          </select>
          <button
            onClick={() => act("joker", { jokerGrant: parseInt(jokerVal) })}
            disabled={saving === "joker"}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all disabled:opacity-50"
          >
            {pill("joker", "Grant") ?? "Grant"}
          </button>
        </div>
      </div>

      {/* Job Orbit unlock */}
      <div className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {userData?.applicationUnlocked
              ? <Unlock className="w-5 h-5 text-emerald-500" />
              : <Lock className="w-5 h-5 text-slate-400" />}
            <div>
              <p className="font-black text-slate-900">Job Orbit Access</p>
              <p className="text-[11px] text-slate-400 font-medium">
                Currently: <span className={userData?.applicationUnlocked ? "text-emerald-600 font-black" : "text-slate-500 font-black"}>
                  {userData?.applicationUnlocked ? "Unlocked" : "Locked"}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={() => act("unlock", { applicationUnlocked: !userData?.applicationUnlocked })}
            disabled={saving === "unlock"}
            className={`px-6 py-3 font-black uppercase text-xs tracking-widest rounded-2xl transition-all disabled:opacity-50 ${
              userData?.applicationUnlocked
                ? "bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200"
                : "bg-emerald-500 hover:bg-emerald-600 text-white"
            }`}
          >
            {pill("unlock", "") ?? (userData?.applicationUnlocked ? "Lock" : "Unlock")}
          </button>
        </div>
      </div>

      {/* Assign Task */}
      <AssignTaskPanel rewards={rewards} />

      {/* Impersonation */}
      <div className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserCog className="w-5 h-5 text-amber-500" />
            <div>
              <p className="font-black text-slate-900">Act as User</p>
              <p className="text-[11px] text-slate-400 font-medium">
                {impersonating
                  ? <span className="text-amber-600 font-black">Currently acting as user1</span>
                  : "Browse & edit data as the user"}
              </p>
            </div>
          </div>
          {impersonating ? (
            <button
              onClick={onStopImpersonation}
              className="flex items-center gap-2 px-6 py-3 bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 font-black uppercase text-xs tracking-widest rounded-2xl transition-all"
            >
              <LogOut className="w-4 h-4" /> Exit
            </button>
          ) : (
            <button
              onClick={onStartImpersonation}
              className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all shadow-lg shadow-amber-100"
            >
              <UserCog className="w-4 h-4" /> Impersonate
            </button>
          )}
        </div>
      </div>

      {/* Telegram webhook setup */}
      <TelegramSetup />

      {/* User Telegram username */}
      <UserTelegramPanel />

    </div>
  );
}

function TelegramSetup() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function register() {
    const url = webhookUrl.trim() || window.location.origin;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/telegram/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: url }),
      });
      const data = await res.json();
      setStatus({ ok: res.ok && data.ok, msg: data.ok ? `Registered: ${data.url}` : (data.description ?? data.error ?? "Failed") });
    } catch (e: any) {
      setStatus({ ok: false, msg: e.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xl">✈️</span>
        <div>
          <p className="font-black text-slate-900">Telegram Webhook</p>
          <p className="text-[11px] text-slate-400 font-medium">One-time setup — registers your deployed URL with the bot</p>
        </div>
      </div>
      <div className="flex gap-3">
        <input
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder={typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}
          className="flex-1 bg-slate-50 border-2 border-transparent rounded-2xl px-5 py-3 outline-none focus:bg-white focus:border-blue-400 font-medium text-slate-800 text-sm"
        />
        <button
          onClick={register}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all disabled:opacity-50"
        >
          {saving ? "Registering…" : "Register"}
        </button>
      </div>
      {status && (
        <p className={`text-xs font-bold mt-2 ml-1 ${status.ok ? "text-emerald-600" : "text-rose-500"}`}>
          {status.ok ? "✓" : "✗"} {status.msg}
        </p>
      )}
      <p className="text-[10px] text-slate-400 font-medium mt-2 ml-1">
        After registering, send <code className="bg-slate-100 px-1 rounded">/start</code> to your bot on Telegram to link your chat ID.
      </p>
    </div>
  );
}

function UserTelegramPanel() {
  const [username, setUsername] = useState("");
  const [saved, setSaved] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/telegram-username")
      .then(r => r.json())
      .then(d => { if (d.username) { setUsername(d.username); setSaved(d.username); } })
      .catch(() => {});
  }, []);

  async function save() {
    const clean = username.replace(/^@/, "").trim();
    if (!clean) return;
    setSaving(true); setStatus(null);
    try {
      const res = await fetch("/api/admin/telegram-username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: clean }),
      });
      const data = await res.json();
      if (data.ok) { setSaved(clean); setStatus({ ok: true, msg: `Saved: @${clean}` }); }
      else setStatus({ ok: false, msg: data.error ?? "Failed" });
    } catch (e: any) {
      setStatus({ ok: false, msg: e.message });
    } finally { setSaving(false); }
  }

  return (
    <div className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xl">👤</span>
        <div>
          <p className="font-black text-slate-900">User Telegram Username</p>
          <p className="text-[11px] text-slate-400 font-medium">Saved to DB — no env var needed in production</p>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">@</span>
          <input
            value={username}
            onChange={e => setUsername(e.target.value.replace(/^@/, ""))}
            placeholder="her_telegram_username"
            className="w-full bg-slate-50 border-2 border-transparent rounded-2xl pl-8 pr-4 py-3 outline-none focus:bg-white focus:border-blue-400 font-medium text-slate-800 text-sm"
          />
        </div>
        <button
          onClick={save}
          disabled={saving || username.replace(/^@/, "").trim() === saved}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {status && (
        <p className={`text-xs font-bold mt-2 ml-1 ${status.ok ? "text-emerald-600" : "text-rose-500"}`}>
          {status.ok ? "✓" : "✗"} {status.msg}
        </p>
      )}
      {saved && (
        <p className="text-[10px] text-slate-400 font-medium mt-2 ml-1">
          Currently: <span className="font-black text-slate-600">@{saved}</span> — she must send <code className="bg-slate-100 px-1 rounded">/start</code> to the bot to link her chat ID.
        </p>
      )}
    </div>
  );
}

// ── Rewards Tab ───────────────────────────────────────────────────────────────

function RewardsTab({
  rewards,
  redemptions,
  taskRewardRequests,
  onRefresh,
}: {
  rewards: AdminReward[];
  redemptions: AdminRedemption[];
  taskRewardRequests: TaskRewardRequest[];
  onRefresh: () => void;
}) {
  const EMPTY_FORM = { emoji: "🎁", label: "", description: "", coinCost: 500, coinStep: 0, isActive: true, isComingSoon: false };
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminReward>>({});
  const [actionSaving, setActionSaving] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  async function createReward(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label.trim()) { setFormError("Label is required"); return; }
    setFormError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) { setForm(EMPTY_FORM); onRefresh(); }
      else { const d = await res.json(); setFormError(d.error ?? "Failed"); }
    } finally { setSaving(false); }
  }

  async function saveEdit(id: string) {
    setActionSaving(`edit-${id}`);
    try {
      await fetch(`/api/admin/rewards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      setEditId(null);
      onRefresh();
    } finally { setActionSaving(null); }
  }

  async function deleteReward(id: string) {
    if (!confirm("Delete this reward?")) return;
    setActionSaving(`del-${id}`);
    try {
      await fetch(`/api/admin/rewards/${id}`, { method: "DELETE" });
      onRefresh();
    } finally { setActionSaving(null); }
  }

  async function redemptionAction(id: string, action: "approve" | "reject" | "fulfill") {
    const adminNote = noteInputs[id] ?? "";
    setActionSaving(`${action}-${id}`);
    try {
      await fetch(`/api/admin/redemptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminNote }),
      });
      onRefresh();
    } finally { setActionSaving(null); }
  }

  const STATUS_STYLE: Record<string, string> = {
    pending:   "bg-amber-100 text-amber-700 border-amber-200",
    approved:  "bg-blue-100 text-blue-700 border-blue-200",
    rejected:  "bg-rose-100 text-rose-600 border-rose-200",
    fulfilled: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };

  const pendingRedemptions = redemptions.filter(r => r.status === "pending");
  const approvedRedemptions = redemptions.filter(r => r.status === "approved");
  const otherRedemptions = redemptions.filter(r => r.status !== "pending" && r.status !== "approved");

  const pendingTaskRewards = taskRewardRequests.filter(t => t.rewardConfig?.approvalStatus === "pending");
  const otherTaskRewards = taskRewardRequests.filter(t => t.rewardConfig?.approvalStatus !== "pending");

  async function taskRewardAction(taskId: string, action: "approve" | "reject") {
    setActionSaving(`treward-${action}-${taskId}`);
    try {
      await fetch(`/api/admin/task-rewards/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      onRefresh();
    } finally { setActionSaving(null); }
  }

  return (
    <div className="space-y-6">
      {/* Reward Catalogue */}
      <div className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm">
        <h3 className="text-base font-black text-slate-900 mb-5 flex items-center gap-2">
          <Gift className="w-5 h-5 text-amber-500" /> Reward Catalogue
        </h3>

        {/* Add reward form */}
        <form onSubmit={createReward} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">Emoji</label>
            <input value={form.emoji} onChange={e => setForm({...form, emoji: e.target.value})}
              className="w-full bg-white border-2 border-transparent rounded-xl px-3 py-2 outline-none focus:border-amber-400 font-black text-center text-xl"
              placeholder="🎁" maxLength={4} />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">Label</label>
            <input required value={form.label} onChange={e => setForm({...form, label: e.target.value})}
              className="w-full bg-white border-2 border-transparent rounded-xl px-3 py-2 outline-none focus:border-amber-400 font-medium text-slate-800"
              placeholder="Coffee break, Amazon card…" />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">Description</label>
            <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              className="w-full bg-white border-2 border-transparent rounded-xl px-3 py-2 outline-none focus:border-amber-400 font-medium text-slate-800"
              placeholder="Optional description…" />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">
              Coin Cost <span className="normal-case font-medium">(min to redeem)</span>
            </label>
            <input required type="number" min={1} value={form.coinCost} onChange={e => setForm({...form, coinCost: Number(e.target.value)})}
              className="w-full bg-white border-2 border-transparent rounded-xl px-3 py-2 outline-none focus:border-amber-400 font-black text-slate-800"
              placeholder="e.g. 500" />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1.5">
              Coin Step <span className="normal-case font-medium">(0 = fixed, &gt;0 = multiples)</span>
            </label>
            <input type="number" min={0} value={form.coinStep} onChange={e => setForm({...form, coinStep: Number(e.target.value)})}
              className="w-full bg-white border-2 border-transparent rounded-xl px-3 py-2 outline-none focus:border-amber-400 font-black text-slate-800"
              placeholder="e.g. 0 or 1000" />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isComingSoon} onChange={e => setForm({...form, isComingSoon: e.target.checked})} className="w-4 h-4 rounded" />
              <span className="text-xs font-bold text-slate-600">Coming Soon</span>
            </label>
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-3 justify-end gap-3">
            {formError && <p className="text-xs font-bold text-rose-500">{formError}</p>}
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase text-xs tracking-widest rounded-xl transition-all disabled:opacity-50 flex items-center gap-2">
              <Plus className="w-4 h-4" /> {saving ? "Adding…" : "Add Reward"}
            </button>
          </div>
        </form>

        {/* Reward list */}
        {rewards.length === 0 ? (
          <EmptyState text="No rewards yet. Add one above." />
        ) : (
          <div className="space-y-2">
            {rewards.map(reward => (
              <div key={reward._id} className="rounded-2xl border border-slate-100 bg-white px-4 py-3 hover:border-slate-200 transition-colors">
                {editId === reward._id ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <input value={editForm.emoji ?? reward.emoji} onChange={e => setEditForm({...editForm, emoji: e.target.value})}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black text-center text-lg outline-none focus:border-amber-400" maxLength={4} />
                    <input value={editForm.label ?? reward.label} onChange={e => setEditForm({...editForm, label: e.target.value})}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 outline-none focus:border-amber-400" placeholder="Label" />
                    <div className="flex gap-2">
                      <input type="number" min={1} value={editForm.coinCost ?? reward.coinCost ?? 500} onChange={e => setEditForm({...editForm, coinCost: Number(e.target.value)})}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-800 outline-none focus:border-amber-400 text-sm" placeholder="Cost" />
                      <input type="number" min={0} value={editForm.coinStep ?? reward.coinStep ?? 0} onChange={e => setEditForm({...editForm, coinStep: Number(e.target.value)})}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-black text-slate-800 outline-none focus:border-amber-400 text-sm" placeholder="Step" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(reward._id)} disabled={actionSaving === `edit-${reward._id}`}
                        className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs transition-all disabled:opacity-50">
                        {actionSaving === `edit-${reward._id}` ? "…" : "Save"}
                      </button>
                      <button onClick={() => setEditId(null)}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-xs transition-all">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl shrink-0">{reward.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-900">{reward.label}</p>
                      <p className="text-[10px] text-slate-500 font-bold">
                        🪙 {(reward.coinCost ?? 0).toLocaleString()} coins
                        {reward.coinStep > 0 && ` · +${reward.coinStep.toLocaleString()} per step`}
                        {(reward.isComingSoon || !reward.isActive) && ` · ${reward.isComingSoon ? "Coming Soon" : "Inactive"}`}
                      </p>
                    </div>
                    <button
                      onClick={() => { setEditId(reward._id); setEditForm({ emoji: reward.emoji, label: reward.label, coinCost: reward.coinCost, coinStep: reward.coinStep, isActive: reward.isActive, isComingSoon: reward.isComingSoon }); }}
                      className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteReward(reward._id)}
                      disabled={actionSaving === `del-${reward._id}`}
                      className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      {actionSaving === `del-${reward._id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mission Reward Requests */}
      <div className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm">
        <h3 className="text-base font-black text-slate-900 mb-5 flex items-center gap-2">
          <span className="text-lg">⚡</span> Mission Reward Requests
          {pendingTaskRewards.length > 0 && (
            <span className="ml-2 bg-violet-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{pendingTaskRewards.length} pending</span>
          )}
        </h3>
        <p className="text-[11px] text-slate-400 font-medium mb-4">
          When Rajshri adds a custom reward to a mission, it needs your approval before coins/rewards are granted on completion.
        </p>
        {taskRewardRequests.length === 0 ? (
          <EmptyState text="No mission reward requests yet." />
        ) : (
          <div className="space-y-3">
            {[...pendingTaskRewards, ...otherTaskRewards].map(t => {
              const rc = t.rewardConfig;
              const isPending = rc?.approvalStatus === "pending";
              const isRejected = rc?.approvalStatus === "rejected";
              const rewardDesc = rc?.type === "coins"
                ? `🪙 ${rc.coins != null ? rc.coins.toLocaleString() + " coins" : "default coins"}`
                : `🎁 ${rc?.rewardLabel ?? "Custom reward"}`;
              return (
                <div key={t._id} className={`rounded-2xl border px-4 py-4 ${isPending ? "bg-violet-50 border-violet-200" : isRejected ? "bg-rose-50 border-rose-100" : "bg-emerald-50 border-emerald-100"}`}>
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-900 mb-0.5">{t.text}</p>
                      <p className="text-[11px] font-bold text-slate-500">{rewardDesc}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {t.userId} · {format(new Date(t.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${
                        isPending ? "bg-violet-100 text-violet-700 border-violet-200"
                        : isRejected ? "bg-rose-100 text-rose-600 border-rose-200"
                        : "bg-emerald-100 text-emerald-700 border-emerald-200"
                      }`}>{rc?.approvalStatus}</span>
                      {isPending && (
                        <>
                          <button
                            onClick={() => taskRewardAction(t._id, "approve")}
                            disabled={!!actionSaving}
                            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs transition-all disabled:opacity-50"
                          >
                            {actionSaving === `treward-approve-${t._id}` ? "…" : "Approve"}
                          </button>
                          <button
                            onClick={() => taskRewardAction(t._id, "reject")}
                            disabled={!!actionSaving}
                            className="px-4 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl font-black text-xs transition-all disabled:opacity-50"
                          >
                            {actionSaving === `treward-reject-${t._id}` ? "…" : "Reject"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Redemption Queue */}
      <div className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm">
        <h3 className="text-base font-black text-slate-900 mb-5 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" /> Redemption Queue
          {pendingRedemptions.length > 0 && (
            <span className="ml-2 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{pendingRedemptions.length} pending</span>
          )}
        </h3>

        {redemptions.length === 0 ? (
          <EmptyState text="No redemption requests yet." />
        ) : (
          <div className="space-y-3">
            {[...pendingRedemptions, ...approvedRedemptions, ...otherRedemptions].map(r => (
              <div key={r._id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-sm font-black text-slate-900">{r.rewardLabel}</p>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${STATUS_STYLE[r.status] ?? ""}`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">
                      🪙 {r.coinsRequested.toLocaleString()} · {r.userId} · {format(new Date(r.requestedAt), "MMM d, yyyy")}
                    </p>
                    {r.adminNote && (
                      <p className="text-[11px] text-slate-500 font-medium mt-1 italic">"{r.adminNote}"</p>
                    )}
                  </div>
                  {r.status === "pending" && (
                    <div className="flex flex-col gap-2 items-end shrink-0">
                      <input
                        value={noteInputs[r._id] ?? ""}
                        onChange={e => setNoteInputs({...noteInputs, [r._id]: e.target.value})}
                        placeholder="Admin note (optional)"
                        className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-400 w-48"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => redemptionAction(r._id, "approve")}
                          disabled={!!actionSaving}
                          className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs transition-all disabled:opacity-50"
                        >
                          {actionSaving === `approve-${r._id}` ? "…" : "Approve"}
                        </button>
                        <button
                          onClick={() => redemptionAction(r._id, "reject")}
                          disabled={!!actionSaving}
                          className="px-4 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl font-black text-xs transition-all disabled:opacity-50"
                        >
                          {actionSaving === `reject-${r._id}` ? "…" : "Reject"}
                        </button>
                      </div>
                    </div>
                  )}
                  {r.status === "approved" && (
                    <button
                      onClick={() => redemptionAction(r._id, "fulfill")}
                      disabled={!!actionSaving}
                      className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-black text-xs transition-all disabled:opacity-50 shrink-0"
                    >
                      {actionSaving === `fulfill-${r._id}` ? "…" : "Mark Fulfilled"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-slate-400 font-medium text-sm">{text}</p>
    </div>
  );
}
