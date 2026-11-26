// src/components/fieldSales/DealerHealthChip.jsx
// Color-coded dealer health status chip (Healthy, Watch, At risk)

import React from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';

export default function DealerHealthChip({ health }) {
  if (!health) return null;

  const status = typeof health === 'string' ? health : (health.status || 'Healthy');

  let bg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  let Icon = ShieldCheck;

  if (status === 'Watch') {
    bg = 'bg-amber-50 text-amber-800 border-amber-200';
    Icon = AlertTriangle;
  } else if (status === 'At risk' || status === 'At Risk') {
    bg = 'bg-rose-50 text-rose-800 border-rose-200';
    Icon = AlertCircle;
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${bg}`}>
      <Icon className="w-3 h-3" />
      <span>{status}</span>
    </span>
  );
}

