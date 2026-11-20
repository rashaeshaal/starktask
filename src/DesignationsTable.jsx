// src/DesignationsTable.jsx
// Designations table with Level, Designation, Department, Employees, and Actions

import React, { useState, useMemo } from 'react';
import { Edit, ChevronDown, ChevronUp, ArrowUpDown, ChevronRight } from 'lucide-react';
import { getRoleLevel } from './orgTree';
import { formatDepartment, pluralize, LEVEL_STYLES } from './orgHelpers';

export default function DesignationsTable({
  designations = [],
  employees = [],
  departments = [],
  canManageOrg = false,
  onSelectDesignation,
  onEditDesignation
}) {
  const [sortField, setSortField] = useState('level'); // 'level' | 'title' | 'count'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  const [levelFilter, setLevelFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');

  // Compute employee count per designation
  const rows = useMemo(() => {
    return designations.map(des => {
      const title = des.title || des.name || 'Staff';
      const lvl = des.level || getRoleLevel(title);
      const count = employees.filter(e => 
        (e.designation || e.role || '').toLowerCase() === title.toLowerCase()
      ).length;

      return {
        ...des,
        computedLevel: lvl,
        assignedCount: count
      };
    });
  }, [designations, employees]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (levelFilter !== 'all' && String(r.computedLevel) !== String(levelFilter)) return false;
      if (deptFilter !== 'all' && (r.departmentId || r.department || '').toLowerCase() !== deptFilter.toLowerCase()) return false;
      return true;
    });
  }, [rows, levelFilter, deptFilter]);

  // Sorted rows
  const sortedRows = useMemo(() => {
    const list = [...filteredRows];
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'level') {
        valA = a.computedLevel;
        valB = b.computedLevel;
      } else if (sortField === 'count') {
        valA = a.assignedCount;
        valB = b.assignedCount;
      } else if (sortField === 'title') {
        valA = (a.title || a.name || '').toLowerCase();
        valB = (b.title || b.name || '').toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredRows, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Table Filters Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Level Filter */}
          <div className="relative">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="h-10 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none appearance-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 cursor-pointer transition-colors"
            >
              <option value="all">All Levels (L1 - L6)</option>
              {[1, 2, 3, 4, 5, 6].map(l => (
                <option key={l} value={l}>Level {l}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Department Filter */}
          <div className="relative">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-10 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none appearance-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 cursor-pointer transition-colors"
            >
              <option value="all">All Departments ({departments.length})</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name || formatDepartment(d.id)}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Count indicator */}
        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="text-slate-900 font-semibold">{filteredRows.length}</span> designations
        </div>

      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th 
                  onClick={() => handleSort('level')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Level</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('title')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Designation</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Department</th>
                <th 
                  onClick={() => handleSort('count')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Employees</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                {canManageOrg && (
                  <th className="py-3 px-4 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRows.length > 0 ? (
                sortedRows.map(row => {
                  const levelConfig = LEVEL_STYLES[row.computedLevel] || LEVEL_STYLES[6];
                  const title = row.title || row.name;
                  const roleMapping = row.roleMapping || row.role;
                  const hasDifferentRoleMapping = roleMapping && roleMapping.toLowerCase() !== title.toLowerCase();

                  return (
                    <tr 
                      key={row.id}
                      className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                      onClick={() => onSelectDesignation && onSelectDesignation(row)}
                    >
                      {/* Level */}
                      <td className="py-3 px-4 font-medium">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${levelConfig.bg} ${levelConfig.text} ${levelConfig.border}`}>
                          L{row.computedLevel}
                        </span>
                      </td>

                      {/* Designation Title & Role mapping subtitle */}
                      <td className="py-3 px-4 font-semibold text-slate-900 group-hover:text-emerald-900">
                        <div>
                          <span>{title}</span>
                          {hasDifferentRoleMapping && (
                            <span className="block text-[11px] font-normal text-slate-400 mt-0.5">
                              Maps to: {roleMapping}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4 text-slate-600">
                        {formatDepartment(row.departmentId || row.department)}
                      </td>

                      {/* Employee count badge */}
                      <td className="py-3 px-4 text-right font-semibold">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px]">
                          {pluralize(row.assignedCount, 'employee')}
                        </span>
                      </td>

                      {/* Actions */}
                      {canManageOrg && (
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => onEditDesignation && onEditDesignation(row)}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors inline-flex items-center gap-1"
                            title="Edit Designation"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={canManageOrg ? 5 : 4} className="py-12 text-center text-slate-400">
                    No designations match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
