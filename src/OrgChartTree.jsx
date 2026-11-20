// src/OrgChartTree.jsx
// Visual Org Chart tree tab: search, expand/collapse, read-only L1-L6 legend, real connector lines, and glowing self-marker

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, ChevronDown, ChevronRight, Sparkles, Building2 } from 'lucide-react';
import { formatName, formatDepartment, LEVEL_STYLES } from './orgHelpers';
import { COMPANY_DEPARTMENTS, getRoleLevel } from './orgTree';

export default function OrgChartTree({
  employees = [],
  currentUserId,
  onSelectEmployee
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDepts, setExpandedDepts] = useState({
    management: true,
    sales: true,
    operations: true,
    warehouse: true,
    transportation: true,
    service: true,
    inventory: true,
    finance: true,
    hr_admin: true,
    marketing: true
  });

  const selfNodeRef = useRef(null);

  // Group employees by department
  const deptsData = useMemo(() => {
    return COMPANY_DEPARTMENTS.map(dept => {
      const staff = employees.filter(e => {
        const eDept = (e.department || e.departmentId || '').toLowerCase().trim();
        return eDept === dept.id.toLowerCase() || eDept.includes(dept.id.toLowerCase());
      }).sort((a, b) => {
        const lvlA = getRoleLevel(a.role || a.designation);
        const lvlB = getRoleLevel(b.role || b.designation);
        if (lvlA !== lvlB) return lvlA - lvlB;
        return (a.fullName || a.name || '').localeCompare(b.fullName || b.name || '');
      });

      return {
        ...dept,
        staff
      };
    });
  }, [employees]);

  const toggleDept = (deptId) => {
    setExpandedDepts(prev => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  const expandAll = () => {
    const all = {};
    COMPANY_DEPARTMENTS.forEach(d => { all[d.id] = true; });
    setExpandedDepts(all);
  };

  const collapseAll = () => {
    setExpandedDepts({});
  };

  // Auto-scroll to logged-in user's position on load
  useEffect(() => {
    if (selfNodeRef.current) {
      selfNodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentUserId]);

  const currentUserIdStr = currentUserId ? String(currentUserId).toLowerCase().trim() : '';

  return (
    <div className="space-y-4">
      
      {/* 1. Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-[18px] h-[18px] absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search hierarchy by name, role or employee ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={expandAll}
            className="h-10 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium transition-colors"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="h-10 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium transition-colors"
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* 2. Read-only L1-L6 Legend */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] text-slate-600">
        <span className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider pl-1">Levels:</span>
        {Object.entries(LEVEL_STYLES).map(([lvl, style]) => (
          <div key={lvl} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 shadow-2xs whitespace-nowrap">
            <span className={`w-2 h-2 rounded-full ${lvl === '1' ? 'bg-[#05331F]' : lvl === '2' ? 'bg-[#07472B]' : lvl === '3' ? 'bg-emerald-800' : lvl === '4' ? 'bg-emerald-600' : lvl === '5' ? 'bg-emerald-400' : 'bg-slate-400'}`} />
            <span className="font-medium text-slate-700">{style.label}</span>
          </div>
        ))}
      </div>

      {/* 3. Collapsible Department Sections */}
      <div className="space-y-3">
        {deptsData.map(dept => {
          const isExpanded = Boolean(expandedDepts[dept.id]);
          const staffCount = dept.staff.length;

          // Filter staff if search query present
          const visibleStaff = searchQuery.trim()
            ? dept.staff.filter(emp => {
                const q = searchQuery.toLowerCase();
                const mName = (emp.fullName || emp.name || '').toLowerCase().includes(q);
                const mRole = (emp.role || emp.designation || '').toLowerCase().includes(q);
                const mEmpId = String(emp.employeeId || '').toLowerCase().includes(q);
                return mName || mRole || mEmpId;
              })
            : dept.staff;

          if (searchQuery.trim() && visibleStaff.length === 0) return null;

          return (
            <div key={dept.id} className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              
              {/* Department Header */}
              <button
                type="button"
                onClick={() => toggleDept(dept.id)}
                className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100/70 transition-colors text-left cursor-pointer border-b border-slate-100"
              >
                <div className="flex items-center gap-2.5">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  )}
                  <span className="font-semibold text-xs text-slate-900 uppercase tracking-wide">
                    {dept.name}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                    {staffCount} {staffCount === 1 ? 'member' : 'members'}
                  </span>
                </div>
              </button>

              {/* Department Members Indented Tree */}
              {isExpanded && (
                <div className="p-4 space-y-2 bg-white">
                  {visibleStaff.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">No members placed in this department.</p>
                  ) : (
                    <div className="space-y-2 relative pl-2">
                      {visibleStaff.map((emp, idx) => {
                        const empLevel = getRoleLevel(emp.role || emp.designation);
                        const isMe = currentUserIdStr && (
                          String(emp.id).toLowerCase() === currentUserIdStr ||
                          String(emp.employeeId).toLowerCase() === currentUserIdStr ||
                          String(emp.uid).toLowerCase() === currentUserIdStr
                        );
                        const levelConfig = LEVEL_STYLES[empLevel] || LEVEL_STYLES[6];
                        const fullName = formatName(emp.fullName || emp.name || 'Staff');
                        const indentPx = Math.max(0, (empLevel - 1) * 16);

                        return (
                          <div 
                            key={emp.id || emp.employeeId || idx}
                            ref={isMe ? selfNodeRef : null}
                            style={{ marginLeft: `${indentPx}px` }}
                            className="relative flex items-center"
                          >
                            {/* Horizontal tick connector */}
                            {indentPx > 0 && (
                              <div className="w-3 border-t border-slate-200 mr-2 shrink-0" />
                            )}

                            {/* Node compact card */}
                            <div 
                              onClick={() => onSelectEmployee && onSelectEmployee(emp)}
                              className={`inline-flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs transition-all cursor-pointer shadow-2xs ${
                                isMe 
                                  ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/30' 
                                  : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs'
                              }`}
                            >
                              {/* Level badge */}
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${levelConfig.bg} ${levelConfig.text} ${levelConfig.border}`}>
                                L{empLevel}
                              </span>

                              {/* Avatar */}
                              <div className="w-7 h-7 rounded-lg bg-[#05331F] text-emerald-200 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                                {fullName.charAt(0)}
                              </div>

                              {/* Name & Designation */}
                              <div className="min-w-0 pr-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-slate-900 truncate">
                                    {fullName}
                                  </span>
                                  {isMe && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                                      <Sparkles className="w-2.5 h-2.5" />
                                      You
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-500 truncate block">
                                  {emp.role || emp.designation || 'Staff'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
}
