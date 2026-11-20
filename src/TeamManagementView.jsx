// src/TeamManagementView.jsx
// Redesigned TeamManagementView (My Team & Operational Workgroups)

import React, { useState, useMemo, useEffect } from 'react';
import { Users, Plus, Loader2 } from 'lucide-react';
import { 
  createTeam, 
  updateTeam, 
  removeTeamMember, 
  syncTeamMembers 
} from './firestoreService';
import { 
  canManageTeam, 
  isGlobalTeamManager, 
  getAllowedManagementDepartments,
  can,
  PERMISSIONS 
} from './permissions';
import { useDepartments } from './useDepartments';
import { useToast } from './ToastContext';

// Modular Sub-components
import TeamsHeader from './TeamsHeader';
import TeamsToolbar from './TeamsToolbar';
import TeamCard from './TeamCard';
import TeamDrawer from './TeamDrawer';
import TeamModal from './TeamModal';
import DeleteTeamModal from './DeleteTeamModal';
import OrgChartTree from './OrgChartTree';
import EmployeeProfileDrawer from './EmployeeProfileDrawer';

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
  const { showToast } = useToast();
  
  // Navigation tabs: 'teams' vs 'org_chart'
  const [activeTab, setActiveTab] = useState('teams');

  // Search & Filters for Teams tab
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Modal / Drawer states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [drawerTeam, setDrawerTeam] = useState(null);
  const [profileEmployee, setProfileEmployee] = useState(null);
  const [deletingTeam, setDeletingTeam] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentUserId = currentUser?.id || currentUser?.uid || currentUser?.employeeId;
  const isGlobalManager = isGlobalTeamManager(currentUser);
  const canUserManageAny = canManageTeam(currentUser);

  const { departments: activeDepts } = useDepartments();

  // Departments user is authorized to manage (driven by dynamic departments hook)
  const allowedManageDepts = useMemo(() => {
    const rawDepts = getAllowedManagementDepartments(currentUser, activeDepts);
    return rawDepts.map(d => {
      if (typeof d === 'object' && d !== null) {
        return { id: d.id || d.name, name: d.name || d.id };
      }
      const matched = activeDepts.find(cd => cd.id === d);
      return { id: d, name: matched ? matched.name : d };
    });
  }, [currentUser, activeDepts]);

  // Filtered teams list based on hierarchy & permissions
  const visibleTeams = useMemo(() => {
    return teams.filter(team => {
      // 1. Management Permission Scope
      if (!canManageTeam(currentUser, team)) {
        // Non-managers see ONLY their own team and downline
        const isMember = teamMembers.some(m => 
          m.teamId === team.id && 
          (m.userId === currentUserId || m.employeeId === currentUser?.employeeId) && 
          m.status === 'active'
        );
        const isLeader = team.leaderId === currentUserId || team.teamLeaderId === currentUserId;
        if (!isMember && !isLeader) return false;
      }

      // 2. Department Filter
      if (selectedDeptFilter !== 'all') {
        const tDept = (team.departmentId || team.department || '').toLowerCase();
        if (tDept !== selectedDeptFilter.toLowerCase()) return false;
      }

      // 3. Status Filter
      if (selectedStatusFilter !== 'all') {
        const curStatus = team.status || 'active';
        if (curStatus !== selectedStatusFilter) return false;
      }

      // 4. Search Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const mName = (team.name || '').toLowerCase().includes(q);
        const mDesc = (team.description || '').toLowerCase().includes(q);
        const mLeader = (team.leaderName || '').toLowerCase().includes(q);
        if (!mName && !mDesc && !mLeader) return false;
      }

      return true;
    });
  }, [teams, teamMembers, currentUser, currentUserId, selectedDeptFilter, selectedStatusFilter, searchTerm]);

  const activeTeamsCount = useMemo(() => {
    return visibleTeams.filter(t => (t.status || 'active') === 'active').length;
  }, [visibleTeams]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedDeptFilter('all');
    setSelectedStatusFilter('all');
  };

  // Save Team (Create or Update)
  const handleSaveTeam = async (payload) => {
    if (editingTeam) {
      await updateTeam(editingTeam.id, payload, currentUser);
      await syncTeamMembers(editingTeam.id, payload.name, payload.members, currentUser);
      if (onTeamUpdated) onTeamUpdated({ ...editingTeam, ...payload });
      showToast('Squad updated successfully!');
      setEditingTeam(null);
    } else {
      const createdId = await createTeam(payload, currentUser);
      if (onTeamCreated) {
        onTeamCreated({ ...payload, id: createdId, memberCount: payload.members.length, status: payload.status || 'active' });
      }
      if (payload.members.length > 0) {
        await syncTeamMembers(createdId, payload.name, payload.members, currentUser);
      }
      showToast('Squad created successfully!');
      setIsCreateModalOpen(false);
    }
  };

  // Toggle Active/Inactive Team Status
  const handleToggleStatus = async (team) => {
    const isActivating = team.status !== 'active';
    const nextStatus = isActivating ? 'active' : 'inactive';
    try {
      await updateTeam(team.id, { status: nextStatus }, currentUser);
      if (onTeamUpdated) onTeamUpdated({ ...team, status: nextStatus });
      showToast(`Team "${team.name}" ${isActivating ? 'activated' : 'deactivated'}.`);
    } catch (err) {
      console.error('Toggle status error:', err);
      showToast('Failed to change team status.', 'error');
    }
  };

  // Confirm Delete Team
  const handleConfirmDelete = async (team) => {
    // Check permission including active tasks restriction for Director Operations
    if (!can(currentUser, PERMISSIONS.TEAM_DELETE, team)) {
      showToast(`Restriction: Squad "${team.name}" cannot be deleted because it still has active tasks or you do not have permission.`, 'error');
      setDeletingTeam(null);
      return;
    }

    setIsDeleting(true);
    try {
      await updateTeam(team.id, { status: 'deleted' }, currentUser);
      if (onTeamUpdated) onTeamUpdated({ ...team, status: 'deleted' });
      showToast(`Team "${team.name}" deleted.`);
      setDeletingTeam(null);
    } catch (err) {
      console.error('Delete team error:', err);
      showToast('Failed to delete team.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Remove Member from Squad
  const handleRemoveMember = async (teamId, userId) => {
    try {
      await removeTeamMember(teamId, userId);
      if (onTeamMembersUpdated) {
        onTeamMembersUpdated(teamMembers.filter(m => !(m.teamId === teamId && (m.userId === userId || m.uid === userId))));
      }
      showToast('Member removed from squad.');
    } catch (err) {
      console.error('Remove member error:', err);
      showToast('Failed to remove member.', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      
      {/* 1. Header with Plain Slate-50 Design & Sticky Underline Tab Bar */}
      <TeamsHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeTeamsCount={activeTeamsCount}
        canManage={canUserManageAny}
        onOpenCreate={() => setIsCreateModalOpen(true)}
      />

      {/* VIEW A: TEAMS LIST */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          
          {/* Toolbar */}
          <TeamsToolbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            departmentFilter={selectedDeptFilter}
            onDepartmentFilterChange={setSelectedDeptFilter}
            statusFilter={selectedStatusFilter}
            onStatusFilterChange={setSelectedStatusFilter}
            departments={activeDepts}
            totalCount={teams.length}
            filteredCount={visibleTeams.length}
            onResetFilters={handleResetFilters}
          />

          {/* Teams Grid */}
          {visibleTeams.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-2xs space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Users className="w-8 h-8" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-semibold text-base text-slate-900">No teams found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  {canUserManageAny 
                    ? 'Create a team in your authorized department or adjust your search filters.' 
                    : 'You currently have read-only access to your assigned squad.'}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="h-10 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
                >
                  Reset filters
                </button>
                {canUserManageAny && (
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="h-10 px-4 rounded-xl bg-[#05331F] hover:bg-[#0a4a2f] text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4 text-emerald-300" />
                    <span>Create Team</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleTeams.map(team => {
                const isManager = canManageTeam(currentUser, team);
                const currentMembers = teamMembers.filter(m => m.teamId === team.id && m.status === 'active');

                return (
                  <TeamCard
                    key={team.id}
                    team={team}
                    members={currentMembers}
                    employees={employees}
                    currentUser={currentUser}
                    isManager={isManager}
                    onOpenDetails={(t) => setDrawerTeam(t)}
                    onEdit={(t) => setEditingTeam(t)}
                    onToggleStatus={handleToggleStatus}
                    onDelete={(t) => setDeletingTeam(t)}
                    onAddMember={(t) => setEditingTeam(t)}
                    onAssignToMember={(m) => {
                      if (onOpenAssignModal) {
                        onOpenAssignModal({ teamId: team.id, memberId: m.userId || m.id });
                      }
                    }}
                    onRemoveMember={handleRemoveMember}
                  />
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* VIEW B: ORG CHART TREE */}
      {activeTab === 'org_chart' && (
        <OrgChartTree
          employees={employees}
          currentUserId={currentUserId}
          onSelectEmployee={(emp) => setProfileEmployee(emp)}
        />
      )}

      {/* Modals & Slide-over Drawer */}
      <TeamDrawer
        isOpen={Boolean(drawerTeam)}
        onClose={() => setDrawerTeam(null)}
        team={drawerTeam}
        members={teamMembers.filter(m => m.teamId === drawerTeam?.id && m.status === 'active')}
        employees={employees}
        currentUser={currentUser}
        onSelectMember={(emp) => setProfileEmployee(emp)}
        onAssignToMember={(m) => {
          if (onOpenAssignModal) {
            onOpenAssignModal({ teamId: drawerTeam?.id, memberId: m.userId || m.id });
          }
        }}
      />

      <EmployeeProfileDrawer
        isOpen={Boolean(profileEmployee)}
        onClose={() => setProfileEmployee(null)}
        employee={profileEmployee}
        currentUser={currentUser}
        reportingManager={employees.find(e => 
          String(e.id || e.employeeId) === String(profileEmployee?.reportsTo || profileEmployee?.reportingManagerId)
        )}
        isMe={String(profileEmployee?.id || profileEmployee?.employeeId) === String(currentUserId)}
        isHR={currentUser?.role === 'HR Manager' || currentUser?.role === 'HR & Admin Manager'}
      />

      <TeamModal
        isOpen={isCreateModalOpen || Boolean(editingTeam)}
        onClose={() => { setIsCreateModalOpen(false); setEditingTeam(null); }}
        team={editingTeam}
        departments={allowedManageDepts}
        employees={employees}
        currentUser={currentUser}
        onSaveTeam={handleSaveTeam}
      />

      <DeleteTeamModal
        isOpen={Boolean(deletingTeam)}
        onClose={() => setDeletingTeam(null)}
        team={deletingTeam}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

    </div>
  );
}
