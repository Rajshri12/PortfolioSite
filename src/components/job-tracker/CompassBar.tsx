"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Coins, Trophy, Zap, Shield, Bell, BellOff } from "lucide-react";
import { apiFetch } from "@/lib/backend";
import { on, coinEvents } from "@/lib/celebrate";

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

interface FloatUp {
  id: number;
  amount: number;
  x: number;
  y: number;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function CompassBar() {
  const [user, setUser] = useState<UserState | null>(null);
  const [unseenBadges, setUnseenBadges] = useState<Array<{ slug: string; title: string; emoji: string }>>([]);
  const [pushState, setPushState] = useState<"loading" | "on" | "off" | "unsupported" | "denied">("loading");
  const [showPushTip, setShowPushTip] = useState(false);
  const [floatUps, setFloatUps] = useState<FloatUp[]>([]);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [streakBroken, setStreakBroken] = useState(false);
  const [coinPulse, setCoinPulse] = useState(0);
  const floatId = useRef(0);

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

  const checkPushStatus = useCallback(async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushState("unsupported");
      return;
    }
    try {
      const res = await apiFetch("/api/push/status");
      if (res.ok) {
        const data = await res.json();
        setPushState(data.subscribed ? "on" : Notification.permission === "denied" ? "denied" : "off");
      }
    } catch {
      setPushState("off");
    }
  }, []);

  useEffect(() => {
    fetchMe();
    fetchUnseenBadges();
    checkPushStatus();
    // Register service worker once (push receive + PWA installability)
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, [fetchMe, fetchUnseenBadges, checkPushStatus]);

  // Gamification celebrations from any page
  useEffect(() => {
    const offAward = on("coins:award", (payload: { amount?: number; screenX?: number; screenY?: number }) => {
      const amount = payload?.amount ?? 0;
      if (amount <= 0) return;
      setCoinPulse((p) => p + 1);
      const id = ++floatId.current;
      // Spawn near the provided coords, else from the coins stat (set below via data attr fallback)
      const fallback = document.getElementById("cb-coins-stat")?.getBoundingClientRect();
      const x = payload?.screenX ?? (fallback ? fallback.left + fallback.width / 2 : 120);
      const y = payload?.screenY ?? (fallback ? fallback.top : 20);
      setFloatUps((prev) => [...prev, { id, amount, x, y }]);
      setTimeout(() => setFloatUps((prev) => prev.filter((f) => f.id !== id)), 1300);
    });
    const offLevel = on("level:up", (level: number) => setLevelUp(level));
    const offStreak = on("streak:broken", () => setStreakBroken(true));
    return () => { offAward(); offLevel(); offStreak(); };
  }, []);

  async function togglePush() {
    if (pushState === "unsupported") return;

    if (pushState === "on") {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await apiFetch("/api/push/subscribe", { method: "DELETE", body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub?.unsubscribe();
      } catch {}
      setPushState("off");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setPushState("denied");
        setShowPushTip(true);
        return;
      }
      const res = await apiFetch("/api/push/status");
      const { publicKey } = await res.json();
      if (!publicKey) return;

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      await apiFetch("/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      setPushState("on");
    } catch {}
  }

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

  async function stopImpersonation() {
    await fetch("/api/admin/impersonate", { method: "DELETE" });
    window.location.href = "/job-tracker-dashboard/admin";
  }

  // While impersonating, show the acting-as banner above the full user bar
  const impersonationBanner = user.role === "admin" && user.impersonating ? (
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
  ) : null;

  const levelProgress = user.coinsPerLevel > 0
    ? ((user.coins % user.coinsPerLevel) / user.coinsPerLevel) * 100
    : 0;

  return (
    <>
      {impersonationBanner}

      {/* Compass Bar */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky z-40 flex items-center gap-4 px-6 py-2.5 bg-white/90 backdrop-blur-sm border-b border-slate-100 shadow-sm"
        style={impersonationBanner ? { top: 37 } : { top: 0 }}
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
        <div id="cb-coins-stat" className="relative flex items-center gap-1.5">
          <motion.span
            key={coinPulse}
            initial={coinPulse > 0 ? { scale: 1.5 } : false}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
            className="text-sm"
          >
            🪙
          </motion.span>
          <motion.span
            key={`c-${coinPulse}`}
            initial={coinPulse > 0 ? { scale: 1.35, color: "#f59e0b" } : false}
            animate={{ scale: 1, color: "#1e293b" }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            className="text-sm font-black"
          >
            {user.coins.toLocaleString()}
          </motion.span>
          <span className="text-xs text-slate-400 font-medium">coins</span>

          {/* +N float-ups */}
          <AnimatePresence>
            {floatUps.map((f) => (
              <motion.span
                key={f.id}
                initial={{ opacity: 0, y: 0, x: "-50%", scale: 0.7 }}
                animate={{ opacity: [0, 1, 1, 0], y: -44, scale: 1.15 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, times: [0, 0.15, 0.7, 1], ease: "easeOut" }}
                className="fixed z-[60] pointer-events-none text-sm font-black text-amber-500 drop-shadow"
                style={{ left: f.x, top: f.y }}
              >
                +{f.amount} 🪙
              </motion.span>
            ))}
          </AnimatePresence>
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

        {/* Push notification bell */}
        <div className="w-px h-4 bg-slate-200" />
        <button
          onClick={togglePush}
          title={
            pushState === "on"
              ? "Notifications on — click to disable"
              : pushState === "denied"
              ? "Notifications blocked in browser settings"
              : "Enable push notifications"
          }
          className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-all ${
            pushState === "on"
              ? "bg-emerald-50 hover:bg-emerald-100"
              : "hover:bg-slate-100"
          }`}
        >
          {pushState === "on" ? (
            <Bell className="w-4 h-4 text-emerald-600" />
          ) : (
            <BellOff className="w-4 h-4 text-slate-400" />
          )}
          <span className={`text-xs font-medium ${pushState === "on" ? "text-emerald-700" : "text-slate-400"}`}>
            {pushState === "on" ? "alerts on" : "alerts off"}
          </span>
        </button>

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

      {/* Push denied tip */}
      <AnimatePresence>
        {showPushTip && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="sticky z-30 flex items-center gap-2 px-6 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-500"
            style={{ top: impersonationBanner ? 37 + 41 : 44 }}
          >
            🔕 Notifications are blocked — enable them for this site in your browser's site settings.
            <button onClick={() => setShowPushTip(false)} className="ml-auto text-slate-400 hover:text-slate-600">&times;</button>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Streak broken banner */}
      <AnimatePresence>
        {streakBroken && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-6 py-3.5 bg-white rounded-[1.8rem] shadow-2xl border border-slate-100 max-w-[92vw]"
          >
            <span className="text-2xl shrink-0">😔</span>
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-900">You missed yesterday — streak reset to 0.</p>
              <p className="text-xs text-slate-500 font-medium">A new streak starts right now. 💪</p>
            </div>
            <button
              onClick={() => setStreakBroken(false)}
              className="ml-2 shrink-0 px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-700 transition-all"
            >
              Got it
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level-up celebration overlay */}
      <AnimatePresence>
        {levelUp !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none"
            onClick={() => setLevelUp(null)}
          >
            <motion.div
              initial={{ scale: 0.4, opacity: 0, rotate: -6 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
              className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 rounded-[3rem] px-14 py-12 text-center shadow-2xl border border-white/10"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.4, 1] }}
                transition={{ delay: 0.15, duration: 0.6 }}
                className="text-6xl mb-3"
              >
                🏆
              </motion.div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">Level Up!</p>
              <p className="text-5xl font-black text-white mt-2">Level {levelUp}</p>
              <p className="text-xs text-slate-300 font-medium mt-3">Your consistency is compounding. Keep going.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
