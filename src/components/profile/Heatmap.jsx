// src/components/profile/Heatmap.jsx
// Section 4: 14-day heatmap (100% green, partial amber, overdue rose) and a 4-week trend arrow

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, Calendar } from 'lucide-react';

export default function Heatmap({ heatmapDays = [], trendDirection = 'stable', last14Completed = 0, prev14Completed = 0 }) {
  return (
    <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              14-Day Activity Heatmap
            </h4>
            <p className="text-[11px] text-slate-500">
              Daily sign-off completion & overdue history
            </p>
          </div>
        </div>

        {/* 4-week trend arrow indicator */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium">4W Trend:</span>
          {trendDirection === 'up' && (
            <span className="inline-flex items-center gap-0.5 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Improving ({last14Completed} vs {prev14Completed})
            </span>
          )}
          {trendDirection === 'down' && (
            <span className="inline-flex items-center gap-0.5 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
              <ArrowDownRight className="w-3.5 h-3.5" />
              Declining ({last14Completed} vs {prev14Completed})
            </span>
          )}
          {trendDirection === 'stable' && (
            <span className="inline-flex items-center gap-0.5 font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              <Minus className="w-3.5 h-3.5" />
              Steady ({last14Completed} tasks)
            </span>
          )}
        </div>
      </div>

      {/* Heatmap Blocks Grid (14 days) */}
      <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 pt-1">
        {heatmapDays.map((day, idx) => {
          let bgClass = 'bg-slate-100 text-slate-400 border-slate-200';
          let statusTooltip = 'No tasks scheduled';

          if (day.status === 'green') {
            bgClass = 'bg-emerald-600 text-white border-emerald-700 shadow-2xs';
            statusTooltip = `100% Completed (${day.completed}/${day.total})`;
          } else if (day.status === 'amber') {
            bgClass = 'bg-amber-400 text-slate-900 border-amber-500';
            statusTooltip = `Partial completion (${day.completed}/${day.total})`;
          } else if (day.status === 'rose') {
            bgClass = 'bg-rose-500 text-white border-rose-600';
            statusTooltip = `Overdue / Incomplete tasks (${day.total - day.completed} pending)`;
          }

          const shortDate = day.date ? day.date.slice(5) : '';

          return (
            <div 
              key={day.date || idx}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-transform hover:scale-105 cursor-pointer ${bgClass}`}
              title={`${day.date}: ${statusTooltip}`}
              aria-label={`${day.date}: ${statusTooltip}`}
            >
              <span className="text-[10px] uppercase font-bold opacity-80">
                {day.dayLabel}
              </span>
              <span className="text-xs font-mono font-bold mt-0.5">
                {shortDate.replace('-', '/')}
              </span>
              <span className="text-[10px] mt-0.5 font-semibold">
                {day.completed}/{day.total}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-3 text-[11px] text-slate-500 pt-1">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> 100% Done
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Partial
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Overdue
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-200" /> Empty
        </span>
      </div>
    </div>
  );
}

