"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Building2, ExternalLink, Calendar, Plus, Search, X,
  ChevronRight, Mail, Users, GitBranch, ArrowRight, AlertCircle,
  CheckCircle2, Clock, Trash2, Send, Loader2, Sparkles, Link,
  MapPin, DollarSign, Tag, MessageSquare, Phone, Star, UserCheck,
  TrendingUp, BarChart2, Zap, Copy, Check, FileText, ShieldCheck,
  ShieldAlert, ShieldX, Bot, CalendarClock,
} from "lucide-react";
import { format, isPast, formatDistanceToNow } from "date-fns";

function fmtDate(val: string | undefined | null, fmt: string, fallback = ""): string {
  if (!val) return fallback;
  const d = new Date(val);
  return isNaN(d.getTime()) ? fallback : format(d, fmt);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type JobStatus = "new" | "applied" | "oa" | "phone_screen" | "interview" | "final_round" | "offer" | "rejected";
type ReferralStatus = "planning" | "asked" | "received" | "declined";
type Priority = "dream" | "high" | "medium" | "low";

interface StageEvent { stage: JobStatus; date: string; notes?: string }
interface Referral {
  referrerName: string; referrerLinkedIn?: string; referrerEmail?: string;
  relationship: string; status: ReferralStatus; askedAt?: string; notes?: string;
}
interface Recruiter { name: string; email?: string; linkedIn?: string; title?: string }
interface ColdEmail { subject: string; body: string; generatedAt: string; sent: boolean; sentAt?: string }

interface Job {
  _id: string; title: string; company: string; url: string;
  applyUrl?: string;
  source: "scraper" | "manual" | "referral" | "cold_email";
  status: JobStatus; priority: Priority;
  reasoning?: string; notes?: string; location?: string; salary?: string;
  tags: string[]; appliedAt?: string; followUpDate?: string;
  rejectionStage?: JobStatus; stageHistory: StageEvent[];
  referral?: Referral; recruiter?: Recruiter; coldEmail?: ColdEmail;
  // ApplyPilot fields
  score?: number;
  scoreReasoning?: string;
  legitimacy?: number;
  resumeUrl?: string;
  coverLetterUrl?: string;
  filesExpireAt?: string;
  notifyType?: string;
  receivedAt?: string;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE: { id: JobStatus; label: string; color: string; bg: string; dot: string; order: number }[] = [
  { id: "new",          label: "New",          color: "border-slate-400",   bg: "bg-slate-50",    dot: "bg-slate-400",   order: 0 },
  { id: "applied",      label: "Applied",      color: "border-blue-400",    bg: "bg-blue-50",     dot: "bg-blue-400",    order: 1 },
  { id: "oa",           label: "OA",           color: "border-cyan-400",    bg: "bg-cyan-50",     dot: "bg-cyan-400",    order: 2 },
  { id: "phone_screen", label: "Phone Screen", color: "border-yellow-400",  bg: "bg-yellow-50",   dot: "bg-yellow-400",  order: 3 },
  { id: "interview",    label: "Interview",    color: "border-violet-400",  bg: "bg-violet-50",   dot: "bg-violet-400",  order: 4 },
  { id: "final_round",  label: "Final Round",  color: "border-purple-500",  bg: "bg-purple-50",   dot: "bg-purple-500",  order: 5 },
  { id: "offer",        label: "Offer",        color: "border-emerald-500", bg: "bg-emerald-50",  dot: "bg-emerald-500", order: 6 },
  { id: "rejected",     label: "Rejected",     color: "border-rose-400",    bg: "bg-rose-50",     dot: "bg-rose-400",    order: 7 },
];

const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  dream:  { label: "Dream",  color: "text-amber-600 bg-amber-50 border-amber-200" },
  high:   { label: "High",   color: "text-rose-600 bg-rose-50 border-rose-200" },
  medium: { label: "Medium", color: "text-blue-600 bg-blue-50 border-blue-200" },
  low:    { label: "Low",    color: "text-slate-500 bg-slate-50 border-slate-200" },
};

const REFERRAL_STATUS_META: Record<ReferralStatus, { label: string; color: string }> = {
  planning: { label: "Planning",  color: "text-slate-600 bg-slate-100" },
  asked:    { label: "Asked",     color: "text-yellow-700 bg-yellow-100" },
  received: { label: "Received",  color: "text-emerald-700 bg-emerald-100" },
  declined: { label: "Declined",  color: "text-rose-700 bg-rose-100" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status?: JobStatus }) {
  const s = PIPELINE.find(p => p.id === status);
  return <span className={`inline-block w-2 h-2 rounded-full ${s?.dot ?? "bg-slate-300"}`} />;
}

function StatusBadge({ status }: { status?: JobStatus }) {
  const s = PIPELINE.find(p => p.id === status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${s?.color ?? "border-slate-200"} ${s?.bg ?? "bg-slate-50"} text-slate-700`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s?.dot ?? "bg-slate-300"}`} />
      {s?.label ?? status ?? "unknown"}
    </span>
  );
}

