"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map, ChevronDown, ChevronRight, CheckCircle2, Circle, Clock,
  ExternalLink, Target, Loader2, Pencil, X, Plus, Trash2, ShieldCheck,
} from "lucide-react";
import { apiFetch } from "@/lib/backend";

type TopicStatus = "not_started" | "in_progress" | "completed";

interface RewardConfig { type: "coins" | "custom"; coins?: number; rewardId?: string; rewardLabel?: string; quantity?: number; }
interface Resource { title: string; url: string; type: string; }
interface Topic { id: string; title: string; notes?: string; resources: Resource[]; reward_config?: RewardConfig | null; progress: { status: TopicStatus }; }
interface Stage {
  id: string; track: string; order_index: number;
  title: string; description: string;
  do_list: string[]; dont_list: string[]; project_spec: string;
  reward_config?: RewardConfig | null;
  topics: Topic[];
}

// ─── Reward Config Editor ─────────────────────────────────────────────────────
interface CatalogueReward { _id: string; label: string; emoji: string; }

function RewardConfigEditor({ value, onChange }: {
  value: RewardConfig | null | undefined;
  onChange: (rc: RewardConfig | null) => void;
}) {
  const [catalogue, setCatalogue] = useState<CatalogueReward[]>([]);
  useEffect(() => {
    fetch("/api/rewards").then(r=>r.json()).then(d=>setCatalogue(Array.isArray(d)?d:[])).catch(()=>{});
  }, []);

  const type = value?.type ?? "coins";

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
      <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Completion Reward</p>
      <div className="flex gap-2">
        <button type="button" onClick={()=>onChange({...(value??{}), type:"coins"})}
          className={`flex-1 py-2 rounded-xl text-xs font-black border-2 transition-all ${type==="coins"?"bg-amber-500 text-white border-amber-500":"bg-white text-slate-500 border-slate-200 hover:border-amber-300"}`}>
          🪙 Coins
        </button>
        <button type="button" onClick={()=>onChange({...(value??{}), type:"custom"})}
          className={`flex-1 py-2 rounded-xl text-xs font-black border-2 transition-all ${type==="custom"?"bg-blue-600 text-white border-blue-600":"bg-white text-slate-500 border-slate-200 hover:border-blue-300"}`}>
          🎁 Custom Reward
        </button>
        {value && (
          <button type="button" onClick={()=>onChange(null)} className="px-3 py-2 text-slate-300 hover:text-rose-500 rounded-xl transition-colors" title="Remove reward override">
            <X className="w-3.5 h-3.5"/>
          </button>
        )}
      </div>

      {type === "coins" && (
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Coins amount <span className="font-medium normal-case">(leave blank for global default)</span></label>
          <input type="number" min={0} value={value?.coins ?? ""} onChange={e=>onChange({...value??{type:"coins"}, type:"coins", coins: e.target.value===""?undefined:Number(e.target.value)})}
            placeholder="e.g. 50"
            className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-amber-400"/>
        </div>
      )}

      {type === "custom" && (
        <div className="space-y-2">
          {catalogue.length > 0 ? (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Reward from catalogue</label>
              <select value={value?.rewardId ?? ""} onChange={e=>{
                const r = catalogue.find(c=>c._id===e.target.value);
                onChange({...value??{type:"custom"}, type:"custom", rewardId: e.target.value, rewardLabel: r?.label});
              }} className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-400">
                <option value="">— pick a reward —</option>
                {catalogue.map(r=><option key={r._id} value={r._id}>{r.emoji} {r.label}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Reward label</label>
              <input value={value?.rewardLabel ?? ""} onChange={e=>onChange({...value??{type:"custom"}, type:"custom", rewardLabel: e.target.value})}
                placeholder="e.g. Coffee break, Snack, Day off"
                className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-400"/>
            </div>
          )}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Quantity</label>
            <input type="number" min={1} value={value?.quantity ?? 1} onChange={e=>onChange({...value??{type:"custom"}, type:"custom", quantity: Number(e.target.value)})}
              className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-blue-400"/>
          </div>
        </div>
      )}

      {!value && (
        <button type="button" onClick={()=>onChange({type:"coins"})}
          className="w-full text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors">
          + Set custom reward for this item
        </button>
      )}
    </div>
  );
}

const STATUS_LABEL: Record<TopicStatus, string> = { not_started: "Not Started", in_progress: "In Progress", completed: "Completed" };
const STATUS_COLOR: Record<TopicStatus, string> = {
  not_started: "bg-slate-100 text-slate-500 border-slate-200",
  in_progress:  "bg-amber-100 text-amber-700 border-amber-200",
  completed:    "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const TRACK_PALETTE = [
  { bg: "bg-blue-50",    border: "border-blue-200",    accent: "text-blue-600",    badge: "bg-blue-100 text-blue-700 border-blue-200",       bar: "bg-blue-500",    dot: "bg-blue-500"    },
  { bg: "bg-violet-50",  border: "border-violet-200",  accent: "text-violet-600",  badge: "bg-violet-100 text-violet-700 border-violet-200",  bar: "bg-violet-500",  dot: "bg-violet-500"  },
  { bg: "bg-emerald-50", border: "border-emerald-200", accent: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700 border-emerald-200", bar: "bg-emerald-500", dot: "bg-emerald-500" },
  { bg: "bg-rose-50",    border: "border-rose-200",    accent: "text-rose-600",    badge: "bg-rose-100 text-rose-700 border-rose-200",         bar: "bg-rose-500",    dot: "bg-rose-500"    },
  { bg: "bg-amber-50",   border: "border-amber-200",   accent: "text-amber-600",   badge: "bg-amber-100 text-amber-700 border-amber-200",      bar: "bg-amber-500",   dot: "bg-amber-500"   },
  { bg: "bg-cyan-50",    border: "border-cyan-200",    accent: "text-cyan-600",    badge: "bg-cyan-100 text-cyan-700 border-cyan-200",         bar: "bg-cyan-500",    dot: "bg-cyan-500"    },
  { bg: "bg-pink-50",    border: "border-pink-200",    accent: "text-pink-600",    badge: "bg-pink-100 text-pink-700 border-pink-200",         bar: "bg-pink-500",    dot: "bg-pink-500"    },
  { bg: "bg-indigo-50",  border: "border-indigo-200",  accent: "text-indigo-600",  badge: "bg-indigo-100 text-indigo-700 border-indigo-200",   bar: "bg-indigo-500",  dot: "bg-indigo-500"  },
];

function trackColor(track: string, allTracks: string[]) {
  const idx = allTracks.indexOf(track);
  return TRACK_PALETTE[(idx < 0 ? 0 : idx) % TRACK_PALETTE.length];
}

function trackLabel(track: string) {
  return track.toUpperCase() + " Track";
}

// ─── Stage edit modal ─────────────────────────────────────────────────────────
function StageModal({ stage, knownTracks, onClose, onSave }: {
  stage: Stage; knownTracks: string[]; onClose: () => void; onSave: (u: Partial<Stage>) => void;
}) {
  const [f, setF] = useState({
    title: stage.title, track: stage.track, description: stage.description,
    project_spec: stage.project_spec, do_list: [...stage.do_list], dont_list: [...stage.dont_list],
  });
  const [rewardConfig, setRewardConfig] = useState<RewardConfig | null | undefined>(stage.reward_config);
  const [newTrack, setNewTrack] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!f.title.trim()) { setError("Title required"); return; }
    setSaving(true);
    const res = await apiFetch(`/api/admin/roadmap/stages/${stage.id}`, {
      method: "PATCH",
      body: JSON.stringify({ title: f.title, track: f.track, description: f.description, projectSpec: f.project_spec, doList: f.do_list.filter(Boolean), dontList: f.dont_list.filter(Boolean), rewardConfig: rewardConfig ?? null }),
    });
    setSaving(false);
    if (res.ok) onSave({ title: f.title, track: f.track, description: f.description, project_spec: f.project_spec, do_list: f.do_list.filter(Boolean), dont_list: f.dont_list.filter(Boolean), reward_config: rewardConfig ?? null });
    else setError("Save failed");
  }

  const listField = (key: "do_list"|"dont_list", color: string) => (
    <div className="space-y-2">
      {f[key].map((v, i) => (
        <div key={i} className="flex gap-2">
          <input value={v} onChange={e => setF(p => { const a = [...p[key]]; a[i]=e.target.value; return {...p,[key]:a}; })}
            className={`flex-1 bg-slate-50 border-2 border-transparent rounded-xl px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-${color}-400`} />
          <button onClick={() => setF(p => ({...p,[key]:p[key].filter((_,j)=>j!==i)}))} className="p-2 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
        </div>
      ))}
      <button onClick={() => setF(p => ({...p,[key]:[...p[key],""]} ))} className={`flex items-center gap-1.5 text-xs font-bold text-${color}-600 hover:text-${color}-700`}>
        <Plus className="w-3.5 h-3.5"/> Add item
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}/>
      <motion.div initial={{opacity:0,scale:0.95,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95}}
        className="glass-panel bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl relative z-10 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2"><Pencil className="w-5 h-5 text-blue-500"/> Edit Stage</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X className="w-5 h-5"/></button>
        </div>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Title</label>
              <input value={f.title} onChange={e=>setF({...f,title:e.target.value})} className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-2.5 outline-none focus:border-blue-400 font-bold text-slate-800"/>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Track</label>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {knownTracks.map(t=>(
                    <button key={t} type="button" onClick={()=>setF({...f,track:t})}
                      className={`px-3 py-1.5 rounded-full text-xs font-black border transition-all ${f.track===t?"bg-blue-600 text-white border-blue-600":"bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600"}`}>
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input value={newTrack} onChange={e=>setNewTrack(e.target.value.toLowerCase().replace(/\s+/g,"-"))}
                    placeholder="new-track"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-400"/>
                  <button type="button" disabled={!newTrack.trim()} onClick={()=>{if(newTrack.trim()){setF({...f,track:newTrack.trim()});setNewTrack("");}}}
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-black disabled:opacity-40 transition-colors">
                    Use
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Selected: <span className="font-black text-slate-600">{f.track.toUpperCase()}</span></p>
              </div>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Description</label>
            <textarea value={f.description} onChange={e=>setF({...f,description:e.target.value})} className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-2.5 outline-none focus:border-blue-400 font-medium text-slate-800 min-h-[70px] resize-none"/>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Stage Project</label>
            <textarea value={f.project_spec} onChange={e=>setF({...f,project_spec:e.target.value})} className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-2.5 outline-none focus:border-blue-400 font-medium text-slate-800 min-h-[60px] resize-none"/>
          </div>
          <div>
            <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1.5">Do List</label>
            {listField("do_list","emerald")}
          </div>
          <div>
            <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest block mb-1.5">Don't List</label>
            {listField("dont_list","rose")}
          </div>
          <RewardConfigEditor value={rewardConfig} onChange={setRewardConfig}/>
        </div>
        {error && <p className="text-xs font-bold text-rose-500 mt-4">{error}</p>}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-black transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-colors">
            {saving?"Saving…":"Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Topic edit modal ─────────────────────────────────────────────────────────
function TopicModal({ topic, onClose, onSave }: {
  topic: Topic; onClose: () => void; onSave: (u: Partial<Topic>) => void;
}) {
  const [title, setTitle] = useState(topic.title);
  const [notes, setNotes] = useState(topic.notes ?? "");
  const [resources, setResources] = useState<{title:string;url:string}[]>(
    topic.resources.length ? topic.resources.map(r=>({title:r.title,url:r.url})) : []
  );
  const [rewardConfig, setRewardConfig] = useState<RewardConfig | null | undefined>(topic.reward_config);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!title.trim()) { setError("Title required"); return; }
    setSaving(true);
    const res = await apiFetch(`/api/admin/roadmap/topics/${topic.id}`, {
      method: "PATCH",
      body: JSON.stringify({ title, notes, resources: resources.filter(r=>r.title.trim()&&r.url.trim()).map(r=>({label:r.title,url:r.url})), rewardConfig: rewardConfig ?? null }),
    });
    setSaving(false);
    if (res.ok) onSave({ title, notes, resources: resources.filter(r=>r.title.trim()&&r.url.trim()).map(r=>({title:r.title,url:r.url,type:"link"})), reward_config: rewardConfig ?? null });
    else setError("Save failed");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}/>
      <motion.div initial={{opacity:0,scale:0.95,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95}}
        className="glass-panel bg-white w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl relative z-10 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2"><Pencil className="w-5 h-5 text-blue-500"/> Edit Topic</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X className="w-5 h-5"/></button>
        </div>
        <div className="space-y-5">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Topic Title</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-2.5 outline-none focus:border-blue-400 font-bold text-slate-800"/>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Add study notes, tips, or context for this topic…"
              className="w-full bg-slate-50 border-2 border-transparent rounded-xl px-4 py-2.5 outline-none focus:border-blue-400 font-medium text-slate-700 text-sm resize-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Resources</label>
            <div className="space-y-3">
              {resources.map((r,i) => (
                <div key={i} className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-2">
                  <div className="flex gap-2 items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase w-10 shrink-0">Label</span>
                    <input value={r.title} onChange={e=>setResources(rs=>rs.map((x,j)=>j===i?{...x,title:e.target.value}:x))}
                      placeholder="e.g. Official Docs"
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-400"/>
                    <button onClick={()=>setResources(rs=>rs.filter((_,j)=>j!==i))} className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors shrink-0"><Trash2 className="w-3.5 h-3.5"/></button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase w-10 shrink-0">URL</span>
                    <input value={r.url} onChange={e=>setResources(rs=>rs.map((x,j)=>j===i?{...x,url:e.target.value}:x))}
                      placeholder="https://..."
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-600 outline-none focus:border-blue-400"/>
                  </div>
                </div>
              ))}
              <button onClick={()=>setResources(rs=>[...rs,{title:"",url:""}])}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                <Plus className="w-3.5 h-3.5"/> Add resource
              </button>
            </div>
          </div>
          <RewardConfigEditor value={rewardConfig} onChange={setRewardConfig}/>
        </div>
        {error && <p className="text-xs font-bold text-rose-500 mt-4">{error}</p>}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-black transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-colors">
            {saving?"Saving…":"Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Add topic inline form ────────────────────────────────────────────────────
function AddTopicRow({ stageId, onAdded }: { stageId: string; onAdded: (t: Topic) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const res = await apiFetch("/api/admin/roadmap/topics", {
      method: "POST",
      body: JSON.stringify({ stageId, title }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      onAdded({ id: data.topicId, title: data.title, resources: [], progress: { status: "not_started" } });
      setTitle("");
      setOpen(false);
    }
  }

  if (!open) return (
    <button onClick={()=>setOpen(true)} className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500 font-bold text-sm transition-all mt-1">
      <Plus className="w-4 h-4"/> Add topic
    </button>
  );

  return (
    <form onSubmit={submit} className="flex gap-2 mt-1">
      <input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Topic title…"
        className="flex-1 bg-white border-2 border-blue-300 rounded-xl px-4 py-2.5 font-medium text-slate-800 text-sm outline-none"/>
      <button type="submit" disabled={saving||!title.trim()} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm disabled:opacity-50 transition-colors">
        {saving?"…":"Add"}
      </button>
      <button type="button" onClick={()=>setOpen(false)} className="px-3 py-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-4 h-4"/></button>
    </form>
  );
}

// ─── Add stage inline form ────────────────────────────────────────────────────
function AddStageRow({ knownTracks, onAdded }: { knownTracks: string[]; onAdded: (s: Stage) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [track, setTrack] = useState(knownTracks[0] ?? "ai");
  const [newTrack, setNewTrack] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError("");
    const res = await apiFetch("/api/admin/roadmap/stages", {
      method: "POST",
      body: JSON.stringify({ title, track }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      onAdded({
        id: data.stageId, track: data.track,
        order_index: data.orderIndex ?? 99,
        title: data.title, description: data.description ?? "",
        do_list: data.doList ?? [], dont_list: data.dontList ?? [],
        project_spec: data.projectSpec ?? "", topics: [],
      });
      setTitle("");
      setOpen(false);
    } else {
      setError("Failed to create stage");
    }
  }

  if (!open) return (
    <button onClick={()=>setOpen(true)}
      className="flex items-center gap-2 w-full px-6 py-4 rounded-2xl border-2 border-dashed border-amber-300 text-amber-500 hover:border-amber-400 hover:bg-amber-50 font-black text-sm transition-all">
      <Plus className="w-5 h-5"/> Add Stage
    </button>
  );

  return (
    <div className="glass-panel rounded-2xl border border-amber-300 p-5 bg-amber-50/60">
      <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest mb-4 flex items-center gap-2"><Plus className="w-3.5 h-3.5"/> New Stage</h3>
      <form onSubmit={submit} className="space-y-3">
        <input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Stage title…"
          className="w-full bg-white border-2 border-amber-200 focus:border-amber-400 rounded-xl px-4 py-2.5 font-bold text-slate-800 text-sm outline-none"/>
        <div>
          <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1.5">Track</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {knownTracks.map(t=>(
              <button key={t} type="button" onClick={()=>setTrack(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-black border transition-all ${track===t?"bg-amber-500 text-white border-amber-500":"bg-white text-slate-500 border-slate-200 hover:border-amber-300 hover:text-amber-600"}`}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input value={newTrack} onChange={e=>setNewTrack(e.target.value.toLowerCase().replace(/\s+/g,"-"))}
              placeholder="new-track"
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-amber-400"/>
            <button type="button" disabled={!newTrack.trim()} onClick={()=>{if(newTrack.trim()){setTrack(newTrack.trim());setNewTrack("");}}}
              className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl text-xs font-black disabled:opacity-40 transition-colors">
              Use
            </button>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Selected: <span className="font-black text-slate-600">{track.toUpperCase()}</span></p>
        </div>
        {error && <p className="text-xs font-bold text-rose-500">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={saving||!title.trim()}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-sm disabled:opacity-50 transition-colors">
            {saving?"Creating…":"Create Stage"}
          </button>
          <button type="button" onClick={()=>setOpen(false)}
            className="px-4 py-2.5 text-slate-500 hover:bg-white rounded-xl font-bold text-sm transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RoadmapPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [activeTrack, setActiveTrack] = useState<string>("all");
  const [updating, setUpdating] = useState<string|null>(null);
  const [coinToast, setCoinToast] = useState<{coins:number;happyHour:boolean}|null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage|null>(null);
  const [editingTopic, setEditingTopic] = useState<{stageIdx:number;topicIdx:number;topic:Topic}|null>(null);
  const [deletingStage, setDeletingStage] = useState<string|null>(null);
  const [deletingTopic, setDeletingTopic] = useState<string|null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/roadmap").then(r=>r.json()),
      apiFetch("/api/me").then(r=>r.json()),
    ])
      .then(([roadmapData, me]) => {
        setStages(roadmapData);
        if (roadmapData.length>0) setExpanded({[roadmapData[0].id]:true});
        setIsAdmin(me.role==="admin");
      })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, []);

  async function cycleStatus(topicId: string, current: TopicStatus) {
    if (editMode) return;
    const next: TopicStatus = current==="not_started"?"in_progress":current==="in_progress"?"completed":"not_started";
    setStages(prev=>prev.map(s=>({...s,topics:s.topics.map(t=>t.id===topicId?{...t,progress:{status:next}}:t)})));
    setUpdating(topicId);
    try {
      const res = await apiFetch(`/api/roadmap/topics/${topicId}`,{method:"PATCH",body:JSON.stringify({status:next})});
      if (res.ok) {
        const data = await res.json();
        if (data.coinsAwarded>0) { setCoinToast({coins:data.coinsAwarded,happyHour:data.happyHour}); setTimeout(()=>setCoinToast(null),4000); }
      } else {
        setStages(prev=>prev.map(s=>({...s,topics:s.topics.map(t=>t.id===topicId?{...t,progress:{status:current}}:t)})));
      }
    } catch {
      setStages(prev=>prev.map(s=>({...s,topics:s.topics.map(t=>t.id===topicId?{...t,progress:{status:current}}:t)})));
    } finally { setUpdating(null); }
  }

  async function deleteStage(stageId: string) {
    if (!confirm("Delete this stage and all its topics?")) return;
    setDeletingStage(stageId);
    await apiFetch(`/api/admin/roadmap/stages/${stageId}`,{method:"DELETE"});
    setStages(prev=>prev.filter(s=>s.id!==stageId));
    setDeletingStage(null);
  }

  async function deleteTopic(topicId: string, stageIdx: number) {
    if (!confirm("Delete this topic?")) return;
    setDeletingTopic(topicId);
    await apiFetch(`/api/admin/roadmap/topics/${topicId}`,{method:"DELETE"});
    setStages(prev=>prev.map((s,si)=>si!==stageIdx?s:{...s,topics:s.topics.filter(t=>t.id!==topicId)}));
    setDeletingTopic(null);
  }

  const knownTracks = Array.from(new Set(stages.map(s=>s.track))).filter(Boolean);
  const filtered = activeTrack==="all"?stages:stages.filter(s=>s.track===activeTrack);
  const totalTopics = stages.flatMap(s=>s.topics).length;
  const doneTopics = stages.flatMap(s=>s.topics).filter(t=>t.progress?.status==="completed").length;
  const pct = totalTopics>0?Math.round((doneTopics/totalTopics)*100):0;

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-5xl mx-auto">

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-xl border border-blue-200 shadow-inner">
            <Map className="w-8 h-8 text-blue-600"/>
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Roadmap</h1>
            <p className="text-slate-500 text-base font-medium">Backend Intern → AI Engineer</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={()=>setEditMode(m=>!m)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all ${editMode?"bg-amber-500 text-white shadow-lg shadow-amber-200":"bg-white border border-slate-200 text-slate-500 hover:border-amber-400 hover:text-amber-600"}`}
            >
              <ShieldCheck className="w-4 h-4"/>
              {editMode?"Exit Edit Mode":"Admin Edit"}
            </button>
          )}
          <div className="glass-panel rounded-2xl px-6 py-4 min-w-[200px]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Progress</span>
              <span className="text-sm font-black text-blue-600">{pct}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <motion.div className="bg-blue-500 h-2 rounded-full" initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:1,ease:"easeOut"}}/>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">{doneTopics}/{totalTopics} topics done</p>
          </div>
        </div>
      </header>

      {/* Edit mode banner */}
      <AnimatePresence>
        {editMode && (
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
            className="mb-6 flex items-center gap-3 px-5 py-3 bg-amber-400 rounded-2xl shadow-lg shadow-amber-200">
            <ShieldCheck className="w-5 h-5 text-amber-900 shrink-0"/>
            <span className="text-amber-900 font-black text-sm">Admin Edit Mode — pencil icons are visible on all stages and topics. Topic progress cycling is disabled.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Track filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={()=>setActiveTrack("all")}
          className={`px-5 py-2 rounded-full font-bold text-sm transition-all ${activeTrack==="all"?"bg-slate-800 text-white shadow-lg shadow-slate-500/20":"bg-white text-slate-500 border border-slate-200 hover:border-slate-400 hover:text-slate-700"}`}>
          All Tracks
        </button>
        {knownTracks.map((t,i)=>{
          const c = TRACK_PALETTE[i % TRACK_PALETTE.length];
          return (
            <button key={t} onClick={()=>setActiveTrack(t)}
              className={`px-5 py-2 rounded-full font-bold text-sm transition-all border ${activeTrack===t?`${c.bar} text-white shadow-lg border-transparent`:`bg-white ${c.accent} ${c.border} hover:opacity-80`}`}>
              {t.toUpperCase()}
            </button>
          );
        })}
      </div>

      {loading?(
        <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 text-blue-500 animate-spin"/></div>
      ):filtered.length===0?(
        <div className="space-y-4">
          <div className="glass-panel rounded-3xl p-12 text-center"><Map className="w-12 h-12 text-slate-300 mx-auto mb-3"/><p className="text-slate-500 font-bold">No stages found.</p></div>
          {editMode && (
            <AddStageRow
              knownTracks={knownTracks}
              onAdded={newStage => {
                setStages(prev => [...prev, newStage]);
                setExpanded(e => ({...e, [newStage.id]: true}));
              }}
            />
          )}
        </div>
      ):(
        <div className="space-y-4">
          {filtered.map((stage, _i) => {
            const colors = trackColor(stage.track, knownTracks);
            const isOpen = expanded[stage.id]??false;
            const stageDone = stage.topics.filter(t=>t.progress?.status==="completed").length;
            const stagePct = stage.topics.length>0?Math.round((stageDone/stage.topics.length)*100):0;
            const globalStageIdx = stages.findIndex(s=>s.id===stage.id);

            return (
              <motion.div key={stage.id} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className={`glass-panel rounded-2xl overflow-hidden border ${colors.border}`}>

                {/* Stage header */}
                <div className={`flex items-center gap-3 px-6 py-5 ${colors.bg}`}>
                  <button className="flex flex-1 items-center gap-4 text-left min-w-0"
                    onClick={()=>setExpanded(e=>({...e,[stage.id]:!isOpen}))}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-sm shrink-0 ${colors.bar}`}>
                      {stage.order_index}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${colors.badge}`}>
                          {trackLabel(stage.track)}
                        </span>
                        {stagePct===100&&<span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">✓ Complete</span>}
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-lg leading-tight truncate">{stage.title}</h3>
                      <p className="text-slate-500 text-sm font-medium line-clamp-1">{stage.description}</p>
                    </div>
                    <div className="hidden md:flex flex-col items-end gap-1 mr-2 shrink-0">
                      <span className={`text-sm font-black ${colors.accent}`}>{stagePct}%</span>
                      <div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-1.5 rounded-full ${colors.bar}`} style={{width:`${stagePct}%`}}/>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">{stageDone}/{stage.topics.length} done</span>
                    </div>
                    {isOpen?<ChevronDown className={`w-5 h-5 shrink-0 ${colors.accent}`}/>:<ChevronRight className="w-5 h-5 shrink-0 text-slate-400"/>}
                  </button>
                  {editMode&&(
                    <div className="flex gap-1 shrink-0">
                      <button onClick={()=>setEditingStage(stage)} className="p-2 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors" title="Edit stage">
                        <Pencil className="w-4 h-4"/>
                      </button>
                      <button onClick={()=>deleteStage(stage.id)} disabled={deletingStage===stage.id} className="p-2 text-rose-400 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors disabled:opacity-50" title="Delete stage">
                        {deletingStage===stage.id?<Loader2 className="w-4 h-4 animate-spin"/>:<Trash2 className="w-4 h-4"/>}
                      </button>
                    </div>
                  )}
                </div>

                {/* Stage body */}
                <AnimatePresence>
                  {isOpen&&(
                    <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.25,ease:"easeInOut"}} className="overflow-hidden">
                      <div className="px-6 pb-6 pt-4 space-y-6">

                        {/* Do / Don't */}
                        <div className="grid md:grid-cols-2 gap-4">
                          {stage.do_list?.length>0&&(
                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 mb-3 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5"/>Do</h4>
                              <ul className="space-y-1.5">{stage.do_list.map((item,i)=>(
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"/>{item}
                                </li>
                              ))}</ul>
                            </div>
                          )}
                          {stage.dont_list?.length>0&&(
                            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                              <h4 className="text-xs font-black uppercase tracking-wider text-rose-500 mb-3 flex items-center gap-1.5"><Circle className="w-3.5 h-3.5"/>Don't</h4>
                              <ul className="space-y-1.5">{stage.dont_list.map((item,i)=>(
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0"/>{item}
                                </li>
                              ))}</ul>
                            </div>
                          )}
                        </div>

                        {stage.project_spec&&(
                          <div className={`${colors.bg} border ${colors.border} rounded-2xl p-4`}>
                            <h4 className={`text-xs font-black uppercase tracking-wider ${colors.accent} mb-2 flex items-center gap-1.5`}><Target className="w-3.5 h-3.5"/>Stage Project</h4>
                            <p className="text-sm text-slate-700 font-medium leading-relaxed">{stage.project_spec}</p>
                          </div>
                        )}

                        {/* Topics */}
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Topics</h4>
                          <div className="grid gap-2">
                            {stage.topics.map((topic,topicIdx)=>{
                              const status = topic.progress?.status??"not_started";
                              return (
                                <div key={topic.id} className={`bg-white rounded-xl border px-4 py-3 transition-all ${editMode?"border-amber-200 bg-amber-50/30":"border-slate-100 hover:border-blue-200 hover:shadow-sm"}`}>
                                  <div className="flex items-center gap-3">
                                    <button onClick={()=>cycleStatus(topic.id,status)} disabled={updating===topic.id||editMode} className="shrink-0">
                                      {updating===topic.id?<Loader2 className="w-5 h-5 text-blue-400 animate-spin"/>
                                        :status==="completed"?<CheckCircle2 className="w-5 h-5 text-emerald-500"/>
                                        :status==="in_progress"?<Clock className="w-5 h-5 text-amber-500"/>
                                        :<Circle className="w-5 h-5 text-slate-300"/>}
                                    </button>
                                    <span className={`text-sm font-bold flex-1 min-w-0 ${status==="completed"&&!editMode?"line-through text-slate-400":"text-slate-800"}`}>
                                      {topic.title}
                                    </span>
                                    {!editMode&&(
                                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${STATUS_COLOR[status]}`}>
                                        {STATUS_LABEL[status]}
                                      </span>
                                    )}
                                    {!editMode&&topic.resources?.slice(0,3).map((r,i)=>(
                                      <a key={i} href={r.url} target="_blank" rel="noreferrer"
                                        className="shrink-0 text-blue-400 hover:text-blue-600 transition-colors" title={r.title}>
                                        <ExternalLink className="w-3.5 h-3.5"/>
                                      </a>
                                    ))}
                                    {editMode&&(
                                      <div className="flex gap-1.5 shrink-0">
                                        <span className="text-[10px] text-slate-400 font-medium mr-1">{topic.resources?.length??0} links</span>
                                        <button onClick={()=>setEditingTopic({stageIdx:globalStageIdx,topicIdx,topic})}
                                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl font-black text-xs transition-colors">
                                          <Pencil className="w-3 h-3"/> Edit
                                        </button>
                                        <button onClick={()=>deleteTopic(topic.id,globalStageIdx)} disabled={deletingTopic===topic.id}
                                          className="p-1.5 bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-600 rounded-xl transition-colors disabled:opacity-50">
                                          {deletingTopic===topic.id?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Trash2 className="w-3.5 h-3.5"/>}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  {topic.notes&&(
                                    <p className="mt-1.5 ml-8 text-xs text-slate-500 font-medium leading-relaxed whitespace-pre-line">{topic.notes}</p>
                                  )}
                                </div>
                              );
                            })}
                            {editMode&&(
                              <AddTopicRow
                                stageId={stage.id}
                                onAdded={newTopic=>setStages(prev=>prev.map((s,si)=>si!==globalStageIdx?s:{...s,topics:[...s.topics,newTopic]}))}
                              />
                            )}
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
          {editMode && (
            <AddStageRow
              knownTracks={knownTracks}
              onAdded={newStage => {
                setStages(prev => [...prev, newStage]);
                setExpanded(e => ({...e, [newStage.id]: true}));
              }}
            />
          )}
        </div>
      )}

      {/* Coin toast */}
      <AnimatePresence>
        {coinToast&&(
          <motion.div initial={{opacity:0,y:24,scale:0.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:16,scale:0.95}}
            className="fixed bottom-6 right-6 z-[200] bg-slate-900 text-white rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-3 max-w-xs">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0 text-lg">🗺️</div>
            <div>
              <p className="font-black text-sm">Topic completed!</p>
              <p className="text-xs text-slate-300 font-medium">+{coinToast.coins} coins{coinToast.happyHour?" · ⚡ 2x Happy Hour":""}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit modals */}
      <AnimatePresence>
        {editingStage&&<StageModal stage={editingStage} knownTracks={knownTracks} onClose={()=>setEditingStage(null)} onSave={u=>{setStages(prev=>prev.map(s=>s.id===editingStage.id?{...s,...u}:s));setEditingStage(null);}}/>}
      </AnimatePresence>
      <AnimatePresence>
        {editingTopic&&<TopicModal topic={editingTopic.topic} onClose={()=>setEditingTopic(null)} onSave={u=>{setStages(prev=>prev.map((s,si)=>si!==editingTopic.stageIdx?s:{...s,topics:s.topics.map((t,ti)=>ti!==editingTopic.topicIdx?t:{...t,...u})}));setEditingTopic(null);}}/>}
      </AnimatePresence>
    </div>
  );
}
