import React from 'react';
import { Search, X, ChevronDown, RotateCcw } from 'lucide-react';

export default function EmployeeToolbar({
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
    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
      
      {/* Search Input (flex-1) */}
      <div className="relative flex-1 min-w-[240px]">
        <Search className="w-[18px] h-[18px] absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" strokeWidth={1.75} />
        <input
          type="text"
          placeholder="Search by name, email, employee ID or designation…"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-10 pl-9 pr-8 bg-slate-50/60 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-colors"
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

      {/* Selects & Result Count */}
      <div className="flex items-center gap-2.5 flex-wrap">
        
        {/* Department Filter */}
        <div className="relative">
          <select
            value={departmentFilter}
            onChange={(e) => onDepartmentFilterChange(e.target.value)}
            className="h-10 pl-3 pr-8 bg-slate-50/60 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none appearance-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 cursor-pointer transition-colors"
          >
            <option value="all">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="h-10 pl-3 pr-8 bg-slate-50/60 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none appearance-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 cursor-pointer transition-colors"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Reset filters button (shows when any filter active) */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="h-10 px-3 rounded-xl border border-dashed border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset filters</span>
          </button>
        )}

        {/* Showing result count */}
        <div className="text-xs font-medium text-slate-500 whitespace-nowrap pl-1">
          Showing <span className="font-semibold text-slate-900">{filteredCount}</span> of {totalCount}
        </div>

      </div>

    </div>
  );
}
