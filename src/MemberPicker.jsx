// src/MemberPicker.jsx
// Member picker grouped by role level (L1 to L6) with search, group select-all, and validation badges

import React, { useState, useMemo } from 'react';
import { Search, X, CheckSquare, Square, AlertCircle, ArrowDownRight } from 'lucide-react';
import { formatName, LEVEL_STYLES } from './orgHelpers';
import { getRoleLevel, validateTeamPlacement } from './orgTree';

export default function MemberPicker({
  department,
  leaderRole,
  employees = [],
  selectedLeaderId,
  selectedMemberIds = [],
  memberReportingMap = {},
  onToggleMember,
  onSelectAllInGroup,
  onChangeReportingLead
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Eligible members in this department, not including the leader
  const deptEmployees = useMemo(() => {
    const normDept = (department || '').toLowerCase().trim();
    return employees.filter(emp => {
      const eDept = (emp.department || emp.departmentId || '').toLowerCase().trim();
      const isLeader = emp.id === selectedLeaderId || emp.employeeId === selectedLeaderId;
      return (eDept === normDept || normDept === 'operations') && !isLeader;
    });
  }, [department, selectedLeaderId, employees]);

  // Group by level L1 to L6
  const groups = useMemo(() => {
    const map = {};
    deptEmployees.forEach(emp => {
      const role = emp.role || emp.designation || 'Staff';
      const lvl = getRoleLevel(role);
      if (!map[lvl]) {
        map[lvl] = {
          level: lvl,
          label: LEVEL_STYLES[lvl]?.label || `Level ${lvl}`,
          members: []
        };
      }
      map[lvl].members.push(emp);
    });

    return Object.values(map).sort((a, b) => a.level - b.level);
  }, [deptEmployees]);

  return (
    <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
      <div className="flex items-center justify-between">
        <label className="block font-semibold text-slate-800 text-xs">
          Select Downline Squad Members
        </label>
        <span className="text-xs text-emerald-800 bg-emerald-100 font-semibold px-2 py-0.5 rounded-full">
          {selectedMemberIds.length} Selected
        </span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          type="text"
          placeholder="Filter staff by name or role…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-9 pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/40"
        />
      </div>

      {/* Grouped Checklist */}
      <div className="max-h-60 overflow-y-auto space-y-3 pr-1 border border-slate-200 rounded-xl p-2.5 bg-white">
        {groups.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-3 text-center">
            No employees found in this department.
          </p>
        ) : (
          groups.map(group => {
            const filteredMembers = searchTerm.trim()
              ? group.members.filter(emp => {
                  const q = searchTerm.toLowerCase();
                  const mName = (emp.fullName || emp.name || '').toLowerCase().includes(q);
                  const mRole = (emp.role || emp.designation || '').toLowerCase().includes(q);
                  return mName || mRole;
                })
              : group.members;

            if (filteredMembers.length === 0) return null;

            const allSelected = filteredMembers.every(m => 
              selectedMemberIds.includes(m.id || m.employeeId)
            );

            return (
              <div key={group.level} className="space-y-1.5">
                {/* Sticky Group Header */}
                <div className="sticky top-0 bg-slate-100 px-2 py-1 rounded-lg flex items-center justify-between text-[11px] font-semibold text-slate-700 z-10">
                  <span>{group.label}</span>
                  <button
                    type="button"
                    onClick={() => onSelectAllInGroup && onSelectAllInGroup(filteredMembers)}
                    className="text-emerald-700 hover:underline text-[10px]"
                  >
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </button>
                </div>

                {/* Member items */}
                {filteredMembers.map(emp => {
                  const empId = String(emp.id || emp.employeeId);
                  const isChecked = selectedMemberIds.includes(empId);
                  const fullName = formatName(emp.fullName || emp.name);
                  const roleName = emp.role || emp.designation || 'Staff';

                  // Strict validation against leader
                  const validation = leaderRole 
                    ? validateTeamPlacement(leaderRole, roleName, department)
                    : { valid: true };

                  const isInvalid = !validation.valid;

                  return (
                    <div 
                      key={empId}
                      className={`p-2.5 rounded-xl border text-xs transition-colors space-y-2 ${
                        isInvalid 
                          ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                          : isChecked 
                            ? 'bg-emerald-50/70 border-emerald-300' 
                            : 'hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div 
                        onClick={() => !isInvalid && onToggleMember(empId)}
                        className={`flex items-center justify-between ${isInvalid ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        title={isInvalid ? validation.reason : ''}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isInvalid}
                            readOnly
                            className="rounded text-emerald-600 pointer-events-none"
                          />
                          <span className={`font-semibold truncate ${isChecked ? 'text-emerald-950' : 'text-slate-800'}`}>
                            {fullName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 font-normal">{roleName}</span>
                          {isInvalid && (
                            <span className="text-[10px] text-red-600 font-medium">
                              Invalid placement
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Immediate reporting lead picker if selected */}
                      {isChecked && !isInvalid && (
                        <div className="pt-1.5 border-t border-emerald-200/60 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <ArrowDownRight className="w-3 h-3 text-slate-400" />
                            Reports To:
                          </span>
                          <select
                            value={memberReportingMap[empId] || selectedLeaderId}
                            onChange={(e) => onChangeReportingLead && onChangeReportingLead(empId, e.target.value)}
                            className="h-8 pl-2 pr-6 bg-white border border-emerald-300 rounded-lg text-xs font-medium text-slate-800 outline-none"
                          >
                            <option value={selectedLeaderId}>Team Leader (Default)</option>
                            {deptEmployees
                              .filter(cand => {
                                const cId = String(cand.id || cand.employeeId);
                                return cId !== empId && selectedMemberIds.includes(cId) && getRoleLevel(cand.role) < getRoleLevel(roleName);
                              })
                              .map(lead => (
                                <option key={lead.id || lead.employeeId} value={lead.id || lead.employeeId}>
                                  {formatName(lead.fullName || lead.name)} ({lead.role})
                                </option>
                              ))
                            }
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

