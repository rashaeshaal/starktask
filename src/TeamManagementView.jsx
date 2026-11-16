import React, { useState } from 'react';
import { 
  Users, Plus, Edit2, Trash2, UserPlus, ArrowRightLeft, 
  Shield, CheckCircle2, XCircle, Search, Filter, AlertCircle, 
  Check, X, Building2, UserCheck, Send, GitFork
} from 'lucide-react';
import { 
  createTeam, 
  updateTeam, 
  addTeamMembers, 
  removeTeamMember, 
  transferTeamMember 
} from './firestoreService';
import { hasPermission } from './employeeDirectory';

export default function TeamManagementView({ 
  teams = [], 
  teamMembers = [], 
  employees = [], 
  departments = [], 
  currentUser,
  onOpenAssignModal,
  onTeamCreated,
  onTeamUpdated,
  onTeamMembersUpdated
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [selectedTeamForMembers, setSelectedTeamForMembers] = useState(null);
  const [transferringMember, setTransferringMember] = useState(null);

  // Form states for Create/Edit
  const [teamName, setTeamName] = useState('');
  const [teamDept, setTeamDept] = useState(currentUser?.department === 'management' ? 'operations' : currentUser?.department || 'sales');
  const [teamLeaderId, setTeamLeaderId] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [allowPeerDelegation, setAllowPeerDelegation] = useState(true);

  // Add members multi-select state
  const [selectedEmployeeIdsToAdd, setSelectedEmployeeIdsToAdd] = useState([]);

  // Transfer member state
  const [targetTeamId, setTargetTeamId] = useState('');

  // Permission validation
  const isCompanyLeadership = ['Executive Director', 'Director Operations', 'General Manager'].includes(currentUser?.role);
  const canManageTeams = hasPermission(currentUser, 'manage_employees') || isCompanyLeadership || ['Operations Head', 'CSO', 'Accounts Manager', 'HR Manager'].includes(currentUser?.role);

  // Filtered teams list based on hierarchy & permissions
  const filteredTeams = teams.filter(team => {
    // If leadership or has manage_employees permission, show company-wide teams
    if (!isCompanyLeadership && !hasPermission(currentUser, 'manage_employees')) {
      if (team.departmentId !== currentUser?.department && team.department !== currentUser?.department) {
        return false;
      }
    }
    const matchSearch = (team.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (team.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = selectedDeptFilter === 'all' || team.departmentId === selectedDeptFilter || team.department === selectedDeptFilter;
    return matchSearch && matchDept;
  });

  // Eligible leaders based on selected team department
  const eligibleLeaders = employees.filter(emp => {
    if (!teamDept || teamDept === 'all') return true;
    return emp.department === teamDept || emp.departmentId === teamDept;
  });

  // Handle Open Create Modal
  const handleOpenCreate = () => {
    const defaultDept = currentUser?.department === 'management' ? 'operations' : currentUser?.department || 'operations';
    setTeamName('');
    setTeamDept(defaultDept);
    const leaders = employees.filter(emp => emp.department === defaultDept || emp.departmentId === defaultDept);
    setTeamLeaderId(leaders[0]?.id || leaders[0]?.employeeId || '');
    setTeamDescription('');
    setAllowPeerDelegation(true);
    setIsCreateModalOpen(true);
  };

  // Handle Open Edit Modal
  const handleOpenEdit = (team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamDept(team.departmentId);
    setTeamLeaderId(team.leaderId || '');
    setTeamDescription(team.description || '');
    setAllowPeerDelegation(team.allowPeerDelegation !== false);
  };

  // Submit Create or Edit Team
  const handleSaveTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) {
      alert('Team name is required.');
      return;
    }

    const leaderObj = employees.find(e => e.id === teamLeaderId || e.employeeId === teamLeaderId);

    const teamPayload = {
      name: teamName.trim(),
      departmentId: teamDept,
      leaderId: teamLeaderId,
      leaderName: leaderObj ? `${leaderObj.fullName || leaderObj.name} (${leaderObj.role})` : 'Unassigned',
      description: teamDescription.trim(),
      allowPeerDelegation: Boolean(allowPeerDelegation)
    };

    try {
      if (editingTeam) {
        try {
          await updateTeam(editingTeam.id, teamPayload, currentUser);
        } catch (fbErr) {
          console.warn("Firestore remote update error, updating local state:", fbErr.message);
        }
        if (onTeamUpdated) onTeamUpdated({ ...editingTeam, ...teamPayload });
        setEditingTeam(null);
      } else {
        let createdId = `team_${Date.now()}`;
        try {
          createdId = await createTeam(teamPayload, currentUser);
        } catch (fbErr) {
          console.warn("Firestore remote write error, saving to local team state:", fbErr.message);
        }
        if (onTeamCreated) onTeamCreated({ ...teamPayload, id: createdId, memberCount: 0, status: 'active' });
        setIsCreateModalOpen(false);
      }
    } catch (err) {
      console.error('Error saving team:', err);
      alert('Error saving team: ' + err.message);
    }
  };

  // Toggle Team Status (Active / Deactive)
  const handleToggleTeamStatus = async (team) => {
    const newStatus = team.status === 'active' ? 'inactive' : 'active';
    try {
      await updateTeam(team.id, { status: newStatus }, currentUser);
    } catch (err) {
      alert('Error updating team status: ' + err.message);
    }
  };

  // Handle Add Members Submit
  const handleAddMembersSubmit = async (e) => {
    e.preventDefault();
    if (selectedEmployeeIdsToAdd.length === 0) {
      alert('Select at least one employee to add.');
      return;
    }

    const membersToAdd = employees.filter(emp => {
      const empId = emp.id || emp.employeeId;
      return selectedEmployeeIdsToAdd.includes(empId);
    });

    const nowStr = new Date().toISOString();
    const newMembers = membersToAdd.map(emp => ({
      id: `${selectedTeamForMembers.id}_${emp.id || emp.employeeId}`,
      teamId: selectedTeamForMembers.id,
      teamName: selectedTeamForMembers.name,
      employeeId: emp.employeeId || emp.id,
      userId: emp.id || emp.employeeId,
      fullName: emp.fullName || emp.name,
      role: emp.role,
      department: emp.department || emp.departmentId,
      email: emp.email,
      addedById: currentUser.id || currentUser.employeeId,
      addedByName: `${currentUser.fullName || currentUser.name} (${currentUser.role})`,
      addedAt: nowStr,
      status: 'active'
    }));

    // Update local state and cache immediately so the user sees members right away
    if (onTeamMembersUpdated) {
      const mergedMembers = [...teamMembers];
      newMembers.forEach(nm => {
        const existingIdx = mergedMembers.findIndex(m => m.teamId === nm.teamId && m.userId === nm.userId);
        if (existingIdx >= 0) {
          mergedMembers[existingIdx] = nm;
        } else {
          mergedMembers.push(nm);
        }
      });
      onTeamMembersUpdated(mergedMembers);
    }

    if (onTeamUpdated) {
      const count = teamMembers.filter(m => m.teamId === selectedTeamForMembers.id && m.status === 'active').length + newMembers.length;
      onTeamUpdated({
        ...selectedTeamForMembers,
        memberCount: count
      });
    }

    try {
      await addTeamMembers(
        selectedTeamForMembers.id,
        selectedTeamForMembers.name,
        membersToAdd,
        currentUser
      );
    } catch (err) {
      console.warn('Firestore add team members warning (saved to local cache):', err.message);
    }

    setSelectedTeamForMembers(null);
    setSelectedEmployeeIdsToAdd([]);
  };

  // Handle Remove Member
  const handleRemoveMember = async (teamId, userId) => {
    if (!confirm('Are you sure you want to remove this employee from the team?')) return;
    
    // Update local state immediately
    if (onTeamMembersUpdated) {
      const updated = teamMembers.filter(m => !(m.teamId === teamId && m.userId === userId));
      onTeamMembersUpdated(updated);
    }
    
    try {
      await removeTeamMember(teamId, userId);
    } catch (err) {
      console.warn('Firestore remove member warning:', err.message);
    }
  };

  // Handle Transfer Member Submit
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!targetTeamId) {
      alert('Please select a target team.');
      return;
    }
    const targetTeamObj = teams.find(t => t.id === targetTeamId);
    if (!targetTeamObj) return;

    if (onTeamMembersUpdated) {
      const updated = teamMembers.map(m => {
        if (m.teamId === transferringMember.teamId && m.userId === transferringMember.userId) {
          return {
            ...m,
            teamId: targetTeamObj.id,
            teamName: targetTeamObj.name
          };
        }
        return m;
      });
      onTeamMembersUpdated(updated);
    }

    try {
      await transferTeamMember(
        transferringMember.teamId,
        targetTeamObj.id,
        targetTeamObj.name,
        { id: transferringMember.userId, fullName: transferringMember.fullName, role: transferringMember.role, email: transferringMember.email },
        currentUser
      );
    } catch (err) {
      console.warn('Firestore transfer member warning:', err.message);
    }
    setTransferringMember(null);
    setTargetTeamId('');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#05331F] bg-[#05331F]/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Corporate Team Management
            </span>
            <span className="text-xs text-slate-400">• Real Cloud Firestore Stream</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Operational Teams & Workgroups</h2>
          <p className="text-xs text-slate-500">
            Create, manage team leaders, assign members & transfer staff with real-time Firestore persistence
          </p>
        </div>

        {/* Action Button: Create Team */}
        {canManageTeams && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-[#05331F] hover:bg-[#07472c] text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-md transition-all active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Team</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search teams by name, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none"
          >
            <option value="all">All Departments</option>
            {departments.map((d, idx) => (
              <option key={d.id || `dept_opt_${idx}`} value={d.id || d.name}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-900">{filteredTeams.length}</span> active teams
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTeams.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 space-y-2">
            <Users className="w-12 h-12 mx-auto text-slate-300" />
            <p className="font-bold text-slate-700 text-sm">No teams found matching criteria.</p>
            <p className="text-xs">Click "Create New Team" to set up departmental workgroups.</p>
          </div>
        ) : (
          filteredTeams.map(team => {
            // Get live members of this team
            const currentMembers = teamMembers.filter(m => m.teamId === team.id && m.status === 'active');

            return (
              <div 
                key={team.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4 hover:border-emerald-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Team Top Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-mono font-bold bg-emerald-50 text-[#05331F] px-2 py-0.5 rounded border border-emerald-200">
                          {team.departmentId?.toUpperCase()}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          team.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {team.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                        {team.allowPeerDelegation !== false && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200" title="HR Rule: Team members can delegate tasks to each other">
                            Link Tree Delegation ON
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 text-base mt-1">{team.name}</h3>
                    </div>

                    {canManageTeams && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(team)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                          title="Edit Team Info / Change Leader"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleTeamStatus(team)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          title={team.status === 'active' ? 'Deactivate Team' : 'Activate Team'}
                        >
                          {team.status === 'active' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2">{team.description || 'Dedicated departmental operations team.'}</p>

                  {/* Team Leader Badge */}
                  <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs flex items-center justify-between">
                    <span className="text-slate-500">Team Leader:</span>
                    <span className="font-bold text-slate-800 truncate max-w-[160px]">{team.leaderName || 'Unassigned'}</span>
                  </div>

                  {/* Members List Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Team Members ({currentMembers.length}):</span>
                      {canManageTeams && team.status === 'active' && (
                        <button
                          onClick={() => {
                            setSelectedTeamForMembers(team);
                            setSelectedEmployeeIdsToAdd([]);
                          }}
                          className="text-[11px] text-[#05331F] font-bold flex items-center gap-1 hover:underline"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>+ Add Members</span>
                        </button>
                      )}
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {currentMembers.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic py-1">No members added yet.</p>
                      ) : (
                        currentMembers.map(m => (
                          <div 
                            key={m.id}
                            className="p-2 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                          >
                            <div className="truncate mr-2">
                              <span className="font-bold text-slate-900 block truncate">{m.fullName}</span>
                              <span className="text-[10px] text-slate-400">{m.role}</span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {onOpenAssignModal && (
                                <button
                                  onClick={() => onOpenAssignModal({ teamId: team.id, memberId: m.userId || m.id })}
                                  className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-[#05331F] font-bold rounded text-[10px] flex items-center gap-1 transition-all"
                                  title={`Delegate / Assign Task to ${m.fullName}`}
                                >
                                  <Send className="w-2.5 h-2.5" />
                                  <span>Assign</span>
                                </button>
                              )}
                              {canManageTeams && (
                                <>
                                  <button
                                    onClick={() => {
                                      setTransferringMember(m);
                                      setTargetTeamId('');
                                    }}
                                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                    title="Transfer Member to Another Team"
                                  >
                                    <ArrowRightLeft className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleRemoveMember(team.id, m.userId)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                    title="Remove from Team"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Created: {team.createdAt || 'Recent'}</span>
                  <span>By: {team.createdByName?.split(' ')[0] || 'Admin'}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: Create / Edit Team */}
      {(isCreateModalOpen || editingTeam) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto safe-pb safe-pt">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5 truncate mr-2">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                  <Users className="w-5 h-5 text-[#05331F]" />
                </div>
                <div className="truncate">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    {editingTeam ? 'Edit Team Details & Leader' : 'Create New Operational Team'}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">Cloud Firestore Master Workgroup Setup</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsCreateModalOpen(false); setEditingTeam(null); }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeam} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1 pt-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Team Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Warehouse North Staging Unit"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={teamDept}
                    onChange={(e) => {
                      const newDept = e.target.value;
                      setTeamDept(newDept);
                      const matchingLeaders = employees.filter(emp => emp.department === newDept || emp.departmentId === newDept);
                      setTeamLeaderId(matchingLeaders[0]?.id || matchingLeaders[0]?.employeeId || '');
                    }}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                  >
                    {departments.map((d, idx) => (
                      <option key={d.id || `create_dept_${idx}`} value={d.id || d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designated Team Leader *</label>
                  <select
                    required
                    value={teamLeaderId}
                    onChange={(e) => setTeamLeaderId(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                  >
                    <option value="">-- Choose Leader --</option>
                    {eligibleLeaders.map((l, idx) => (
                      <option key={l.id || l.employeeId || `leader_${idx}`} value={l.id || l.employeeId}>
                        {l.fullName || l.name} — {l.role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Scope & Description</label>
                <textarea
                  rows="2"
                  placeholder="Responsibilities, daily targets or route scope of this team..."
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                />
              </div>

              {/* HR Governance Policy: Intra-Team Delegation Rule */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="allowPeerDelegation"
                  checked={allowPeerDelegation}
                  onChange={(e) => setAllowPeerDelegation(e.target.checked)}
                  className="mt-0.5 rounded text-[#05331F] focus:ring-[#05331F]"
                />
                <label htmlFor="allowPeerDelegation" className="text-xs cursor-pointer select-none">
                  <span className="font-bold text-slate-900 block">HR Rule: Allow Intra-Team Task Delegation (Link Tree)</span>
                  <span className="text-[11px] text-slate-600 block leading-tight mt-0.5">
                    When enabled, team members can assign and delegate tasks to each other (e.g. Leader A assigns to B, and B can assign to C).
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => { setIsCreateModalOpen(false); setEditingTeam(null); }}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472c] text-white font-semibold shadow-md transition-all active:scale-98"
                >
                  {editingTeam ? 'Save Team Updates' : 'Create Team in Firestore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Members with Duplicate Prevention */}
      {selectedTeamForMembers && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto safe-pb safe-pt">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 shrink-0">
              <div className="truncate mr-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">Add Members to {selectedTeamForMembers.name}</h3>
                <p className="text-[11px] text-slate-500 truncate">Select active employees from the authorized department</p>
              </div>
              <button 
                onClick={() => setSelectedTeamForMembers(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMembersSubmit} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1 pt-3">
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl p-2 bg-slate-50 space-y-1.5">
                {employees
                  .filter(emp => {
                    const empId = emp.id || emp.employeeId;
                    // Filter by team department unless executive
                    if (!isCompanyLeadership && emp.department !== selectedTeamForMembers.departmentId) return false;
                    // Exclude employees already active in this team (Duplicate prevention)
                    const isAlreadyMember = teamMembers.some(m => 
                      m.teamId === selectedTeamForMembers.id && 
                      (m.userId === empId || m.userId === emp.id || m.employeeId === emp.employeeId) && 
                      m.status === 'active'
                    );
                    return !isAlreadyMember;
                  })
                  .map(emp => {
                    const empId = emp.id || emp.employeeId;
                    const isChecked = selectedEmployeeIdsToAdd.includes(empId);
                    
                    const toggleSelect = () => {
                      if (isChecked) {
                        setSelectedEmployeeIdsToAdd(prev => prev.filter(id => id !== empId));
                      } else {
                        setSelectedEmployeeIdsToAdd(prev => [...prev, empId]);
                      }
                    };

                    return (
                      <div 
                        key={empId} 
                        onClick={toggleSelect}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                          isChecked ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-2xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate mr-2 pointer-events-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="rounded text-[#05331F] focus:ring-[#05331F] pointer-events-none"
                          />
                          <div className="truncate">
                            <span className="block text-xs truncate">{emp.fullName || emp.name}</span>
                            <span className="text-[10px] text-slate-400 font-normal">{emp.role} (ID: {emp.employeeId || empId})</span>
                          </div>
                        </div>

                        <span className="text-[9px] uppercase font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 shrink-0">
                          {emp.department}
                        </span>
                      </div>
                    );
                  })}
              </div>

              <div className="text-xs text-slate-500 flex justify-between items-center">
                <span>Selected: <strong className="text-slate-900">{selectedEmployeeIdsToAdd.length}</strong> employees</span>
                <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                  Duplicate Membership Guard Active
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setSelectedTeamForMembers(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472c] text-white font-semibold shadow-md transition-all active:scale-98"
                >
                  Add to Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Transfer Team Member */}
      {transferringMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto safe-pb safe-pt">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 shrink-0">
              <div className="flex items-center gap-2 truncate mr-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-600 shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">Transfer Team Member</h3>
              </div>
              <button 
                onClick={() => setTransferringMember(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1 pt-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                <div className="text-slate-500">Employee: <span className="font-bold text-slate-900">{transferringMember.fullName}</span></div>
                <div className="text-slate-500">Current Team: <span className="font-bold text-slate-900">{transferringMember.teamName}</span></div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Team *</label>
                <select
                  required
                  value={targetTeamId}
                  onChange={(e) => setTargetTeamId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                >
                  <option value="">-- Choose Target Team --</option>
                  {teams
                    .filter(t => t.id !== transferringMember?.teamId && t.status === 'active')
                    .map((t, idx) => (
                      <option key={t.id || `target_team_${idx}`} value={t.id}>
                        {t.name} ({t.departmentId?.toUpperCase()})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setTransferringMember(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-semibold shadow-md transition-all active:scale-98"
                >
                  Complete Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

