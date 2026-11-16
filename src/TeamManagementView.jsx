import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Plus, Edit2, Trash2, UserPlus, ArrowRightLeft, 
  Search, Filter, AlertCircle, Check, X, Building2, UserCheck, 
  Send, GitFork, Loader2, Network, ChevronDown, ChevronRight,
  ShieldCheck, ArrowDownRight
} from 'lucide-react';
import { 
  createTeam, 
  updateTeam, 
  addTeamMembers, 
  removeTeamMember, 
  transferTeamMember 
} from './firestoreService';
import { 
  canManageTeam, 
  isGlobalTeamManager, 
  getAllowedManagementDepartments, 
  canUserAssignTo 
} from './permissions';
import { 
  ORG_TREE, 
  COMPANY_DEPARTMENTS, 
  getAllowedLeadersForDepartment, 
  validateTeamPlacement, 
  getRoleLevel,
  getDownlineRoles
} from './orgTree';

/**
 * TeamManagementView (My Team & Operational Workgroups)
 * 
 * Features:
 * 1. Team Settings Access Control:
 *    - Create, edit, delete, add/remove/transfer members:
 *      * Global: HR Manager, Admin Manager, Executive Director, General Manager.
 *      * Operations Head: Operations teams only.
 *      * All other roles: Read-only access to their team and downline. Controls are completely hidden.
 * 2. Hierarchy Tree for every department:
 *    - All 10 departments supported.
 *    - Assign button appears only if member is in user's downline.
 * 3. Create / Edit Team Modal:
 *    - Department dropdown with allowed departments.
 *    - Allowed leader dropdown based on department tree.
 *    - Member picker grouped by role level.
 *    - Live indented tree preview.
 *    - Strict hierarchy validation (e.g., Driver cannot report to Sales Manager).
 * 4. "Org Chart" Tab:
 *    - Visual company-wide hierarchy tree collapsible by department.
 *    - Logged-in user's position highlighted.
 */
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
  // Navigation tabs: 'teams' (Team Cards) vs 'org_chart' (Company Org Chart)
  const [activeViewTab, setActiveViewTab] = useState('teams');

  // Department and search filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [selectedTeamForMembers, setSelectedTeamForMembers] = useState(null);
  const [transferringMember, setTransferringMember] = useState(null);

  // Form states for Create/Edit
  const [teamName, setTeamName] = useState('');
  const [teamDept, setTeamDept] = useState('');
  const [teamLeaderId, setTeamLeaderId] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [selectedMemberIdsForTeam, setSelectedMemberIdsForTeam] = useState([]);
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // Add members state
  const [selectedEmployeeIdsToAdd, setSelectedEmployeeIdsToAdd] = useState([]);

  // Transfer member state
  const [targetTeamId, setTargetTeamId] = useState('');

  // Org chart collapsed departments state
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

  const currentUserId = currentUser?.id || currentUser?.uid || currentUser?.employeeId;
  const isGlobalManager = isGlobalTeamManager(currentUser);
  const canUserManageAny = canManageTeam(currentUser);

  // Departments this user is authorized to manage (normalized as { id, name })
  const allowedManageDepts = useMemo(() => {
    const rawDepts = getAllowedManagementDepartments(currentUser, COMPANY_DEPARTMENTS);
    return rawDepts.map(d => {
      if (typeof d === 'object' && d !== null) {
        return { id: d.id || d.name, name: d.name || d.id };
      }
      const matched = COMPANY_DEPARTMENTS.find(cd => cd.id === d);
      return { id: d, name: matched ? matched.name : d };
    });
  }, [currentUser]);

  // Filtered teams list based on hierarchy & permissions
  const visibleTeams = useMemo(() => {
    return teams.filter(team => {
      // 1. Management Permission Scope:
      // If user is a team manager, show all teams they can manage
      if (canManageTeam(currentUser, team)) {
        // Can see it
      } else {
        // Non-managers see ONLY their own team and downline
        const isMember = teamMembers.some(m => 
          m.teamId === team.id && 
          (m.userId === currentUserId || m.employeeId === currentUser?.employeeId) && 
          m.status === 'active'
        );
        const isLeader = team.leaderId === currentUserId || team.teamLeaderId === currentUserId;
        if (!isMember && !isLeader) {
          return false;
        }
      }

      // 2. Department Filter
      const matchDept = selectedDeptFilter === 'all' || 
                        team.departmentId === selectedDeptFilter || 
                        team.department === selectedDeptFilter;
      if (!matchDept) return false;

      // 3. Search Filter
      const matchSearch = (team.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (team.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (team.leaderName || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [teams, teamMembers, currentUser, currentUserId, selectedDeptFilter, searchTerm]);

  // Handle ESC key to dismiss modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsCreateModalOpen(false);
        setEditingTeam(null);
        setSelectedTeamForMembers(null);
        setTransferringMember(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalError('');
    const defaultDept = allowedManageDepts[0]?.id || 'operations';
    setTeamName('');
    setTeamDept(defaultDept);
    setTeamLeaderId('');
    setTeamDescription('');
    setSelectedMemberIdsForTeam([]);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (team) => {
    setModalError('');
    setEditingTeam(team);
    setTeamName(team.name || '');
    setTeamDept(team.departmentId || team.department || 'operations');
    setTeamLeaderId(team.leaderId || '');
    setTeamDescription(team.description || '');

    // Existing team member IDs
    const curMembers = teamMembers.filter(m => m.teamId === team.id && m.status === 'active');
    setSelectedMemberIdsForTeam(curMembers.map(m => m.userId || m.employeeId));
  };

  // Live list of eligible leaders for the currently selected department in modal
  const eligibleLeadersForModal = useMemo(() => {
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

  // Live list of eligible members in this department, grouped by role level
  const eligibleMembersForModal = useMemo(() => {
    const normDept = (teamDept || '').toLowerCase();
    const deptEmployees = employees.filter(emp => {
      const empDept = (emp.department || emp.departmentId || '').toLowerCase();
      // In same department and not the chosen leader
      return (empDept === normDept || normDept === 'operations') && (emp.id !== teamLeaderId && emp.employeeId !== teamLeaderId);
    });

    // Group by role
    const grouped = {};
    deptEmployees.forEach(emp => {
      const role = emp.role || 'Staff';
      if (!grouped[role]) {
        grouped[role] = {
          role,
          level: getRoleLevel(role),
          members: []
        };
      }
      grouped[role].members.push(emp);
    });

    return Object.values(grouped).sort((a, b) => a.level - b.level);
  }, [teamDept, teamLeaderId, employees]);

  // Selected leader object for modal live preview
  const selectedLeaderObj = useMemo(() => {
    return employees.find(e => e.id === teamLeaderId || e.employeeId === teamLeaderId);
  }, [teamLeaderId, employees]);

  // Submit Create or Edit Team with Strict Tree Placement Validation
  const handleSaveTeamSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!teamName.trim()) {
      setModalError('Team name is required.');
      return;
    }
    if (!teamDept) {
      setModalError('Department is required.');
      return;
    }
    if (!teamLeaderId) {
      setModalError('A designated Team Leader is required.');
      return;
    }

    const leaderObj = employees.find(e => e.id === teamLeaderId || e.employeeId === teamLeaderId);
    if (!leaderObj) {
      setModalError('Invalid leader selected.');
      return;
    }

    // Strict Org Tree Placement Validation for every selected member
    const selectedMembers = employees.filter(emp => 
      selectedMemberIdsForTeam.includes(emp.id || emp.employeeId)
    );

    for (const member of selectedMembers) {
      const validation = validateTeamPlacement(leaderObj.role, member.role, teamDept);
      if (!validation.valid) {
        setModalError(validation.reason);
        return;
      }
    }

    setModalLoading(true);

    const teamPayload = {
      name: teamName.trim(),
      departmentId: teamDept,
      leaderId: teamLeaderId,
      leaderName: `${leaderObj.fullName || leaderObj.name} (${leaderObj.role})`,
      description: teamDescription.trim(),
      members: selectedMembers.map(m => ({
        id: m.id || m.employeeId,
        userId: m.id || m.employeeId,
        fullName: m.fullName || m.name,
        role: m.role,
        department: m.department || teamDept,
        email: m.email
      }))
    };

    try {
      if (editingTeam) {
        await updateTeam(editingTeam.id, teamPayload, currentUser);
        if (onTeamUpdated) onTeamUpdated({ ...editingTeam, ...teamPayload });
        setEditingTeam(null);
      } else {
        const createdId = await createTeam(teamPayload, currentUser);
        if (onTeamCreated) onTeamCreated({ ...teamPayload, id: createdId, memberCount: selectedMembers.length, status: 'active' });
        
        // Add members to teamMembers collection
        if (selectedMembers.length > 0) {
          await addTeamMembers(createdId, teamName.trim(), selectedMembers, currentUser);
        }
        setIsCreateModalOpen(false);
      }
    } catch (err) {
      console.error('Error saving team:', err);
      setModalError(err.message || 'Failed to save team in Firestore.');
    } finally {
      setModalLoading(false);
    }
  };

  // Delete / Toggle Status
  const handleDeleteTeam = async (team) => {
    if (!confirm(`Are you sure you want to deactivate "${team.name}"?`)) return;
    try {
      await updateTeam(team.id, { status: team.status === 'active' ? 'inactive' : 'active' }, currentUser);
      if (onTeamUpdated) onTeamUpdated({ ...team, status: team.status === 'active' ? 'inactive' : 'active' });
    } catch (err) {
      alert(err.message);
    }
  };

  // Remove Member
  const handleRemoveMember = async (teamId, userId) => {
    if (!confirm('Remove this member from the team?')) return;
    try {
      await removeTeamMember(teamId, userId);
      if (onTeamMembersUpdated) {
        onTeamMembersUpdated(teamMembers.filter(m => !(m.teamId === teamId && (m.userId === userId || m.uid === userId))));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans select-none">
      
      {/* 1. TOP HEADER & VIEW TOGGLES */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Operational Teams & Hierarchy</h1>
            <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {visibleTeams.length} Active Teams
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Departmental squads, team leaders, and strict reporting branches across all 10 departments.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Tab Switcher: Teams vs Org Chart */}
          <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveViewTab('teams')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeViewTab === 'teams' ? 'bg-[#05331F] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Team Squads</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveViewTab('org_chart')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeViewTab === 'org_chart' ? 'bg-[#05331F] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Org Chart Tree</span>
            </button>
          </div>

          {/* Create Team Button (Visible ONLY to authorized managers) */}
          {canUserManageAny && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 bg-[#05331F] hover:bg-[#07472c] text-white rounded-2xl text-xs font-bold shadow-xs transition-all active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-300" />
              <span>Create Team</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW A: TEAMS LIST */}
      {activeViewTab === 'teams' && (
        <div className="space-y-5">
          {/* Filter & Search Toolbar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search teams by squad name, leader or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
              />
            </div>

            {/* Department Filter for All 10 Departments */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#05331F] w-full sm:w-48 cursor-pointer"
              >
                <option value="all">All 10 Departments</option>
                {COMPANY_DEPARTMENTS.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Teams Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {visibleTeams.length === 0 ? (
              <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400 space-y-3">
                <Users className="w-12 h-12 mx-auto text-emerald-500/50" />
                <p className="font-semibold text-slate-700">No Operational Teams Found</p>
                <p className="text-xs">
                  {canUserManageAny 
                    ? 'Create a team in your authorized department to assign supervisors and staff.' 
                    : 'You currently have read-only access to your assigned squad.'}
                </p>
              </div>
            ) : (
              visibleTeams.map(team => {
                const isManagerOfThisTeam = canManageTeam(currentUser, team);
                const currentMembers = teamMembers.filter(m => m.teamId === team.id && m.status === 'active');

                // Sort members by tree hierarchy level (indented presentation)
                const sortedMembers = [...currentMembers].sort((a, b) => {
                  return getRoleLevel(a.role) - getRoleLevel(b.role);
                });

                return (
                  <div 
                    key={team.id}
                    className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-300 transition-all"
                  >
                    <div className="space-y-3">
                      {/* Team Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-mono font-bold bg-emerald-50 text-[#05331F] px-2 py-0.5 rounded border border-emerald-200">
                              {team.departmentId?.toUpperCase() || 'OPERATIONS'}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              team.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {team.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <h3 className="font-bold text-slate-900 text-base mt-1">{team.name}</h3>
                        </div>

                        {/* Management Controls: Hidden completely for unauthorized users */}
                        {isManagerOfThisTeam && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(team)}
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Team"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTeam(team)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Deactivate Team"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2">
                        {team.description || 'Departmental team unit.'}
                      </p>

                      {/* Team Leader Banner */}
                      <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Leader:</span>
                        <span className="font-bold text-slate-800 truncate max-w-[170px]">
                          {team.leaderName || 'Unassigned'}
                        </span>
                      </div>

                      {/* Indented Members List Preview */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                          <span>Team Hierarchy ({sortedMembers.length}):</span>
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                          {sortedMembers.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic py-2 text-center">No members placed yet.</p>
                          ) : (
                            sortedMembers.map(m => {
                              const memberUid = m.userId || m.uid || m.id;
                              const memberLevel = getRoleLevel(m.role);
                              // Indent based on role level relative to leader
                              const indentPx = Math.max(0, (memberLevel - 3) * 8);

                              // Assign button visibility: strictly downline
                              const targetEmp = employees.find(e => (e.id || e.employeeId) === memberUid) || m;
                              const canAssignToThisMember = canUserAssignTo(currentUser, targetEmp, employees);

                              return (
                                <div 
                                  key={m.id || memberUid}
                                  style={{ paddingLeft: `${8 + indentPx}px` }}
                                  className="p-2 bg-slate-50/90 rounded-xl border border-slate-100 flex items-center justify-between text-xs transition-all gap-2"
                                >
                                  <div className="truncate min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 truncate">
                                      <span className="font-bold text-slate-900 truncate">{m.fullName}</span>
                                      <span className="text-[9px] font-mono text-slate-400 bg-slate-200/60 px-1 rounded">
                                        L{memberLevel}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 block truncate">{m.role}</span>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {/* Assign Button: appears strictly if member is in logged-in user's downline */}
                                    {canAssignToThisMember && onOpenAssignModal && (
                                      <button
                                        type="button"
                                        onClick={() => onOpenAssignModal({ teamId: team.id, memberId: memberUid })}
                                        className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-[#05331F] font-bold rounded text-[10px] flex items-center gap-1 transition-all border border-emerald-200 cursor-pointer"
                                        title={`Assign Task to ${m.fullName}`}
                                      >
                                        <Send className="w-2.5 h-2.5 text-emerald-700" />
                                        <span>Assign</span>
                                      </button>
                                    )}

                                    {/* Remove member button: visible ONLY for authorized managers */}
                                    {isManagerOfThisTeam && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveMember(team.id, memberUid)}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                        title="Remove Member"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Department: {team.departmentId?.toUpperCase()}</span>
                      <span>{currentMembers.length} Members</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW B: ORG CHART TREE (Collapsible by Department) */}
      {activeViewTab === 'org_chart' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b pb-4 border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Company Hierarchy & Reporting Lines</h2>
              <p className="text-xs text-slate-500">
                Single unified hierarchy tree. Your position is highlighted in emerald.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100 inline-block" />
              <span className="text-xs font-semibold text-slate-700">Your Position</span>
            </div>
          </div>

          {/* Department Tree Sections */}
          <div className="space-y-4">
            {COMPANY_DEPARTMENTS.map(dept => {
              const isExpanded = Boolean(expandedDepts[dept.id]);
              const deptEmployees = employees.filter(e => {
                const eDept = (e.department || e.departmentId || '').toLowerCase();
                return eDept === dept.id.toLowerCase();
              });

              return (
                <div key={dept.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                  {/* Department Collapsible Bar */}
                  <button
                    type="button"
                    onClick={() => setExpandedDepts(prev => ({ ...prev, [dept.id]: !prev[dept.id] }))}
                    className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      <span className="font-bold text-xs text-slate-900 uppercase tracking-wide">{dept.name}</span>
                      <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-600 font-semibold">
                        {deptEmployees.length} Staff
                      </span>
                    </div>
                  </button>

                  {/* Employees in Department Grouped by Role Level */}
                  {isExpanded && (
                    <div className="p-4 bg-white space-y-2 border-t border-slate-100">
                      {deptEmployees.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">No employees placed in this department.</p>
                      ) : (
                        deptEmployees
                          .sort((a, b) => getRoleLevel(a.role) - getRoleLevel(b.role))
                          .map(emp => {
                            const empLevel = getRoleLevel(emp.role);
                            const isMe = (emp.id || emp.employeeId) === currentUserId;
                            const indentPx = Math.max(0, (empLevel - 1) * 16);

                            return (
                              <div
                                key={emp.id || emp.employeeId}
                                style={{ marginLeft: `${indentPx}px` }}
                                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                                  isMe 
                                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-xs' 
                                    : 'bg-slate-50/70 border-slate-200 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate mr-2">
                                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                                    isMe ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'
                                  }`}>
                                    L{empLevel}
                                  </span>
                                  <span className="truncate">{emp.fullName || emp.name}</span>
                                  {isMe && (
                                    <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.2 rounded font-mono">
                                      YOU
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] font-semibold text-slate-500 shrink-0">
                                  {emp.role}
                                </span>
                              </div>
                            );
                          })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CREATE / EDIT TEAM MODAL (With Live Tree Preview & Strict Tree Validation) */}
      {(isCreateModalOpen || editingTeam) && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto safe-pb safe-pt"
          onClick={() => { setIsCreateModalOpen(false); setEditingTeam(null); }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col p-5 sm:p-6 shadow-2xl border border-slate-200 my-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5 truncate mr-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold shrink-0 border border-emerald-200">
                  <Users className="w-5 h-5 text-[#05331F]" />
                </div>
                <div className="truncate">
                  <h3 className="text-base font-bold text-slate-900 truncate">
                    {editingTeam ? `Edit Squad: ${editingTeam.name}` : 'Create Departmental Squad'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Leader selection and member placement enforced by company hierarchy.
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => { setIsCreateModalOpen(false); setEditingTeam(null); }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Validation / Error Alert */}
            {modalError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Form Content (Internally scrollable, Save button always visible sticky) */}
            <form onSubmit={handleSaveTeamSubmit} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1 pt-3">
              
              {/* Team Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Squad / Team Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Warehouse Staging Unit A"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                />
              </div>

              {/* Department & Designated Leader Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department *</label>
                  <select
                    required
                    value={teamDept}
                    onChange={(e) => {
                      setTeamDept(e.target.value);
                      setTeamLeaderId('');
                      setSelectedMemberIdsForTeam([]);
                    }}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                  >
                    {allowedManageDepts.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designated Leader *</label>
                  <select
                    required
                    value={teamLeaderId}
                    onChange={(e) => setTeamLeaderId(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                  >
                    <option value="">-- Select Leader from Tree --</option>
                    {eligibleLeadersForModal.map(l => (
                      <option key={l.id || l.employeeId} value={l.id || l.employeeId}>
                        {l.fullName || l.name} — {l.role} (Level {getRoleLevel(l.role)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Scope & Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Responsibilities & Scope</label>
                <textarea
                  rows="2"
                  placeholder="Daily operational targets and route details..."
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                />
              </div>

              {/* Member Picker Grouped by Role Level */}
              <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-900 text-xs">
                    Select Downline Members (In {teamDept?.toUpperCase()})
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {selectedMemberIdsForTeam.length} Selected
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 border border-slate-200 rounded-xl p-2 bg-white">
                  {eligibleMembersForModal.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic py-2 text-center">
                      No staff found in this department to place.
                    </p>
                  ) : (
                    eligibleMembersForModal.map(group => (
                      <div key={group.role} className="space-y-1">
                        <div className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          {group.role} (Level {group.level})
                        </div>
                        {group.members.map(emp => {
                          const empId = emp.id || emp.employeeId;
                          const isChecked = selectedMemberIdsForTeam.includes(empId);

                          const toggle = () => {
                            if (isChecked) {
                              setSelectedMemberIdsForTeam(prev => prev.filter(id => id !== empId));
                            } else {
                              setSelectedMemberIdsForTeam(prev => [...prev, empId]);
                            }
                          };

                          return (
                            <div 
                              key={empId}
                              onClick={toggle}
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs select-none transition-all ${
                                isChecked 
                                  ? 'bg-emerald-50 border border-emerald-300 font-bold text-emerald-950' 
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  readOnly
                                  className="rounded text-[#05331F] pointer-events-none"
                                />
                                <span className="truncate">{emp.fullName || emp.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-normal">{emp.role}</span>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* LIVE TREE PREVIEW (Indented by role level) */}
              {selectedLeaderObj && (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#05331F] flex items-center gap-1.5">
                      <GitFork className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Live Hierarchy Preview: Who Can Assign To Whom</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded font-semibold">
                      Strict Downline Enforcement
                    </span>
                  </div>

                  <div className="space-y-1 bg-white p-3 rounded-xl border border-emerald-200/60 text-xs">
                    {/* Leader Node */}
                    <div className="flex items-center gap-2 font-bold text-[#05331F]">
                      <span className="text-[10px] font-mono bg-emerald-900 text-white px-1.5 py-0.2 rounded">
                        LEADER (L{getRoleLevel(selectedLeaderObj.role)})
                      </span>
                      <span>{selectedLeaderObj.fullName || selectedLeaderObj.name}</span>
                      <span className="text-slate-500 font-normal">({selectedLeaderObj.role})</span>
                    </div>

                    {/* Member Nodes Indented */}
                    {selectedMemberIdsForTeam.map(mId => {
                      const emp = employees.find(e => (e.id || e.employeeId) === mId);
                      if (!emp) return null;
                      const lvl = getRoleLevel(emp.role);
                      const indent = Math.max(1, lvl - getRoleLevel(selectedLeaderObj.role)) * 16;

                      return (
                        <div 
                          key={mId} 
                          style={{ marginLeft: `${indent}px` }}
                          className="flex items-center gap-2 text-slate-700 pt-1"
                        >
                          <ArrowDownRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1 rounded">
                            L{lvl}
                          </span>
                          <span className="font-semibold">{emp.fullName || emp.name}</span>
                          <span className="text-[11px] text-slate-500">({emp.role})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sticky Footer Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => { setIsCreateModalOpen(false); setEditingTeam(null); }}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472c] text-white font-semibold shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {modalLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                      <span>Validating & Saving...</span>
                    </>
                  ) : (
                    <span>{editingTeam ? 'Save Team Updates' : 'Create Team in Firestore'}</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
