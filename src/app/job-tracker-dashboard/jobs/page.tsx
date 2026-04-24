"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Building2, ExternalLink, Calendar, Plus, Search, Filter, Tag, CheckCircle2, Clock, XCircle, ChevronDown, Trash2, LayoutDashboard, Target, Activity, Flame, Zap, X, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isMock, setIsMock] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchAiInsight();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      if (data.success) {
        setJobs(data.data);
        if (data.isMock) setIsMock(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateJobStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status, 
          ...(status === 'applied' ? { appliedAt: new Date() } : {}) 
        })
      });
      if (res.ok) {
        if (isMock) {
           setJobs(jobs.map(j => j._id === id ? { ...j, status, ...(status === 'applied' ? { appliedAt: new Date() } : {}) } : j));
           if (selectedJob && selectedJob._id === id) {
              setSelectedJob({ ...selectedJob, status, ...(status === 'applied' ? { appliedAt: new Date() } : {}) });
           }
        } else {
           fetchJobs();
           if (selectedJob && selectedJob._id === id) {
             setSelectedJob({ ...selectedJob, status });
           }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };
  
  const fetchAiInsight = async () => {
    setInsightLoading(true);
    try {
      const res = await fetch('/api/ai/suggestions', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'insight' }) 
      });
      const data = await res.json();
      if (data.success) {
        setAiInsight(data.insight);
      }
    } catch (err) {
      console.error('Failed to fetch AI insight:', err);
    } finally {
      setInsightLoading(false);
    }
  };

  const fetchAiSuggestions = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/suggestions', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'suggestions' }) 
      });
      const data = await res.json();
      if (data.success) {
        setAiSuggestions(data.suggestions);
      }
    } catch (err) {
      console.error('Failed to fetch AI suggestions:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const acceptAiSuggestion = async (suggestion: any) => {
    // Basic implementation for jobs page
    setAiSuggestions(prev => prev ? prev.filter(s => s.text !== suggestion.text) : null);
  };

  const rejectAiSuggestion = (suggestionText: string) => {
    setAiSuggestions(prev => prev ? prev.filter(s => s.text !== suggestionText) : null);
  };

  const deleteJob = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (isMock) {
           setJobs(jobs.filter(j => j._id !== id));
        } else {
           fetchJobs();
        }
        if (selectedJob && selectedJob._id === id) setSelectedJob(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesFilter = filter === 'all' || job.status === filter;
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          job.company.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'new': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'applied': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'interviewing': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'offer': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'rejected': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const columns = [
    { id: 'new', title: 'New Matches', color: 'border-blue-300', bg: 'bg-blue-50/50' },
    { id: 'applied', title: 'Applied', color: 'border-yellow-300', bg: 'bg-yellow-50/50' },
    { id: 'interviewing', title: 'Interviewing', color: 'border-purple-300', bg: 'bg-purple-50/50' },
    { id: 'offer', title: 'Offers', color: 'border-emerald-300', bg: 'bg-emerald-50/50' }
  ];

  const totalApplied = jobs.filter(j => j.status !== 'new').length;
  const interviewRate = totalApplied > 0 
    ? Math.round((jobs.filter(j => j.status === 'interviewing' || j.status === 'offer').length / totalApplied) * 100) 
    : 0;

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto">
      {isMock && (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-4 rounded mb-8 flex justify-between items-center shadow-sm">
          <p><strong>Demo Mode Active:</strong> You are viewing mock data. Add your MongoDB URI to `.env.local` to start saving your real jobs.</p>
        </div>
      )}
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2 flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl shadow-inner border border-blue-200">
              <Briefcase className="w-8 h-8 text-blue-600" />
            </div>
            Job Orbit
          </h1>
          <p className="text-slate-500 text-lg">Your intelligent career command center</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="glass-panel px-4 py-2 flex items-center gap-2 rounded-full bg-white/60 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search companies or titles..." 
              className="bg-transparent border-none outline-none text-slate-700 w-full font-medium placeholder-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex bg-slate-200/50 p-1 rounded-full">
            <button 
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${viewMode === 'grid' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Grid
            </button>
            <button 
              onClick={() => setViewMode('kanban')}
              className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${viewMode === 'kanban' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Board
            </button>
          </div>

          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-semibold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40"
          >
            <Plus className="w-5 h-5" />
            Add Job
          </button>
        </div>
      </header>
      
      {/* AI Strategic Briefing */}
      <AnimatePresence mode="wait">
        {(aiInsight || insightLoading) && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2.5rem] p-1 border-none shadow-2xl shadow-blue-100 overflow-hidden mb-10">
            <div className="bg-white/95 backdrop-blur-md rounded-[2.3rem] p-6 md:p-8 flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="flex flex-col gap-2 max-w-xl">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200">
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Strategic Insight</h3>
                    </div>
                    {insightLoading ? (
                        <div className="h-6 w-48 bg-slate-100 animate-pulse rounded-md"></div>
                    ) : (
                        <p className="text-sm font-bold text-slate-500 italic leading-relaxed">
                            "{aiInsight}"
                        </p>
                    )}
                </div>

                <div className="hidden lg:block h-12 w-px bg-slate-100"></div>

                <div className="flex-1 flex items-center justify-center lg:justify-end overflow-hidden gap-3 py-1 w-full lg:w-auto">
                    {aiSuggestions ? (
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 pt-1">
                            {aiSuggestions.map((suggestion, i) => (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={i} className="group flex shrink-0 items-center gap-4 p-3 pr-4 bg-slate-50 hover:bg-white rounded-2xl border border-transparent hover:border-blue-200 transition-all cursor-default">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${suggestion.category === 'learning' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {suggestion.category === 'learning' ? <BookOpen className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                                    </div>
                                    <p className="text-[11px] font-black text-slate-700 max-w-[150px] leading-tight">{suggestion.text}</p>
                                    <div className="flex gap-1 border-l border-slate-200 pl-3">
                                        <button onClick={() => rejectAiSuggestion(suggestion.text)} className="p-1.5 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"><X className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => acceptAiSuggestion(suggestion)} className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-all"><CheckCircle2 className="w-3.5 h-3.5" /></button>
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
                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <Target className="w-4 h-4" />
                            )}
                            Get Mission Suggestions
                        </button>
                    )}
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-500 font-medium">Total Tracked</h3>
            <LayoutDashboard className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-slate-800">{jobs.length}</p>
        </div>
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-500 font-medium">Applied</h3>
            <Target className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-slate-800">{totalApplied}</p>
        </div>
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-500 font-medium">Interviewing</h3>
            <Activity className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-slate-800">{jobs.filter(j => j.status === 'interviewing').length}</p>
        </div>
        <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between border-b-4 border-emerald-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-500 font-medium">Success Rate</h3>
            <Flame className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-slate-800">{interviewRate}%</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredJobs.map((job) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={job._id}
                onClick={() => setSelectedJob(job)}
                className="glass-panel rounded-2xl p-6 cursor-pointer hover:-translate-y-1 transition-all duration-300 flex flex-col group relative overflow-hidden bg-white/70 hover:bg-white"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="w-5 h-5 text-slate-400" />
                </div>
                
                <div className="mb-4">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border mb-4 ${getStatusColor(job.status)}`}>
                    {job.status.toUpperCase()}
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 mb-1 line-clamp-2">{job.title}</h3>
                  <div className="flex items-center gap-2 text-slate-600 font-medium">
                    <Building2 className="w-4 h-4" />
                    {job.company}
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-slate-200 flex justify-between items-center text-sm text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    {format(new Date(job.createdAt), 'MMM d')}
                  </span>
                  <span className={`capitalize px-2 py-1 rounded-md text-xs font-bold ${job.source === 'scraper' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                    {job.source}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredJobs.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center glass-panel rounded-3xl bg-white/50">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Search className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">No jobs found</h3>
              <p className="text-slate-500 max-w-md">Try adjusting your search query or add a new job.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-6 overflow-x-auto pb-8 min-h-[500px]">
          {columns.map(col => (
            <div key={col.id} className={`flex-1 min-w-[300px] rounded-3xl border-t-4 ${col.color} ${col.bg} p-4 flex flex-col`}>
              <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="font-extrabold text-slate-800">{col.title}</h3>
                <span className="bg-white text-slate-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                  {filteredJobs.filter(j => j.status === col.id).length}
                </span>
              </div>
              <div className="flex flex-col gap-4 flex-1">
                <AnimatePresence>
                  {filteredJobs.filter(j => j.status === col.id).map(job => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={job._id}
                      onClick={() => setSelectedJob(job)}
                      className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
                    >
                      <h4 className="font-bold text-slate-900 mb-1">{job.title}</h4>
                      <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-3">
                        <Building2 className="w-3.5 h-3.5" />
                        {job.company}
                      </div>
                      {job.appliedAt && (
                        <div className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded inline-block">
                          Applied {format(new Date(job.appliedAt), 'MMM d')}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedJob(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border mb-4 ${getStatusColor(selectedJob.status)}`}>
                      {selectedJob.status.toUpperCase()}
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 mb-2">{selectedJob.title}</h2>
                    <div className="flex items-center gap-4 text-slate-600 text-lg font-medium">
                      <span className="flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-500" /> {selectedJob.company}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedJob(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex gap-3 mb-8">
                  <a 
                    href={selectedJob.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-3 rounded-xl font-semibold transition-colors shadow-md shadow-blue-500/20"
                  >
                    View Job Posting
                  </a>
                  <select
                    className="flex-1 bg-white border-2 border-slate-200 text-slate-700 py-3 px-4 rounded-xl font-bold appearance-none outline-none focus:border-blue-500 transition-colors cursor-pointer"
                    value={selectedJob.status}
                    onChange={(e) => updateJobStatus(selectedJob._id, e.target.value)}
                  >
                    <option value="new">Mark as New</option>
                    <option value="applied">Mark as Applied</option>
                    <option value="interviewing">Interviewing</option>
                    <option value="offer">Got Offer!</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="space-y-6">
                  {selectedJob.reasoning && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 shadow-inner">
                      <h4 className="text-indigo-600 text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Tag className="w-4 h-4" /> AI Evaluation
                      </h4>
                      <p className="text-slate-700 font-medium leading-relaxed">{selectedJob.reasoning}</p>
                    </div>
                  )}
                  
                  {selectedJob.notes && (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 shadow-inner">
                      <h4 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                        Notes
                      </h4>
                      <p className="text-slate-700 font-medium leading-relaxed">{selectedJob.notes}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
                      <h4 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">Added On</h4>
                      <p className="text-slate-900 font-bold flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        {format(new Date(selectedJob.createdAt), 'PPP')}
                      </p>
                    </div>
                    {selectedJob.appliedAt && (
                      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
                        <h4 className="text-blue-600 text-sm font-bold uppercase tracking-wider mb-2">Applied On</h4>
                        <p className="text-blue-900 font-bold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-blue-500" />
                          {format(new Date(selectedJob.appliedAt), 'PPP')}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-6 mt-6 border-t border-slate-200 flex justify-end">
                    <button 
                      onClick={() => deleteJob(selectedJob._id)}
                      className="text-rose-500 font-semibold hover:text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Job
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      {isAddModalOpen && <AddJobModal onClose={() => setIsAddModalOpen(false)} onAdd={fetchJobs} isMock={isMock} />}
    </div>
  );
}

function AddJobModal({ onClose, onAdd, isMock }: { onClose: () => void, onAdd: () => void, isMock: boolean }) {
  const [formData, setFormData] = useState({ title: '', company: '', url: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, source: 'manual' })
      });
      if (res.ok) {
        if (!isMock) onAdd();
        else window.location.reload(); // Quick refresh to show mock update limitation
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-panel bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 p-8">
        <h2 className="text-2xl font-extrabold text-slate-900 mb-6 flex items-center gap-2">
          <Plus className="w-6 h-6 text-blue-600" />
          Add Job Manually
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-700 text-sm font-bold mb-2">Job Title</label>
            <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium" placeholder="e.g. Backend Engineer" />
          </div>
          <div>
            <label className="block text-slate-700 text-sm font-bold mb-2">Company</label>
            <input required type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium" placeholder="e.g. Acme Corp" />
          </div>
          <div>
            <label className="block text-slate-700 text-sm font-bold mb-2">URL</label>
            <input required type="url" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium" placeholder="https://..." />
          </div>
          <div>
            <label className="block text-slate-700 text-sm font-bold mb-2">Notes (Optional)</label>
            <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium min-h-[100px]" placeholder="Add context or details..." />
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
