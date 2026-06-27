"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Save, Calendar, Loader2, Trash2, Search, X,
  Sparkles, ChevronDown, ChevronUp, Edit3, Flame, TrendingUp,
  Hash, BarChart2, Clock, CheckCircle2, Lock, Unlock, ShieldCheck,
} from "lucide-react";
import {
  format, parseISO, differenceInDays, isToday,
  startOfMonth, endOfMonth, eachDayOfInterval,
} from "date-fns";
import { apiFetch } from "@/lib/backend";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mood = "rough" | "meh" | "okay" | "good" | "fire";
type EntryType = "general" | "thought" | "summary" | "issue";

interface RawEntry { id: string; date: string; content: string; entryType?: EntryType; isPrivate?: boolean }
interface ParsedEntry extends RawEntry { text: string; mood?: Mood; tags: string[] }

const ENTRY_TYPES: { id: EntryType; emoji: string; label: string; color: string; active: string }[] = [
  { id: "general",  emoji: "✏️",  label: "General",  color: "text-slate-600",  active: "bg-slate-100 border-slate-400 text-slate-700" },
  { id: "thought",  emoji: "💭",  label: "Thought",  color: "text-violet-600", active: "bg-violet-100 border-violet-400 text-violet-700" },
  { id: "summary",  emoji: "📋",  label: "Summary",  color: "text-blue-600",   active: "bg-blue-100 border-blue-400 text-blue-700" },
  { id: "issue",    emoji: "⚔️",  label: "Issue",    color: "text-rose-600",   active: "bg-rose-100 border-rose-400 text-rose-700" },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const MOODS: { id: Mood; emoji: string; label: string; active: string; inactive: string; bar: string }[] = [
  { id: "rough", emoji: "😔", label: "Rough",   active: "bg-slate-200 border-slate-400 text-slate-700",       inactive: "border-slate-200 text-slate-400 hover:border-slate-300",   bar: "bg-slate-400" },
  { id: "meh",   emoji: "😐", label: "Meh",     active: "bg-yellow-100 border-yellow-400 text-yellow-700",    inactive: "border-slate-200 text-slate-400 hover:border-yellow-300",  bar: "bg-yellow-400" },
  { id: "okay",  emoji: "🙂", label: "Okay",    active: "bg-blue-100 border-blue-400 text-blue-700",          inactive: "border-slate-200 text-slate-400 hover:border-blue-300",    bar: "bg-blue-400" },
  { id: "good",  emoji: "😊", label: "Good",    active: "bg-emerald-100 border-emerald-400 text-emerald-700", inactive: "border-slate-200 text-slate-400 hover:border-emerald-300", bar: "bg-emerald-400" },
  { id: "fire",  emoji: "🔥", label: "On Fire", active: "bg-orange-100 border-orange-400 text-orange-700",    inactive: "border-slate-200 text-slate-400 hover:border-orange-300",  bar: "bg-orange-400" },
];

const FALLBACK_TAGS = ["Learning", "Win 🎉", "Setback", "DSA", "Job Hunt", "Reflection", "Breakthrough", "Stuck"];
const FALLBACK_PROMPTS = [
  "What was the hardest thing you worked on today — and what did you actually learn from it?",
  "What are you proud of today, even if it feels small?",
  "What concept finally clicked? Explain it like you're teaching a friend.",
  "Where did you feel most stuck? What's your plan to unblock tomorrow?",
  "Rate your focus today 1–10. What would make tomorrow a 10?",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function encode(text: string, mood?: Mood, tags?: string[]): string {
  if (!mood && !tags?.length) return text;
  return JSON.stringify({ _v: 1, mood, tags: tags ?? [], text });
}

function decode(raw: string): { text: string; mood?: Mood; tags: string[] } {
  try {
    const p = JSON.parse(raw);
    if (p?._v === 1) return { text: p.text ?? "", mood: p.mood, tags: p.tags ?? [] };
  } catch {}
  return { text: raw, tags: [] };
}

function wordCount(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

function computeStreak(entries: RawEntry[]): number {
  if (!entries.length) return 0;
  const dates = [...new Set(entries.map(e => e.date))].sort().reverse();
  let streak = 0;
  let cursor = new Date();
  for (const d of dates) {
    const diff = differenceInDays(cursor, parseISO(d));
    if (diff > 1) break;
    streak++;
    cursor = parseISO(d);
  }
  return streak;
}

// ─── EntryCard ────────────────────────────────────────────────────────────────

function EntryCard({
  entry, onDelete, onEdit, availableTags,
}: {
  entry: ParsedEntry;
  onDelete: (id: string) => void;
  onEdit: (id: string, encoded: string) => Promise<void>;
  availableTags: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(entry.text);
  const [editMood, setEditMood] = useState<Mood | undefined>(entry.mood);
  const [editTags, setEditTags] = useState<string[]>(entry.tags);
  const [saving, setSaving] = useState(false);
  const [reflecting, setReflecting] = useState(false);
  const [reflection, setReflection] = useState<string | null>(null);

  const moodMeta = entry.mood ? MOODS.find(m => m.id === entry.mood) : null;
  const wc = wordCount(entry.text);

  async function saveEdit() {
    setSaving(true);
    try {
      await onEdit(entry.id, encode(editText, editMood, editTags));
      setEditing(false);
    } finally { setSaving(false); }
  }

  async function getReflection() {
    setReflecting(true);
    try {
      const res = await fetch("/api/ai/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: entry.text, mood: entry.mood }),
      });
      const data = await res.json();
      if (data.success) setReflection(data.reflection);
    } finally { setReflecting(false); }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="glass-panel rounded-2xl p-5 group"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {moodMeta && <span className="text-base leading-none">{moodMeta.emoji}</span>}
          <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
          <span className="text-sm font-black text-slate-700">
            {format(parseISO(entry.date), "EEEE, MMM d")}
          </span>
          <span className="text-[10px] font-bold text-slate-400">{wc}w</span>
          {entry.tags.map(t => (
            <span key={t} className="text-[9px] font-black bg-rose-50 text-rose-500 border border-rose-100 px-1.5 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => { setEditing(true); setExpanded(true); }}
            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      {editing ? (
        <div className="space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {MOODS.map(m => (
              <button
                key={m.id}
                onClick={() => setEditMood(v => v === m.id ? undefined : m.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${editMood === m.id ? m.active : `bg-white ${m.inactive}`}`}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {availableTags.map(t => (
              <button
                key={t}
                onClick={() => setEditTags(v => v.includes(t) ? v.filter(x => x !== t) : [...v, t])}
                className={`text-xs font-black px-2 py-0.5 rounded-full border transition-all ${editTags.includes(t) ? "bg-rose-100 border-rose-300 text-rose-700" : "bg-slate-50 border-slate-200 text-slate-500 hover:border-rose-200"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <textarea
            value={editText}
            onChange={e => setEditText(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-rose-400 resize-none min-h-[120px] font-medium"
          />
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors border border-slate-200">
              Cancel
            </button>
            <button onClick={saveEdit} disabled={saving} className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black transition-colors shadow-md shadow-rose-500/20 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className={`text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-wrap ${!expanded ? "line-clamp-3" : ""}`}>
            {entry.text}
          </p>
          <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
            {wc > 40 && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors"
              >
                {expanded ? <><ChevronUp className="w-3 h-3" /> Collapse</> : <><ChevronDown className="w-3 h-3" /> Read more</>}
              </button>
            )}
            {expanded && !reflection && (
              <button
                onClick={getReflection}
                disabled={reflecting}
                className="flex items-center gap-1.5 text-xs font-black text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg border border-violet-200 transition-colors disabled:opacity-50 ml-auto"
              >
                {reflecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {reflecting ? "Reflecting…" : "AI Reflect"}
              </button>
            )}
          </div>
          <AnimatePresence>
            {reflection && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 bg-violet-50 border border-violet-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-violet-500" />
                    <span className="text-[10px] font-black text-violet-500 uppercase tracking-wider">AI Reflection</span>
                  </div>
                  <button onClick={() => setReflection(null)} className="text-violet-300 hover:text-violet-500 p-0.5 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-violet-800 font-medium leading-relaxed italic">"{reflection}"</p>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function JournalPage() {
  const [entries, setEntries] = useState<ParsedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PER_PAGE = 30;

  // Settings from DB
  const [quickTags, setQuickTags] = useState<string[]>(FALLBACK_TAGS);
  const [prompts, setPrompts] = useState<string[]>(FALLBACK_PROMPTS);

  useEffect(() => {
    fetch("/api/settings/journal_tags").then(r => r.json()).then(d => { if (d.value?.length) setQuickTags(d.value); }).catch(() => {});
    fetch("/api/settings/journal_prompts").then(r => r.json()).then(d => { if (d.value?.length) setPrompts(d.value); }).catch(() => {});
  }, []);

  // Editor
  const [text, setText] = useState("");
  const [mood, setMood] = useState<Mood | undefined>(undefined);
  const [tags, setTags] = useState<string[]>([]);
  const [entryType, setEntryType] = useState<EntryType>("general");
  const [isPrivate, setIsPrivate] = useState(false);
  const [editingTodayId, setEditingTodayId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptIdx] = useState(() => Math.floor(Math.random() * FALLBACK_PROMPTS.length));
  const [reflecting, setReflecting] = useState(false);
  const [todayReflection, setTodayReflection] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [coinToast, setCoinToast] = useState<{ coins: number; happyHour: boolean } | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [moodFilter, setMoodFilter] = useState<Mood | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");
  const wc = wordCount(text);
  const readTime = Math.max(1, Math.round(wc / 200));

  useEffect(() => { loadEntries(); }, [page]);

  useEffect(() => {
    const todayEntry = entries.find(e => e.date === today);
    if (todayEntry) {
      setText(todayEntry.text);
      setMood(todayEntry.mood);
      setTags(todayEntry.tags);
      setEditingTodayId(todayEntry.id);
    } else {
      setText(""); setMood(undefined); setTags([]); setEditingTodayId(null);
    }
  }, [entries, today]);

  async function loadEntries() {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/journal?page=${page}&per_page=${PER_PAGE}`);
      const data = await res.json();
      const raw: RawEntry[] = data.entries ?? [];
      setEntries(raw.map(e => ({ ...e, ...decode(e.content) })));
      setTotal(data.total ?? 0);
    } finally { setLoading(false); }
  }

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const encoded = encode(text, mood, tags);
      if (editingTodayId) {
        await apiFetch(`/api/journal/${editingTodayId}`, {
          method: "PATCH",
          body: JSON.stringify({ content: encoded, entryType, isPrivate }),
        });
      } else {
        const res = await apiFetch("/api/journal", {
          method: "POST",
          body: JSON.stringify({ date: today, content: encoded, entryType, isPrivate }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.coinsAwarded > 0) {
            setCoinToast({ coins: data.coinsAwarded, happyHour: data.happyHour });
            setTimeout(() => setCoinToast(null), 4000);
          }
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setTodayReflection(null);
      await loadEntries();
    } finally { setSaving(false); }
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this entry?")) return;
    const res = await apiFetch(`/api/journal/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEntries(prev => prev.filter(e => e.id !== id));
      setTotal(t => t - 1);
    }
  }

  async function editEntry(id: string, encoded: string) {
    await apiFetch(`/api/journal/${id}`, { method: "PATCH", body: JSON.stringify({ content: encoded }) });
    const decoded = decode(encoded);
    setEntries(prev => prev.map(e => e.id === id ? { ...e, content: encoded, ...decoded } : e));
  }

  async function getTodayReflection() {
    if (!text.trim()) return;
    setReflecting(true);
    try {
      const res = await fetch("/api/ai/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, mood }),
      });
      const data = await res.json();
      if (data.success) setTodayReflection(data.reflection);
    } finally { setReflecting(false); }
  }

  // Stats
  const streak = computeStreak(entries);
  const totalWords = entries.reduce((s, e) => s + wordCount(e.text), 0);
  const avgWords = entries.length ? Math.round(totalWords / entries.length) : 0;

  // Monthly heatmap
  const now = new Date();
  const monthDays = eachDayOfInterval({ start: startOfMonth(now), end: endOfMonth(now) });
  const entryDates = new Set(entries.map(e => e.date));
  const firstDayOffset = startOfMonth(now).getDay();

  // Filtered past entries
  const pastEntries = entries
    .filter(e => e.date !== today)
    .filter(e => !search || e.text.toLowerCase().includes(search.toLowerCase()) || e.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))
    .filter(e => !tagFilter || e.tags.includes(tagFilter))
    .filter(e => !moodFilter || e.mood === moodFilter);

  const totalPages = Math.ceil(total / PER_PAGE);
  const allTags = [...new Set(entries.flatMap(e => e.tags))];
  const moodCounts = MOODS.map(m => ({ ...m, count: entries.filter(e => e.mood === m.id).length }));
  const hasMoodData = moodCounts.some(m => m.count > 0);

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-rose-100 rounded-xl border border-rose-200 shadow-inner">
          <BookOpen className="w-8 h-8 text-rose-500" />
        </div>
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900">Journal</h1>
          <p className="text-slate-500 font-medium">Your honest record of the journey</p>
        </div>
      </div>

      {/* Privacy notice */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl mb-6 text-xs font-medium text-slate-500">
        <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
        <span>🔒 <span className="font-bold text-slate-600">Private entries are end-to-end yours</span> — admins cannot read entries marked private, even in impersonation mode.</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Entries", value: total,                         icon: BookOpen,    color: "text-rose-500",    bg: "bg-rose-50 border-rose-200" },
          { label: "Streak",        value: `${streak}d`,                  icon: Flame,       color: "text-orange-500",  bg: "bg-orange-50 border-orange-200" },
          { label: "Avg Words",     value: avgWords,                      icon: BarChart2,   color: "text-blue-500",    bg: "bg-blue-50 border-blue-200" },
          { label: "Total Words",   value: totalWords.toLocaleString(),   icon: TrendingUp,  color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`glass-panel rounded-2xl p-4 border ${bg}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Main layout: editor + sidebar */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">

        {/* Editor — 2 cols */}
        <div className="md:col-span-2 glass-panel rounded-2xl p-6 border-l-4 border-rose-400">
          {/* Date bar */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-500" />
              <span className="text-sm font-black text-slate-700">{format(now, "EEEE, MMMM d, yyyy")}</span>
              {editingTodayId && (
                <span className="text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">Updating</span>
              )}
            </div>
            <button
              onClick={() => setShowPrompt(v => !v)}
              className="flex items-center gap-1.5 text-xs font-black text-violet-600 bg-violet-50 hover:bg-violet-100 px-2.5 py-1.5 rounded-lg border border-violet-200 transition-colors"
            >
              <Hash className="w-3 h-3" /> Prompt
            </button>
          </div>

          {/* Writing prompt */}
          <AnimatePresence>
            {showPrompt && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                  <p className="text-sm text-violet-700 font-semibold italic flex-1">"{prompts[promptIdx % Math.max(prompts.length, 1)]}"</p>
                  <button
                    onClick={() => { setText(t => t || prompts[promptIdx % Math.max(prompts.length, 1)] + "\n\n"); setShowPrompt(false); }}
                    className="text-[10px] font-black text-violet-600 bg-white px-2 py-1 rounded-lg border border-violet-200 shrink-0 hover:bg-violet-50 transition-colors"
                  >
                    Use
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Entry type selector */}
          <div className="mb-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Entry type</p>
            <div className="flex gap-1.5 flex-wrap">
              {ENTRY_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setEntryType(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    entryType === t.id ? t.active : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                  }`}
                >
                  <span>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mood selector */}
          <div className="mb-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">How are you feeling?</p>
            <div className="flex gap-2 flex-wrap">
              {MOODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMood(v => v === m.id ? undefined : m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${mood === m.id ? m.active : `bg-white ${m.inactive}`}`}
                >
                  <span>{m.emoji}</span> {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick tags */}
          <div className="mb-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Tag this entry</p>
            <div className="flex gap-1.5 flex-wrap">
              {quickTags.map(t => (
                <button
                  key={t}
                  onClick={() => setTags(v => v.includes(t) ? v.filter(x => x !== t) : [...v, t])}
                  className={`text-xs font-black px-2.5 py-1 rounded-full border transition-all ${tags.includes(t) ? "bg-rose-100 border-rose-300 text-rose-700" : "bg-slate-50 border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-500"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="What did you work on today? What clicked? What's still fuzzy? Write freely — no one's grading this…"
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all text-sm font-medium resize-none min-h-[200px]"
          />

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
            <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
              <span>{wc} words</span>
              {wc > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {readTime} min read
                </span>
              )}
            </div>
            <div className="flex gap-2 items-center">
              {/* Private toggle */}
              <button
                onClick={() => setIsPrivate(v => !v)}
                title={isPrivate ? "Private — only you can see this" : "Public — mark as private to hide from admin"}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-black text-xs border transition-all ${
                  isPrivate
                    ? "bg-rose-50 border-rose-300 text-rose-600"
                    : "bg-white border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-400"
                }`}
              >
                {isPrivate ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                {isPrivate ? "Private" : "Private?"}
              </button>

              {text.trim() && (
                <button
                  onClick={getTodayReflection}
                  disabled={reflecting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-violet-50 hover:bg-violet-100 text-violet-600 rounded-full font-black text-xs border border-violet-200 transition-all disabled:opacity-50"
                >
                  {reflecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {reflecting ? "Reflecting…" : "AI Reflect"}
                </button>
              )}
              <button
                onClick={save}
                disabled={saving || !text.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-full font-bold shadow-lg transition-all disabled:opacity-50 text-sm text-white bg-rose-500 hover:bg-rose-600 shadow-rose-500/30"
              >
                {saved ? <CheckCircle2 className="w-4 h-4" /> : saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saved ? "Saved!" : saving ? "Saving…" : editingTodayId ? "Update" : "Save"}
              </button>
            </div>
          </div>

          {/* AI reflection for today */}
          <AnimatePresence>
            {todayReflection && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 bg-violet-50 border border-violet-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                    <span className="text-[10px] font-black text-violet-500 uppercase tracking-wider">AI Reflection</span>
                  </div>
                  <button onClick={() => setTodayReflection(null)} className="text-violet-300 hover:text-violet-500 p-0.5 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-sm text-violet-800 font-medium leading-relaxed italic">"{todayReflection}"</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Monthly heatmap */}
          <div className="glass-panel rounded-2xl p-5">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">{format(now, "MMMM yyyy")}</p>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <span key={i} className="text-[8px] font-black text-slate-300 text-center">{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOffset }).map((_, i) => <div key={`pad-${i}`} />)}
              {monthDays.map(day => {
                const ds = format(day, "yyyy-MM-dd");
                const has = entryDates.has(ds);
                const isT = isToday(day);
                return (
                  <div
                    key={ds}
                    title={has ? `Entry on ${format(day, "MMM d")}` : format(day, "MMM d")}
                    className={`aspect-square rounded flex items-center justify-center text-[8px] font-black transition-all cursor-default
                      ${isT ? "ring-2 ring-rose-400 ring-offset-1" : ""}
                      ${has ? "bg-rose-400 text-white" : "bg-slate-100 text-slate-400"}`}
                  >
                    {format(day, "d")}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-rose-400" />
                <span className="text-[9px] font-bold text-slate-400">Entry</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-slate-100 ring-1 ring-rose-400" />
                <span className="text-[9px] font-bold text-slate-400">Today</span>
              </div>
            </div>
          </div>

          {/* Mood distribution */}
          {hasMoodData && (
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Mood History</p>
              <div className="space-y-2.5">
                {moodCounts.filter(m => m.count > 0).map(m => {
                  const pct = Math.round((m.count / entries.filter(e => e.mood).length) * 100);
                  return (
                    <div key={m.id} className="flex items-center gap-2">
                      <span className="text-sm w-5 shrink-0">{m.emoji}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`h-2 rounded-full ${m.bar}`}
                        />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 w-5 text-right shrink-0">{m.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Best streak tip */}
          <div className="glass-panel rounded-2xl p-5 bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-100">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Streak: {streak} day{streak !== 1 ? "s" : ""}</span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              {streak === 0
                ? "Write your first entry today to start your streak."
                : streak < 5
                ? "Keep writing daily — consistency compounds faster than you think."
                : streak < 14
                ? "You're building a real habit. The compound effect is already working."
                : "Exceptional. This kind of discipline is exactly what separates good engineers from great ones."}
            </p>
          </div>
        </div>
      </div>

      {/* Past entries section */}
      <div>
        {/* Filters row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            Past Entries
            {pastEntries.length !== entries.filter(e => e.date !== today).length && (
              <span className="text-rose-500 font-black">{pastEntries.length} of {entries.filter(e => e.date !== today).length}</span>
            )}
          </h3>
          <div className="flex gap-2 flex-wrap items-center">
            <div className="glass-panel flex items-center gap-2 px-3 py-1.5 rounded-full">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search entries…"
                className="bg-transparent border-none outline-none text-xs text-slate-700 font-medium placeholder-slate-400 w-32"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-slate-300 hover:text-slate-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex gap-1">
              {MOODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMoodFilter(v => v === m.id ? null : m.id)}
                  title={m.label}
                  className={`w-7 h-7 rounded-full border text-sm flex items-center justify-center transition-all ${moodFilter === m.id ? "border-rose-400 bg-rose-50 scale-110 shadow-sm" : "border-slate-200 bg-white hover:border-rose-200"}`}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-5">
            {allTags.map(t => (
              <button
                key={t}
                onClick={() => setTagFilter(v => v === t ? null : t)}
                className={`text-xs font-black px-2.5 py-1 rounded-full border transition-all ${tagFilter === t ? "bg-rose-100 border-rose-300 text-rose-700" : "bg-slate-50 border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-500"}`}
              >
                {t}
              </button>
            ))}
            {(tagFilter || moodFilter || search) && (
              <button
                onClick={() => { setTagFilter(null); setMoodFilter(null); setSearch(""); }}
                className="text-xs font-black px-2.5 py-1 rounded-full border bg-slate-100 border-slate-300 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center gap-1"
              >
                <X className="w-2.5 h-2.5" /> Clear filters
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-rose-400 animate-spin" /></div>
        ) : pastEntries.length === 0 ? (
          <div className="glass-panel rounded-2xl p-10 text-center">
            <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-bold text-sm">
              {search || tagFilter || moodFilter ? "No entries match your filters." : "No past entries yet. Start writing!"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {pastEntries.map(entry => (
                <EntryCard key={entry.id} entry={entry} onDelete={deleteEntry} onEdit={editEntry} availableTags={quickTags} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-7">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page === 1}
              className="px-4 py-2 rounded-full border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              ← Prev
            </button>
            <span className="text-sm font-bold text-slate-600">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-full border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Coin reward toast */}
      <AnimatePresence>
        {coinToast && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[200] bg-slate-900 text-white rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-3 max-w-xs"
          >
            <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center shrink-0 text-lg">📖</div>
            <div>
              <p className="font-black text-sm">Journal saved!</p>
              <p className="text-xs text-slate-300 font-medium">
                +{coinToast.coins} coins{coinToast.happyHour ? " · ⚡ 2x Happy Hour" : ""}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