function PriorityBadge({ priority }: { priority?: Priority }) {
  if (!priority) return null;
  const m = PRIORITY_META[priority] ?? { label: priority, color: "text-slate-500 bg-slate-50 border-slate-200" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${m.color}`}>
      {priority === "dream" && <Star className="w-2.5 h-2.5 mr-1" />}
      {m.label}
    </span>
  );
}

function FollowUpBadge({ date }: { date?: string }) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const overdue = isPast(d);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${overdue ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
      {overdue ? <AlertCircle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
      {overdue ? "Follow-up overdue" : `Follow up ${formatDistanceToNow(d, { addSuffix: true })}`}
    </span>
  );
}

function ScoreBadge({ score }: { score?: number }) {
  if (score == null) return null;
  const color =
    score >= 8 ? "bg-emerald-100 text-emerald-700 border-emerald-300" :
    score >= 6 ? "bg-amber-100 text-amber-700 border-amber-300" :
                 "bg-rose-100 text-rose-600 border-rose-300";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${color}`}>
      <Bot className="w-2.5 h-2.5" /> {score}/10
    </span>
  );
}

function LegitimacyBadge({ legitimacy }: { legitimacy?: number }) {
  if (legitimacy == null) return null;
  if (legitimacy === 1) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
      <ShieldCheck className="w-2.5 h-2.5" /> Legit
    </span>
  );
  if (legitimacy === 2) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
      <ShieldAlert className="w-2.5 h-2.5" /> Caution
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-200">
      <ShieldX className="w-2.5 h-2.5" /> Ghost Job
    </span>
  );
}

// ─── Pipeline Tab ─────────────────────────────────────────────────────────────

