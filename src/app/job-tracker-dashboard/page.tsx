"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Briefcase,
  ArrowRight,
  Calendar as CalendarIcon,
  Zap,
  ExternalLink,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Target,
  Clock,
  Settings,
  X,
  ChevronDown,
  Flame,
  BookOpen,
  Sparkles,
  TrendingUp,
  Star,
  Activity,
  Gift,
} from "lucide-react";
import Link from "next/link";
import {
  format,
  addDays,
  startOfWeek,
  isSameDay,
  isToday,
  getDay,
  subDays,
  differenceInDays,
  startOfWeek as startOfWeekFn,
} from "date-fns";
import { useTasks, Task } from "@/context/TaskContext";

const FALLBACK_QUOTE = { text: "Begin. The universe rewards motion.", author: "The Path" };
const FALLBACK_NORTH_STAR = `Dear Rajshri,\n\nYou started this because you believed you could become more. That belief was correct.\n\nKeep going.`;
const JOURNEY_START_FALLBACK = new Date("2025-01-01");

interface UserState {
  coins: number;
  level: number;
  coinsPerLevel: number;
  streak: number;
  jokerTokens: number;
  currentMood: "hard" | "okay" | "easy" | null;
  weeklyStake: { active: boolean; weekStartDate: string } | null;
  applicationUnlocked: boolean;
  role: "admin" | "user";
  impersonating: string | null;
  journeyStartDate?: string;
}

