"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { format } from 'date-fns';

export interface Task {
    _id: string;
    id: string;
    text: string;
    url?: string;
    category: 'learning' | 'job-search';
    completedDates: string[];
    type: 'custom' | 'daily';
    date: string;
    recurrence: {
        type: 'none' | 'daily' | 'weekly';
        days: number[];
    };
    endDate?: string;
    excludedDates?: string[];
}

interface TaskContextType {
    tasks: Task[];
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    refreshTasks: () => Promise<void>;
    progress: {
        total: number;
        completed: number;
        percentage: number;
    };
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: React.ReactNode }) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [progress, setProgress] = useState({ total: 0, completed: 0, percentage: 0 });

    const fetchTasks = async () => {
        try {
            const res = await fetch('/api/tasks');
            const data = await res.json();
            if (data.success) {
                setTasks(data.data.map((t: any) => ({ ...t, id: t._id })));
            }
        } catch (err) {
            console.error('Failed to fetch tasks in context:', err);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    useEffect(() => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const dayOfWeek = new Date().getDay();

        const dailyTasks = tasks.filter(task => {
            // Check if task has ended
            if (task.endDate && today > task.endDate) return false;
            // Check if today is excluded
            if (task.excludedDates?.includes(today)) return false;

            if (task.recurrence.type === 'none') return task.date === today;
            if (task.recurrence.type === 'daily') return true;
            if (task.recurrence.type === 'weekly') return task.recurrence.days.includes(dayOfWeek);
            return false;
        });

        const total = dailyTasks.length;
        const completed = dailyTasks.filter(t => t.completedDates?.includes(today)).length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        setProgress({ total, completed, percentage });
    }, [tasks]);

    return (
        <TaskContext.Provider value={{ tasks, setTasks, refreshTasks: fetchTasks, progress }}>
            {children}
        </TaskContext.Provider>
    );
}

export function useTasks() {
    const context = useContext(TaskContext);
    if (context === undefined) {
        throw new Error('useTasks must be used within a TaskProvider');
    }
    return context;
}
