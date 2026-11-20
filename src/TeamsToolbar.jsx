// src/TeamsToolbar.jsx
// One clean white row toolbar: search, Department select, Status select, count indicator, and reset button

import React from 'react';
import { Search, X, ChevronDown, RotateCcw } from 'lucide-react';
import { formatDepartment } from './orgHelpers';

export default function TeamsToolbar({
  searchTerm,
  onSearchChange,
  departmentFilter,
  onDepartmentFilterChange,
  statusFilter,
  onStatusFilterChange,
  departments = [],
  totalCount = 0,
  filteredCount = 0,
  onResetFilters
}) {
  const hasActiveFilters = Boolean(
    searchTerm.trim() || departmentFilter !== 'all' || statusFilter !== 'all'
  );

  return (
    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
      
      {/* 1. Search Input (flex-1) */}
      <div className="relative flex-1 min-w-[240px]">
        <Search className="w-[18px] h-[18px] absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" strokeWidth={1.75} />
        <input
          type="text"
          placeholder="Search teams by squad name, leader or department…"
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

      {/* 2. Selects, Result count & Reset */}
      <div className="flex items-center gap-2.5 flex-wrap">
        
        {/* Department Select */}
        <div className="relative">
          <select
            value={departmentFilter}
            onChange={(e) => onDepartmentFilterChange(e.target.value)}
            className="h-10 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none appearance-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 cursor-pointer transition-colors"
          >
            <option value="all">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>
                {d.name || formatDepartment(d.id)}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Status Select */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="h-10 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none appearance-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 cursor-pointer transition-colors"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

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

        {/* Result Count Indicator */}
        <div className="text-xs text-slate-500 font-medium px-2 whitespace-nowrap">
          Showing <span className="text-slate-900 font-semibold">{filteredCount}</span> of {totalCount}
        </div>

      </div>

    </div>
  );
}
