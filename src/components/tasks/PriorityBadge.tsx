import React from 'react';

export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low' | 'basic';

interface PriorityBadgeProps {
  priority: string;
  withChevron?: boolean;
}

export default function PriorityBadge({ priority, withChevron = false }: PriorityBadgeProps) {
  const norm = (priority || 'medium').toLowerCase();

  let bg = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = 'Medium';
  let dotColor = 'bg-slate-400';

  if (norm === 'urgent' || norm === 'critical') {
    bg = 'bg-rose-50 text-rose-700 border-rose-200';
    label = 'Urgent';
    dotColor = 'bg-rose-500';
  } else if (norm === 'high') {
    bg = 'bg-amber-50 text-amber-700 border-amber-200';
    label = 'High';
    dotColor = 'bg-amber-500';
  } else if (norm === 'medium') {
    bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    label = 'Medium';
    dotColor = 'bg-emerald-500';
  } else if (norm === 'low' || norm === 'basic') {
    bg = 'bg-slate-100 text-slate-600 border-slate-200';
    label = norm === 'basic' ? 'Basic' : 'Low';
    dotColor = 'bg-slate-400';
  } else if (norm === 'priority') {
    bg = 'bg-blue-50 text-blue-700 border-blue-200';
    label = 'Priority';
    dotColor = 'bg-blue-500';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{label}</span>
      {withChevron && <span className="text-[9px] opacity-60">▼</span>}
    </span>
  );
}
