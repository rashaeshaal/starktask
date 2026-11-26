import React from 'react';
import { Bell, CheckCircle, Clock, TrendingUp, Check } from 'lucide-react';
import MyTodoList from './MyTodoList';

interface TaskStatsPanelProps {
  currentUser: any;
  tasks: any[];
  userTodos?: any[];
  onToggleTodo?: (todoId: string, doneState: boolean) => void;
  onAddTodo?: (text: string) => void;
  onClose?: () => void;
}

export default function TaskStatsPanel({
  currentUser,
  tasks = [],
  userTodos = [],
  onToggleTodo,
  onAddTodo,
  onClose
}: TaskStatsPanelProps) {
  const userName = currentUser?.fullName || currentUser?.name || 'User';
  const userRole = currentUser?.role || 'Operations Staff';
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const total = tasks.length || 1;
  const completed = tasks.filter((t) => {
    const s = (t.status || '').toLowerCase();
    return s === 'done' || s === 'completed';
  }).length;
  const inProgress = tasks.filter((t) => {
    const s = (t.status || '').toLowerCase();
    return s === 'in progress' || s === 'review' || s === 'pending review';
  }).length;

  const completedPct = Math.round((completed / total) * 100);

  // SVG Semicircle gauge calculation
  const radius = 64;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (completedPct / 100) * circumference;

  return (
    <aside className="w-80 shrink-0 space-y-4 font-sans">
      {/* 1. User Profile Chip */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#E5E7EB] shadow-[0_1px_2px_rgba(16,24,40,0.06)] flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[#0B3D2E] text-emerald-300 font-bold flex items-center justify-center text-sm shadow-2xs border border-white">
            {userInitials}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-xs text-slate-900 truncate">{userName}</h3>
            <p className="text-[11px] text-slate-500 truncate">{userRole}</p>
          </div>
        </div>

        <button
          type="button"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-2 right-2 ring-2 ring-white" />
        </button>
      </div>

      {/* 2. Task stats card with green gradient & Semicircle Gauge */}
      <div className="bg-gradient-to-br from-[#0B3D2E] to-[#06241B] text-white p-4 rounded-2xl shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-200">
            Task Stats
          </h4>
          <span className="text-[10px] font-semibold bg-emerald-800/60 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-700/50">
            Live
          </span>
        </div>

        {/* Semicircle Gauge */}
        <div className="flex flex-col items-center justify-center py-1">
          <div className="relative w-36 h-20 flex items-center justify-center">
            <svg className="w-36 h-36 -rotate-180 transform" viewBox="0 0 160 160">
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="text-emerald-950/70"
                strokeWidth="12"
                stroke="currentColor"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={0}
              />
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="text-emerald-400 transition-all duration-700 ease-out"
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>
            <div className="absolute top-10 flex flex-col items-center">
              <span className="text-xl font-extrabold tracking-tight text-white">{completedPct}%</span>
              <span className="text-[9px] uppercase font-bold text-emerald-300">Completed</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-emerald-900/60">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-emerald-200 text-[11px]">Done: <strong>{completed}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-emerald-200 text-[11px]">Progress: <strong>{inProgress}</strong></span>
          </div>
        </div>

        {/* Info Strip */}
        <div className="bg-emerald-950/70 rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-emerald-200 border border-emerald-800/40">
          <TrendingUp className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>You completed 18% more tasks this week than last week.</span>
        </div>
      </div>

      {/* 3. My Todo List Panel */}
      <MyTodoList 
        todos={userTodos}
        onToggleTodo={onToggleTodo}
        onAddTodo={onAddTodo}
      />
    </aside>
  );
}
