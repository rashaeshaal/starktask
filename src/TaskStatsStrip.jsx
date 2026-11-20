// src/TaskStatsStrip.jsx
// Summary strip: 4 compact stat cards that double as quick status filters

import React from 'react';
import { Layers, Clock, Activity, CheckCircle2 } from 'lucide-react';
import { TASK_STATUSES } from './rbac';

export default function TaskStatsStrip({
  tasks = [],
  currentStatusFilter = 'all',
  onSelectStatusFilter
}) {
  const stats = React.useMemo(() => {
    let pending = 0;
    let inProgress = 0;
    let completed = 0;

    tasks.forEach(t => {
      const s = t.status;
      if (s === TASK_STATUSES.COMPLETED || s === 'Completed') {
        completed++;
      } else if (s === TASK_STATUSES.IN_PROGRESS || s === 'In Progress' || s === TASK_STATUSES.PENDING_REVIEW || s === 'Pending Review') {
        inProgress++;
      } else {
        pending++;
      }
    });

    return [
      {
        id: 'all',
        label: 'Total Tasks',
        count: tasks.length,
        icon: Layers,
        color: 'text-slate-700',
        bg: 'bg-slate-100',
        activeRing: 'ring-2 ring-slate-400 bg-slate-50'
      },
      {
        id: TASK_STATUSES.ASSIGNED,
        label: 'Pending',
        count: pending,
        icon: Clock,
        color: 'text-amber-700',
        bg: 'bg-amber-100',
        activeRing: 'ring-2 ring-amber-400 bg-amber-50/50'
      },
      {
        id: TASK_STATUSES.IN_PROGRESS,
        label: 'In Progress',
        count: inProgress,
        icon: Activity,
        color: 'text-blue-700',
        bg: 'bg-blue-100',
        activeRing: 'ring-2 ring-blue-400 bg-blue-50/50'
      },
      {
        id: TASK_STATUSES.COMPLETED,
        label: 'Completed',
        count: completed,
        icon: CheckCircle2,
        color: 'text-emerald-700',
        bg: 'bg-emerald-100',
        activeRing: 'ring-2 ring-emerald-500 bg-emerald-50/50'
      }
    ];
  }, [tasks]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(stat => {
        const Icon = stat.icon;
        const isSelected = currentStatusFilter === stat.id;

        return (
          <button
            key={stat.id}
            type="button"
            onClick={() => onSelectStatusFilter(isSelected ? 'all' : stat.id)}
            className={`p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs text-left transition-all duration-150 cursor-pointer hover:border-slate-300 ${
              isSelected ? stat.activeRing : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                {stat.label}
              </span>
              <div className={`w-7 h-7 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center`}>
                <Icon className="w-4 h-4" strokeWidth={1.75} />
              </div>
            </div>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {stat.count}
            </div>
          </button>
        );
      })}
    </div>
  );
}
