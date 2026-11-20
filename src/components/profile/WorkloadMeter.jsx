// src/components/profile/WorkloadMeter.jsx
// Section 3: Workload meter: open tasks vs a configurable threshold (green/amber/red)

import React, { useState } from 'react';
import { Gauge, Settings2 } from 'lucide-react';

export default function WorkloadMeter({ openCount = 0, defaultThreshold = 8 }) {
  const [threshold, setThreshold] = useState(defaultThreshold);
  const [isEditingThreshold, setIsEditingThreshold] = useState(false);

  // Status calculation:
  // Green: <= 60% of threshold
  // Amber: 61% - 100% of threshold
  // Red: > threshold (over capacity)
  const ratio = threshold > 0 ? (openCount / threshold) * 100 : 0;
  
  let statusColor = 'emerald';
  let statusLabel = 'Optimal Load';
  let badgeClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  let barClasses = 'bg-emerald-600';

  if (ratio > 100) {
    statusColor = 'rose';
    statusLabel = 'Over Capacity';
    badgeClasses = 'bg-rose-50 text-rose-800 border-rose-200';
    barClasses = 'bg-rose-600';
  } else if (ratio > 60) {
    statusColor = 'amber';
    statusLabel = 'Moderate / High';
    badgeClasses = 'bg-amber-50 text-amber-800 border-amber-200';
    barClasses = 'bg-amber-500';
  }

  const clampedPercentage = Math.min(Math.max(ratio, 4), 100);

  return (
    <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Workload Capacity Meter
            </h4>
            <p className="text-[11px] text-slate-500">
              Live active queue vs workload threshold ({threshold} tasks)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClasses}`}>
            {statusLabel}
          </span>
          <button
            type="button"
            onClick={() => setIsEditingThreshold(!isEditingThreshold)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Configure capacity threshold"
            aria-label="Configure workload threshold"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Threshold Configurator Inline */}
      {isEditingThreshold && (
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">Set max task capacity threshold:</span>
          <div className="flex items-center gap-1.5">
            {[5, 8, 12, 15].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setThreshold(val);
                  setIsEditingThreshold(false);
                }}
                className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                  threshold === val
                    ? 'bg-[#05331F] text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Progress Bar Meter */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-800">
            {openCount} Open Tasks
          </span>
          <span className="text-slate-500 font-mono text-[11px]">
            {Math.round(ratio)}% of max capacity ({threshold})
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barClasses}`}
            style={{ width: `${clampedPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

