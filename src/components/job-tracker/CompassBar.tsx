"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Coins, Trophy, Zap, Shield } from "lucide-react";
import { apiFetch } from "@/lib/backend";

interface UserState {
  coins: number;
  level: number;
  coinsPerLevel: number;
  streak: number;
  jokerTokens: number;
  isHappyHour: boolean;
  happyHourMultiplier: number;
  happyHourEnd: number;
  role: "admin" | "user";
  impersonating: string | null;
}

export default function CompassBar() {
  const [user, setUser] = useState<UserState | null>(null);
  const [unseenBadges, setUnseenBadges] = useState<Array<{ slug: string; title: string; emoji: string }>>([]);

  const fetchMe = useCallback(async () => {
    try {
      const res = await apiFetch("/api/me");
      if (res.ok) setUser(await res.json());
    } catch {}
  }, []);

  const fetchUnseenBadges = useCallback(async () => {
    try {
      const res = await apiFetch("/api/badges?unseen=true");
      if (res.ok) {
        const data = await res.json();
        const earned = (data.badges ?? []).filter((b: any) => b.earned && !b.seenAt);
        setUnseenBadges(earned);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchMe();
    fetchUnseenBadges();
  }, [fetchMe, fetchUnseenBadges]);

  async function dismissBadge(slug: string) {
    await apiFetch(`/api/badges/${slug}/seen`, { method: "PATCH" });
    setUnseenBadges((prev) => prev.filter((b) => b.slug !== slug));
  }

  if (!user) return null;

  // Admin banner (no stats, just a label)
  if (user.role === "admin" && !user.impersonating) {
    return (
      <div className="sticky top-0 z-40 flex items-center gap-2 px-6 py-2 bg-amber-50 border-b border-amber-200">
        <Shield className="w-4 h-4 text-amber-600" />
        <span className="text-xs font-black uppercase tracking-widest text-amber-700">Admin Mode</span>
      </div>
    );
  }

  if (user.role === "admin" && user.impersonating) {
    async function stopImpersonation() {
      await fetch("/api/admin/impersonate", { method: "DELETE" });
      window.location.href = "/job-tracker-dashboard/admin";
    }
    return (
      <div className="sticky top-0 z-40 flex items-center gap-2 px-6 py-2 bg-amber-100 border-b border-amber-300">
        <Shield className="w-4 h-4 text-amber-700" />
        <span className="text-xs font-black uppercase tracking-widest text-amber-800">
          Acting as — {user.impersonating}
        </span>
        <button
          onClick={stopImpersonation}
          className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all"
        >
          Exit
        </button>
      </div>
    );
  }

  const levelProgress = user.coinsPerLevel > 0
    ? ((user.coins % user.coinsPerLevel) / user.coinsPerLevel) * 100
    : 0;

  return (
    <>
      {/* Compass Bar */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 flex items-center gap-4 px-6 py-2.5 bg-white/90 backdrop-blur-sm border-b border-slate-100 shadow-sm"
      >
        {/* Streak */}
        <div className="flex items-center gap-1.5">
          <Flame className={`w-4 h-4 ${user.streak > 0 ? "text-orange-500" : "text-slate-300"}`} />
          <span className={`text-sm font-black ${user.streak > 0 ? "text-orange-600" : "text-slate-400"}`}>
            {user.streak}
          </span>
          <span className="text-xs text-slate-400 font-medium">day streak</span>
        </div>

        <div className="w-px h-4 bg-slate-200" />

        {/* Coins */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🪙</span>
          <span className="text-sm font-black text-slate-800">{user.coins.toLocaleString()}</span>
          <span className="text-xs text-slate-400 font-medium">coins</span>
        </div>

        <div className="w-px h-4 bg-slate-200" />

        {/* Level */}
        <div className="flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-black text-blue-700">Lv {user.level}</span>
          <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <motion.div
              className="bg-blue-500 h-1.5 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${levelProgress}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
        </div>

        {/* Joker tokens */}
        {user.jokerTokens > 0 && (
          <>
            <div className="w-px h-4 bg-slate-200" />
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(user.jokerTokens, 3) }).map((_, i) => (
                <span key={i} className="text-sm">🃏</span>
              ))}
              <span className="text-xs text-slate-500 font-medium ml-0.5">joker{user.jokerTokens > 1 ? "s" : ""}</span>
            </div>
          </>
        )}

        {/* Happy Hour badge */}
        <AnimatePresence>
          {user.isHappyHour && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="ml-auto flex items-center gap-1.5 bg-yellow-100 border border-yellow-300 rounded-full px-3 py-1"
            >
              <Zap className="w-3.5 h-3.5 text-yellow-600" />
              <span className="text-xs font-black text-yellow-700 uppercase tracking-wider">
                {user.happyHourMultiplier}x Happy Hour
              </span>
              <span className="text-[10px] text-yellow-600">until {user.happyHourEnd}:00</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* New badge toast */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {unseenBadges.slice(0, 2).map((badge) => (
            <motion.div
              key={badge.slug}
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.9 }}
              className="flex items-center gap-3 bg-white rounded-2xl px-5 py-3.5 shadow-xl border border-slate-100 cursor-pointer"
              onClick={() => dismissBadge(badge.slug)}
            >
              <span className="text-2xl">{badge.emoji}</span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">New Badge!</p>
                <p className="text-sm font-bold text-slate-900">{badge.title}</p>
              </div>
              <button className="ml-2 text-slate-300 hover:text-slate-500 text-lg leading-none">&times;</button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
