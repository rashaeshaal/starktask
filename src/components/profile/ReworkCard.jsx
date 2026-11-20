// src/components/profile/ReworkCard.jsx
// Section 7: Rework: count of tasks sent back and the rework rate

import React from 'react';
import { RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react';

export default function ReworkCard({ reworkCount = 0, reworkRate = 0, assigned = 0 }) {
  const isHealthy = reworkRate <= 10;

  return (
    <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Quality Rework & Rejections
            </h4>
            <p className="text-[11px] text-slate-500">
              Tasks returned for correction by supervisor
            </p>
          </div>
        </div>

        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
          isHealthy
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {isHealthy ? 'Acceptable' : 'High Rework'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
          <span className="text-[11px] font-medium text-slate-500">Tasks Sent Back</span>
          <div className="text-2xl font-bold text-slate-900">
            {reworkCount}
          </div>
          <p className="text-[10px] text-slate-500">
            Correction requests
          </p>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
          <span className="text-[11px] font-medium text-slate-500">Rework Rate</span>
          <div className={`text-2xl font-bold ${isHealthy ? 'text-emerald-700' : 'text-rose-600'}`}>
            {reworkRate}%
          </div>
          <p className="text-[10px] text-slate-500">
            Benchmark &lt; 10%
          </p>
        </div>
      </div>
    </div>
  );
}

