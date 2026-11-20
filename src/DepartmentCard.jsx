// src/DepartmentCard.jsx
// Department card with person-specific lead resolution, scaled progress bar, and archive handling

import React from 'react';
import { User, Archive } from 'lucide-react';
import { formatName, pluralize } from './orgHelpers';

export default function DepartmentCard({
  department,
  assignedCount = 0,
  totalEmployeesCount = 1,
  employees = [],
  canManageOrg = false,
  onSelect,
  onArchive,
  onEdit
}) {
  const isArchived = department.status === 'archived';
  const total = totalEmployeesCount > 0 ? totalEmployeesCount : 1;
  const pct = Math.min(100, Math.round((assignedCount / total) * 100));
  const hasEmployees = assignedCount > 0;

  // Department code
  const code = (department.code || department.id || 'DEPT').toUpperCase();

  // Find department head person
  const leadPerson = React.useMemo(() => {
    if (!employees || employees.length === 0) return null;
    const deptId = (department.id || department.code || '').toLowerCase().trim();
    
    // Look for headId match first
    if (department.headId) {
      const match = employees.find(e => 
        String(e.id).toLowerCase() === String(department.headId).toLowerCase() ||
        String(e.employeeId).toLowerCase() === String(department.headId).toLowerCase()
      );
      if (match) return match;
    }

    // Look for matching headName
    if (department.headName) {
      const match = employees.find(e => 
        (e.fullName || e.name || '').toLowerCase() === department.headName.toLowerCase()
      );
      if (match) return match;
    }

    // Look for department head designation within this department
    const deptMembers = employees.filter(e => {
      const eDept = (e.department || e.departmentId || '').toLowerCase().trim();
      return eDept === deptId || eDept.includes(deptId);
    });

    const leadRoleMatch = deptMembers.find(e => {
      const role = (e.designation || e.role || '').toLowerCase();
      return role.includes('head') || role.includes('manager') || role.includes('director') || role.includes('lead');
    });

    return leadRoleMatch || null;
  }, [department, employees]);

  const leadDisplayName = leadPerson 
    ? formatName(leadPerson.fullName || leadPerson.name)
    : (department.headName ? formatName(department.headName) : department.headRole || 'Not assigned');

  return (
    <div
      onClick={() => onSelect && onSelect(department.id)}
      className={`group rounded-2xl border p-5 shadow-sm transition-all duration-150 flex flex-col justify-between cursor-pointer ${
        isArchived 
          ? 'bg-slate-50/70 border-slate-200 opacity-75' 
          : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'
      }`}
    >
      <div className="space-y-3">
        {/* Top Header: Code badge + Status + Archive action */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase tracking-wider">
              {code}
            </span>
            {isArchived && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Archived</span>
              </span>
            )}
          </div>

          {canManageOrg && (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                disabled={hasEmployees && !isArchived}
                onClick={() => onArchive && onArchive(department)}
                title={
                  hasEmployees && !isArchived 
                    ? "Reassign employees before archiving" 
                    : isArchived ? "Re-activate Department" : "Archive Department"
                }
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                  hasEmployees && !isArchived
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-400 hover:text-amber-700 hover:bg-amber-50'
                }`}
              >
                <Archive className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>
          )}
        </div>

        {/* Department Name & Description */}
        <div>
          <h3 className="font-semibold text-base text-slate-900 group-hover:text-emerald-900 transition-colors">
            {department.name}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-2 mt-1">
            {department.description || 'Core corporate operational department at Stark Steel Doors.'}
          </p>
        </div>

        {/* Head of Department with avatar */}
        <div className="flex items-center gap-2 pt-1 text-xs text-slate-600">
          <div className="w-6 h-6 rounded-md bg-[#05331F] text-emerald-200 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
            {leadPerson ? leadDisplayName.charAt(0) : <User className="w-3.5 h-3.5 text-emerald-400" />}
          </div>
          <span className="truncate">
            Lead: <strong className="text-slate-900 font-semibold">{leadDisplayName}</strong>
          </span>
        </div>
      </div>

      {/* Footer: Progress bar relative to total personnel */}
      <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Active Staff</span>
          <span className="font-semibold text-slate-900">
            {pluralize(assignedCount, 'employee')} ({pct}%)
          </span>
        </div>

        {/* Scaled progress bar */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-600 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

    </div>
  );
}
