"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Coins, Trophy, Zap, Shield, Bell, BellOff } from "lucide-react";
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
            className="sticky top-[44px] z-30 flex items-center gap-2 px-6 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-500"
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
    </>
  );
}
