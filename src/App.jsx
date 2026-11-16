import React, { useState, useEffect } from 'react';
import { 
  Building2, Phone, Calendar, Clock, Lock, Unlock, CheckCircle2, 
  AlertCircle, AlertTriangle, Layers, Filter, PlusCircle, User, Users,
  ShieldAlert, RefreshCw, Eye, Edit3, CheckCheck, ChevronRight,
  TrendingUp, BarChart3, Inbox, Briefcase, FileText, Bell, Database,
  Menu, X, LogOut
} from 'lucide-react';

import { useAuth } from './AuthContext';
import LoginScreen from './LoginScreen';
import { TASK_STATUSES, TASK_PRIORITIES, canViewTask, canApproveTask, isTaskLockedForUser } from './rbac';
import { getTodayDateString } from './dateUtils';
import { hasPermission, ENTERPRISE_EMPLOYEE_DIRECTORY } from './employeeDirectory';
import { MASTER_DEPARTMENTS, MASTER_DESIGNATIONS } from './orgStructure';
import { 
  initializeCompanyStructure,
  subscribeToDepartments,
  subscribeToDesignations,
  subscribeToEmployees,
  subscribeToTeams,
  subscribeToTeamMembers,
  subscribeToTasks, 
  createFirestoreTask, 
  updateFirestoreTask, 
  subscribeToNotifications 
} from './firestoreService';

import Sidebar from './Sidebar';
import TaskAssignmentModal from './TaskAssignmentModal';
import TaskExecutionModal from './TaskExecutionModal';
import SupervisorApprovalModal from './SupervisorApprovalModal';
import CompanyDashboardView from './CompanyDashboardView';
import OrganizationManagementView from './OrganizationManagementView';
import TeamManagementView from './TeamManagementView';
import TaskPulseTeamView from './TaskPulseTeamView';
import AddEmployeeModal from './AddEmployeeModal';
import SopTemplatesView from './SopTemplatesView';
import EscalationsView from './EscalationsView';
import TodoReminderView from './TodoReminderView';
import DealersDirectoryView from './DealersDirectoryView';

