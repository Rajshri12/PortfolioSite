"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, X, Play, Pause, RotateCcw } from "lucide-react";
import { apiFetch } from "@/lib/backend";
import { coinEvents } from "@/lib/celebrate";

const PRESETS = [25, 50]; // minutes

type Phase = "idle" | "running" | "paused" | "done";

export default function FocusTimer({ tasks }: { tasks: Array<{ id: string; text: string }> }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [elapsed, setElapsed] = useState(0);
  const [attachedTask, setAttachedTask] = useState<string>("");
  const [earned, setEarned] = useState<number | null>(null);
  const elapsedRef = useRef(0);

  const complete = useCallback(async (secs: number) => {
    setPhase("done");
    const taskText = tasks.find((t) => t.id === attachedTask)?.text;
    try {
      const res = await apiFetch("/api/focus/complete", {
        method: "POST",
        body: JSON.stringify({ durationSeconds: secs, taskText }),
      });
      const data = await res.json();
      if (res.ok && data.coinsAwarded > 0) {
        setEarned(data.coinsAwarded);
        coinEvents.award({ amount: data.coinsAwarded });
      } else {
        setEarned(0);
      }
    } catch {
      setEarned(0);
    }
  }, [attachedTask, tasks]);

  // Tick — wall clock is only read inside this effect
  useEffect(() => {
    if (phase !== "running") return;
    const epoch = Date.now() - elapsedRef.current * 1000;
    const id = setInterval(() => {
      const e = Math.floor((Date.now() - epoch) / 1000);
      if (e >= totalSeconds) {
        elapsedRef.current = totalSeconds;
        setElapsed(totalSeconds);
        complete(totalSeconds);
      } else {
        elapsedRef.current = e;
        setElapsed(e);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase, totalSeconds, complete]);

  function start(minutes: number) {
    setTotalSeconds(minutes * 60);
    elapsedRef.current = 0;
    setElapsed(0);
    setPhase("running");
    setEarned(null);
  }

  function togglePause() {
    if (phase === "running") setPhase("paused");
    else if (phase === "paused") setPhase("running");
  }

  function reset() {
    setPhase("idle");
    elapsedRef.current = 0;
    setElapsed(0);
    setEarned(null);
  }

  const remaining = totalSeconds - elapsed;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const pct = totalSeconds > 0 ? (elapsed / totalSeconds) * 100 : 0;

  // Document title countdown while running
  useEffect(() => {
    if (phase === "running") {
      document.title = `${mm}:${ss} — Focus · Phoenix`;
    } else {
      document.title = "Career Hub";
    }
    return () => { document.title = "Career Hub"; };
  }, [mm, ss, phase]);

  return (
    <>
      {/* Launcher — fixed bottom-left */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-40 flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-[1.6rem] shadow-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all"
        title="Focus timer — earn bonus coins for deep work"
      >
        <Timer className="w-4 h-4 text-amber-400" />
        Focus
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            className="fixed bottom-6 left-6 z-50 w-80 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-black text-slate-900">Focus Session</p>
              </div>
              <button onClick={() => { if (phase === "running" || phase === "paused") reset(); setOpen(false); }} className="text-slate-300 hover:text-slate-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ring + time */}
            <div className="relative flex items-center justify-center py-3">
              <svg width="150" height="150" className="-rotate-90">
                <circle cx="75" cy="75" r="64" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                <motion.circle
                  cx="75" cy="75" r="64" fill="none"
                  stroke={phase === "done" ? "#10b981" : "#f59e0b"}
                  strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={402}
                  animate={{ strokeDashoffset: 402 - (pct / 100) * 402 }}
                  transition={{ duration: 0.5 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {phase === "done" ? (
                  <>
                    <span className="text-3xl">🎉</span>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">
                      {earned && earned > 0 ? `+${earned} 🪙 earned` : "Session done"}
                    </p>
                  </>
                ) : (
                  <span className={`text-3xl font-black tabular-nums ${phase === "running" ? "text-slate-900" : "text-slate-400"}`}>
                    {mm}:{ss}
                  </span>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="px-5 pb-5 space-y-3">
              {phase === "idle" && (
                <>
                  <div className="flex gap-2">
                    {PRESETS.map((m) => (
                      <button
                        key={m}
                        onClick={() => start(m)}
                        className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                      >
                        {m} min
                      </button>
                    ))}
                  </div>
                  {tasks.length > 0 && (
                    <select
                      value={attachedTask}
                      onChange={(e) => setAttachedTask(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:border-amber-400"
                    >
                      <option value="">Attach to a mission (optional)</option>
                      {tasks.map((t) => (
                        <option key={t.id} value={t.id}>{t.text}</option>
                      ))}
                    </select>
                  )}
                </>
              )}

              {(phase === "running" || phase === "paused") && (
                <div className="flex gap-2">
                  <button
                    onClick={togglePause}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                  >
                    {phase === "running" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {phase === "running" ? "Pause" : "Resume"}
                  </button>
                  <button
                    onClick={reset}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl transition-all"
                    title="Cancel session"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {phase === "done" && (
                <button
                  onClick={reset}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  New Session
                </button>
              )}

              <p className="text-[10px] text-slate-400 font-medium text-center leading-relaxed">
                {phase === "idle"
                  ? `Finish a session to earn 🪙 coins${attachedTask ? " for the attached mission" : ""}.`
                  : phase === "done"
                  ? "Nice deep work — coins are in your balance."
                  : "Stay in this tab — coins credit when the timer completes."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
