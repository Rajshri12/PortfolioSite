"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ChevronDown, Send } from "lucide-react";
import { apiFetch } from "@/lib/backend";
import { coinEvents } from "@/lib/celebrate";

export default function WinOfTheDay({ dateStr }: { dateStr: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existing, setExisting] = useState<string | null>(null);

  // Check if today's summary entry already exists
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/journal?page=1&limit=1`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.entries) return;
        const today = d.entries.find(
          (e: { date: string; entryType: string }) => e.date === dateStr && e.entryType === "summary"
        );
        if (today) {
          setExisting(today.content);
          setSaved(true);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [dateStr]);

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/journal", {
        method: "POST",
        body: JSON.stringify({
          date: dateStr,
          content: text.trim(),
          entryType: "summary",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaved(true);
        setExisting(text.trim());
        if (data.coinsAwarded > 0) {
          coinEvents.award({ amount: data.coinsAwarded });
        }
      }
    } catch {}
    finally { setSaving(false); }
  }

  return (
    <div className="glass-panel bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-slate-50/50 transition-colors"
      >
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
          saved ? "bg-emerald-100" : "bg-violet-100"
        }`}>
          <Trophy className={`w-5 h-5 ${saved ? "text-emerald-600" : "text-violet-600"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Win of the Day</p>
          <p className="text-sm font-black text-slate-900 truncate">
            {saved ? "Logged — nice work! 🎉" : "What went well today?"}
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && !saved && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-3">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="One small win, one big lesson…"
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 placeholder:text-slate-300 outline-none focus:border-violet-400 resize-none"
              />
              <button
                onClick={save}
                disabled={!text.trim() || saving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                {saving ? "Saving…" : "Log my win"}
              </button>
              <p className="text-[10px] text-slate-400 font-medium text-center">
                Saves to your journal as a daily summary — earns 🪙 coins.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {saved && existing && (
        <div className="px-5 pb-5">
          <p className="text-sm font-medium text-slate-600 italic leading-relaxed">&ldquo;{existing}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
