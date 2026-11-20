import React, { useState, useMemo } from 'react';
import { Edit, ChevronDown, ChevronUp, ArrowUpDown, Search, Filter } from 'lucide-react';
import { getRoleLevel } from './orgTree';

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
        
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="h-10 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
            >
              <option value="all">All Levels (L1 - L6)</option>
              {[1, 2, 3, 4, 5, 6].map(l => (
                <option key={l} value={l}>Level {l}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-10 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
            >
              <option value="all">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Showing <strong className="text-slate-900">{sortedRows.length}</strong> designations
        </span>

      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold sticky top-0">
              <tr>
                <th 
                  onClick={() => handleSort('level')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Level</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('title')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Designation</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>

                <th className="py-3 px-4 whitespace-nowrap">Department</th>
                <th className="py-3 px-4 whitespace-nowrap">Role Mapping</th>

                <th 
                  onClick={() => handleSort('count')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Employees</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>

                {canManageOrg && (
                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={canManageOrg ? 6 : 5} className="py-8 text-center text-slate-400">
                    No designations match your criteria.
                  </td>
                </tr>
              ) : (
                sortedRows.map(des => (
                  <tr 
                    key={des.id} 
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        L{des.computedLevel}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {des.title || des.name}
                    </td>

                    <td className="py-3 px-4 text-slate-600 uppercase font-mono text-[11px] whitespace-nowrap">
                      {des.departmentId || des.department || 'Operations'}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                        {des.roleMapping || des.role || des.title}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectDesignation && onSelectDesignation(des.title || des.name)}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                      >
                        {des.assignedCount} {des.assignedCount === 1 ? 'employee' : 'employees'}
                      </button>
                    </td>

                    {canManageOrg && (
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onEditDesignation && onEditDesignation(des)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Edit Designation"
                        >
                          <Edit className="w-4 h-4" strokeWidth={1.75} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Stacked Cards */}
      <div className="md:hidden space-y-2.5">
        {sortedRows.map(des => (
          <div key={des.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  L{des.computedLevel}
                </span>
                <h4 className="font-semibold text-sm text-slate-900 mt-1">
                  {des.title || des.name}
                </h4>
                <p className="text-xs text-slate-500 uppercase font-mono mt-0.5">
                  {des.departmentId || des.department || 'Operations'}
                </p>
              </div>

              {canManageOrg && (
                <button
                  type="button"
                  onClick={() => onEditDesignation && onEditDesignation(des)}
                  className="p-2 text-slate-400 hover:text-slate-800 rounded-lg"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-mono text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                {des.roleMapping || des.role || des.title}
              </span>

              <button
                type="button"
                onClick={() => onSelectDesignation && onSelectDesignation(des.title || des.name)}
                className="font-semibold text-emerald-700 hover:underline"
              >
                {des.assignedCount} staff
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