export default function DailyTracker() {
  const { tasks, setTasks, refreshTasks: fetchTasks } = useTasks();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[] | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [greeting, setGreeting] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [jobStats, setJobStats] = useState({ total: 0, applied: 0, interviews: 0, offers: 0 });
  const [dailyQuote, setDailyQuote] = useState<{ text: string; author: string }>(FALLBACK_QUOTE);
  const [northStarText, setNorthStarText] = useState(FALLBACK_NORTH_STAR);
  const [userState, setUserState] = useState<UserState | null>(null);
  const [moodSubmitting, setMoodSubmitting] = useState(false);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/me");
      if (res.ok) setUserState(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    setIsMounted(true);
    fetchTasks();
    fetchJobStats();
    fetchAiInsight();
    fetchMe();

    fetch("/api/settings/daily_quotes")
      .then((r) => r.json())
      .then((d) => {
        if (d.value?.length) {
          const quotes = d.value;
          setDailyQuote(quotes[new Date().getDate() % quotes.length]);
        }
      })
      .catch(() => {});

    fetch("/api/settings/northstar_text")
      .then((r) => r.json())
      .then((d) => {
        if (d.value) setNorthStarText(d.value);
      })
      .catch(() => {});

    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

    const updateClock = () => setCurrentTime(format(new Date(), "h:mm a"));
    updateClock();
    const clockInterval = setInterval(updateClock, 60000);
    return () => clearInterval(clockInterval);
  }, [fetchMe]);

  const fetchAiInsight = async () => {
    setInsightLoading(true);
    try {
      const res = await fetch("/api/ai/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "insight" }),
      });
      const data = await res.json();
      if (data.success) setAiInsight(data.insight);
    } catch {}
    finally { setInsightLoading(false); }
  };

  const fetchAiSuggestions = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "suggestions" }),
      });
      const data = await res.json();
      if (data.success) setAiSuggestions(data.suggestions);
    } catch {}
    finally { setAiLoading(false); }
  };

  const fetchJobStats = async () => {
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      if (data.success) {
        const jobs = data.data;
        setJobStats({
          total: jobs.length,
          applied: jobs.filter((j: any) => j.status !== "new").length,
          interviews: jobs.filter((j: any) =>
            ["phone_screen", "interview", "final_round"].includes(j.status)
          ).length,
          offers: jobs.filter((j: any) => j.status === "offer").length,
        });
      }
    } catch {}
  };

  const acceptAiSuggestion = async (suggestion: any) => {
    const taskData = {
      ...suggestion,
      recurrence: { type: "none", days: [] },
      date: format(selectedDate, "yyyy-MM-dd"),
      completedDates: [],
    };
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
      const data = await res.json();
      if (data.success) {
        setTasks((prev) => [data.data, ...prev]);
        setAiSuggestions((prev) =>
          prev ? prev.filter((s) => s.text !== suggestion.text) : null
        );
      }
    } catch {}
  };

  const rejectAiSuggestion = (text: string) => {
    setAiSuggestions((prev) => (prev ? prev.filter((s) => s.text !== text) : null));
  };

  const toggleTask = async (taskId: string, dateStr: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const isCompleted = task.completedDates?.includes(dateStr);
    const newCompletedDates = isCompleted
      ? task.completedDates.filter((d) => d !== dateStr)
      : [...(task.completedDates || []), dateStr];

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completedDates: newCompletedDates } : t))
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedDates: newCompletedDates }),
      });
      const data = await res.json();
      if (!data.success) fetchTasks();
      else if (data.coinsAwarded) fetchMe();
    } catch {
      fetchTasks();
    }
  };

  const deleteTask = async (id: string, option: "one" | "following" | "all" = "all") => {
    setDeletingTask(null);
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const dStr = format(selectedDate, "yyyy-MM-dd");

    if (option === "all") {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      try {
        const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!data.success) fetchTasks();
      } catch { fetchTasks(); }
    } else if (option === "one") {
      const newExcluded = [...(task.excludedDates || []), dStr];
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, excludedDates: newExcluded } : t)));
      try {
        const res = await fetch(`/api/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ excludedDates: newExcluded }),
        });
        const data = await res.json();
        if (!data.success) fetchTasks();
      } catch { fetchTasks(); }
    } else if (option === "following") {
      const yesterday = format(subDays(selectedDate, 1), "yyyy-MM-dd");
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, endDate: yesterday } : t)));
      try {
        const res = await fetch(`/api/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endDate: yesterday }),
        });
        const data = await res.json();
        if (!data.success) fetchTasks();
      } catch { fetchTasks(); }
    }
  };

  const setMood = async (mood: "hard" | "okay" | "easy") => {
    if (moodSubmitting) return;
    setMoodSubmitting(true);
    try {
      const res = await fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood }),
      });
      if (res.ok) setUserState((prev) => (prev ? { ...prev, currentMood: mood } : prev));
    } catch {}
    finally { setMoodSubmitting(false); }
  };

  const isTaskVisibleOnDate = (task: Task, date: Date) => {
    const dStr = format(date, "yyyy-MM-dd");
    if (task.endDate && dStr > task.endDate) return false;
    if (task.excludedDates?.includes(dStr)) return false;
    if (task.recurrence.type === "none") return task.date === dStr;
    if (task.recurrence.type === "daily") return true;
    if (task.recurrence.type === "weekly") return task.recurrence.days.includes(getDay(date));
    return false;
  };

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const filteredTasks = tasks.filter((t) => isTaskVisibleOnDate(t, selectedDate));
  const learningTasks = filteredTasks.filter((t) => t.category === "learning");
  const jobSearchTasks = filteredTasks.filter((t) => t.category === "job-search");
  const selfCareTasks = filteredTasks.filter((t) => t.category === "self-care");

  const getCompletion = (taskList: Task[]) => {
    if (taskList.length === 0) return 0;
    return Math.round(
      (taskList.filter((t) => t.completedDates?.includes(dateStr)).length / taskList.length) * 100
    );
  };

  const learningProgress = getCompletion(learningTasks);
  const jobSearchProgress = getCompletion(jobSearchTasks);
  const selfCareProgress = getCompletion(selfCareTasks);
  const todayTotalTasks = filteredTasks.length;
  const todayDoneTasks = filteredTasks.filter((t) => t.completedDates?.includes(dateStr)).length;
  const todayOverallPct =
    todayTotalTasks > 0 ? Math.round((todayDoneTasks / todayTotalTasks) * 100) : 0;
  const allDoneToday =
    todayTotalTasks > 0 && todayDoneTasks === todayTotalTasks && isToday(selectedDate);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Weekly chest — days this week with all tasks done
  const thisWeekStart = startOfWeekFn(new Date(), { weekStartsOn: 1 });
  const thisWeekDays = Array.from({ length: 7 }, (_, i) => addDays(thisWeekStart, i));
  const weeklyDoneCount = thisWeekDays.filter((day) => {
    const dStr2 = format(day, "yyyy-MM-dd");
    const dayTasks = tasks.filter((t) => isTaskVisibleOnDate(t, day));
    return dayTasks.length > 0 && dayTasks.every((t) => t.completedDates?.includes(dStr2));
  }).length;
  const chestEarned = weeklyDoneCount >= 5;

  // Next reward milestone
  const streak = userState?.streak ?? 0;
  const milestones = [
    { days: 14, coins: 100, label: "14-day streak" },
    { days: 30, coins: 500, label: "30-day streak" },
    { days: 60, coins: 1500, label: "60-day streak" },
  ];
  const nextMilestone = milestones.find((m) => m.days > streak) ?? milestones[milestones.length - 1];
  const daysToNextMilestone = Math.max(0, nextMilestone.days - streak);

  const journeyStart = userState?.journeyStartDate ? new Date(userState.journeyStartDate) : JOURNEY_START_FALLBACK;
  const dayNum = differenceInDays(new Date(), journeyStart) + 1;

  if (!isMounted) return null;

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-7xl mx-auto space-y-10" suppressHydrationWarning>

      {/* Hero Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <p className="text-blue-600 font-bold tracking-[0.2em] uppercase text-[10px]">Mission Control</p>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
            {greeting},{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Visionary
            </span>
          </h1>
          <div className="flex items-center gap-4 text-slate-400 font-bold text-sm uppercase">
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4" /> {format(selectedDate, "MMM do")}
            </span>
            <span className="w-1 h-1 bg-slate-200 rounded-full" />
            {currentTime && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> {currentTime}
              </span>
            )}
            <span className="w-1 h-1 bg-slate-200 rounded-full" />
            <span className="text-blue-500 font-black">Day {dayNum}</span>
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-[2rem] font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2 shadow-xl shrink-0"
        >
          <Plus className="w-5 h-5" /> New Mission
        </motion.button>
      </header>

      {/* Daily Quote + Mood row */}
      <div className="flex flex-col md:flex-row gap-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-1 items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-[2rem]"
        >
          <span className="text-xl shrink-0">✨</span>
          <p className="text-sm font-bold text-slate-600 italic flex-1">"{dailyQuote.text}"</p>
          <span className="text-[10px] font-black text-blue-400 shrink-0">— {dailyQuote.author}</span>
        </motion.div>

        {/* Mood Picker */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel bg-white rounded-[2rem] px-5 py-4 border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0"
        >
          <div className="shrink-0">
            <p className="text-sm font-black text-slate-900">How are you feeling today?</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Your mood is private. After 3 hard days in a row, a check-in alert is sent.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {(
              [
                { mood: "hard" as const, emoji: "😤", label: "Hard", color: "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600", activeColor: "bg-rose-500 border-rose-500 text-white" },
                { mood: "okay" as const, emoji: "😐", label: "Okay", color: "bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-600", activeColor: "bg-amber-500 border-amber-500 text-white" },
                { mood: "easy" as const, emoji: "😎", label: "Easy", color: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-600", activeColor: "bg-emerald-500 border-emerald-500 text-white" },
              ] as const
            ).map(({ mood, emoji, label, color, activeColor }) => {
              const active = userState?.currentMood === mood;
              return (
                <button
                  key={mood}
                  onClick={() => setMood(mood)}
                  disabled={moodSubmitting}
                  className={`flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl border-2 font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 ${
                    active ? activeColor : color
                  }`}
                >
                  <span className="text-lg">{emoji}</span>
                  {label}
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* All-done celebration */}
      <AnimatePresence>
        {allDoneToday && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="flex items-center gap-4 px-6 py-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-[2rem] shadow-sm"
          >
            <span className="text-3xl">🎉</span>
            <div className="flex-1">
              <p className="font-black text-emerald-800 text-base">All missions complete for today!</p>
              <p className="text-emerald-600 text-xs font-semibold mt-0.5">
                You showed up and delivered. That's how the right job gets earned.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600 bg-white border border-emerald-200 px-4 py-2 rounded-full text-xs font-black">
              <Flame className="w-3.5 h-3.5 text-orange-500" /> Day complete
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* ── Left Column ── */}
        <div className="lg:col-span-8 space-y-10">

          {/* Week Calendar */}
          <div className="glass-panel bg-white/50 backdrop-blur-xl rounded-[2.5rem] p-4 border-white shadow-sm">
            <div className="flex items-center justify-between p-4 mb-4">
              <h2 className="text-xl font-black text-slate-800">{format(selectedDate, "MMMM yyyy")}</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedDate(subDays(selectedDate, 7))}
                  className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className={`px-6 py-2 rounded-2xl text-xs font-black transition-all ${
                    isToday(selectedDate)
                      ? "bg-slate-50 text-slate-400 cursor-default"
                      : "bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                  className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex justify-between px-2 gap-3">
              {weekDays.map((day, i) => {
                const active = isSameDay(day, selectedDate);
                const current = isToday(day);
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={`flex-1 flex flex-col items-center py-6 rounded-[2rem] transition-all relative ${
                      active
                        ? "bg-slate-900 text-white shadow-2xl scale-105 z-10"
                        : "hover:bg-white text-slate-400"
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase mb-1 opacity-50">{format(day, "EEE")}</span>
                    <span className="text-2xl font-black">{format(day, "d")}</span>
                    {current && !active && (
                      <div className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Task Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {/* Learning */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Learning</h3>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xl font-black text-indigo-600 leading-none">{learningProgress}%</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Today</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${learningProgress}%` }}
                  className="bg-indigo-600 h-full rounded-full"
                />
              </div>
              <div className="space-y-3">
                {learningTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={() => toggleTask(task.id, dateStr)}
                    onEdit={() => setEditingTask(task)}
                    onDelete={() => {
                      if (task.type === "custom") {
                        if (confirm("Delete this mission?")) deleteTask(task.id);
                      } else {
                        setDeletingTask(task);
                      }
                    }}
                    isCompleted={!!task.completedDates?.includes(dateStr)}
                  />
                ))}
                {learningTasks.length === 0 && (
                  <div className="py-10 text-center glass-panel rounded-3xl border-dashed border-2 border-slate-100 opacity-50">
                    <p className="text-xs font-bold text-slate-400 uppercase">No learning tasks</p>
                  </div>
                )}
              </div>
            </div>

            {/* Job Search — only when unlocked */}
            {(userState?.applicationUnlocked || userState?.role === "admin") && <div className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Target className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Job Search</h3>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xl font-black text-emerald-600 leading-none">{jobSearchProgress}%</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Today</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${jobSearchProgress}%` }}
                  className="bg-emerald-600 h-full rounded-full"
                />
              </div>
              <div className="space-y-3">
                {jobSearchTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={() => toggleTask(task.id, dateStr)}
                    onEdit={() => setEditingTask(task)}
                    onDelete={() => {
                      if (task.type === "custom") {
                        if (confirm("Delete this mission?")) deleteTask(task.id);
                      } else {
                        setDeletingTask(task);
                      }
                    }}
                    isCompleted={!!task.completedDates?.includes(dateStr)}
                  />
                ))}
                {jobSearchTasks.length === 0 && (
                  <div className="py-10 text-center glass-panel rounded-3xl border-dashed border-2 border-slate-100 opacity-50">
                    <p className="text-xs font-bold text-slate-400 uppercase">No job search tasks</p>
                  </div>
                )}
              </div>
            </div>}

            {/* Self-Care */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                    <span className="text-lg">🌿</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Self-Care</h3>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xl font-black text-rose-500 leading-none">{selfCareProgress}%</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Today</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${selfCareProgress}%` }}
                  className="bg-rose-400 h-full rounded-full"
                />
              </div>
              <div className="space-y-3">
                {selfCareTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={() => toggleTask(task.id, dateStr)}
                    onEdit={() => setEditingTask(task)}
                    onDelete={() => {
                      if (task.type === "custom") {
                        if (confirm("Delete this habit?")) deleteTask(task.id);
                      } else {
                        setDeletingTask(task);
                      }
                    }}
                    isCompleted={!!task.completedDates?.includes(dateStr)}
                  />
                ))}
                {selfCareTasks.length === 0 && (
                  <div className="py-10 text-center glass-panel rounded-3xl border-dashed border-2 border-rose-50 opacity-60">
                    <p className="text-xs font-bold text-rose-300 uppercase">No self-care habits</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* AI Strategic Briefing */}
          <AnimatePresence mode="wait">
            {(aiInsight || insightLoading) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2.5rem] p-1 border-none shadow-2xl shadow-blue-100 overflow-hidden"
              >
                <div className="bg-white/95 backdrop-blur-md rounded-[2.3rem] p-6 md:p-8 flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200">
                        <Zap className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                        Strategic Insight
                      </h3>
                    </div>
                    {insightLoading ? (
                      <div className="h-6 w-48 bg-slate-100 animate-pulse rounded-md" />
                    ) : (
                      <p className="text-sm font-bold text-slate-500 italic leading-relaxed">
                        "{aiInsight}"
                      </p>
                    )}
                  </div>

                  <div className="w-full h-px bg-slate-100" />

                  <div className="flex items-center gap-3 overflow-hidden w-full">
                    {aiSuggestions ? (
                      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 pt-1">
                        {aiSuggestions.map((suggestion, i) => (
                          <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            key={i}
                            className="group flex shrink-0 items-center gap-4 p-3 pr-4 bg-slate-50 hover:bg-white rounded-2xl border border-transparent hover:border-blue-200 transition-all cursor-default"
                          >
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                suggestion.category === "learning"
                                  ? "bg-indigo-100 text-indigo-600"
                                  : "bg-emerald-100 text-emerald-600"
                              }`}
                            >
                              {suggestion.category === "learning" ? (
                                <BookOpen className="w-4 h-4" />
                              ) : (
                                <Target className="w-4 h-4" />
                              )}
                            </div>
                            <p className="text-[11px] font-black text-slate-700 max-w-[150px] leading-tight">
                              {suggestion.text}
                            </p>
                            <div className="flex gap-1 border-l border-slate-200 pl-3">
                              <button
                                onClick={() => rejectAiSuggestion(suggestion.text)}
                                className="p-1.5 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => acceptAiSuggestion(suggestion)}
                                className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-all"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <button
                        onClick={fetchAiSuggestions}
                        disabled={aiLoading}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 border border-blue-200 shadow-sm disabled:opacity-50 shrink-0"
                      >
                        {aiLoading ? (
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        Get Mission Suggestions
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Right Sidebar ── */}
        <div className="lg:col-span-4 space-y-8">

          {/* Today's Ring */}
          <div className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm flex items-center gap-5">
            <div className="relative w-16 h-16 shrink-0">
              <svg width="64" height="64" className="-rotate-90">
                <circle cx="32" cy="32" r="24" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                <motion.circle
                  cx="32" cy="32" r="24" fill="none"
                  stroke={todayOverallPct === 100 ? "#10b981" : "#3b82f6"}
                  strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={151}
                  initial={{ strokeDashoffset: 151 }}
                  animate={{ strokeDashoffset: 151 - (todayOverallPct / 100) * 151 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-700">
                {todayOverallPct}%
              </span>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800 leading-none">
                {todayDoneTasks}/{todayTotalTasks}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                Tasks done today
              </p>
              {allDoneToday && (
                <p className="text-[10px] font-black text-emerald-500 mt-1">🎉 Day complete!</p>
              )}
            </div>
          </div>

          {/* Next Reward Card */}
          <div className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Gift className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Reward</p>
                <p className="text-base font-black text-slate-900">{nextMilestone.label}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-lg font-black text-amber-600">🪙 {nextMilestone.coins}</p>
                <p className="text-[10px] font-bold text-slate-400">{daysToNextMilestone}d away</p>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (streak / nextMilestone.days) * 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="bg-amber-400 h-full rounded-full"
              />
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {streak > 0
                ? `${streak} day streak — ${daysToNextMilestone} more to unlock 🪙${nextMilestone.coins}.`
                : "Start your streak today to unlock coin rewards!"}
            </p>
          </div>

          {/* Rewards & History Card */}
          <Link
            href="/job-tracker-dashboard/rewards"
            className="glass-panel bg-white rounded-[2.5rem] p-5 border border-slate-100 shadow-sm flex items-center gap-4 hover:border-amber-300 hover:shadow-md transition-all group"
          >
            <div className="w-11 h-11 bg-amber-100 rounded-2xl flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
              🎁
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Coins</p>
              <p className="text-base font-black text-slate-900 flex items-center gap-1.5">
                🪙 {(userState?.coins ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Redeem →</span>
              <span className="text-[10px] font-bold text-slate-400">Badges · History</span>
            </div>
          </Link>

          {/* Weekly Chest */}
          <div
            className={`glass-panel rounded-[2.5rem] p-6 border shadow-sm transition-all ${
              chestEarned
                ? "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200"
                : "bg-white border-slate-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                    chestEarned ? "bg-amber-100" : "bg-slate-100"
                  }`}
                >
                  {chestEarned ? "🎁" : "📦"}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Weekly Chest</p>
                  <p className="text-base font-black text-slate-900">{weeklyDoneCount}/7 days</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-black ${chestEarned ? "text-amber-600" : "text-slate-400"}`}>
                  {chestEarned
                    ? "🪙 150 earned!"
                    : `${Math.max(0, 5 - weeklyDoneCount)} more needed`}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">5/7 days = chest</p>
              </div>
            </div>
            <div className="flex gap-1.5 mt-4">
              {thisWeekDays.map((day, i) => {
                const dStr2 = format(day, "yyyy-MM-dd");
                const dayTasks = tasks.filter((t) => isTaskVisibleOnDate(t, day));
                const done =
                  dayTasks.length > 0 && dayTasks.every((t) => t.completedDates?.includes(dStr2));
                const future = day > new Date();
                return (
                  <div
                    key={i}
                    title={format(day, "EEE")}
                    className={`flex-1 h-2 rounded-full transition-all ${
                      future ? "bg-slate-100" : done ? "bg-emerald-400" : "bg-slate-200"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Activity Heatmap */}
          <HeatMap tasks={tasks} isTaskVisible={isTaskVisibleOnDate} />

          {/* Job Pipeline Snapshot */}
          <div className="glass-panel bg-white rounded-[2.5rem] p-6 border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-black text-slate-900">Job Pipeline</h3>
              <Link
                href="/job-tracker-dashboard/jobs"
                className="text-xs font-black text-blue-600 hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Tracked", value: jobStats.total, color: "text-slate-700", bg: "bg-slate-50", icon: Briefcase },
                { label: "Applied", value: jobStats.applied, color: "text-blue-600", bg: "bg-blue-50", icon: TrendingUp },
                { label: "Interviews", value: jobStats.interviews, color: "text-violet-600", bg: "bg-violet-50", icon: Activity },
                { label: "Offers", value: jobStats.offers, color: "text-emerald-600", bg: "bg-emerald-50", icon: Star },
              ].map(({ label, value, color, bg, icon: Icon }) => (
                <div key={label} className={`${bg} rounded-2xl p-3 flex items-center gap-2`}>
                  <Icon className={`w-4 h-4 ${color} shrink-0`} />
                  <div>
                    <p className={`text-xl font-black leading-none ${color}`}>{value}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* North Star */}
          <NorthStar jobStats={jobStats} northStarText={northStarText} streak={streak} journeyStartDate={userState?.journeyStartDate} />
        </div>
      </div>

      {/* Add Mission Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden"
            >
              <TaskForm
                onClose={() => setIsModalOpen(false)}
                onAdd={(newTask) => {
                  setTasks((prev) => [newTask, ...prev]);
                  fetchTasks();
                }}
                selectedDate={selectedDate}
                jobOrbitUnlocked={!!(userState?.applicationUnlocked || userState?.role === "admin")}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Mission Modal */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingTask(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden"
            >
              <TaskForm
                initialTask={editingTask}
                onClose={() => setEditingTask(null)}
                onAdd={(updatedTask) => {
                  setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
                  fetchTasks();
                }}
                selectedDate={selectedDate}
                jobOrbitUnlocked={!!(userState?.applicationUnlocked || userState?.role === "admin")}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {deletingTask && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingTask(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden p-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Delete Mission?</h3>
                  <p className="text-slate-500 text-sm font-medium">How would you like to handle this series?</p>
                </div>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => deleteTask(deletingTask.id, "one")}
                  className="w-full p-5 bg-slate-50 hover:bg-slate-100 rounded-2xl text-left transition-all border border-transparent hover:border-slate-200 group"
                >
                  <p className="font-black text-slate-900 group-hover:text-blue-600">Only Today</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                    Remove mission from {format(selectedDate, "MMM d")} only
                  </p>
                </button>
                <button
                  onClick={() => deleteTask(deletingTask.id, "following")}
                  className="w-full p-5 bg-slate-50 hover:bg-slate-100 rounded-2xl text-left transition-all border border-transparent hover:border-slate-200 group"
                >
                  <p className="font-black text-slate-900 group-hover:text-blue-600">This and all following</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                    Stop this mission from tomorrow onwards
                  </p>
                </button>
                <button
                  onClick={() => deleteTask(deletingTask.id, "all")}
                  className="w-full p-5 bg-rose-50 hover:bg-rose-100 rounded-2xl text-left transition-all border border-transparent hover:border-rose-200 group"
                >
                  <p className="font-black text-rose-600">Entire Series</p>
                  <p className="text-[10px] text-rose-400 font-bold uppercase mt-1">
                    Delete this mission from all past and future dates
                  </p>
                </button>
              </div>
              <button
                onClick={() => setDeletingTask(null)}
                className="w-full mt-6 py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskItem({
  task, onToggle, onDelete, onEdit, isCompleted,
}: {
  task: Task; onToggle: () => void; onDelete: () => void; onEdit: () => void; isCompleted: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`group grid grid-cols-[1fr_auto] items-center rounded-[1.8rem] border-2 transition-all overflow-hidden ${
        isCompleted
          ? "bg-slate-50/80 border-transparent shadow-none"
          : "bg-white border-slate-50 hover:border-blue-100 hover:shadow-xl shadow-blue-50/20"
      }`}
    >
      <div onClick={onToggle} className="flex items-center gap-4 p-5 cursor-pointer select-none overflow-hidden">
        <div className="shrink-0">
          <motion.div
            animate={isCompleted ? { scale: [1, 1.35, 1] } : { scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {isCompleted ? (
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-8 h-8 border-2 border-slate-200 rounded-full group-hover:border-blue-400 bg-white transition-colors" />
            )}
          </motion.div>
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-base font-bold transition-all truncate ${isCompleted ? "text-slate-400 line-through" : "text-slate-800"}`}>
            {task.text}
          </p>
          {task.recurrence.type !== "none" && (
            <span className={`mt-1 inline-flex px-2 py-0.5 text-[8px] font-black uppercase rounded-md items-center gap-1 ${
              task.category === "learning" ? "bg-indigo-50 text-indigo-600" : task.category === "self-care" ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-600"
            }`}>
              <Zap className="w-2 h-2" /> {task.recurrence.type}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 pr-4 pl-2 h-12 bg-white/50">
        {task.url && (
          <a
            href={task.url} target="_blank" rel="noreferrer"
            className="w-9 h-9 flex items-center justify-center hover:bg-blue-50 text-slate-300 hover:text-blue-600 rounded-xl transition-all"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="w-9 h-9 flex items-center justify-center hover:bg-slate-50 text-slate-300 hover:text-slate-900 rounded-xl transition-all"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="w-9 h-9 flex items-center justify-center hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-xl transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

type RewardConfig = { type: "coins" | "custom"; coins?: number; rewardId?: string; rewardLabel?: string; quantity?: number; };

function TaskForm({
  onClose, onAdd, selectedDate, initialTask, jobOrbitUnlocked,
}: {
  onClose: () => void; onAdd: (t: Task) => void; selectedDate: Date; initialTask?: Task | null; jobOrbitUnlocked?: boolean;
}) {
  const [text, setText] = useState(initialTask?.text || "");
  const [url, setUrl] = useState(initialTask?.url || "");
  const [category, setCategory] = useState<"learning" | "job-search" | "self-care">(initialTask?.category || "learning");
  const [recurrenceType, setRecurrenceType] = useState<"none" | "daily" | "weekly">(
    initialTask?.recurrence.type || "none"
  );
  const [selectedDays, setSelectedDays] = useState<number[]>(initialTask?.recurrence.days || [1, 2, 3, 4, 5]);
  const [rewardConfig, setRewardConfig] = useState<RewardConfig | null>((initialTask as any)?.rewardConfig ?? null);
  const [rewardOpen, setRewardOpen] = useState(!!(initialTask as any)?.rewardConfig);
  const [catalogue, setCatalogue] = useState<{_id:string;label:string;emoji:string}[]>([]);

  useEffect(()=>{
    fetch("/api/rewards").then(r=>r.json()).then(d=>setCatalogue(Array.isArray(d.rewards)?d.rewards:[])).catch(()=>{});
  }, []);

  const days = [
    { label: "S", value: 0 }, { label: "M", value: 1 }, { label: "T", value: 2 },
    { label: "W", value: 3 }, { label: "T", value: 4 }, { label: "F", value: 5 }, { label: "S", value: 6 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const taskData: Record<string, unknown> = {
      text,
      url: url.trim() || undefined,
      category,
      type: recurrenceType === "none" ? "custom" : "daily",
      recurrence: { type: recurrenceType, days: recurrenceType === "weekly" ? selectedDays : [] },
      date: recurrenceType === "none" ? format(selectedDate, "yyyy-MM-dd") : undefined,
      rewardConfig: rewardOpen ? rewardConfig : null,
    };
    if (!initialTask) taskData.completedDates = [];

    try {
      const res = await fetch(initialTask ? `/api/tasks/${initialTask.id}` : "/api/tasks", {
        method: initialTask ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
      const data = await res.json();
      if (data.success) {
        onAdd({ ...data.data, id: String(data.data._id) });
        onClose();
      }
    } catch {}
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-black text-slate-900">Assign Mission</h3>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mission Details</label>
          <input
            required autoFocus type="text" value={text} onChange={(e) => setText(e.target.value)}
            className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-6 py-4 outline-none focus:bg-white focus:border-indigo-500 transition-all font-bold text-slate-800"
            placeholder="e.g. Study System Design"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mission Link (Optional)</label>
          <input
            type="url" value={url} onChange={(e) => setUrl(e.target.value)}
            className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-6 py-4 outline-none focus:bg-white focus:border-indigo-500 transition-all font-bold text-slate-800"
            placeholder="https://..."
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
          <div className="flex bg-slate-50 p-1.5 rounded-2xl gap-1">
            <button
              type="button" onClick={() => setCategory("learning")}
              className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                category === "learning" ? "bg-white shadow-md text-indigo-600" : "text-slate-400"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Learning
            </button>
            {jobOrbitUnlocked && (
              <button
                type="button" onClick={() => setCategory("job-search")}
                className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  category === "job-search" ? "bg-white shadow-md text-emerald-600" : "text-slate-400"
                }`}
              >
                <Target className="w-3.5 h-3.5" /> Job Search
              </button>
            )}
            <button
              type="button" onClick={() => setCategory("self-care")}
              className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                category === "self-care" ? "bg-white shadow-md text-rose-500" : "text-slate-400"
              }`}
            >
              🌿 Self-Care
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Frequency</label>
            <div className="relative">
              <select
                value={recurrenceType}
                onChange={(e) => setRecurrenceType(e.target.value as "none" | "daily" | "weekly")}
                className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-6 py-4 outline-none appearance-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-800 cursor-pointer"
              >
                <option value="none">One-time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Selected Days</option>
              </select>
              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-col justify-end p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
            <p className="text-[10px] font-bold text-blue-800">{format(selectedDate, "MMM do, yyyy")}</p>
            <p className="text-[8px] font-medium text-blue-600">Selected Date</p>
          </div>
        </div>
        {recurrenceType === "weekly" && (
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selected Weekdays</label>
            <div className="flex justify-between gap-1">
              {days.map((day) => (
                <button
                  key={day.value} type="button"
                  onClick={() =>
                    setSelectedDays((prev) =>
                      prev.includes(day.value) ? prev.filter((d) => d !== day.value) : [...prev, day.value]
                    )
                  }
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all border-2 ${
                    selectedDays.includes(day.value)
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-white border-slate-100 text-slate-400"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Reward Config */}
        {!rewardOpen ? (
          <button type="button" onClick={()=>{setRewardOpen(true);setRewardConfig({type:"coins"});}}
            className="w-full py-3 text-xs font-black text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-2xl border border-dashed border-amber-200 transition-all">
            ⚡ Set custom reward for this mission
          </button>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Completion Reward</p>
              <button type="button" onClick={()=>{setRewardOpen(false);setRewardConfig(null);}} className="text-slate-300 hover:text-rose-500 transition-colors">
                <X className="w-3.5 h-3.5"/>
              </button>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={()=>setRewardConfig(rc=>({...(rc??{}),type:"coins"}))}
                className={`flex-1 py-2 rounded-xl text-xs font-black border-2 transition-all ${rewardConfig?.type==="coins"?"bg-amber-500 text-white border-amber-500":"bg-white text-slate-500 border-slate-200 hover:border-amber-300"}`}>
                🪙 Coins
              </button>
              <button type="button" onClick={()=>setRewardConfig(rc=>({...(rc??{}),type:"custom"}))}
                className={`flex-1 py-2 rounded-xl text-xs font-black border-2 transition-all ${rewardConfig?.type==="custom"?"bg-blue-600 text-white border-blue-600":"bg-white text-slate-500 border-slate-200 hover:border-blue-300"}`}>
                🎁 Custom
              </button>
            </div>
            {rewardConfig?.type === "coins" && (
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Coins <span className="font-medium normal-case">(blank = global default)</span></label>
                <input type="number" min={0} value={rewardConfig.coins ?? ""} onChange={e=>setRewardConfig(rc=>({...(rc??{type:"coins"}),coins:e.target.value===""?undefined:Number(e.target.value)}))}
                  placeholder="e.g. 20"
                  className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-amber-400"/>
              </div>
            )}
            {rewardConfig?.type === "custom" && (
              <div className="space-y-2">
                {catalogue.length > 0 ? (
                  <select value={rewardConfig.rewardId ?? ""} onChange={e=>{const r=catalogue.find(c=>c._id===e.target.value);setRewardConfig(rc=>({...(rc??{type:"custom"}),rewardId:e.target.value,rewardLabel:r?.label}));}}
                    className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-400">
                    <option value="">— pick a reward —</option>
                    {catalogue.map(r=><option key={r._id} value={r._id}>{r.emoji} {r.label}</option>)}
                  </select>
                ) : (
                  <input value={rewardConfig.rewardLabel ?? ""} onChange={e=>setRewardConfig(rc=>({...(rc??{type:"custom"}),rewardLabel:e.target.value}))}
                    placeholder="Reward label e.g. Coffee break"
                    className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-400"/>
                )}
                <input type="number" min={1} value={rewardConfig.quantity ?? 1} onChange={e=>setRewardConfig(rc=>({...(rc??{type:"custom"}),quantity:Number(e.target.value)}))}
                  placeholder="Quantity"
                  className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-blue-400"/>
              </div>
            )}
          </div>
        )}

        <div className="pt-4 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-2xl">
            Cancel
          </button>
          <button type="submit" className="flex-1 py-4 bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl transition-all">
            Assign Mission
          </button>
        </div>
      </form>
    </div>
  );
}

function HeatMap({ tasks, isTaskVisible }: { tasks: Task[]; isTaskVisible: (t: Task, d: Date) => boolean }) {
  const days = Array.from({ length: 91 }, (_, i) => subDays(new Date(), 90 - i));

  const pct = (day: Date) => {
    const dStr = format(day, "yyyy-MM-dd");
    const visible = tasks.filter((t) => isTaskVisible(t, day));
    if (visible.length === 0) return -1;
    const done = visible.filter((t) => t.completedDates?.includes(dStr)).length;
    return Math.round((done / visible.length) * 100);
  };

  const color = (p: number) => {
    if (p < 0) return "bg-slate-100";
    if (p === 0) return "bg-slate-200";
    if (p < 50) return "bg-blue-200";
    if (p < 100) return "bg-blue-400";
    return "bg-emerald-500";
  };

  return (
    <div className="glass-panel bg-white rounded-[2.5rem] p-8 border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black text-slate-900">Activity</h3>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
          <span className="w-3 h-3 rounded-sm bg-slate-100 inline-block" /> None
          <span className="w-3 h-3 rounded-sm bg-blue-200 inline-block ml-2" /> Partial
          <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block ml-2" /> Full
        </div>
      </div>
      <div className="flex flex-wrap gap-[3px]">
        {days.map((day, i) => {
          const p = pct(day);
          return (
            <div
              key={i}
              title={`${format(day, "MMM d")}${p >= 0 ? ` · ${p}%` : ""}`}
              className={`w-[10px] h-[10px] rounded-sm ${color(p)} ${
                isToday(day) ? "ring-2 ring-blue-400 ring-offset-1" : ""
              } transition-all hover:scale-125 cursor-default`}
            />
          );
        })}
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 text-center">
        Last 91 days of consistency
      </p>
    </div>
  );
}

function NorthStar({
  jobStats, northStarText, streak, journeyStartDate,
}: {
  jobStats: { total: number; applied: number; interviews: number; offers: number };
  northStarText: string;
  streak: number;
  journeyStartDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const journeyStart = journeyStartDate ? new Date(journeyStartDate) : JOURNEY_START_FALLBACK;
  const dayNum = differenceInDays(new Date(), journeyStart) + 1;

  return (
    <div className="glass-panel bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2.5rem] overflow-hidden shadow-2xl text-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full p-8 text-left flex items-start justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">⭐</span>
            <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">North Star</span>
          </div>
          <p className="text-xl font-black leading-tight">Day {dayNum}</p>
          <p className="text-blue-300 text-sm font-medium mt-1">of becoming an AI Engineer</p>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown className="w-5 h-5 text-blue-300 mt-1 shrink-0" />
        </motion.div>
      </button>

      <div className="px-8 pb-6 grid grid-cols-2 gap-3">
        {[
          { label: "Jobs Tracked", value: jobStats.total },
          { label: "Streak", value: `${streak}d` },
          { label: "Applied", value: jobStats.applied },
          { label: "Interviews", value: jobStats.interviews },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white/5 rounded-2xl p-3 text-center">
            <p className="text-base font-black text-white leading-none">{value}</p>
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-wider mt-1">{label}</p>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-8 pb-8 border-t border-white/10 pt-6">
              {northStarText.split("\n\n").map((para, i) => (
                <p
                  key={i}
                  className={`text-sm leading-relaxed mb-4 last:mb-0 ${
                    i === 0 ? "font-black text-white" : "text-blue-200 font-medium"
                  }`}
                >
                  {para}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
