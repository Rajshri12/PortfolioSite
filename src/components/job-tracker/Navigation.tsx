"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Rocket, Briefcase, Home, Map, Bot, BarChart2, BookMarked, BookOpen, Menu, X, LogOut, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTasks } from '@/context/TaskContext';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [applicationUnlocked, setApplicationUnlocked] = useState(true);
  const { progress } = useTasks();

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => {
        // When impersonating, show nav as if we are the target user
        setRole(d.impersonating ? 'user' : (d.role ?? null));
        setApplicationUnlocked(d.applicationUnlocked ?? false);
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  const showJobOrbit = role === 'admin' || applicationUnlocked;

  const navItems = [
    { name: 'Home', href: '/job-tracker-dashboard', icon: Home },
    ...(showJobOrbit ? [{ name: 'Job Orbit', href: '/job-tracker-dashboard/jobs', icon: Briefcase }] : []),
    { name: 'Roadmap', href: '/job-tracker-dashboard/roadmap', icon: Map },
    { name: 'ClarityBot', href: '/job-tracker-dashboard/chatbot', icon: Bot },
    { name: 'Progress', href: '/job-tracker-dashboard/progress', icon: BarChart2 },
    { name: 'Vault', href: '/job-tracker-dashboard/vault', icon: BookMarked },
    { name: 'Journal', href: '/job-tracker-dashboard/journal', icon: BookOpen },
    ...(role === 'admin' ? [{ name: 'Admin', href: '/job-tracker-dashboard/admin', icon: Shield }] : []),
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{background:"linear-gradient(135deg,#7c3aed,#db2777)"}}>
            <Rocket className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-slate-900 tracking-tight">Career Hub</span>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-600">
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[100] w-64 bg-white border-r border-slate-100 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-6">
          {/* Logo */}
          <Link href="/job-tracker-dashboard" className="hidden md:flex items-center gap-3 mb-10 px-2 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shrink-0" style={{background:"linear-gradient(135deg,#7c3aed,#db2777)",boxShadow:"0 8px 20px rgba(124,58,237,0.35)"}}>
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900 tracking-tight leading-none block">Career Hub</span>
              <span className="text-[10px] font-bold text-violet-500 tracking-widest uppercase leading-none">Your growth space</span>
            </div>
          </Link>

          <nav className="space-y-1 relative z-[110] mb-10">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer
                    ${isActive
                      ? 'text-violet-700 pointer-events-none'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}
                  `}
                  style={isActive ? {background:"linear-gradient(90deg,rgba(124,58,237,0.10),rgba(219,39,119,0.06))",boxShadow:"inset 0 0 0 1px rgba(124,58,237,0.12)"} : undefined}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-violet-600' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="px-2 space-y-3 mt-auto">
            {/* Daily progress */}
            <div className="rounded-2xl p-4 border border-violet-100" style={{background:"linear-gradient(135deg,rgba(124,58,237,0.04),rgba(219,39,119,0.04))"}}>
              <div className="flex justify-between items-center mb-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daily Goal</p>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md" style={{background:"linear-gradient(90deg,#7c3aed,#db2777)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{progress.percentage}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 overflow-hidden">
                <div
                  className="h-1.5 rounded-full transition-all duration-1000 ease-out"
                  style={{width:`${progress.percentage}%`,background:"linear-gradient(90deg,#7c3aed,#db2777)"}}
                />
              </div>
              <p className="text-xs text-slate-500 font-medium">{progress.completed} of {progress.total} done</p>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-500 font-bold text-sm transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
