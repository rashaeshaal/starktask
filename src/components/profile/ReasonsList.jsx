// src/components/profile/ReasonsList.jsx
// Section 6: Incomplete-task reasons: top reasons with counts, from the reason stored on sign-off

import React from 'react';
import { HelpCircle, AlertCircle } from 'lucide-react';

export default function ReasonsList({ reasons = [] }) {
  return (
    <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Incomplete & Sign-Off Blockers
            </h4>
            <p className="text-[11px] text-slate-500">
              Reasons recorded during task sign-off review
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-slate-500">
          {reasons.length} Identified
        </span>
      </div>

      {reasons.length === 0 ? (
        <div className="p-4 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl text-center">
          <p className="text-xs text-slate-500">
            No incomplete reasons recorded in this period. Great execution consistency!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {reasons.map((item, index) => (
            <div 
              key={index} 
              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
            >
              <div className="flex items-start gap-2 min-w-0 pr-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="font-medium text-slate-800 leading-snug break-words">
                  {item.reason}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-mono font-bold text-slate-700 shrink-0 shadow-2xs">
                {item.count} {item.count === 1 ? 'time' : 'times'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

