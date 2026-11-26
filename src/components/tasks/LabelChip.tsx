import React from 'react';

interface LabelChipProps {
  label: string;
  color?: string;
}

export default function LabelChip({ label, color }: LabelChipProps) {
  const norm = (label || '').toLowerCase();
  
  let style = 'bg-slate-100 text-slate-700 border-slate-200';
  if (norm.includes('sales') || norm.includes('door') || norm.includes('booking')) {
    style = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  } else if (norm.includes('urgent') || norm.includes('block') || norm.includes('overdue')) {
    style = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (norm.includes('warehouse') || norm.includes('dispatch') || norm.includes('shipping')) {
    style = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (norm.includes('review') || norm.includes('payment') || norm.includes('finance')) {
    style = 'bg-amber-50 text-amber-800 border-amber-200';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${style}`}>
      {label}
    </span>
  );
}
