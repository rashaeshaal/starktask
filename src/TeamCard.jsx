// src/TeamCard.jsx
// Equal-height squad card with Title Case titles, leader block, member list, and 3-dots actions menu

import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Edit, Trash2, UserPlus, Power, Plus } from 'lucide-react';
import TeamMemberRow from './TeamMemberRow';
import { formatName, formatDepartment, pluralize, DEPT_DOT_COLORS } from './orgHelpers';
import { getRoleLevel } from './orgTree';
import { canUserAssignTo } from './permissions';

export default function TeamCard({
  team,
  members = [],
  employees = [],
  currentUser,
  isManager = false,
  onOpenDetails,
  onEdit,
  onToggleStatus,
  onDelete,
  onAddMember,
  onAssignToMember,
  onRemoveMember
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const menuRef = useRef(null);

  const isActive = team.status === 'active';
  const teamTitle = formatName(team.name || 'Team Squad');
  const deptKey = (team.departmentId || team.department || 'operations').toLowerCase();
  const deptDisplay = formatDepartment(team.departmentId || team.department);
  const dotColor = DEPT_DOT_COLORS[deptKey] || 'bg-slate-400';

  // Sort members by level L1 to L6
  const sortedMembers = React.useMemo(() => {
    return [...members].sort((a, b) => {
      const lvlA = a.level || getRoleLevel(a.role) || 6;
      const lvlB = b.level || getRoleLevel(b.role) || 6;
      return lvlA - lvlB;
    });
  }, [members]);

  const maxVisible = 4;
  const displayedMembers = isExpanded ? sortedMembers : sortedMembers.slice(0, maxVisible);
  const remainingCount = sortedMembers.length - maxVisible;

  // Resolve leader details
  const leaderObj = React.useMemo(() => {
    const lId = team.leaderId || team.teamLeaderId;
    return employees.find(e => e.id === lId || e.employeeId === lId);
  }, [team.leaderId, team.teamLeaderId, employees]);

  const leaderName = formatName(leaderObj?.fullName || leaderObj?.name || team.leaderName || 'Unassigned');
  const leaderRole = leaderObj?.role || leaderObj?.designation || team.leaderRole || 'Team Leader';

  // Hide generic boilerplate description
  const rawDesc = (team.description || '').trim();
  const isGenericDesc = rawDesc === 'Departmental team unit.' || rawDesc === 'Core corporate operational department at Stark Steel Doors.';
  const displayDescription = isGenericDesc ? '' : rawDesc;

  // Close 3-dots menu on outside click or ESC
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isMenuOpen]);

  return (
    <div
      onClick={() => onOpenDetails && onOpenDetails(team)}
      className="group bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-emerald-300 transition-all duration-150 flex flex-col justify-between cursor-pointer h-full"
    >
      <div className="space-y-4">
        
        {/* 1. Header: Department Chip, Status Pill, and 3-Dots Menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Department chip with color dot */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
              <span className={`w-2 h-2 rounded-full ${dotColor}`} />
              <span>{deptDisplay}</span>
            </div>

            {/* Status pill (fixed size, no wrapping) */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
              isActive 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-600' : 'bg-red-500'}`} />
              <span>{isActive ? 'Active' : 'Inactive'}</span>
            </span>
          </div>

          {/* 3-dots menu (Role-gated) */}
          {isManager && (
            <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(prev => !prev)}
                aria-label="Squad actions"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <MoreHorizontal className="w-[18px] h-[18px]" strokeWidth={1.75} />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => { setIsMenuOpen(false); onEdit && onEdit(team); }}
                    className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-400" />
                    <span>Edit Team</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsMenuOpen(false); onToggleStatus && onToggleStatus(team); }}
                    className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Power className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isActive ? 'Deactivate Team' : 'Activate Team'}</span>
                  </button>
                  <div className="h-px bg-slate-100 my-1" />
                  <button
                    type="button"
                    onClick={() => { setIsMenuOpen(false); onDelete && onDelete(team); }}
                    className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Team</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Squad Title & Description */}
        <div>
          <h3 className="font-semibold text-base text-slate-900 group-hover:text-emerald-950 transition-colors truncate">
            {teamTitle}
          </h3>
          {displayDescription && (
            <p className="text-xs text-slate-500 line-clamp-2 mt-1">
              {displayDescription}
            </p>
          )}
        </div>

        {/* 3. Leader Block */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#05331F] text-emerald-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
            {leaderName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
              Team Leader
            </span>
            <p className="text-xs font-semibold text-slate-900 truncate" title={leaderName}>
              {leaderName}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {leaderRole}
            </p>
          </div>
        </div>

        {/* 4. Members Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              {pluralize(sortedMembers.length, 'member')}
            </span>
            {isManager && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddMember && onAddMember(team);
                }}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add member</span>
              </button>
            )}
          </div>

          {/* Members list */}
          {sortedMembers.length === 0 ? (
            <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center space-y-1.5">
              <p className="text-xs text-slate-400">No members yet</p>
              {isManager && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddMember && onAddMember(team);
                  }}
                  className="text-xs font-semibold text-[#05331F] hover:underline"
                >
                  Add members
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {displayedMembers.map(member => {
                const targetEmp = employees.find(e => (e.id || e.employeeId) === (member.userId || member.id)) || member;
                const canAssign = canUserAssignTo(currentUser, targetEmp, employees, members);

                return (
                  <TeamMemberRow
                    key={member.id || member.userId}
                    member={member}
                    canAssign={canAssign}
                    canRemove={isManager}
                    onAssign={onAssignToMember}
                    onRemove={(m) => onRemoveMember && onRemoveMember(team.id, m.userId || m.id)}
                  />
                );
              })}

              {remainingCount > 0 && !isExpanded && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(true);
                  }}
                  className="w-full py-1.5 text-center text-xs font-medium text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                >
                  +{remainingCount} more
                </button>
              )}

              {isExpanded && remainingCount > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                  }}
                  className="w-full py-1.5 text-center text-xs font-medium text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  Show less
                </button>
              )}
            </div>
          )}
        </div>

      </div>

      {/* 5. Footer (pinned to bottom via mt-auto) */}
      <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="truncate">{deptDisplay}</span>
        <span className="font-medium whitespace-nowrap">{pluralize(sortedMembers.length, 'member')}</span>
      </div>

    </div>
  );
}