function PipelineCard({ job, onClick }: { job: Job; onClick: () => void }) {
  const isOverdue = job.followUpDate && isPast(new Date(job.followUpDate)) && job.status !== "rejected" && job.status !== "offer";
  return (
    <motion.div
      layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      className={`bg-white rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-all group ${isOverdue ? "border-rose-300 ring-1 ring-rose-200" : "border-slate-100 hover:border-blue-200"}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-900 text-sm truncate">{job.title}</p>
          <p className="text-xs text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
            <Building2 className="w-3 h-3" /> {job.company}
          </p>
        </div>
        <PriorityBadge priority={job.priority} />
      </div>
      {job.location && (
        <p className="text-[10px] text-slate-400 flex items-center gap-1 mb-2 font-medium">
          <MapPin className="w-2.5 h-2.5" /> {job.location}
        </p>
      )}
      {(job.tags?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {job.tags.slice(0, 3).map(t => (
            <span key={t} className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{t}</span>
          ))}
        </div>
      )}
      {(job.score != null || job.legitimacy != null) && (
        <div className="flex gap-1 flex-wrap mb-2">
          <ScoreBadge score={job.score} />
          <LegitimacyBadge legitimacy={job.legitimacy} />
        </div>
      )}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
        <div className="flex gap-1 items-center">
          {job.referral && <span title="Has referral" className="text-emerald-500"><Users className="w-3 h-3" /></span>}
          {job.coldEmail && <span title="Cold email sent" className="text-blue-400"><Mail className="w-3 h-3" /></span>}
          {job.recruiter && <span title="Recruiter tracked" className="text-violet-400"><UserCheck className="w-3 h-3" /></span>}
          {job.resumeUrl && <span title="Resume ready" className="text-indigo-400"><FileText className="w-3 h-3" /></span>}
        </div>
        {job.followUpDate && <FollowUpBadge date={job.followUpDate} />}
      </div>
    </motion.div>
  );
}

function PipelineTab({ jobs, onSelect }: { jobs: Job[]; onSelect: (j: Job) => void }) {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    const matchQ = !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q);
    const matchP = priorityFilter === "all" || j.priority === priorityFilter;
    return matchQ && matchP;
  });

  const columns = PIPELINE.filter(p => p.id !== "rejected");
  const rejected = filtered.filter(j => j.status === "rejected");

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="glass-panel flex items-center gap-2 px-4 py-2 rounded-full flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search jobs…"
            className="bg-transparent border-none outline-none text-sm text-slate-700 font-medium placeholder-slate-400 w-full"
          />
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-full">
          {(["all", "dream", "high", "medium", "low"] as const).map(p => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1 rounded-full text-xs font-black transition-all capitalize ${priorityFilter === p ? "bg-white shadow text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
            >
              {p === "all" ? "All" : p}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto pb-6">
        <div className="flex gap-4 min-w-max">
          {columns.map(col => {
            const colJobs = filtered.filter(j => j.status === col.id);
            return (
              <div key={col.id} className={`w-64 shrink-0 rounded-2xl border-t-4 ${col.color} ${col.bg} p-3 flex flex-col`}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">{col.label}</span>
                  <span className="bg-white text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full border border-slate-200">{colJobs.length}</span>
                </div>
                <div className="space-y-2 min-h-[120px]">
                  <AnimatePresence>
                    {colJobs.map(j => <PipelineCard key={j._id} job={j} onClick={() => onSelect(j)} />)}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {rejected.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <X className="w-3 h-3" /> Rejected ({rejected.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {rejected.map(j => (
              <div key={j._id} onClick={() => onSelect(j)} className="bg-rose-50 border border-rose-100 rounded-xl p-3 cursor-pointer hover:border-rose-300 transition-all opacity-70 hover:opacity-100">
                <p className="text-sm font-bold text-slate-700">{j.title}</p>
                <p className="text-xs text-slate-500">{j.company}</p>
                {j.rejectionStage && <p className="text-[10px] text-rose-500 font-bold mt-1">Rejected at: {PIPELINE.find(p => p.id === j.rejectionStage)?.label}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Referrals Tab ────────────────────────────────────────────────────────────

function ReferralsTab({ jobs, onSelect, onUpdate }: { jobs: Job[]; onSelect: (j: Job) => void; onUpdate: (id: string, patch: Partial<Job>) => void }) {
  const withReferral = jobs.filter(j => j.referral);
  const groups: Record<ReferralStatus, Job[]> = { planning: [], asked: [], received: [], declined: [] };
  withReferral.forEach(j => { if (j.referral) groups[j.referral.status].push(j); });

  const overdueFollowUps = jobs.filter(j => j.followUpDate && isPast(new Date(j.followUpDate)) && j.status !== "rejected" && j.status !== "offer");

  return (
    <div className="space-y-6">
      {overdueFollowUps.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-black text-rose-700 uppercase tracking-wider">Follow-up Overdue</span>
          </div>
          <div className="space-y-2">
            {overdueFollowUps.map(j => (
              <div key={j._id} onClick={() => onSelect(j)} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-rose-100 cursor-pointer hover:border-rose-300 transition-all">
                <div>
                  <p className="text-sm font-bold text-slate-800">{j.title} <span className="text-slate-400 font-medium">@ {j.company}</span></p>
                  <p className="text-xs text-rose-500 font-semibold">Was due {fmtDate(j.followUpDate, "MMM d")}</p>
                </div>
                <StatusBadge status={j.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {(["planning", "asked", "received", "declined"] as ReferralStatus[]).map(status => {
        const groupJobs = groups[status];
        if (groupJobs.length === 0) return null;
        const meta = REFERRAL_STATUS_META[status];
        return (
          <div key={status} className="glass-panel rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
              <span className="text-xs text-slate-400 font-bold">{groupJobs.length} job{groupJobs.length > 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-3">
              {groupJobs.map(j => (
                <div key={j._id} onClick={() => onSelect(j)} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-200 hover:shadow-sm transition-all">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-black text-slate-900 text-sm">{j.title} <span className="text-slate-500 font-medium">@ {j.company}</span></p>
                      <StatusBadge status={j.status} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-semibold">
                      Referral from <span className="text-blue-600">{j.referral!.referrerName}</span> · {j.referral!.relationship}
                    </p>
                    {j.referral!.notes && <p className="text-xs text-slate-400 mt-1 italic">"{j.referral!.notes}"</p>}
                    {j.followUpDate && <div className="mt-2"><FollowUpBadge date={j.followUpDate} /></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {withReferral.length === 0 && (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-bold text-slate-500">No referrals tracked yet.</p>
          <p className="text-sm text-slate-400 mt-1">Open a job and add referral details to track them here.</p>
        </div>
      )}
    </div>
  );
}

// ─── Cold Outreach Tab ────────────────────────────────────────────────────────

function EmailCard({ job, onCopy, onMarkSent }: { job: Job; onCopy: () => void; onMarkSent: () => void }) {
  const [copied, setCopied] = useState(false);
  const email = job.coldEmail!;
  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy();
  };
  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-100">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="font-black text-slate-900">{job.title} <span className="text-slate-400 font-medium">@ {job.company}</span></p>
          {job.recruiter && (
            <p className="text-xs text-slate-500 mt-0.5 font-semibold">
              To: {job.recruiter.name}{job.recruiter.title ? ` (${job.recruiter.title})` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {email.sent
            ? <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Sent</span>
            : <button onClick={onMarkSent} className="text-[10px] font-black bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1"><Send className="w-3 h-3" /> Mark Sent</button>
          }
          <button onClick={handleCopy} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors" title="Copy email">
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
        <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Subject</p>
        <p className="text-sm font-bold text-slate-800">{email.subject}</p>
        <hr className="border-slate-100" />
        <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Body</p>
        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">{email.body}</p>
      </div>
      <p className="text-[10px] text-slate-400 mt-3 font-medium">{email.generatedAt ? `Generated ${fmtDate(email.generatedAt, "MMM d, yyyy")}` : ""}</p>
    </div>
  );
}

function EmailGeneratorModal({ onClose, onGenerated }: { onClose: () => void; onGenerated: (email: { subject: string; body: string }) => void }) {
  const [form, setForm] = useState({ jobTitle: "", company: "", recruiterName: "", recruiterTitle: "", myName: "Rajshri", myBackground: "Backend Python developer with FastAPI, LangChain, and RAG experience", jobUrl: "", tone: "warm but professional" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ subject: string; body: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/cold-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) setResult({ subject: data.subject, body: data.body });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(`Subject: ${result.subject}\n\n${result.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inp = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 font-medium transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl"><Sparkles className="w-5 h-5 text-blue-600" /></div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">AI Cold Email Generator</h2>
                <p className="text-xs text-slate-500 font-medium">Crafts a personalised, punchy email via GPT-4o-mini</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
          </div>

          {!result ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Job Title *</label><input className={inp} value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} placeholder="AI Engineer" /></div>
                <div><label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Company *</label><input className={inp} value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Anthropic" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Recruiter Name</label><input className={inp} value={form.recruiterName} onChange={e => setForm(f => ({ ...f, recruiterName: e.target.value }))} placeholder="Sarah Chen" /></div>
                <div><label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Recruiter Title</label><input className={inp} value={form.recruiterTitle} onChange={e => setForm(f => ({ ...f, recruiterTitle: e.target.value }))} placeholder="Senior Recruiter" /></div>
              </div>
              <div><label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Your Name</label><input className={inp} value={form.myName} onChange={e => setForm(f => ({ ...f, myName: e.target.value }))} /></div>
              <div><label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Your Background</label><textarea className={`${inp} min-h-[80px] resize-none`} value={form.myBackground} onChange={e => setForm(f => ({ ...f, myBackground: e.target.value }))} /></div>
              <div><label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Job URL</label><input className={inp} value={form.jobUrl} onChange={e => setForm(f => ({ ...f, jobUrl: e.target.value }))} placeholder="https://..." /></div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Tone</label>
                <select className={inp} value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value }))}>
                  <option value="warm but professional">Warm but professional</option>
                  <option value="confident and direct">Confident and direct</option>
                  <option value="enthusiastic and energetic">Enthusiastic and energetic</option>
                  <option value="concise and formal">Concise and formal</option>
                </select>
              </div>
              <button onClick={generate} disabled={loading || !form.jobTitle || !form.company} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-black transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-50">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate Email</>}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-3">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Subject</p>
                  <p className="font-black text-slate-800">{result.subject}</p>
                </div>
                <hr className="border-slate-100" />
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Body</p>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line font-medium">{result.body}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setResult(null)} className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors border border-slate-200">Regenerate</button>
                <button onClick={handleCopy} className={`flex-1 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${copied ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}>
                  {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Email</>}
                </button>
                <button onClick={() => { onGenerated(result); onClose(); }} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black transition-colors shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Use This
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function OutreachTab({ jobs, onUpdate }: { jobs: Job[]; onUpdate: (id: string, patch: Partial<Job>) => void }) {
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const withEmail = jobs.filter(j => j.coldEmail);
  const withRecruiter = jobs.filter(j => j.recruiter && !j.coldEmail);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-slate-700">{withEmail.length} emails generated · {withEmail.filter(j => j.coldEmail?.sent).length} sent</p>
        </div>
        <button onClick={() => { setSelectedJobId(null); setShowGenerator(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black text-sm transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/30">
          <Sparkles className="w-4 h-4" /> New Cold Email
        </button>
      </div>

      {withRecruiter.length > 0 && (
        <div className="glass-panel rounded-2xl p-5">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <UserCheck className="w-3.5 h-3.5" /> Recruiters Tracked — No Email Yet
          </p>
          <div className="space-y-2">
            {withRecruiter.map(j => (
              <div key={j._id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-slate-100">
                <div>
                  <p className="text-sm font-bold text-slate-800">{j.title} @ {j.company}</p>
                  <p className="text-xs text-slate-500 font-semibold">{j.recruiter!.name}{j.recruiter!.title ? ` · ${j.recruiter!.title}` : ""}</p>
                </div>
                <button onClick={() => { setSelectedJobId(j._id); setShowGenerator(true); }} className="text-xs font-black bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Generate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {withEmail.length > 0 ? (
        <div className="space-y-4">
          {withEmail.map(j => (
            <EmailCard
              key={j._id}
              job={j}
              onCopy={() => {}}
              onMarkSent={() => onUpdate(j._id, { coldEmail: { ...j.coldEmail!, sent: true, sentAt: new Date().toISOString() } })}
            />
          ))}
        </div>
      ) : (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <Mail className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-bold text-slate-500">No cold emails yet.</p>
          <p className="text-sm text-slate-400 mt-1">Generate your first AI-crafted cold email to stand out.</p>
        </div>
      )}

      <AnimatePresence>
        {showGenerator && (
          <EmailGeneratorModal
            onClose={() => setShowGenerator(false)}
            onGenerated={(email) => {
              if (selectedJobId) {
                onUpdate(selectedJobId, { coldEmail: { ...email, generatedAt: new Date().toISOString(), sent: false } });
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Job Drawer ───────────────────────────────────────────────────────────────

const EMPTY_REFERRAL: Referral = { referrerName: "", relationship: "", status: "planning", referrerLinkedIn: "", referrerEmail: "", notes: "" };

function ReferralForm({ initial, onSave, onCancel }: { initial: Referral; onSave: (r: Referral) => void; onCancel: () => void }) {
  const [r, setR] = useState<Referral>(initial);
  const inp = "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 font-medium transition-all";
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Referrer Name *</label>
          <input className={inp} value={r.referrerName} onChange={e => setR(v => ({ ...v, referrerName: e.target.value }))} placeholder="Kavya Reddy" />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Relationship</label>
          <input className={inp} value={r.relationship} onChange={e => setR(v => ({ ...v, relationship: e.target.value }))} placeholder="College friend / Ex-colleague / LinkedIn connection" />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Status</label>
          <select className={inp} value={r.status} onChange={e => setR(v => ({ ...v, status: e.target.value as ReferralStatus }))}>
            <option value="planning">Planning to ask</option>
            <option value="asked">Asked</option>
            <option value="received">Received referral</option>
            <option value="declined">Declined</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Their Email</label>
          <input className={inp} type="email" value={r.referrerEmail ?? ""} onChange={e => setR(v => ({ ...v, referrerEmail: e.target.value }))} placeholder="name@company.com" />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">LinkedIn URL</label>
          <input className={inp} value={r.referrerLinkedIn ?? ""} onChange={e => setR(v => ({ ...v, referrerLinkedIn: e.target.value }))} placeholder="https://linkedin.com/in/..." />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Notes</label>
          <textarea className={`${inp} min-h-[60px] resize-none`} value={r.notes ?? ""} onChange={e => setR(v => ({ ...v, notes: e.target.value }))} placeholder="Any context, what to say, follow-up plan…" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors">Cancel</button>
        <button onClick={() => { if (r.referrerName?.trim()) onSave(r); }} disabled={!r.referrerName?.trim()} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-colors disabled:opacity-50">Save Referral</button>
      </div>
    </div>
  );
}

function JobDrawer({ job, onClose, onUpdate, onDelete }: { job: Job; onClose: () => void; onUpdate: (id: string, patch: Partial<Job>) => void; onDelete: (id: string) => void }) {
  const stageOrder = PIPELINE.map(p => p.id);
  const currentIdx = stageOrder.indexOf(job.status);
  const nextStage = job.status !== "rejected" && currentIdx < stageOrder.length - 2 ? stageOrder[currentIdx + 1] : null;
  const [noteText, setNoteText] = useState(job.notes ?? "");
  const [editingNote, setEditingNote] = useState(false);
  const [editingReferral, setEditingReferral] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 240 }} className="relative z-10 bg-white w-full max-w-xl h-full overflow-y-auto shadow-2xl">
        <div className="p-7">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <StatusBadge status={job.status} />
                <PriorityBadge priority={job.priority} />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">{job.title}</h2>
              <p className="text-slate-500 font-semibold flex items-center gap-1.5 mt-1">
                <Building2 className="w-4 h-4" /> {job.company}
                {job.location && <><span className="text-slate-300">·</span><MapPin className="w-3.5 h-3.5" />{job.location}</>}
              </p>
              {job.salary && <p className="text-sm text-emerald-600 font-bold mt-1 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{job.salary}</p>}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors shrink-0"><X className="w-5 h-5" /></button>
          </div>

          <div className="flex gap-2 mb-6 flex-wrap">
            <a href={job.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-black hover:bg-blue-700 transition-colors shadow shadow-blue-500/20">
              <ExternalLink className="w-3.5 h-3.5" /> View Posting
            </a>
            {job.applyUrl && (
              <a href={job.applyUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-black hover:bg-emerald-700 transition-colors shadow shadow-emerald-500/20">
                <Send className="w-3.5 h-3.5" /> Apply Now
              </a>
            )}
            {nextStage && (
              <button onClick={() => onUpdate(job._id, { status: nextStage })} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-black hover:bg-blue-100 transition-colors border border-blue-200">
                <ArrowRight className="w-3.5 h-3.5" />
                Move to {PIPELINE.find(p => p.id === nextStage)?.label}
              </button>
            )}
            <button onClick={() => { if (confirm("Delete this job?")) { onDelete(job._id); onClose(); } }} className="flex items-center gap-1.5 text-rose-500 hover:bg-rose-50 px-3 py-2 rounded-xl text-sm font-bold transition-colors border border-transparent hover:border-rose-200 ml-auto">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {job.followUpDate && <div className="mb-5"><FollowUpBadge date={job.followUpDate} /></div>}

          {/* ApplyPilot Section */}
          {(job.score != null || job.resumeUrl || job.coverLetterUrl || job.legitimacy != null) && (
            <div className="glass-panel rounded-2xl p-5 mb-5 border-l-4 border-indigo-400">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5" /> ApplyPilot
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {job.score != null && <ScoreBadge score={job.score} />}
                {job.legitimacy != null && <LegitimacyBadge legitimacy={job.legitimacy} />}
                {job.notifyType && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {job.notifyType}
                  </span>
                )}
              </div>
              {job.scoreReasoning && (
                <p className="text-xs text-slate-600 font-medium bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 mb-4 leading-relaxed">
                  {job.scoreReasoning}
                </p>
              )}
              {(job.resumeUrl || job.coverLetterUrl) && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Generated Files</p>
                  {job.filesExpireAt && (
                    <p className={`text-[10px] font-semibold flex items-center gap-1 ${new Date(job.filesExpireAt) < new Date() ? "text-rose-500" : "text-slate-400"}`}>
                      <CalendarClock className="w-3 h-3" />
                      {job.filesExpireAt && (new Date(job.filesExpireAt) < new Date() ? "Links expired" : `Links expire ${fmtDate(job.filesExpireAt, "MMM d, yyyy")}`)}
                    </p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {job.resumeUrl && (
                      <a href={job.resumeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-black bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-2 rounded-xl border border-indigo-200 transition-colors">
                        <FileText className="w-3.5 h-3.5" /> Resume PDF
                      </a>
                    )}
                    {job.coverLetterUrl && (
                      <a href={job.coverLetterUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-black bg-violet-50 text-violet-700 hover:bg-violet-100 px-3 py-2 rounded-xl border border-violet-200 transition-colors">
                        <FileText className="w-3.5 h-3.5" /> Cover Letter PDF
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stage Timeline */}
          <div className="glass-panel rounded-2xl p-5 mb-5">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5"><GitBranch className="w-3.5 h-3.5" /> Stage History</p>
            <div className="space-y-2">
              {(job.stageHistory ?? []).map((ev, i) => {
                const s = PIPELINE.find(p => p.id === ev.stage);
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`w-2.5 h-2.5 rounded-full mt-1 ${s?.dot ?? "bg-slate-300"}`} />
                      {i < (job.stageHistory ?? []).length - 1 && <div className="w-px flex-1 bg-slate-100 mt-1 mb-1 min-h-[16px]" />}
                    </div>
                    <div className="pb-2">
                      <p className="text-sm font-bold text-slate-700">{s?.label ?? ev.stage}</p>
                      <p className="text-xs text-slate-400 font-medium">{fmtDate(ev.date, "MMM d, yyyy")}</p>
                      {ev.notes && <p className="text-xs text-slate-500 italic mt-0.5">"{ev.notes}"</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          {(job.tags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {job.tags.map(t => <span key={t} className="text-xs font-black bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full border border-slate-200">{t}</span>)}
            </div>
          )}

          {/* Recruiter */}
          {job.recruiter && (
            <div className="glass-panel rounded-2xl p-5 mb-5">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5" /> Recruiter</p>
              <p className="font-black text-slate-800">{job.recruiter.name}</p>
              {job.recruiter.title && <p className="text-xs text-slate-500 font-semibold">{job.recruiter.title}</p>}
              <div className="flex gap-3 mt-2">
                {job.recruiter.email && <a href={`mailto:${job.recruiter.email}`} className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline"><Mail className="w-3 h-3" />{job.recruiter.email}</a>}
                {job.recruiter.linkedIn && <a href={job.recruiter.linkedIn} target="_blank" rel="noreferrer" className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline"><Link className="w-3 h-3" />LinkedIn</a>}
              </div>
            </div>
          )}

          {/* Referral */}
          <div className="glass-panel rounded-2xl p-5 mb-5 border-l-4 border-emerald-400">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Referral
              </p>
              {job.referral && !editingReferral && (
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${REFERRAL_STATUS_META[job.referral.status]?.color ?? "bg-slate-100 text-slate-500"}`}>
                    {REFERRAL_STATUS_META[job.referral.status]?.label ?? job.referral.status}
                  </span>
                  <button onClick={() => setEditingReferral(true)} className="text-xs text-blue-600 font-bold hover:underline">Edit</button>
                </div>
              )}
            </div>
            {!job.referral && !editingReferral ? (
              <button
                onClick={() => setEditingReferral(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-emerald-200 rounded-xl text-sm font-black text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-all"
              >
                <Users className="w-4 h-4" /> Add Referral
              </button>
            ) : editingReferral ? (
              <ReferralForm
                initial={job.referral ? { ...EMPTY_REFERRAL, ...job.referral } : EMPTY_REFERRAL}
                onSave={(r) => {
                  onUpdate(job._id, { referral: r, source: "referral" });
                  setEditingReferral(false);
                }}
                onCancel={() => setEditingReferral(false)}
              />
            ) : (
              <>
                <p className="font-black text-slate-800">{job.referral!.referrerName}</p>
                <p className="text-xs text-slate-500 font-semibold">{job.referral!.relationship}</p>
                {job.referral!.notes && <p className="text-xs text-slate-400 italic mt-1">"{job.referral!.notes}"</p>}
                <div className="flex gap-3 mt-2 flex-wrap">
                  {job.referral!.referrerEmail && (
                    <a href={`mailto:${job.referral!.referrerEmail}`} className="text-xs text-emerald-600 font-bold flex items-center gap-1 hover:underline">
                      <Mail className="w-3 h-3" />{job.referral!.referrerEmail}
                    </a>
                  )}
                  {job.referral!.referrerLinkedIn && (
                    <a href={job.referral!.referrerLinkedIn} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 font-bold flex items-center gap-1 hover:underline">
                      <Link className="w-3 h-3" />LinkedIn
                    </a>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Cold Email */}
          {job.coldEmail && (
            <div className="glass-panel rounded-2xl p-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Cold Email</p>
                {job.coldEmail.sent
                  ? <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Sent {fmtDate(job.coldEmail.sentAt, "MMM d")}</span>
                  : <span className="text-[10px] font-black bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Not sent</span>
                }
              </div>
              <p className="text-xs font-bold text-slate-700 mb-1">Subject: {job.coldEmail.subject}</p>
              <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line font-medium line-clamp-4">{job.coldEmail.body}</p>
            </div>
          )}

          {/* Notes */}
          <div className="glass-panel rounded-2xl p-5 mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Notes</p>
              {!editingNote && <button onClick={() => setEditingNote(true)} className="text-xs text-blue-600 font-bold hover:underline">Edit</button>}
            </div>
            {editingNote ? (
              <>
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 min-h-[80px] resize-none font-medium" />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { onUpdate(job._id, { notes: noteText }); setEditingNote(false); }} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-xs font-black hover:bg-blue-700 transition-colors">Save</button>
                  <button onClick={() => { setNoteText(job.notes ?? ""); setEditingNote(false); }} className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-600 font-medium">{job.notes || <span className="text-slate-300 italic">No notes yet.</span>}</p>
            )}
          </div>

          {/* Change Stage */}
          <div className="glass-panel rounded-2xl p-5">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Move Stage</p>
            <select
              value={job.status}
              onChange={e => onUpdate(job._id, { status: e.target.value as JobStatus })}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-400 cursor-pointer"
            >
              {PIPELINE.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Add Job Modal ────────────────────────────────────────────────────────────

function AddJobModal({ onClose, onAdd }: { onClose: () => void; onAdd: (job: Job) => void }) {
  const [form, setForm] = useState({ title: "", company: "", url: "", location: "", salary: "", priority: "medium" as Priority, tags: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inp = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 font-medium transition-all";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = { ...form, tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [], source: "manual" as const };
      const res = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success && data.data?.[0]) {
        onAdd(data.data[0]);
        onClose();
      } else {
        setError(data.error ?? data.message ?? "Failed to save. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 p-8 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-extrabold text-slate-900 mb-5 flex items-center gap-2"><Plus className="w-5 h-5 text-blue-600" /> Add Job</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Job Title *</label><input required className={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="AI Engineer" /></div>
            <div><label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Company *</label><input required className={inp} value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Anthropic" /></div>
            <div><label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Priority</label>
              <select className={inp} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}>
                {(["dream", "high", "medium", "low"] as Priority[]).map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
              </select>
            </div>
            <div className="col-span-2"><label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Job URL *</label><input required type="url" className={inp} value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." /></div>
            <div><label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Location</label><input className={inp} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Remote / NYC" /></div>
            <div><label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Salary Range</label><input className={inp} value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} placeholder="$150k–$200k" /></div>
            <div className="col-span-2"><label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Tags (comma-separated)</label><input className={inp} value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="Python, RAG, FastAPI" /></div>
            <div className="col-span-2"><label className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Notes</label><textarea className={`${inp} min-h-[70px] resize-none`} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          {error && (
            <p className="text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50">
              {saving ? "Saving…" : "Save Job"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ jobs }: { jobs: Job[] }) {
  const total = jobs.length;
  const applied = jobs.filter(j => j.status !== "new").length;
  const active = jobs.filter(j => !["new", "rejected", "offer"].includes(j.status)).length;
  const offers = jobs.filter(j => j.status === "offer").length;
  const interviewRate = applied > 0 ? Math.round((jobs.filter(j => ["interview", "final_round", "offer"].includes(j.status)).length / applied) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      {[
        { label: "Tracked", value: total, color: "text-slate-700", bg: "bg-slate-50 border-slate-200", icon: Briefcase },
        { label: "Applied", value: applied, color: "text-blue-600", bg: "bg-blue-50 border-blue-200", icon: Send },
        { label: "Active", value: active, color: "text-violet-600", bg: "bg-violet-50 border-violet-200", icon: TrendingUp },
        { label: "Offers", value: offers, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: Star },
        { label: "Interview Rate", value: `${interviewRate}%`, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: BarChart2 },
      ].map(({ label, value, color, bg, icon: Icon }) => (
        <div key={label} className={`glass-panel rounded-2xl p-4 border ${bg}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <p className={`text-2xl font-black ${color}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function JobOrbitPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeTab, setActiveTab] = useState<"pipeline" | "referrals" | "outreach">("pipeline");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const normaliseJob = (j: Job): Job => ({
    ...j,
    tags: Array.isArray(j.tags) ? j.tags : [],
    stageHistory: Array.isArray(j.stageHistory) ? j.stageHistory : [],
    status: j.status ?? "new",
    priority: j.priority ?? "medium",
    source: j.source ?? "manual",
  });

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) setJobs(data.data.map(normaliseJob));
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchJobs(); }, []);

  const updateJob = async (id: string, patch: Partial<Job>) => {
    // Optimistic update
    setJobs(prev => prev.map(j => j._id === id ? { ...j, ...patch } : j));
    if (selectedJob?._id === id) setSelectedJob(prev => prev ? { ...prev, ...patch } : prev);
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      const data = await res.json();
      if (data.success && data.data) {
        const fresh = normaliseJob(data.data);
        // Sync with authoritative DB state (stageHistory, appliedAt, etc.)
        setJobs(prev => prev.map(j => j._id === id ? fresh : j));
        if (selectedJob?._id === id) setSelectedJob(fresh);
      } else {
        fetchJobs();
      }
    } catch { fetchJobs(); }
  };

  const deleteJob = async (id: string) => {
    // Optimistic update
    setJobs(prev => prev.filter(j => j._id !== id));
    if (selectedJob?._id === id) setSelectedJob(null);
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) fetchJobs(); // revert on failure
    } catch { fetchJobs(); }
  };

  const TABS = [
    { id: "pipeline" as const, label: "Pipeline", icon: GitBranch },
    { id: "referrals" as const, label: "Referrals", icon: Users, count: jobs.filter(j => j.referral).length },
    { id: "outreach" as const, label: "Cold Outreach", icon: Mail, count: jobs.filter(j => j.coldEmail).length },
  ];

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-xl border border-blue-200 shadow-inner">
            <Briefcase className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900">Job Orbit</h1>
            <p className="text-slate-500 font-medium">Track every stage of your job search</p>
          </div>
        </div>
        <button onClick={() => setAddOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-colors">
          <Plus className="w-5 h-5" /> Add Job
        </button>
      </div>

      <StatsBar jobs={jobs} />

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl mb-6 w-fit">
        {TABS.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === id ? "bg-white shadow text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {count !== undefined && count > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === id ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-500"}`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
      ) : (
        <>
          {activeTab === "pipeline" && <PipelineTab jobs={jobs} onSelect={setSelectedJob} />}
          {activeTab === "referrals" && <ReferralsTab jobs={jobs} onSelect={setSelectedJob} onUpdate={updateJob} />}
          {activeTab === "outreach" && <OutreachTab jobs={jobs} onUpdate={updateJob} />}
        </>
      )}

      {/* Job Drawer */}
      <AnimatePresence>
        {selectedJob && (
          <JobDrawer
            key={selectedJob._id}
            job={jobs.find(j => j._id === selectedJob._id) ?? selectedJob}
            onClose={() => setSelectedJob(null)}
            onUpdate={updateJob}
            onDelete={deleteJob}
          />
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {addOpen && (
          <AddJobModal
            onClose={() => setAddOpen(false)}
            onAdd={(newJob) => setJobs(prev => [normaliseJob(newJob), ...prev])}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
