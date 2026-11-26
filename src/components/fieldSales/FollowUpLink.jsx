// src/components/fieldSales/FollowUpLink.jsx
// Displays linked follow-up created from nextActionDate with status and auto-navigation

import React from 'react';
import { Calendar, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

export default function FollowUpLink({ linkedTask, onNavigateToTask }) {
  if (!linkedTask) return null;

  const isCompleted = linkedTask.status === 'Completed' || linkedTask.status === 'completed';

  return (
    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
          isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-800 truncate">{linkedTask.title || 'Linked Dealer Follow-Up'}</p>
          <p className="text-[10px] text-slate-400">
            Due: {linkedTask.deadlineDate || linkedTask.taskDate || 'Upcoming'}
          </p>
        </div>
      </div>

      {onNavigateToTask && (
        <button
          type="button"
          onClick={() => onNavigateToTask(linkedTask)}
          className="text-[11px] font-bold text-[#05331F] hover:underline flex items-center gap-0.5 shrink-0 ml-2 cursor-pointer"
        >
          <span>View Task</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

