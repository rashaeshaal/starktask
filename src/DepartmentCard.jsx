import React from 'react';
import { Building2, User, Archive, CheckCircle2, ChevronRight } from 'lucide-react';

export default function DepartmentCard({
  department,
  assignedCount = 0,
  totalEmployeesCount = 1,
  canManageOrg = false,
  onSelect,
  onArchive,
  onEdit
}) {
  const isArchived = department.status === 'archived';
  const pct = totalEmployeesCount > 0 ? Math.round((assignedCount / totalEmployeesCount) * 100) : 0;
  const hasEmployees = assignedCount > 0;

  // Department code
  const code = (department.code || department.id || 'DEPT').toUpperCase();

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
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              isArchived 
                ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isArchived ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <span>{isArchived ? 'Archived' : 'Active'}</span>
            </span>
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

        {/* Head of Department */}
        <div className="flex items-center gap-2 pt-1 text-xs text-slate-600">
          <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
            <User className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <span className="truncate">
            Lead: <strong className="text-slate-900 font-semibold">{department.headName || department.headRole || 'Not assigned'}</strong>
          </span>
        </div>
      </div>

      {/* Footer: Progress bar relative to total personnel */}
      <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Active Staff</span>
          <span className="font-semibold text-slate-900">{assignedCount} employees</span>
        </div>

        {/* Thin progress bar */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-600 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(8, pct))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
