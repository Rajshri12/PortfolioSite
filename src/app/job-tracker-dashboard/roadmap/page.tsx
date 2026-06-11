"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map, ChevronDown, ChevronRight, CheckCircle2, Circle, Clock,
  Cpu, Code2, BookOpen, ExternalLink, Target, Loader2
} from "lucide-react";
import { apiFetch } from "@/lib/backend";

type TopicStatus = "not_started" | "in_progress" | "completed";

interface Topic {
  id: string;
  title: string;
  resources: { title: string; url: string; type: string }[];
  progress: { status: TopicStatus };
}

interface Stage {
  id: string;
  track: "ai" | "dsa";
  order_index: number;
  title: string;
  description: string;
  do_list: string[];
  dont_list: string[];
  project_spec: string;
  topics: Topic[];
}

const STATUS_LABEL: Record<TopicStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
};

const STATUS_COLOR: Record<TopicStatus, string> = {
  not_started: "bg-slate-100 text-slate-500 border-slate-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const TRACK_COLORS = {
  ai: { bg: "bg-blue-50", border: "border-blue-200", accent: "text-blue-600", dot: "bg-blue-500", badge: "bg-blue-100 text-blue-700 border-blue-200" },
  dsa: { bg: "bg-violet-50", border: "border-violet-200", accent: "text-violet-600", dot: "bg-violet-500", badge: "bg-violet-100 text-violet-700 border-violet-200" },
};

