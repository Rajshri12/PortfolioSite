"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Circle, 
  Linkedin, 
  Mail, 
  Search, 
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
  Trophy,
  GraduationCap,
  Clock,
  Settings,
  X,
  ChevronDown,
  BarChart3,
  Flame,
  Activity,
  Award,
  BookOpen
} from 'lucide-react';
import Link from 'next/link';
import { 
  format, 
  addDays, 
  startOfWeek, 
  isSameDay, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isToday,
  parseISO,
  getDay,
  subDays,
  startOfToday
} from 'date-fns';
import { useTasks, Task } from '@/context/TaskContext';

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
  const [greeting, setGreeting] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [jobStats, setJobStats] = useState({ total: 0, applied: 0, interviews: 0 });
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    setIsMounted(true);
    fetchTasks();
    fetchJobStats();
    fetchAiInsight();
    
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
    setLoading(false);
  }, []);

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

  const fetchJobStats = async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      if (data.success) {
        const jobs = data.data;
        setJobStats({
          total: jobs.length,
          applied: jobs.filter((j: any) => j.status !== 'new').length,
          interviews: jobs.filter((j: any) => j.status === 'interviewing' || j.status === 'offer').length
        });
      }
    } catch (err) {
      console.error('Failed to fetch job stats:', err);
    }
  };

  const acceptAiSuggestion = async (suggestion: any) => {
    const taskData = {
        ...suggestion,
        recurrence: { type: 'none', days: [] },
        date: format(selectedDate, 'yyyy-MM-dd'),
        completedDates: []
    };

    try {
        const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        const data = await res.json();
        if (data.success) {
            setTasks(prev => [data.data, ...prev]);
            // Remove from suggestions
            setAiSuggestions(prev => prev ? prev.filter(s => s.text !== suggestion.text) : null);
        }
    } catch (err) {
        console.error('Failed to accept AI suggestion:', err);
    }
  };

  const rejectAiSuggestion = (suggestionText: string) => {
    setAiSuggestions(prev => prev ? prev.filter(s => s.text !== suggestionText) : null);
  };



  const toggleTask = async (taskId: string, dateStr: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const isCompleted = task.completedDates?.includes(dateStr);
    const newCompletedDates = isCompleted 
      ? task.completedDates.filter(d => d !== dateStr)
      : [...(task.completedDates || []), dateStr];

    // Immediate local update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completedDates: newCompletedDates } : t));

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedDates: newCompletedDates })
      });
      const data = await res.json();
      if (!data.success) {
        console.error('Failed to sync toggle:', data.error);
        fetchTasks(); // Sync back if DB fails
      }
    } catch (err) {
      console.error('Network error during toggle:', err);
      fetchTasks();
    }
  };

  const deleteTask = async (id: string, option: 'one' | 'following' | 'all' = 'all') => {
    // Close modal immediately for better UX
    setDeletingTask(null);
    
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const dStr = format(selectedDate, 'yyyy-MM-dd');

    if (option === 'all') {
      setTasks(prev => prev.filter(t => t.id !== id));
      try {
        await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Network error during deletion:', err);
        fetchTasks();
      }
    } else if (option === 'one') {
      const newExcluded = [...(task.excludedDates || []), dStr];
      setTasks(prev => prev.map(t => t.id === id ? { ...t, excludedDates: newExcluded } : t));
      try {
        await fetch(`/api/tasks/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ excludedDates: newExcluded })
        });
      } catch (err) {
        console.error('Failed to exclude date:', err);
        fetchTasks();
      }
    } else if (option === 'following') {
      const yesterday = format(subDays(selectedDate, 1), 'yyyy-MM-dd');
      setTasks(prev => prev.map(t => t.id === id ? { ...t, endDate: yesterday } : t));
      try {
        await fetch(`/api/tasks/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endDate: yesterday })
        });
      } catch (err) {
        console.error('Failed to set end date:', err);
        fetchTasks();
      }
    }
  };


  const isTaskVisibleOnDate = (task: Task, date: Date) => {
    const dStr = format(date, 'yyyy-MM-dd');
    
    // Check if task has ended
    if (task.endDate && dStr > task.endDate) return false;
    
    // Check if this specific date is excluded
    if (task.excludedDates?.includes(dStr)) return false;

    if (task.recurrence.type === 'none') return task.date === dStr;
    if (task.recurrence.type === 'daily') return true;
    if (task.recurrence.type === 'weekly') return task.recurrence.days.includes(getDay(date));
    return false;
  };

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const filteredTasks = tasks.filter(t => isTaskVisibleOnDate(t, selectedDate));
  
  const learningTasks = filteredTasks.filter(t => t.category === 'learning');
  const jobSearchTasks = filteredTasks.filter(t => t.category === 'job-search');

  const getCompletion = (taskList: Task[]) => {
    if (taskList.length === 0) return 0;
    const completed = taskList.filter(t => t.completedDates?.includes(dateStr)).length;
    return Math.round((completed / taskList.length) * 100);
  };

  const learningProgress = getCompletion(learningTasks);
  const jobSearchProgress = getCompletion(jobSearchTasks);

  // Calendar generation
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Stats for charts
  const last7Days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));

  const weeklyData = last7Days.map(day => {
    const dStr = format(day, 'yyyy-MM-dd');
    const dayTasks = tasks.filter(t => isTaskVisibleOnDate(t, day));
    const done = dayTasks.filter(t => t.completedDates?.includes(dStr)).length;
    const total = dayTasks.length;
    return { day: format(day, 'EEE'), progress: total > 0 ? (done / total) * 100 : 0 };
  });

  // Calculate Streaks
  const calculateStreak = (category: string) => {
    if (tasks.length === 0) return 0;
    let streak = 0;
    let checkDate = startOfToday();
    let daysSearched = 0;
    const maxSearchDays = 365;

    while (daysSearched < maxSearchDays) {
        const dStr = format(checkDate, 'yyyy-MM-dd');
        const dayTasks = tasks.filter(t => t.category === category && isTaskVisibleOnDate(t, checkDate));
        
        if (dayTasks.length === 0) {
            // If it's today and no tasks are scheduled yet, just go to yesterday
            // Otherwise, if no tasks were scheduled for a day, it doesn't break the streak
            checkDate = subDays(checkDate, 1);
            daysSearched++;
            continue;
        }

        const allDone = dayTasks.every(t => t.completedDates?.includes(dStr));
        if (allDone) {
            streak++;
            checkDate = subDays(checkDate, 1);
            daysSearched++;
        } else {
            // If today is not done, check if it's because it's still today
            if (isToday(checkDate)) {
                checkDate = subDays(checkDate, 1);
                daysSearched++;
                continue;
            }
            break;
        }
    }
    return streak;
  };


  const learningStreak = calculateStreak('learning');
  const jobStreak = calculateStreak('job-search');

  if (!isMounted) return null;

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-7xl mx-auto space-y-10" suppressHydrationWarning>
      
      {/* Header & Streaks */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div className="space-y-2">
          <p className="text-blue-600 font-bold tracking-[0.2em] uppercase text-[10px]">Productivity Command Center</p>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
            {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Visionary</span>
          </h1>

          <div className="flex items-center gap-4 text-slate-400 font-bold text-sm uppercase">
            <span className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4" /> {format(selectedDate, 'MMM do')}</span>
            <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {format(new Date(), 'h:mm a')}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
            <div className="glass-panel px-6 py-4 rounded-[2rem] bg-white shadow-sm border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                    <Flame className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                    <p className="text-2xl font-black text-slate-800 leading-none">{learningStreak}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Learn Streak</p>
                </div>
            </div>
            <div className="glass-panel px-6 py-4 rounded-[2rem] bg-white shadow-sm border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <Activity className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                    <p className="text-2xl font-black text-slate-800 leading-none">{jobStreak}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Job Search Streak</p>
                </div>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-[2rem] font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2 shadow-xl">
                <Plus className="w-5 h-5" /> New Mission
            </button>
        </div>
      </header>

      {/* AI Strategic Briefing - Promoted to Top */}
      <AnimatePresence mode="wait">
        {(aiInsight || insightLoading) && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2.5rem] p-1 border-none shadow-2xl shadow-blue-100 overflow-hidden">
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


      {/* Main Grid: Left (Missions) | Right (Charts & Stats) */}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Missions Section */}
        <div className="lg:col-span-8 space-y-10">
            
            {/* Calendar */}
            <div className="glass-panel bg-white/50 backdrop-blur-xl rounded-[2.5rem] p-4 border-white shadow-sm">
                <div className="flex items-center justify-between p-4 mb-4">
                    <h2 className="text-xl font-black text-slate-800">{format(selectedDate, 'MMMM yyyy')}</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setSelectedDate(subDays(selectedDate, 7))} className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400"><ChevronLeft className="w-5 h-5" /></button>
                        <button 
                            onClick={() => setSelectedDate(new Date())} 
                            className={`px-6 py-2 rounded-2xl text-xs font-black transition-all ${isToday(selectedDate) 
                                ? 'bg-slate-50 text-slate-400 cursor-default' 
                                : 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700'}`}
                        >
                            Today
                        </button>
                        <button onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                </div>
                <div className="flex justify-between px-2 gap-3">
                    {weekDays.map((day, i) => {
                        const active = isSameDay(day, selectedDate);
                        const current = isToday(day);
                        return (
                            <button key={i} onClick={() => setSelectedDate(day)} className={`flex-1 flex flex-col items-center py-6 rounded-[2rem] transition-all relative ${active ? 'bg-slate-900 text-white shadow-2xl scale-105 z-10' : 'hover:bg-white text-slate-400'}`}>
                                <span className="text-[10px] font-black uppercase mb-1 opacity-50">{format(day, 'EEE')}</span>
                                <span className="text-2xl font-black">{format(day, 'd')}</span>
                                {current && !active && <div className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full"></div>}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Learning Category */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center"><BookOpen className="w-5 h-5 text-indigo-600" /></div>
                            <h3 className="text-xl font-black text-slate-900">Learning</h3>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-xl font-black text-indigo-600 leading-none">{learningProgress}%</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase">Today</span>
                        </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mb-8 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${learningProgress}%` }} className="bg-indigo-600 h-full rounded-full" />
                    </div>

                    <div className="space-y-3">
                        {learningTasks.map(task => (
                            <TaskItem 
                                key={task.id} 
                                task={task} 
                                onToggle={() => toggleTask(task.id, dateStr)} 
                                onEdit={() => setEditingTask(task)}
                                onDelete={() => {
                                    if (task.type === 'custom') {
                                        if (confirm('Delete this mission?')) deleteTask(task.id);
                                    } else {
                                        setDeletingTask(task);
                                    }
                                }} 
                                isCompleted={!!task.completedDates?.includes(dateStr)} 
                            />
                        ))}
                        {learningTasks.length === 0 && <div className="py-10 text-center glass-panel rounded-3xl border-dashed border-2 border-slate-100 opacity-50"><p className="text-xs font-bold text-slate-400 uppercase">No learning tasks</p></div>}
                    </div>
                </div>

                {/* Job Search Category */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center"><Target className="w-5 h-5 text-emerald-600" /></div>
                            <h3 className="text-xl font-black text-slate-900">Job Search</h3>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-xl font-black text-emerald-600 leading-none">{jobSearchProgress}%</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase">Today</span>
                        </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mb-8 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${jobSearchProgress}%` }} className="bg-emerald-600 h-full rounded-full" />
                    </div>

                    <div className="space-y-3">
                        {jobSearchTasks.map(task => (
                            <TaskItem 
                                key={task.id} 
                                task={task} 
                                onToggle={() => toggleTask(task.id, dateStr)} 
                                onEdit={() => setEditingTask(task)}
                                onDelete={() => {
                                    if (task.type === 'custom') {
                                        if (confirm('Delete this mission?')) deleteTask(task.id);
                                    } else {
                                        setDeletingTask(task);
                                    }
                                }} 
                                isCompleted={!!task.completedDates?.includes(dateStr)} 
                            />
                        ))}
                        {jobSearchTasks.length === 0 && <div className="py-10 text-center glass-panel rounded-3xl border-dashed border-2 border-slate-100 opacity-50"><p className="text-xs font-bold text-slate-400 uppercase">No job search tasks</p></div>}
                    </div>
                </div>
            </div>
        </div>

        {/* Sidebar: Metrics & Motivation */}
        <div className="lg:col-span-4 space-y-8">
            
            {/* Weekly Motivation Chart */}


            <div className="glass-panel bg-white rounded-[2.5rem] p-8 border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black text-slate-900">Weekly Consistency</h3>
                    <BarChart3 className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex items-end justify-between h-40 gap-2 mb-4">
                    {weeklyData.map((data, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                            <div className="w-full bg-slate-50 rounded-xl h-full flex flex-col justify-end overflow-hidden relative">
                                <motion.div 
                                    initial={{ height: 0 }} 
                                    animate={{ height: `${data.progress}%` }} 
                                    className={`w-full ${data.progress === 100 ? 'bg-emerald-500' : 'bg-blue-400'} opacity-80 group-hover:opacity-100 transition-all`}
                                />
                                {data.progress > 0 && <span className="absolute top-2 w-full text-center text-[8px] font-black text-slate-400 hidden group-hover:block">{Math.round(data.progress)}%</span>}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{data.day}</span>
                        </div>
                    ))}
                </div>
                <p className="text-[10px] font-bold text-center text-slate-400 uppercase tracking-widest">Efficiency over last 7 days</p>
            </div>

            {/* Achievement Card */}
            <div className="glass-panel bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
                <h3 className="text-2xl font-black mb-2">Power Metric</h3>
                <p className="text-blue-200 font-medium text-sm mb-8">Overall career advancement index</p>
                
                <div className="flex items-end gap-3 mb-8">
                    <span className="text-6xl font-black leading-none">{(learningStreak + jobStreak) * 5}</span>
                    <span className="text-blue-400 font-black uppercase text-xs mb-2">XP Points</span>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs font-bold border-b border-white/10 pb-4">
                        <span className="text-blue-300 uppercase">Jobs Tracked</span>
                        <span>{jobStats.total}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold border-b border-white/10 pb-4">
                        <span className="text-blue-300 uppercase">Successful Apps</span>
                        <span>{jobStats.applied}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-blue-300 uppercase">Interviews Secured</span>
                        <span className="text-emerald-400">{jobStats.interviews}</span>
                    </div>
                </div>
            </div>

            <Link href="/job-tracker-dashboard/jobs">
                <div className="glass-panel bg-white rounded-[2.5rem] p-8 border-slate-100 hover:shadow-2xl transition-all duration-500 group border-b-8 border-indigo-500">
                    <div className="flex justify-between items-center mb-6">
                        <div className="p-4 bg-indigo-50 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all"><Target className="w-6 h-6" /></div>
                        <ArrowRight className="w-6 h-6 text-slate-200 group-hover:text-indigo-600 transition-all" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-1">Open Pipelines</h3>
                    <p className="text-slate-400 font-medium text-xs">Manage active job applications</p>
                </div>
            </Link>

        </div>
      </div>

       {/* Add Mission Modal */}
       <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden">
                <TaskForm 
                    onClose={() => setIsModalOpen(false)} 
                    onAdd={(newTask) => {
                        setTasks(prev => [newTask, ...prev]);
                        fetchTasks();
                    }} 
                    selectedDate={selectedDate} 
                />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Mission Modal */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingTask(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden">
                <TaskForm 
                    initialTask={editingTask}
                    onClose={() => setEditingTask(null)} 
                    onAdd={(updatedTask) => {
                        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
                        fetchTasks();
                    }} 
                    selectedDate={selectedDate} 
                />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingTask && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeletingTask(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden p-8">
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
                        onClick={() => deleteTask(deletingTask.id, 'one')}
                        className="w-full p-5 bg-slate-50 hover:bg-slate-100 rounded-2xl text-left transition-all border border-transparent hover:border-slate-200 group"
                    >
                        <p className="font-black text-slate-900 group-hover:text-blue-600">Only Today</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Remove mission from {format(selectedDate, 'MMM d')} only</p>
                    </button>
                    
                    <button 
                        onClick={() => deleteTask(deletingTask.id, 'following')}
                        className="w-full p-5 bg-slate-50 hover:bg-slate-100 rounded-2xl text-left transition-all border border-transparent hover:border-slate-200 group"
                    >
                        <p className="font-black text-slate-900 group-hover:text-blue-600">This and all following</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Stop this mission from tomorrow onwards</p>
                    </button>
                    
                    <button 
                        onClick={() => deleteTask(deletingTask.id, 'all')}
                        className="w-full p-5 bg-rose-50 hover:bg-rose-100 rounded-2xl text-left transition-all border border-transparent hover:border-rose-200 group"
                    >
                        <p className="font-black text-rose-600">Entire Series</p>
                        <p className="text-[10px] text-rose-400 font-bold uppercase mt-1">Delete this mission from all past and future dates</p>
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

function TaskItem({ task, onToggle, onDelete, onEdit, isCompleted }: { task: Task, onToggle: () => void, onDelete: () => void, onEdit: () => void, isCompleted: boolean }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`group grid grid-cols-[1fr_auto] items-center rounded-[1.8rem] border-2 transition-all overflow-hidden ${isCompleted ? 'bg-slate-50/80 border-transparent shadow-none' : 'bg-white border-slate-50 hover:border-blue-100 hover:shadow-xl shadow-blue-50/20'}`}
        >
            {/* Clickable Area for Toggle */}
            <div 
                onClick={onToggle}
                className="flex items-center gap-4 p-5 cursor-pointer select-none overflow-hidden"
            >
                <div className="shrink-0">
                    {isCompleted ? (
                        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    ) : (
                        <div className="w-8 h-8 border-2 border-slate-200 rounded-full group-hover:border-blue-400 bg-white transition-colors" />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <p className={`text-base font-bold transition-all truncate ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {task.text}
                    </p>
                    {task.recurrence.type !== 'none' && (
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-md flex items-center gap-1 ${task.category === 'learning' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                <Zap className="w-2 h-2" /> {task.recurrence.type}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions Area - Fixed Width Column */}
            <div className="flex items-center gap-1 pr-4 pl-2 h-12 bg-white/50">
                {task.url && (
                    <a 
                        href={task.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="w-9 h-9 flex items-center justify-center hover:bg-blue-50 text-slate-300 hover:text-blue-600 rounded-xl transition-all"
                        title="Visit Link"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </a>
                )}
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                    }} 
                    className="w-9 h-9 flex items-center justify-center hover:bg-slate-50 text-slate-300 hover:text-slate-900 rounded-xl transition-all"
                    title="Edit Mission"
                >
                    <Settings className="w-4 h-4" />
                </button>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }} 
                    className="w-9 h-9 flex items-center justify-center hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-xl transition-all"
                    title="Delete Mission"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
}




function TaskForm({ onClose, onAdd, selectedDate, initialTask }: { onClose: () => void, onAdd: (t: Task) => void, selectedDate: Date, initialTask?: Task | null }) {
  const [text, setText] = useState(initialTask?.text || '');
  const [url, setUrl] = useState(initialTask?.url || '');
  const [category, setCategory] = useState<'learning' | 'job-search'>(initialTask?.category || 'learning');
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'daily' | 'weekly'>(initialTask?.recurrence.type || 'none');

  const [selectedDays, setSelectedDays] = useState<number[]>(initialTask?.recurrence.days || [1, 2, 3, 4, 5]);

  const days = [
    { label: 'S', value: 0 }, { label: 'M', value: 1 }, { label: 'T', value: 2 },
    { label: 'W', value: 3 }, { label: 'T', value: 4 }, { label: 'F', value: 5 }, { label: 'S', value: 6 }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const taskData = {
      text,
      url: url.trim() || undefined,
      category,
      type: recurrenceType === 'none' ? 'custom' : 'daily',
      recurrence: {
        type: recurrenceType,
        days: recurrenceType === 'weekly' ? selectedDays : []
      },
      date: recurrenceType === 'none' ? format(selectedDate, 'yyyy-MM-dd') : undefined,
      completedDates: []
    };


    try {
      const apiUrl = initialTask ? `/api/tasks/${initialTask.id}` : '/api/tasks';
      const method = initialTask ? 'PATCH' : 'POST';

      const res = await fetch(apiUrl, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      const data = await res.json();
      if (data.success) {
        onAdd({ ...data.data, id: String(data.data._id) });
        onClose();
      }
    } catch (err) {
      console.error('Failed to save task:', err);
    }
  };


  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-black text-slate-900">Assign Mission</h3>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X className="w-6 h-6" /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mission Details</label>
            <input required autoFocus type="text" value={text} onChange={e => setText(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-6 py-4 outline-none focus:bg-white focus:border-indigo-500 transition-all font-bold text-slate-800" placeholder="e.g. Study System Design" />
        </div>

        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mission Link (Optional)</label>
            <input type="url" value={url} onChange={e => setUrl(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-6 py-4 outline-none focus:bg-white focus:border-indigo-500 transition-all font-bold text-slate-800" placeholder="https://..." />
        </div>


        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Category</label>
            <div className="flex bg-slate-50 p-1.5 rounded-2xl">
                <button type="button" onClick={() => setCategory('learning')} className={`flex-1 py-4 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${category === 'learning' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}>
                    <BookOpen className="w-4 h-4" /> Learning
                </button>
                <button type="button" onClick={() => setCategory('job-search')} className={`flex-1 py-4 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${category === 'job-search' ? 'bg-white shadow-md text-emerald-600' : 'text-slate-400'}`}>
                    <Target className="w-4 h-4" /> Job Search
                </button>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Frequency</label>
                <div className="relative">
                    <select value={recurrenceType} onChange={e => setRecurrenceType(e.target.value as any)} className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-6 py-4 outline-none appearance-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-800 cursor-pointer">
                        <option value="none">One-time</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Selected Days</option>
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>
            <div className="flex flex-col justify-end p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                <p className="text-[10px] font-bold text-blue-800">{format(selectedDate, 'MMM do, yyyy')}</p>
                <p className="text-[8px] font-medium text-blue-600">Selected Date</p>
            </div>
        </div>

        {recurrenceType === 'weekly' && (
            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selected Weekdays</label>
                <div className="flex justify-between gap-1">
                    {days.map(day => (
                        <button key={day.value} type="button" onClick={() => setSelectedDays(prev => prev.includes(day.value) ? prev.filter(d => d !== day.value) : [...prev, day.value])} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all border-2 ${selectedDays.includes(day.value) ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>
                            {day.label}
                        </button>
                    ))}
                </div>
            </div>
        )}

        <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-2xl">Cancel</button>
            <button type="submit" className="flex-1 py-4 bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl transition-all">Assign Mission</button>
        </div>
      </form>
    </div>
  );
}