export default function App() {
  const { currentUser, userProfile, loading: authLoading, logout } = useAuth();
  const todayStr = getTodayDateString();

  // Master Data from Live Firestore (with verified company master defaults)
  const [departments, setDepartments] = useState(MASTER_DEPARTMENTS);
  const [designations, setDesignations] = useState(MASTER_DESIGNATIONS);
  const [employees, setEmployees] = useState(ENTERPRISE_EMPLOYEE_DIRECTORY);
  const [teams, setTeams] = useState(() => {
    try {
      const saved = localStorage.getItem('salesdoor_teams_cache');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [teamMembers, setTeamMembers] = useState(() => {
    try {
      const saved = localStorage.getItem('salesdoor_team_members_cache');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Active Main Navigation Tab: 'dashboard' | 'my_tasks' | 'teams' | 'approvals' | 'organization'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [employeeSubFilter, setEmployeeSubFilter] = useState('all');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignModalPreset, setAssignModalPreset] = useState(null); // { teamId, memberId }
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [selectedTaskForExec, setSelectedTaskForExec] = useState(null);
  const [selectedTaskForApproval, setSelectedTaskForApproval] = useState(null);
  const [selectedTaskForLogs, setSelectedTaskForLogs] = useState(null);

  // 1. One-time initialization of Approved Structure in Cloud Firestore
  useEffect(() => {
    initializeCompanyStructure();
  }, []);

  // 2. Real-time Subscriptions to Firestore Collections
  useEffect(() => {
    const unsubDepts = subscribeToDepartments((deptsList) => {
      if (deptsList && deptsList.length > 0) setDepartments(deptsList);
    });
    const unsubDes = subscribeToDesignations((desList) => {
      if (desList && desList.length > 0) setDesignations(desList);
    });
    const unsubEmps = subscribeToEmployees((firestoreList) => {
      // Merge verified master directory with Firestore overrides
      const masterList = [...ENTERPRISE_EMPLOYEE_DIRECTORY];
      const firestoreMap = new Map();
      if (Array.isArray(firestoreList)) {
        firestoreList.forEach(e => firestoreMap.set(e.employeeId || e.id, e));
      }

      const merged = masterList.map(emp => ({
        ...emp,
        ...(firestoreMap.get(emp.employeeId) || {})
      }));

      // Append any newly registered employees
      if (Array.isArray(firestoreList)) {
        firestoreList.forEach(e => {
          if (!masterList.some(m => m.employeeId === e.employeeId || m.email === e.email)) {
            merged.push(e);
          }
        });
      }

      setEmployees(merged);
    });
    const unsubTeams = subscribeToTeams(setTeams);
    const unsubMembers = subscribeToTeamMembers(setTeamMembers);

    return () => {
      unsubDepts && unsubDepts();
      unsubDes && unsubDes();
      unsubEmps && unsubEmps();
      unsubTeams && unsubTeams();
      unsubMembers && unsubMembers();
    };
  }, []);

  // 3. Real-time Tasks & Notifications Stream for Logged-In User
  useEffect(() => {
    if (!userProfile) return;

    const unsubTasks = subscribeToTasks(userProfile, setTasks);
    const unsubNotifs = subscribeToNotifications(userProfile.id, setNotifications);

    return () => {
      unsubTasks && unsubTasks();
      unsubNotifs && unsubNotifs();
    };
  }, [userProfile]);

  // If loading auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-emerald-300">Connecting to Cloud Firestore...</p>
        </div>
      </div>
    );
  }

  // If unauthenticated, present real Firebase Authentication Login
  if (!currentUser) {
    return <LoginScreen />;
  }

  const activeEmployee = userProfile || {
    id: currentUser.uid,
    fullName: currentUser.displayName || currentUser.email,
    role: 'Employee',
    department: 'operations'
  };

  const isLeadership = ['Executive Director', 'Director Operations', 'General Manager'].includes(activeEmployee.role);

  // Review Queue: Tasks waiting for current user's approval
  const pendingApprovals = tasks.filter(t => 
    t.status === TASK_STATUSES.PENDING_REVIEW && canApproveTask(activeEmployee, t)
  );

  // Task Counts for Sidebar Badges
  const taskCounts = {
    total: tasks.length,
    today: tasks.filter(t => t.taskDate === todayStr || t.deadlineDate === todayStr).length,
    inProgress: tasks.filter(t => t.status === TASK_STATUSES.IN_PROGRESS).length,
    overdue: tasks.filter(t => t.deadlineDate < todayStr && t.status !== TASK_STATUSES.COMPLETED).length,
    blocked: tasks.filter(t => t.status === TASK_STATUSES.BLOCKED).length,
    completed: tasks.filter(t => t.status === TASK_STATUSES.COMPLETED).length
  };

  // Filtered Task List
  const employeeFilteredTasks = tasks.filter(t => {
    if (activeTab === 'my_tasks' && !isLeadership) {
      const isAssigned = t.assignedToId === activeEmployee.id || (t.assigneeIds && t.assigneeIds.includes(activeEmployee.id));
      if (!isAssigned) return false;
    }

    if (employeeSubFilter === 'today') return t.taskDate === todayStr || t.deadlineDate === todayStr;
    if (employeeSubFilter === 'in_progress') return t.status === TASK_STATUSES.IN_PROGRESS;
    if (employeeSubFilter === 'pending') return t.status === TASK_STATUSES.ASSIGNED || t.status === TASK_STATUSES.ACCEPTED;
    if (employeeSubFilter === 'overdue') return t.deadlineDate < todayStr && t.status !== TASK_STATUSES.COMPLETED;
    if (employeeSubFilter === 'completed') return t.status === TASK_STATUSES.COMPLETED;
    if (employeeSubFilter === 'blocked') return t.status === TASK_STATUSES.BLOCKED;
    return true;
  });

  // Handlers
  const handleTaskCreated = async (newTaskData) => {
    try {
      await createFirestoreTask(newTaskData, activeEmployee);
    } catch (err) {
      console.error('Failed to create task in Firestore:', err);
      alert('Error creating task: ' + err.message);
    }
  };

  const handleTaskUpdated = async (updatedTask) => {
    try {
      await updateFirestoreTask(updatedTask.id, updatedTask, activeEmployee);
    } catch (err) {
      console.error('Failed to update task in Firestore:', err);
      alert('Error updating task: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex">
      
      {/* Systematic Left Navigation Sidebar */}
      <Sidebar
        currentUser={activeEmployee}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        employeeSubFilter={employeeSubFilter}
        onSubFilterChange={setEmployeeSubFilter}
        taskCounts={taskCounts}
        pendingApprovalsCount={pendingApprovals.length}
        onOpenAssignModal={() => setIsAssignModalOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
      />

      {/* Main Canvas - Adjusts automatically to sidebar width */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
        isSidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
      }`}>
        
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between gap-4">
            
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#05331F] text-emerald-300 flex items-center justify-center font-bold lg:hidden shrink-0 shadow-xs">
                <Building2 className="w-4 h-4" />
              </div>

              <div>
                <h1 className="text-sm sm:text-lg font-bold text-slate-900 flex items-center gap-1.5 sm:gap-2">
                  <span>SalesDoor Enterprise</span>
                  <span className="text-[9px] sm:text-[10px] bg-[#05331F]/10 text-[#05331F] font-bold px-1.5 sm:px-2 py-0.5 rounded-full">
                    {activeEmployee.role}
                  </span>
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-400 hidden sm:block">
                  Logged in as <span className="font-semibold text-slate-700">{activeEmployee.fullName || activeEmployee.name}</span> ({activeEmployee.email})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Notifications */}
              <div className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </div>

              {/* Mobile Quick Logout */}
              <button
                onClick={() => logout()}
                className="lg:hidden p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Assign Task Button - Visible strictly to authorized users */}
              {(isLeadership || hasPermission(activeEmployee, 'assign_tasks') || hasPermission(activeEmployee, 'create_tasks')) && (
                <button
                  onClick={() => setIsAssignModalOpen(true)}
                  className="flex items-center gap-1.5 bg-[#05331F] text-white hover:bg-[#07472c] px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-xs font-bold shadow-md transition-all shrink-0"
                >
                  <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300" />
                  <span className="hidden sm:inline">Assign Task</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Body */}
        <main className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 flex-1 pb-24 lg:pb-8">
          {/* VIEW 1: Company Performance Dashboard */}
          {activeTab === 'dashboard' && (
            <CompanyDashboardView 
              tasks={tasks} 
              departments={departments}
              employees={employees}
              currentUser={activeEmployee} 
              onNavigateToTab={setActiveTab}
              onOpenTaskDetails={(task) => setSelectedTaskForExec(task)}
              onOpenAssignModal={() => setIsAssignModalOpen(true)}
            />
          )}

          {/* VIEW 2: Organization Management & Real Employee Directory */}
          {activeTab === 'organization' && (
            <OrganizationManagementView
              departments={departments}
              designations={designations}
              employees={employees}
              teams={teams}
              teamMembers={teamMembers}
              currentUser={activeEmployee}
              onOpenAddEmployee={() => setIsAddEmployeeModalOpen(true)}
              onEmployeeAdded={(newEmp) => setEmployees(prev => [...prev, newEmp])}
              onEmployeeUpdated={(updatedEmp) => {
                setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
              }}
              onEmployeeDeleted={(delId) => {
                setEmployees(prev => prev.filter(e => e.id !== delId));
              }}
              onDesignationUpdated={(updatedDes) => {
                setDesignations(prev => prev.map(d => d.id === updatedDes.id ? updatedDes : d));
              }}
            />
          )}

          {/* VIEW 2.5: Team Management Module */}
          {activeTab === 'teams' && (
            <TeamManagementView
              teams={teams}
              teamMembers={teamMembers}
              employees={employees}
              departments={departments}
              currentUser={activeEmployee}
              onOpenAssignModal={(preset) => {
                setAssignModalPreset(preset || null);
                setIsAssignModalOpen(true);
              }}
              onTeamCreated={(newTeam) => {
                setTeams(prev => {
                  const updated = [...prev, newTeam];
                  try { localStorage.setItem('salesdoor_teams_cache', JSON.stringify(updated)); } catch {}
                  return updated;
                });
              }}
              onTeamUpdated={(upTeam) => {
                setTeams(prev => {
                  const updated = prev.map(t => t.id === upTeam.id ? upTeam : t);
                  try { localStorage.setItem('salesdoor_teams_cache', JSON.stringify(updated)); } catch {}
                  return updated;
                });
              }}
              onTeamMembersUpdated={(updatedMembers) => {
                setTeamMembers(updatedMembers);
                try { localStorage.setItem('salesdoor_team_members_cache', JSON.stringify(updatedMembers)); } catch {}
              }}
            />
          )}

          {/* VIEW 3: Supervisor Review Queue */}
          {activeTab === 'approvals' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Tasks Awaiting Review & Sign-Off</h3>
                  <p className="text-xs text-slate-500">
                    Review queue for: <span className="font-semibold text-slate-800">{activeEmployee.fullName || activeEmployee.name}</span>
                  </p>
                </div>
                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full border border-amber-200">
                  {pendingApprovals.length} Pending
                </span>
              </div>

              {pendingApprovals.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 text-slate-400 space-y-2">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/50" />
                  <p className="font-semibold text-sm text-slate-600">All submissions are reviewed!</p>
                  <p className="text-xs">No pending approvals assigned to your account right now.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingApprovals.map(t => (
                    <div key={t.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">{t.id}</span>
                        <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
                          Pending Sign-Off
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-900">{t.title}</h4>
                      <p className="text-xs text-slate-600">{t.description}</p>

                      <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-xs space-y-1">
                        <div className="text-slate-500">Submitted by: <span className="font-semibold text-slate-800">{t.assignedToName}</span></div>
                        {t.submissionNotes && (
                          <div className="text-slate-700 italic">"{t.submissionNotes}"</div>
                        )}
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => setSelectedTaskForApproval(t)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-[#05331F] hover:bg-[#07472c] text-white rounded-2xl text-xs font-bold shadow-xs transition-all"
                        >
                          <CheckCheck className="w-4 h-4" />
                          <span>Review & Decide</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW 3.5: Escalations & Incident Log */}
          {activeTab === 'escalations' && (
            <EscalationsView
              tasks={tasks}
              currentUser={activeEmployee}
            />
          )}

          {/* VIEW 3.6: SOP Templates & Auto Task Scheduler */}
          {activeTab === 'templates' && (
            <SopTemplatesView
              employees={employees}
              departments={departments}
              currentUser={activeEmployee}
            />
          )}

          {/* VIEW 3.8: Dedicated Dealers Directory View */}
          {activeTab === 'dealers' && (
            <DealersDirectoryView
              currentUser={activeEmployee}
              tasks={tasks}
              onOpenAssignOrderModal={(prefill) => {
                setAssignModalPreset(prefill);
                setIsAssignModalOpen(true);
              }}
            />
          )}

          {/* VIEW 4: TaskPulse-Style Team & Employee Task Tracking View */}
          {activeTab === 'my_tasks' && (
            <TaskPulseTeamView
              tasks={tasks}
              employees={employees}
              teams={teams}
              teamMembers={teamMembers}
              departments={departments}
              currentUser={activeEmployee}
              onTaskUpdated={handleTaskUpdated}
              onOpenTaskDetails={(task) => setSelectedTaskForExec(task)}
              onOpenAssignModal={() => setIsAssignModalOpen(true)}
            />
          )}

        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR FOR PWA */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-lg safe-pb">
          <button
            onClick={() => setActiveTab('my_tasks')}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all ${
              activeTab === 'my_tasks' ? 'text-[#05331F] font-bold' : 'text-slate-400'
            }`}
          >
            <Inbox className="w-5 h-5" />
            <span className="text-[10px]">Tasks</span>
          </button>

          <button
            onClick={() => setActiveTab('teams')}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all ${
              activeTab === 'teams' ? 'text-[#05331F] font-bold' : 'text-slate-400'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px]">Team</span>
          </button>

          {/* Quick Central Action Button */}
          {(isLeadership || hasPermission(activeEmployee, 'assign_tasks') || hasPermission(activeEmployee, 'create_tasks')) && (
            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="w-11 h-11 -mt-5 rounded-2xl bg-[#05331F] text-white flex items-center justify-center shadow-lg active:scale-95 transition-all border-2 border-white"
              title="Assign Task"
            >
              <PlusCircle className="w-6 h-6 text-emerald-300" />
            </button>
          )}

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all ${
              activeTab === 'dashboard' ? 'text-[#05331F] font-bold' : 'text-slate-400'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px]">Reports</span>
          </button>

          <button
            onClick={() => setActiveTab('organization')}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all ${
              activeTab === 'organization' ? 'text-[#05331F] font-bold' : 'text-slate-400'
            }`}
          >
            <Building2 className="w-5 h-5" />
            <span className="text-[10px]">Staff</span>
          </button>
        </nav>
      </div>

      {/* Task Assignment Modal */}
      <TaskAssignmentModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setAssignModalPreset(null);
        }}
        initialPreset={assignModalPreset}
        currentUser={activeEmployee}
        departments={departments}
        employees={employees}
        teams={teams}
        teamMembers={teamMembers}
        onTaskCreated={handleTaskCreated}
      />

      {/* Task Execution Modal */}
      <TaskExecutionModal
        isOpen={Boolean(selectedTaskForExec)}
        onClose={() => setSelectedTaskForExec(null)}
        task={selectedTaskForExec}
        currentUser={activeEmployee}
        onTaskUpdated={handleTaskUpdated}
      />

      {/* Supervisor Review Modal */}
      <SupervisorApprovalModal
        isOpen={Boolean(selectedTaskForApproval)}
        onClose={() => setSelectedTaskForApproval(null)}
        task={selectedTaskForApproval}
        currentUser={activeEmployee}
        onApprovalDecided={handleTaskUpdated}
      />

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => setIsAddEmployeeModalOpen(false)}
        departments={departments}
        designations={designations}
        existingUsers={employees}
        currentUser={activeEmployee}
      />

      {/* Immutable Audit Trail Modal */}
      {selectedTaskForLogs && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Task Audit Trail & Governance</h3>
                <p className="text-xs text-slate-500">{selectedTaskForLogs.title}</p>
              </div>
              <button 
                onClick={() => setSelectedTaskForLogs(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto text-xs pr-1">
              {(selectedTaskForLogs.auditLogs || []).map((log, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-bold text-[#05331F]">{log.action}</span>
                    <span>{log.timestamp}</span>
                  </div>
                  <div className="text-[11px] text-slate-700 font-semibold">{log.performedByName}</div>
                  <p className="text-slate-600 text-xs">{log.details}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t flex justify-end">
              <button
                onClick={() => setSelectedTaskForLogs(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Close Trail
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
