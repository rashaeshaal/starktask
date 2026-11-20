// src/TeamModal.jsx
// Create / Edit Team Modal with 2-column fields, leader dropdown, MemberPicker, live tree preview & validation

import React, { useState, useEffect, useMemo } from 'react';
import { Users, X, AlertCircle, Loader2, GitFork, ArrowDownRight } from 'lucide-react';
import MemberPicker from './MemberPicker';
import { formatName, formatDepartment } from './orgHelpers';
import { getAllowedLeadersForDepartment, getRoleLevel, validateTeamPlacement } from './orgTree';

export default function TeamModal({
  isOpen,
  onClose,
  team = null,
  departments = [],
  employees = [],
  currentUser,
  onSaveTeam
}) {
  const isEditing = Boolean(team && team.id);

  const [teamName, setTeamName] = useState('');
  const [teamDept, setTeamDept] = useState('');
  const [teamLeaderId, setTeamLeaderId] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamStatus, setTeamStatus] = useState('active');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [memberReportingMap, setMemberReportingMap] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (team) {
      setTeamName(team.name || '');
      setTeamDept(team.departmentId || team.department || departments[0]?.id || 'operations');
      setTeamLeaderId(team.leaderId || '');
      setTeamDescription(team.description || '');
      setTeamStatus(team.status || 'active');

      const existingMembers = team.members || [];
      setSelectedMemberIds(existingMembers.map(m => String(m.id || m.userId || m.employeeId)));

      const repMap = {};
      existingMembers.forEach(m => {
        const mId = String(m.id || m.userId || m.employeeId);
        if (m.reportingLeadId) repMap[mId] = m.reportingLeadId;
      });
      setMemberReportingMap(repMap);
    } else {
      setTeamName('');
      setTeamDept(departments[0]?.id || 'operations');
      setTeamLeaderId('');
      setTeamDescription('');
      setTeamStatus('active');
      setSelectedMemberIds([]);
      setMemberReportingMap({});
    }
    setError('');
  }, [team, isOpen, departments]);

  // Handle ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Eligible leaders for currently chosen department
  const eligibleLeaders = useMemo(() => {
    const allowedRoles = getAllowedLeadersForDepartment(teamDept);
    return employees.filter(emp => {
      const empDept = (emp.department || emp.departmentId || '').toLowerCase();
      const normDept = (teamDept || '').toLowerCase();
      const matchesDept = empDept === normDept || 
                          emp.role === 'Operations Head' || 
                          ['Executive Director', 'Director Operations', 'General Manager'].includes(emp.role);
      return matchesDept && allowedRoles.includes(emp.role);
    });
  }, [teamDept, employees]);

  const leaderObj = useMemo(() => {
    return employees.find(e => String(e.id || e.employeeId) === String(teamLeaderId));
  }, [teamLeaderId, employees]);

  const handleToggleMember = (empId) => {
    setSelectedMemberIds(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const handleSelectAllInGroup = (groupMembers) => {
    const groupIds = groupMembers.map(m => String(m.id || m.employeeId));
    const allSelected = groupIds.every(id => selectedMemberIds.includes(id));
    if (allSelected) {
      setSelectedMemberIds(prev => prev.filter(id => !groupIds.includes(id)));
    } else {
      setSelectedMemberIds(prev => Array.from(new Set([...prev, ...groupIds])));
    }
  };

  const handleChangeReportingLead = (memberId, leadId) => {
    setMemberReportingMap(prev => ({ ...prev, [memberId]: leadId }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!teamName.trim()) {
      setError('Team name is required.');
      return;
    }
    if (!teamDept) {
      setError('Please select a department.');
      return;
    }
    if (!teamLeaderId) {
      setError('A designated Team Leader is required.');
      return;
    }

    if (!leaderObj) {
      setError('Selected leader record was not found.');
      return;
    }

    // Strict validation for every selected member
    const selectedMembers = employees.filter(emp => 
      selectedMemberIds.includes(String(emp.id || emp.employeeId))
    );

    for (const member of selectedMembers) {
      const validation = validateTeamPlacement(leaderObj.role, member.role, teamDept);
      if (!validation.valid) {
        setError(validation.reason);
        return;
      }
    }

    setLoading(true);

    const payload = {
      name: teamName.trim(),
      departmentId: teamDept,
      department: teamDept,
      leaderId: teamLeaderId,
      leaderName: `${formatName(leaderObj.fullName || leaderObj.name)} (${leaderObj.role})`,
      description: teamDescription.trim(),
      status: teamStatus,
      members: selectedMembers.map(m => {
        const mId = String(m.id || m.employeeId);
        const repLeadId = memberReportingMap[mId] || teamLeaderId;
        const repLeadObj = employees.find(e => String(e.id || e.employeeId) === String(repLeadId));
        return {
          id: mId,
          userId: mId,
          fullName: m.fullName || m.name,
          role: m.role || m.designation,
          department: m.department || teamDept,
          departmentId: teamDept,
          email: m.email,
          reportingLeadId: repLeadId,
          reportingLeadName: repLeadObj ? `${formatName(repLeadObj.fullName || repLeadObj.name)} (${repLeadObj.role})` : null
        };
      })
    };

    try {
      if (onSaveTeam) {
        await onSaveTeam(payload);
      }
      onClose();
    } catch (err) {
      console.error('Save team error:', err);
      setError(err.message || 'Failed to save team.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col p-6 shadow-xl border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#05331F] flex items-center justify-center font-bold border border-emerald-200">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {isEditing ? `Edit Squad: ${team.name}` : 'Create Departmental Squad'}
              </h3>
              <p className="text-xs text-slate-500">
                Leader selection and member placement enforced by hierarchy rules.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Validation error */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1 pt-4">
          
          {/* 2-Column Grid: Name & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Squad Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Warehouse Staging Unit A"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department *</label>
              <select
                required
                value={teamDept}
                onChange={(e) => {
                  setTeamDept(e.target.value);
                  setTeamLeaderId('');
                  setSelectedMemberIds([]);
                }}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 cursor-pointer"
              >
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name || formatDepartment(dept.id)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 2-Column Grid: Designated Leader & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Designated Leader *</label>
              <select
                required
                value={teamLeaderId}
                onChange={(e) => setTeamLeaderId(e.target.value)}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 cursor-pointer"
              >
                <option value="">-- Choose Eligible Leader --</option>
                {eligibleLeaders.map(l => (
                  <option key={l.id || l.employeeId} value={l.id || l.employeeId}>
                    {formatName(l.fullName || l.name)} — {l.role} (Level {getRoleLevel(l.role)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={teamStatus}
                onChange={(e) => setTeamStatus(e.target.value)}
                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 cursor-pointer"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Scope / Description Textarea (Full width) */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description & Scope</label>
            <textarea
              rows={2}
              placeholder="Operational responsibilities, territory, or staging assignments…"
              value={teamDescription}
              onChange={(e) => setTeamDescription(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Member Picker */}
          <MemberPicker
            department={teamDept}
            leaderRole={leaderObj?.role}
            employees={employees}
            selectedLeaderId={teamLeaderId}
            selectedMemberIds={selectedMemberIds}
            memberReportingMap={memberReportingMap}
            onToggleMember={handleToggleMember}
            onSelectAllInGroup={handleSelectAllInGroup}
            onChangeReportingLead={handleChangeReportingLead}
          />

          {/* Live Tree Preview */}
          {leaderObj && (
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
              <span className="text-xs font-semibold text-[#05331F] flex items-center gap-1.5">
                <GitFork className="w-3.5 h-3.5 text-emerald-700" />
                <span>Live Hierarchy Preview: Strict Downline Reporting</span>
              </span>

              <div className="bg-white p-3 rounded-xl border border-emerald-200/60 space-y-1.5 text-xs">
                {/* Leader node */}
                <div className="flex items-center gap-2 font-semibold text-[#05331F]">
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#05331F] text-emerald-300">
                    LEADER (L{getRoleLevel(leaderObj.role)})
                  </span>
                  <span>{formatName(leaderObj.fullName || leaderObj.name)}</span>
                  <span className="text-slate-500 font-normal">({leaderObj.role})</span>
                </div>

                {/* Member nodes */}
                {selectedMemberIds.map(mId => {
                  const emp = employees.find(e => String(e.id || e.employeeId) === String(mId));
                  if (!emp) return null;
                  const lvl = getRoleLevel(emp.role || emp.designation);
                  const repLeadId = memberReportingMap[mId] || teamLeaderId;
                  const isSubLead = String(repLeadId) !== String(teamLeaderId);
                  const repLeadObj = employees.find(e => String(e.id || e.employeeId) === String(repLeadId));

                  return (
                    <div 
                      key={mId}
                      style={{ marginLeft: isSubLead ? '24px' : '16px' }}
                      className="flex items-center justify-between text-slate-700 pt-0.5"
                    >
                      <div className="flex items-center gap-1.5">
                        <ArrowDownRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[10px] font-bold px-1 rounded bg-slate-100 text-slate-700">
                          L{lvl}
                        </span>
                        <span className="font-semibold text-slate-900">{formatName(emp.fullName || emp.name)}</span>
                        <span className="text-[11px] text-slate-500">({emp.role || emp.designation})</span>
                      </div>
                      {isSubLead && repLeadObj && (
                        <span className="text-[10px] text-emerald-800 bg-emerald-100/70 px-1.5 py-0.2 rounded font-medium">
                          Reports to: {formatName(repLeadObj.fullName || repLeadObj.name)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sticky Modal Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-10 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-5 rounded-xl bg-[#05331F] hover:bg-[#0a4a2f] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-2xs"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-300" />}
              <span>{isEditing ? 'Save Changes' : 'Create Team'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
