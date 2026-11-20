// src/TeamMemberRow.jsx
// Compact member row with avatar, Title Case name, level badge, reports-to line, Assign button and remove X

import React from 'react';
import { X, Send } from 'lucide-react';
import { formatName, LEVEL_STYLES } from './orgHelpers';
import { getRoleLevel } from './orgTree';

export default function TeamMemberRow({
  member,
  canAssign = false,
  canRemove = false,
  onAssign,
  onRemove
}) {
  const memberUid = member.userId || member.uid || member.id;
  const fullName = formatName(member.fullName || member.name || 'Member');
  const roleName = member.role || 'Staff';
  const memberLevel = member.level || getRoleLevel(roleName) || 5;
  const levelConfig = LEVEL_STYLES[memberLevel] || LEVEL_STYLES[6];
  const reportingLeadName = member.reportingLeadName ? formatName(member.reportingLeadName) : null;

  return (
    <div className="p-2 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between gap-2 text-xs transition-colors hover:bg-slate-100/60">
      
      {/* Left: Avatar + Details */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-lg bg-[#05331F] text-emerald-200 text-xs font-semibold flex items-center justify-center flex-shrink-0">
          {fullName.charAt(0)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-900 truncate">
              {fullName}
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${levelConfig.bg} ${levelConfig.text} ${levelConfig.border}`}>
              L{memberLevel}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 truncate mt-0.5">
            <span>{roleName}</span>
            {reportingLeadName && (
              <span className="text-slate-400"> · Reports to {reportingLeadName}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* Assign task button (strictly for authorized downline) */}
        {canAssign && (
          <button
            type="button"
            onClick={() => onAssign && onAssign(member)}
            className="h-7 px-2.5 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title={`Assign task to ${fullName}`}
          >
            <Send className="w-3 h-3 text-emerald-600" />
            <span>Assign</span>
          </button>
        )}

        {/* Remove member button (managers only) */}
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove && onRemove(member)}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
            title="Remove member from squad"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

    </div>
  );
}
