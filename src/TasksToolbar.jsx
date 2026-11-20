// src/TasksToolbar.jsx
// Clean one-row toolbar with segmented date filter, search, selects, and group toggle

import React from 'react';
import { Search, X, ChevronDown, RotateCcw, Calendar, Layers } from 'lucide-react';
import { TASK_STATUSES } from './rbac';
import { formatDue } from './taskHelpers';

export default function TasksToolbar({
  dateFilter,
  onDateFilterChange,
  selectedDate,
  onSelectedDateChange,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  groupByStatus,
  onToggleGroupByStatus,
  onResetFilters
}) {
  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    dateFilter !== 'today'
  );

  return (
    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      
      {/* Left: Segmented Date Filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="inline-flex p-1 bg-slate-100 rounded-xl">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'all', label: 'All dates' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onDateFilterChange(tab.id)}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                dateFilter === tab.id
                  ? 'bg-[#05331F] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Custom date picker */}
        <div className="relative inline-flex items-center">
          <label 
            htmlFor="customDatePicker" 
            className={`h-10 px-3 rounded-xl border text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
              dateFilter === 'custom' 
                ? 'bg-emerald-50 border-emerald-300 text-[#05331F]' 
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title="Select specific date"
          >
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">
              {dateFilter === 'custom' ? formatDue(selectedDate).label : 'Date'}
            </span>
          </label>
          <input
            id="customDatePicker"
            type="date"
            value={selectedDate}
            onChange={(e) => {
              onSelectedDateChange(e.target.value);
              onDateFilterChange('custom');
            }}
            className="sr-only"
          />
        </div>
      </div>

      {/* Middle & Right: Search, Selects, Group toggle, Reset */}
      <div className="flex items-center gap-2.5 flex-wrap flex-1 lg:justify-end">
        
        {/* Search Input (flex-1) */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-[18px] h-[18px] absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search tasks, descriptions or references…"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-10 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search query"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Select */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="h-10 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none appearance-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 cursor-pointer transition-colors"
          >
            <option value="all">All Statuses</option>
            <option value={TASK_STATUSES.ASSIGNED}>Pending</option>
            <option value={TASK_STATUSES.IN_PROGRESS}>In Progress</option>
            <option value={TASK_STATUSES.PENDING_REVIEW}>In Review</option>
            <option value={TASK_STATUSES.COMPLETED}>Completed</option>
            <option value={TASK_STATUSES.BLOCKED}>Blocked</option>
            <option value="overdue">Overdue</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Priority Select */}
        <div className="relative">
          <select
            value={priorityFilter}
            onChange={(e) => onPriorityFilterChange(e.target.value)}
            className="h-10 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none appearance-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 cursor-pointer transition-colors"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Grouping toggle button */}
        <button
          type="button"
          onClick={onToggleGroupByStatus}
          className={`h-10 px-3 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
            groupByStatus 
              ? 'bg-emerald-50 border-emerald-300 text-[#05331F]' 
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
          title="Toggle grouped sections"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Group</span>
        </button>

        {/* Reset ghost button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="h-10 px-3 text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}

      </div>

    </div>
  );
}

