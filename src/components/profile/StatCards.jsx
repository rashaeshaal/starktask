// src/components/profile/StatCards.jsx
// Section 2: Stat cards (last 30 days, 7/14/30 day switch): assigned, completed, overdue, on-time %, avg completion time vs team, sign-off streak, days missed

import React from 'react';
import { 
  CheckCircle2, AlertTriangle, Clock, Flame, 
  CalendarX, Target, TrendingUp, Users 
} from 'lucide-react';

export default function StatCards({ stats, rangeDays = 30, onRangeChange }) {
  if (!stats) return null;

  const {
    assigned = 0,
    completed = 0,
    overdue = 0,
    onTimePercent = 100,
    avgCompletionTimeHours = 4.2,
    teamAvgCompletionTimeHours = 4.8,
    signOffStreak = 0,
    daysMissed = 0
  } = stats;

  const timeDiff = (avgCompletionTimeHours - teamAvgCompletionTimeHours).toFixed(1);
  const isFaster = Number(timeDiff) <= 0;

  return (
    <div className="space-y-4">
      {/* Range switcher tabs */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Performance Metrics
        </h3>
        <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200" role="group" aria-label="Time period selector">
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => onRangeChange(days)}
              aria-label={`Show ${days} days statistics`}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                rangeDays === days
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {days}D
            </button>
          ))}
        </div>
      </div>

      {/* Grid of 6 Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {/* Card 1: Assigned */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Assigned</span>
            <Target className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {assigned}
          </div>
          <p className="text-[11px] text-slate-500">Total in {rangeDays}d</p>
        </div>

        {/* Card 2: Completed */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-medium text-slate-600">Completed</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            {completed}
          </div>
          <p className="text-[11px] text-slate-500">{assigned > 0 ? `${Math.round((completed / assigned) * 100)}% rate` : 'No tasks'}</p>
        </div>

        {/* Card 3: Overdue */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-rose-500">
            <span className="text-xs font-medium text-slate-600">Overdue</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className={`text-2xl font-bold ${overdue > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
            {overdue}
          </div>
          <p className="text-[11px] text-slate-500">Needs attention</p>
        </div>

        {/* Card 4: On-time % */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-medium text-slate-600">On-Time %</span>
            <TrendingUp className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {onTimePercent}%
          </div>
          <p className="text-[11px] text-slate-500">Target ≥ 90%</p>
        </div>

        {/* Card 5: Avg Completion vs Team */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-600">Avg Speed</span>
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {avgCompletionTimeHours}h
          </div>
          <p className="text-[11px] text-slate-500">
            <span className={isFaster ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
              {isFaster ? `-${Math.abs(timeDiff)}h faster` : `+${timeDiff}h slower`}
            </span> vs team ({teamAvgCompletionTimeHours}h)
          </p>
        </div>

        {/* Card 6: Sign-Off Streak & Missed */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1 col-span-2 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-medium text-slate-600">Streak / Missed</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{signOffStreak}d</span>
            <span className="text-xs text-slate-400">streak</span>
            <span className="text-slate-300">|</span>
            <span className={`text-base font-bold ${daysMissed > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
              {daysMissed}d
            </span>
            <span className="text-xs text-slate-400">missed</span>
          </div>
          <p className="text-[11px] text-slate-500">Consecutive sign-offs</p>
        </div>
      </div>
    </div>
  );
}

