// src/TeamDrawer.jsx
// Read-only team detail drawer with leader, description, full member list, and Esc dismiss

import React, { useEffect } from 'react';
import { X, Users, User, Building2, Calendar } from 'lucide-react';
import TeamMemberRow from './TeamMemberRow';
import { formatName, formatDepartment, pluralize, DEPT_DOT_COLORS } from './orgHelpers';
import { getRoleLevel } from './orgTree';
import { canUserAssignTo } from './permissions';

export default function TeamDrawer({
  isOpen,
  onClose,
  team,
  members = [],
  employees = [],
  currentUser,
  onAssignToMember,
  onSelectMember
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !team) return null;

  const isActive = team.status === 'active';
  const teamTitle = formatName(team.name || 'Team Squad');
  const deptDisplay = formatDepartment(team.departmentId || team.department);
  const dotColor = DEPT_DOT_COLORS[(team.departmentId || '').toLowerCase()] || 'bg-slate-400';

  // Leader
  const leaderObj = employees.find(e => e.id === team.leaderId || e.employeeId === team.leaderId);
  const leaderName = formatName(leaderObj?.fullName || leaderObj?.name || team.leaderName || 'Unassigned');
  const leaderRole = leaderObj?.role || leaderObj?.designation || team.leaderRole || 'Team Leader';

  // Sort members by level L1 to L6
  const sortedMembers = [...members].sort((a, b) => {
    const lvlA = a.level || getRoleLevel(a.role) || 6;
    const lvlB = b.level || getRoleLevel(b.role) || 6;
    return lvlA - lvlB;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-600' : 'bg-red-500'}`} />
                <span>{isActive ? 'Active' : 'Inactive'}</span>
              </span>
              <span className="text-xs text-slate-500 font-medium">{deptDisplay}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Title & Description */}
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {teamTitle}
              </h2>
              {team.description ? (
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {team.description}
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">No description provided.</p>
              )}
            </div>

            {/* Team Leader Banner */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#05331F] text-emerald-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {leaderName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                  Designated Team Leader
                </span>
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {leaderName}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {leaderRole}
                </p>
              </div>
            </div>

            {/* Members Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Squad Members ({sortedMembers.length})
                </h3>
              </div>

              {sortedMembers.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-3 text-center border border-dashed border-slate-200 rounded-xl">
                  No members assigned to this squad.
                </p>
              ) : (
                <div className="space-y-2">
                  {sortedMembers.map(member => {
                    const targetEmp = employees.find(e => (e.id || e.employeeId) === (member.userId || member.id)) || member;
                    const canAssign = canUserAssignTo(currentUser, targetEmp, employees, members);

                    return (
                      <TeamMemberRow
                        key={member.id || member.userId}
                        member={member}
                        canAssign={canAssign}
                        canRemove={false}
                        onAssign={onAssignToMember}
                        onSelect={() => onSelectMember && onSelectMember(targetEmp)}
                      />
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

