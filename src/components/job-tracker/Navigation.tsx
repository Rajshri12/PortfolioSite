"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Briefcase, CheckCircle, Settings, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useTasks } from '@/context/TaskContext';

export default function Navigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { progress } = useTasks();

  const navItems = [
    { name: 'Daily Tracker', href: '/job-tracker-dashboard', icon: CheckCircle },
    { name: 'Job Orbit', href: '/job-tracker-dashboard/jobs', icon: Briefcase },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-900">Career Hub</span>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-600">
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[100] w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-6">
          <Link href="/job-tracker-dashboard" className="hidden md:flex items-center gap-3 mb-10 px-2 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <span className="font-extrabold text-xl text-slate-900 tracking-tight">Career Hub</span>
          </Link>

          <nav className="space-y-2 relative z-[110] mb-10">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all cursor-pointer
                    ${isActive 
                      ? 'bg-blue-50 text-blue-600 shadow-sm shadow-blue-100 pointer-events-none' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="px-2">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daily Goal</p>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{progress.percentage}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 mb-2 overflow-hidden">
                <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${progress.percentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-600 font-medium">{progress.completed} of {progress.total} tasks completed</p>
            </div>
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
