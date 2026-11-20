// src/TeamsHeader.jsx
// Plain page header on slate-50 with live count pill, create button, and underline tab bar

import React from 'react';
import { Users, Plus, Network } from 'lucide-react';
import { pluralize } from './orgHelpers';

export default function TeamsHeader({
  activeTab,
  onTabChange,
  activeTeamsCount = 0,
  canManage = false,
  onOpenCreate
}) {
  return (
    <div className="space-y-4">
      {/* 1. Header Row (Plain on slate-50) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Operational Teams & Hierarchy
            </h1>
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {activeTeamsCount} Active {activeTeamsCount === 1 ? 'Team' : 'Teams'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Departmental squads, designated team leaders, and operational workgroups.
          </p>
        </div>

        {/* Right: + Create Team button (role-gated for managers) */}
        {canManage && (
          <button
            type="button"
            onClick={onOpenCreate}
            className="h-10 px-4 rounded-xl bg-[#05331F] hover:bg-[#0a4a2f] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-2xs focus-visible:ring-2 focus-visible:ring-emerald-500/40 w-full sm:w-auto"
          >
            <Plus className="w-[18px] h-[18px] text-emerald-300" strokeWidth={1.75} />
            <span>Create Team</span>
          </button>
        )}
      </div>

      {/* 2. Underline Tab Bar (sticky below header) */}
      <div className="border-b border-slate-200 sticky top-0 bg-slate-50/95 backdrop-blur-xs z-20">
        <div 
          role="tablist" 
          aria-label="Teams view tabs"
          className="flex items-center gap-6 overflow-x-auto no-scrollbar"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'teams'}
            type="button"
            onClick={() => onTabChange('teams')}
            className={`flex items-center gap-2 py-3 text-sm transition-colors relative whitespace-nowrap cursor-pointer ${
              activeTab === 'teams'
                ? 'text-[#05331F] font-semibold border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
            <span>Team Squads</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              activeTab === 'teams' ? 'bg-emerald-100 text-[#05331F]' : 'bg-slate-200 text-slate-600'
            }`}>
              {activeTeamsCount}
            </span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'org_chart'}
            type="button"
            onClick={() => onTabChange('org_chart')}
            className={`flex items-center gap-2 py-3 text-sm transition-colors relative whitespace-nowrap cursor-pointer ${
              activeTab === 'org_chart'
                ? 'text-[#05331F] font-semibold border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent'
            }`}
          >
            <Network className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
            <span>Org Chart Tree</span>
          </button>
        </div>
      </div>
    </div>
  );
}

