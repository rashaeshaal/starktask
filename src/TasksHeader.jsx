// src/TasksHeader.jsx
// Page header and underline navigation tabs for My Tasks

import React from 'react';
import { PlusCircle, Send, CheckSquare, Truck, Megaphone, Lock } from 'lucide-react';
import { pluralize } from './taskHelpers';

export default function TasksHeader({
  viewMode,
  onViewModeChange,
  isAllTasks = false,
  todayCount = 0,
  assignedByMeCount = 0,
  salesLinkedCount = 0,
  marketingRequestsCount = 0,
  canSeeSalesLinked = false,
  canSeeMarketingRequests = false,
  onOpenAddWork,
  isTodayLocked = false
}) {
  const tabs = isAllTasks 
    ? [
        {
          id: 'all_tasks',
          label: 'Directory',
          count: todayCount
        }
      ]
    : [
        {
          id: 'my_tasks',
          label: 'My Work',
          count: todayCount
        }
      ];

  if (canSeeSalesLinked) {
    tabs.push({
      id: 'sales_linked',
      label: 'From Sales',
      count: salesLinkedCount,
      icon: Truck
    });
  }

  if (canSeeMarketingRequests) {
    tabs.push({
      id: 'marketing_requests',
      label: 'Marketing Requests',
      count: marketingRequestsCount,
      icon: Megaphone
    });
  }

  return (
    <div className="space-y-4">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            {isAllTasks ? 'Task Directory' : 'My Tasks'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAllTasks ? `${todayCount} total operational tasks` : `${pluralize(todayCount, 'task')} today`}
          </p>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={onOpenAddWork}
          disabled={isTodayLocked}
          className={`h-10 px-4 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-2xs focus-visible:ring-2 focus-visible:ring-emerald-500/40 w-full sm:w-auto ${
            isTodayLocked
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed opacity-80'
              : 'bg-[#05331F] hover:bg-[#0a4a2f] text-white cursor-pointer'
          }`}
          title={isTodayLocked ? "Today's work log is locked. Entries can no longer be modified." : "Add today's work"}
        >
          {isTodayLocked ? (
            <Lock className="w-[16px] h-[16px] text-slate-500" strokeWidth={2} />
          ) : (
            <PlusCircle className="w-[18px] h-[18px] text-emerald-300" strokeWidth={1.75} />
          )}
          <span>{isTodayLocked ? 'Work Log Locked' : "Add today's work"}</span>
        </button>
      </div>

      {/* Underline Tab Bar (sticky below header) */}
      <div className="border-b border-slate-200">
        <div 
          role="tablist" 
          aria-label="Task categories"
          className="flex items-center gap-6 overflow-x-auto no-scrollbar"
        >
          {tabs.map(tab => {
            const isActive = viewMode === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => onViewModeChange(tab.id)}
                className={`flex items-center gap-2 py-3 text-sm transition-colors relative whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-[#05331F] font-semibold border-b-2 border-emerald-600'
                    : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent'
                }`}
              >
                {Icon && <Icon className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    isActive ? 'bg-emerald-100 text-[#05331F]' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