export default function RoadmapPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [activeTrack, setActiveTrack] = useState<"all" | "ai" | "dsa">("all");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/roadmap")
      .then((r) => r.json())
      .then((data) => {
        setStages(data);
        if (data.length > 0) setExpanded({ [data[0].id]: true });
      })
      .catch(() => setStages([]))
      .finally(() => setLoading(false));
  }, []);

  async function cycleStatus(topicId: string, current: TopicStatus) {
    const next: TopicStatus = current === "not_started" ? "in_progress" : current === "in_progress" ? "completed" : "not_started";
    // Optimistic update
    setStages((prev) =>
      prev.map((s) => ({
        ...s,
        topics: s.topics.map((t) =>
          t.id === topicId ? { ...t, progress: { status: next } } : t
        ),
      }))
    );
    setUpdating(topicId);
    try {
      const res = await apiFetch(`/api/roadmap/topics/${topicId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        // Revert on failure
        setStages((prev) =>
          prev.map((s) => ({
            ...s,
            topics: s.topics.map((t) =>
              t.id === topicId ? { ...t, progress: { status: current } } : t
            ),
          }))
        );
      }
    } catch {
      // Revert on network error
      setStages((prev) =>
        prev.map((s) => ({
          ...s,
          topics: s.topics.map((t) =>
            t.id === topicId ? { ...t, progress: { status: current } } : t
          ),
        }))
      );
    } finally {
      setUpdating(null);
    }
  }

  const filtered = activeTrack === "all" ? stages : stages.filter((s) => s.track === activeTrack);

  const totalTopics = stages.flatMap((s) => s.topics).length;
  const doneTopics = stages.flatMap((s) => s.topics).filter((t) => t.progress?.status === "completed").length;
  const pct = totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0;

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-5xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-1 flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl border border-blue-200 shadow-inner">
              <Map className="w-8 h-8 text-blue-600" />
            </div>
            Roadmap
          </h1>
          <p className="text-slate-500 text-base font-medium">Backend Intern → AI Engineer</p>
        </div>

        {/* Overall progress */}
        <div className="glass-panel rounded-2xl px-6 py-4 min-w-[220px]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Progress</span>
            <span className="text-sm font-black text-blue-600">{pct}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <motion.div
              className="bg-blue-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">{doneTopics} / {totalTopics} topics done</p>
        </div>
      </header>

      {/* Track filter */}
      <div className="flex gap-2 mb-6">
        {(["all", "ai", "dsa"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTrack(t)}
            className={`px-5 py-2 rounded-full font-bold text-sm transition-all ${
              activeTrack === t
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                : "bg-white text-slate-500 border border-slate-200 hover:border-blue-300 hover:text-blue-600"
            }`}
          >
            {t === "all" ? "All Tracks" : t.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center">
          <Map className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-bold">No stages found. Make sure the backend is running and seeded.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((stage, idx) => {
            const colors = TRACK_COLORS[stage.track];
            const isOpen = expanded[stage.id] ?? false;
            const stageDone = stage.topics.filter((t) => t.progress?.status === "completed").length;
            const stagePct = stage.topics.length > 0 ? Math.round((stageDone / stage.topics.length) * 100) : 0;

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`glass-panel rounded-2xl overflow-hidden border ${colors.border}`}
              >
                {/* Stage header */}
                <button
                  className={`w-full flex items-center gap-4 px-6 py-5 ${colors.bg} hover:brightness-[0.97] transition-all text-left`}
                  onClick={() => setExpanded((e) => ({ ...e, [stage.id]: !isOpen }))}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-sm ${stage.track === "ai" ? "bg-blue-500" : "bg-violet-500"}`}>
                    {stage.order_index}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${colors.badge}`}>
                        {stage.track === "ai" ? "AI Track" : "DSA Track"}
                      </span>
                      {stagePct === 100 && (
                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                          ✓ Complete
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-lg leading-tight">{stage.title}</h3>
                    <p className="text-slate-500 text-sm font-medium line-clamp-1">{stage.description}</p>
                  </div>
                  <div className="hidden md:flex flex-col items-end gap-1 mr-2">
                    <span className={`text-sm font-black ${colors.accent}`}>{stagePct}%</span>
                    <div className="w-24 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-1.5 rounded-full ${stage.track === "ai" ? "bg-blue-500" : "bg-violet-500"}`} style={{ width: `${stagePct}%` }} />
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">{stageDone}/{stage.topics.length} done</span>
                  </div>
                  {isOpen ? <ChevronDown className={`w-5 h-5 shrink-0 ${colors.accent}`} /> : <ChevronRight className="w-5 h-5 shrink-0 text-slate-400" />}
                </button>

                {/* Stage body */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-4 space-y-6">
                        {/* Description + Do/Don't */}
                        <div className="grid md:grid-cols-2 gap-4">
                          {stage.do_list?.length > 0 && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 mb-3 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Do
                              </h4>
                              <ul className="space-y-1.5">
                                {stage.do_list.map((item, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {stage.dont_list?.length > 0 && (
                            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                              <h4 className="text-xs font-black uppercase tracking-wider text-rose-500 mb-3 flex items-center gap-1.5">
                                <Circle className="w-3.5 h-3.5" /> Don't
                              </h4>
                              <ul className="space-y-1.5">
                                {stage.dont_list.map((item, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {stage.project_spec && (
                          <div className={`${colors.bg} border ${colors.border} rounded-2xl p-4`}>
                            <h4 className={`text-xs font-black uppercase tracking-wider ${colors.accent} mb-2 flex items-center gap-1.5`}>
                              <Target className="w-3.5 h-3.5" /> Stage Project
                            </h4>
                            <p className="text-sm text-slate-700 font-medium leading-relaxed">{stage.project_spec}</p>
                          </div>
                        )}

                        {/* Topics */}
                        {stage.topics.length > 0 && (
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Topics</h4>
                            <div className="grid gap-3">
                              {stage.topics.map((topic) => {
                                const status = topic.progress?.status ?? "not_started";
                                return (
                                  <div key={topic.id} className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 px-4 py-3 hover:border-blue-200 hover:shadow-sm transition-all">
                                    <button
                                      onClick={() => cycleStatus(topic.id, status)}
                                      disabled={updating === topic.id}
                                      className="shrink-0"
                                    >
                                      {updating === topic.id ? (
                                        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                                      ) : status === "completed" ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                      ) : status === "in_progress" ? (
                                        <Clock className="w-5 h-5 text-amber-500" />
                                      ) : (
                                        <Circle className="w-5 h-5 text-slate-300" />
                                      )}
                                    </button>
                                    <span className={`text-sm font-bold ${status === "completed" ? "line-through text-slate-400" : "text-slate-800"}`}>
                                      {topic.title}
                                    </span>
                                    <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full border ${STATUS_COLOR[status]}`}>
                                      {STATUS_LABEL[status]}
                                    </span>
                                    {topic.resources?.slice(0, 2).map((r, i) => (
                                      <a key={i} href={r.url} target="_blank" rel="noreferrer"
                                        className="shrink-0 text-blue-400 hover:text-blue-600 transition-colors"
                                        title={r.title}>
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
