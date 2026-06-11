"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookMarked, Plus, Search, ExternalLink, Download, Trash2,
  GraduationCap, Briefcase, Wrench, CheckSquare, Gift, X, Loader2
} from "lucide-react";
import { apiFetch } from "@/lib/backend";

type Category = "course" | "job" | "tool" | "checkpoint" | "free";

interface Resource {
  id: string;
  category: Category;
  title: string;
  url: string;
  notes?: string;
  status: string;
  tags: string[];
  created_at: string;
}

const CATEGORY_META: Record<Category, { label: string; icon: typeof GraduationCap; color: string; bg: string; border: string }> = {
  course: { label: "Courses", icon: GraduationCap, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  job: { label: "Jobs", icon: Briefcase, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  tool: { label: "Tools", icon: Wrench, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
  checkpoint: { label: "Checkpoints", icon: CheckSquare, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  free: { label: "Free Resources", icon: Gift, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
};

const EMPTY_FORM = { category: "course" as Category, title: "", url: "", notes: "", tags: "" };

export default function VaultPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Category | "all">("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () =>
    apiFetch("/api/vault")
      .then((r) => r.json())
      .then(setResources)
      .catch(() => setResources([]))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const filtered = resources.filter((r) => {
    const matchTab = activeTab === "all" || r.category === activeTab;
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.notes ?? "").toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  async function addResource(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch("/api/vault", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
          status: "active",
        }),
      });
      if (res.ok) {
        setForm(EMPTY_FORM);
        setShowAdd(false);
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteResource(id: string) {
    if (!confirm("Delete this resource?")) return;
    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/vault/${id}`, { method: "DELETE" });
      if (res.ok) {
        setResources((prev) => prev.filter((r) => r.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  function exportCSV() {
    const rows = [["Title", "Category", "URL", "Notes", "Tags", "Created"]];
    filtered.forEach((r) => rows.push([r.title, r.category, r.url, r.notes ?? "", (r.tags ?? []).join(";"), r.created_at]));
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "vault.csv";
    a.click();
  }

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-xl border border-blue-200 shadow-inner">
            <BookMarked className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900">Resource Vault</h1>
            <p className="text-slate-500 font-medium">{resources.length} resources saved</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold shadow-lg shadow-blue-500/30 transition-all text-sm"
          >
            <Plus className="w-4 h-4" /> Add Resource
          </button>
        </div>
      </header>

      {/* Search + Tabs */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex items-center gap-2 bg-white rounded-full border border-slate-200 px-4 py-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources…"
            className="bg-transparent border-none outline-none text-slate-700 font-medium text-sm flex-1 placeholder-slate-400"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "all" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "border border-slate-200 text-slate-500 hover:border-blue-300"}`}
          >
            All
          </button>
          {(Object.keys(CATEGORY_META) as Category[]).map((cat) => {
            const m = CATEGORY_META[cat];
            const Icon = m.icon;
            return (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                  activeTab === cat ? `${m.bg} ${m.color} ${m.border}` : "border-slate-200 text-slate-500 hover:border-blue-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center">
          <BookMarked className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-bold">No resources yet. Add your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {filtered.map((r, i) => {
              const m = CATEGORY_META[r.category] ?? CATEGORY_META.free;
              const Icon = m.icon;
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass-panel rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-md transition-all group relative"
                >
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border mb-3 ${m.bg} ${m.color} ${m.border}`}>
                    <Icon className="w-3 h-3" /> {m.label}
                  </div>
                  <h3 className="font-extrabold text-slate-900 mb-1 line-clamp-2 pr-6">{r.title}</h3>
                  {r.notes && <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-3">{r.notes}</p>}
                  {r.tags?.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-3">
                      {r.tags.slice(0, 3).map((t) => (
                        <span key={t} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-auto pt-3 border-t border-slate-100">
                    <a href={r.url} target="_blank" rel="noreferrer"
                      className="flex-1 flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 truncate">
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{r.url.replace(/^https?:\/\//, "")}</span>
                    </a>
                    <button
                      onClick={() => deleteResource(r.id)}
                      disabled={deletingId === r.id}
                      className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      {deletingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowAdd(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Plus className="w-6 h-6 text-blue-600" /> Add Resource
                </h2>
                <button onClick={() => setShowAdd(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={addResource} className="space-y-4">
                <div>
                  <label className="block text-slate-700 text-sm font-bold mb-1">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold text-sm">
                    {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
                      <option key={c} value={c}>{CATEGORY_META[c].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 text-sm font-bold mb-1">Title</label>
                  <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-medium text-sm"
                    placeholder="e.g. FastAPI Full Course" />
                </div>
                <div>
                  <label className="block text-slate-700 text-sm font-bold mb-1">URL</label>
                  <input required type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-medium text-sm"
                    placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-slate-700 text-sm font-bold mb-1">Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-medium text-sm min-h-[80px] resize-none"
                    placeholder="Why this matters…" />
                </div>
                <div>
                  <label className="block text-slate-700 text-sm font-bold mb-1">Tags (comma separated)</label>
                  <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-medium text-sm"
                    placeholder="python, ai, must-do" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAdd(false)}
                    className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 disabled:opacity-50 transition-colors">
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
