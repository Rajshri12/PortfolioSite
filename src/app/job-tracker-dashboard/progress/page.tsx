"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart2, Flame, Snowflake, Trophy, Target, Loader2, Lock, CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/lib/backend";

interface Badge {
  slug: string;
  label: string;
  description: string;
  icon: string;
  earned: boolean;
  earned_at?: string;
}

interface ProgressData {
  ai_completion_pct: number;
  ai_topics_completed: number;
  ai_topics_total: number;
  dsa_topics_completed: number;
  dsa_topics_total: number;
  dsa_problems_done: number;
  streak: number;
  freezes_remaining: number;
  badges: Badge[];
}

function RingChart({ pct, color, size = 96 }: { pct: number; color: string; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
    </svg>
  );
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [freezing, setFreezing] = useState(false);

  useEffect(() => {
    apiFetch("/api/progress")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  async function useFreeze() {
    if (freezing || !data) return;
    setFreezing(true);
    try {
      const res = await apiFetch("/api/streaks/freeze", { method: "POST" });
      if (res.ok) {
        setData((d) => d ? { ...d, freezes_remaining: d.freezes_remaining - 1 } : d);
      }
    } finally {
      setFreezing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen p-10 flex items-center justify-center">
        <div className="glass-panel rounded-3xl p-10 text-center">
          <BarChart2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-bold">Could not load progress. Make sure the backend is running.</p>
        </div>
      </div>
    );
  }

  const earnedBadges = data.badges.filter((b) => b.earned);
  const lockedBadges = data.badges.filter((b) => !b.earned);

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-100 rounded-xl border border-blue-200 shadow-inner">
          <BarChart2 className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900">Progress</h1>
          <p className="text-slate-500 font-medium">Your journey at a glance</p>
        </div>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "AI Completion", value: `${Math.round(data.ai_completion_pct)}%`, icon: Target, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
          { label: "DSA Topics", value: `${data.dsa_topics_completed}/${data.dsa_topics_total}`, icon: CheckCircle2, color: "text-violet-600", bg: "bg-violet-50 border-violet-200" },
          { label: "Streak", value: `${data.streak}d`, icon: Flame, color: "text-orange-500", bg: "bg-orange-50 border-orange-200" },
          { label: "AI Topics", value: `${data.ai_topics_completed}/${data.ai_topics_total}`, icon: BarChart2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
        ].map(({ label, value, icon: Icon, color, bg }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`glass-panel rounded-2xl p-5 border ${bg}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className={`text-3xl font-black ${color}`}>{value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Ring charts */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col items-center gap-4">
          <div className="relative">
            <RingChart pct={data.ai_completion_pct} color="#3b82f6" size={120} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-blue-600">{data.ai_completion_pct}%</span>
              <span className="text-[10px] font-bold text-slate-400">AI Track</span>
            </div>
          </div>
          <p className="text-sm font-bold text-slate-700">AI Roadmap</p>
        </div>

        <div className="glass-panel rounded-2xl p-6 flex flex-col items-center gap-4">
          <div className="relative">
            <RingChart pct={data.dsa_topics_total > 0 ? Math.round((data.dsa_topics_completed / data.dsa_topics_total) * 100) : 0} color="#8b5cf6" size={120} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-violet-600">{data.dsa_topics_completed}</span>
              <span className="text-[10px] font-bold text-slate-400">/ {data.dsa_topics_total} DSA</span>
            </div>
          </div>
          <p className="text-sm font-bold text-slate-700">DSA Topics</p>
        </div>

        {/* Streak card */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-black text-slate-700 uppercase tracking-wider">Streak</span>
            </div>
            <div className="flex items-end gap-2 mb-1">
              <span className="text-5xl font-black text-orange-500">{data.streak}</span>
              <span className="text-slate-400 font-bold pb-2">days</span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Keep going — consistency is the superpower.</p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Snowflake className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-slate-500">Freezes remaining</span>
              </div>
              <span className="text-sm font-black text-blue-600">{data.freezes_remaining}</span>
            </div>
            <button
              onClick={useFreeze}
              disabled={freezing || data.freezes_remaining <= 0}
              className="w-full mt-1 py-2 rounded-xl text-sm font-bold border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-40"
            >
              {freezing ? "Applying…" : "Use Streak Freeze"}
            </button>
          </div>
        </div>
      </div>

      {/* Track breakdown bars */}
      <div className="glass-panel rounded-2xl p-6 mb-8">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">Track Breakdown</h3>
        <div className="space-y-4">
          {[
            { label: "AI Track", completed: data.ai_topics_completed, total: data.ai_topics_total, color: "bg-blue-500", textColor: "text-blue-600" },
            { label: "DSA Track", completed: data.dsa_topics_completed, total: data.dsa_topics_total, color: "bg-violet-500", textColor: "text-violet-600" },
          ].map((track, i) => {
            const pct = track.total > 0 ? Math.round((track.completed / track.total) * 100) : 0;
            return (
              <div key={track.label}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-bold text-slate-700">{track.label}</span>
                  <span className={`text-xs font-black ${track.textColor}`}>{track.completed}/{track.total} topics · {pct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <motion.div
                    className={`h-2.5 rounded-full ${track.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: i * 0.1, duration: 0.9, ease: "easeOut" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges */}
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" /> Badges
          <span className="ml-auto text-amber-600 font-black">{earnedBadges.length} earned</span>
        </h3>
        {data.badges.length === 0 ? (
          <p className="text-slate-400 text-sm font-medium">No badges defined yet. Run the seed script.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[...earnedBadges, ...lockedBadges].map((badge) => (
              <motion.div
                key={badge.slug}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`rounded-2xl p-4 text-center border transition-all ${
                  badge.earned
                    ? "bg-amber-50 border-amber-200 shadow-sm"
                    : "bg-slate-50 border-slate-100 opacity-50 grayscale"
                }`}
              >
                <div className="text-3xl mb-2">{badge.icon}</div>
                <p className="text-xs font-black text-slate-800 mb-0.5">{badge.label}</p>
                <p className="text-[10px] text-slate-500 font-medium leading-tight">{badge.description}</p>
                {badge.earned ? (
                  <div className="mt-2 inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-200">
                    <Trophy className="w-2.5 h-2.5" /> Earned
                  </div>
                ) : (
                  <div className="mt-2 inline-flex items-center gap-1 bg-slate-100 text-slate-400 text-[9px] font-black px-2 py-0.5 rounded-full">
                    <Lock className="w-2.5 h-2.5" /> Locked
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
