// src/components/profile/PriorityMix.jsx
// Section 5: Priority mix bar (Low/Medium/High/Urgent)

import React from 'react';
import { Layers } from 'lucide-react';

export default function PriorityMix({ priorityMix = { Low: 0, Medium: 0, High: 0, Urgent: 0 } }) {
  const { Low = 0, Medium = 0, High = 0, Urgent = 0 } = priorityMix;
  const total = Low + Medium + High + Urgent;

  const lowPct = total > 0 ? Math.round((Low / total) * 100) : 0;
  const medPct = total > 0 ? Math.round((Medium / total) * 100) : 0;
  const highPct = total > 0 ? Math.round((High / total) * 100) : 0;
  const urgentPct = total > 0 ? Math.round((Urgent / total) * 100) : 0;

  return (
    <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Task Priority Distribution
            </h4>
            <p className="text-[11px] text-slate-500">
              Breakdown across Low, Medium, High and Urgent tasks
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-slate-700 font-mono">
          {total} Total
        </span>
      </div>

      {/* Horizontal Multi-color Stacked Bar */}
      <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200">
        {total === 0 ? (
          <div className="w-full h-full bg-slate-200" />
        ) : (
          <>
            {lowPct > 0 && (
              <div 
                style={{ width: `${lowPct}%` }} 
                className="bg-slate-400 h-full transition-all duration-300" 
                title={`Low Priority: ${Low} (${lowPct}%)`}
              />
            )}
            {medPct > 0 && (
              <div 
                style={{ width: `${medPct}%` }} 
                className="bg-blue-500 h-full transition-all duration-300" 
                title={`Medium Priority: ${Medium} (${medPct}%)`}
              />
            )}
            {highPct > 0 && (
              <div 
                style={{ width: `${highPct}%` }} 
                className="bg-amber-500 h-full transition-all duration-300" 
                title={`High Priority: ${High} (${highPct}%)`}
              />
            )}
            {urgentPct > 0 && (
              <div 
                style={{ width: `${urgentPct}%` }} 
                className="bg-rose-600 h-full transition-all duration-300" 
                title={`Urgent Priority: ${Urgent} (${urgentPct}%)`}
              />
            )}
          </>
        )}
      </div>

      {/* Breakdown Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <span className="text-slate-600 font-medium">Low</span>
          </div>
          <span className="font-bold text-slate-800">{Low}</span>
        </div>

        <div className="p-2 rounded-xl bg-blue-50/50 border border-blue-200/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-blue-900 font-medium">Medium</span>
          </div>
          <span className="font-bold text-blue-950">{Medium}</span>
        </div>

        <div className="p-2 rounded-xl bg-amber-50/50 border border-amber-200/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-amber-900 font-medium">High</span>
          </div>
          <span className="font-bold text-amber-950">{High}</span>
        </div>

        <div className="p-2 rounded-xl bg-rose-50/50 border border-rose-200/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            <span className="text-rose-900 font-medium">Urgent</span>
          </div>
          <span className="font-bold text-rose-950">{Urgent}</span>
        </div>
      </div>
    </div>
  );
}

