import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Building2, Phone, Calendar, Clock, Lock, Unlock, CheckCircle2, 
  AlertCircle, AlertTriangle, Layers, Filter, PlusCircle, User, Users,
  ShieldAlert, RefreshCw, Eye, Edit3, CheckCheck, ChevronRight,
  TrendingUp, BarChart3, Inbox, Briefcase, FileText, Bell, Database,
  Menu, X, LogOut, CheckSquare, Search, Command, Bookmark, Megaphone,
  Package
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
  subscribeToNotifications,
  subscribeToDealers,
  subscribeToDealerBookings
} from './firestoreService';
import { getScope, canAccess, SCOPES, PAGES } from './permissions';
import { canAccessSales } from './salesPermissions';
import { db } from './firebase';
import { 
  collection, query, where, onSnapshot, addDoc, updateDoc, 
  doc, serverTimestamp, Timestamp 
} from 'firebase/firestore';

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
import TodoReminders from './TodoReminders';
import { useToast } from './ToastContext';
import TeamPerformanceView from './TeamPerformanceView';
import ReportsView from './ReportsView';
import DealersDirectoryView from './DealersDirectoryView';
import DealerBookingsView from './DealerBookingsView';
import PwaInstallPrompt from './PwaInstallPrompt';
import DevRoleSwitcher, { TEST_PERSONAS } from './DevRoleSwitcher';

export default function App() {
  const { currentUser, userProfile, loading: authLoading, logout } = useAuth();
  const todayStr = getTodayDateString();

  // Dev override persona for testing RBAC live in the UI
  const [devOverrideUser, setDevOverrideUser] = useState(null);

  // Master Data from Live Firestore
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

  // Live Dealers & Bookings
  const [dealers, setDealers] = useState([]);
  const [dealerBookings, setDealerBookings] = useState([]);

  // Logged-in user's private to-dos
  const [userTodos, setUserTodos] = useState([]);

  // Active view tab
  const [activeTab, setActiveTab] = useState('dashboard');
  const [employeeSubFilter, setEmployeeSubFilter] = useState('all');

  // Modal Dialogs
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignModalPreset, setAssignModalPreset] = useState(null);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [selectedTaskForExec, setSelectedTaskForExec] = useState(null);
  const [selectedTaskForApproval, setSelectedTaskForApproval] = useState(null);

  // Responsive Navigation State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { showToast } = useToast();
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  // Quick Search (Ctrl+K)
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Announcements Banner state
  const [announcements, setAnnouncements] = useState([]);

  // Active user: dev override or authenticated user profile
  const activeEmployee = devOverrideUser || userProfile || {
    id: currentUser?.uid,
    uid: currentUser?.uid,
    fullName: currentUser?.displayName || currentUser?.email,
    role: 'Employee',
    department: 'operations'
  };

  const userScope = getScope(activeEmployee);
  const isSales = canAccessSales(activeEmployee);
  const currentUid = currentUser?.uid || activeEmployee?.uid || activeEmployee?.id;

  // Route Guard Helper with Toast Notification
  const navigateToTabSafe = (targetTab, subFilter = null) => {
    if (!canAccess(activeEmployee, targetTab)) {
      showToast("Access Restricted: You don't have permission to view that page.", "warning");
      setActiveTab('dashboard');
      return;
    }
    setActiveTab(targetTab);
    if (subFilter) setEmployeeSubFilter(subFilter);
  };

  // Route Guard check whenever activeTab or activeEmployee changes
  useEffect(() => {
    if (activeTab !== 'dashboard' && !canAccess(activeEmployee, activeTab)) {
      showToast("Access Restricted: You don't have permission to view that page.", "warning");
      setActiveTab('dashboard');
    }
  }, [activeTab, activeEmployee]);

  // 1. Master Data Listeners
  useEffect(() => {
    const unsubDepts = subscribeToDepartments(setDepartments);
    const unsubDes = subscribeToDesignations(setDesignations);
    const unsubEmps = subscribeToEmployees((liveEmps) => {
      if (liveEmps && liveEmps.length > 0) {
        setEmployees(liveEmps);
      }
    });
    const unsubTeams = subscribeToTeams(setTeams);
    const unsubMembers = subscribeToTeamMembers(setTeamMembers);
    const unsubDealers = subscribeToDealers(setDealers);
    const unsubBookings = subscribeToDealerBookings(setDealerBookings);

    return () => {
      unsubDepts && unsubDepts();
      unsubDes && unsubDes();
      unsubEmps && unsubEmps();
      unsubTeams && unsubTeams();
      unsubMembers && unsubMembers();
      unsubDealers && unsubDealers();
      unsubBookings && unsubBookings();
    };
  }, []);

  // 2. Real-time Tasks & Notifications Stream filtered strictly by RBAC scope
  useEffect(() => {
    if (!activeEmployee) return;

    // Use current activeEmployee identifier as stable trigger to prevent re-attaching listeners
    const unsubTasks = subscribeToTasks(activeEmployee, setTasks, employees);
    const unsubNotifs = subscribeToNotifications(activeEmployee.id || activeEmployee.uid, setNotifications);

    return () => {
      unsubTasks && unsubTasks();
      unsubNotifs && unsubNotifs();
    };
  }, [activeEmployee?.id || activeEmployee?.uid]);

  // 3. Private User To-Dos Listener
  useEffect(() => {
    if (!currentUid) return;

    const q = query(collection(db, 'todos'), where('uid', '==', currentUid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          ...data,
          dueAtDate: data.dueAt?.toDate ? data.dueAt.toDate() : (data.dueAt ? new Date(data.dueAt) : null),
          remindAtDate: data.remindAt?.toDate ? data.remindAt.toDate() : (data.remindAt ? new Date(data.remindAt) : null)
        });
      });
      setUserTodos(list);
    }, (err) => {
      console.warn('To-dos listener error:', err);
    });

    return () => unsubscribe();
  }, [currentUid]);

  // 4. Announcements Stream
  useEffect(() => {
    const q = query(collection(db, 'announcements'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
      setAnnouncements(list);
    }, (err) => {
      console.warn('Announcements listener error:', err);
    });

    return () => unsubscribe();
  }, []);

  // 5. Global Keyboard Shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsQuickSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsQuickSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Review Queue (Tasks completed / submitted that were assigned BY this user)
  const pendingApprovals = useMemo(() => {
    if (!activeEmployee) return [];
    const myId = String(activeEmployee.id || activeEmployee.uid || '');
    const myEmpId = activeEmployee.employeeId ? String(activeEmployee.employeeId) : '';
    const myName = String(activeEmployee.fullName || activeEmployee.name || '').toLowerCase();

    return tasks.filter(t => {
      // 1. Task must be finished by the assignee (Pending Review, Pending Sign-Off, or Completed waiting for sign-off)
      const s = (t.status || '').toLowerCase();
      const isSubmitted = s === 'pending review' || s === 'pending sign-off' || s === 'completed';
      if (!isSubmitted) return false;

      // 2. Strict assigner check: Only the person who assigned the task sees it in their approval page
      const byId = String(t.assignedById || t.createdById || '');
      const byName = String(t.assignedByName || '').toLowerCase();

      const wasAssignedByMe = (myId && byId === myId) || 
                              (myEmpId && byId === myEmpId) || 
                              (myName && byName === myName);

      return wasAssignedByMe;
    });
  }, [tasks, activeEmployee]);

  // Active escalations count
  const escalationsCount = tasks.filter(t => 
    t.status === 'Blocked' || 
    t.status === 'Operational Blocker' || 
    t.paymentStatus === 'Payment Hold' ||
    (t.deadlineDate && t.deadlineDate < todayStr && t.status !== TASK_STATUSES.COMPLETED)
  ).length;

  // Task Counts for Badges
  const assignedByMeCount = useMemo(() => {
    if (!currentUid) return 0;
    const empId = activeEmployee?.employeeId;
    return tasks.filter(t => {
      const byId = String(t.assignedById || t.createdById || '');
      return byId === currentUid || (empId && byId === String(empId));
    }).length;
  }, [tasks, currentUid, activeEmployee]);

  const taskCounts = {
    total: tasks.length,
    today: tasks.filter(t => (t.taskDate || t.deadlineDate || '').startsWith(todayStr)).length,
    inProgress: tasks.filter(t => t.status === TASK_STATUSES.IN_PROGRESS).length,
    overdue: tasks.filter(t => t.deadlineDate && t.deadlineDate < todayStr && t.status !== TASK_STATUSES.COMPLETED).length,
    blocked: tasks.filter(t => t.status === TASK_STATUSES.BLOCKED || t.status === 'Blocked').length,
    completed: tasks.filter(t => t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed').length,
    assignedByMeCount
  };

  // Due reminders count
  const dueRemindersCount = useMemo(() => {
    const now = new Date().getTime();
    return userTodos.filter(t => !t.done && t.remindAtDate && t.remindAtDate.getTime() <= now).length;
  }, [userTodos]);

  // Operational Alerts Engine
  const systemAlerts = useMemo(() => {
    const alerts = [];
    if (taskCounts.overdue > 0) {
      alerts.push({
        id: 'alt_overdue',
        type: 'critical',
        title: `${taskCounts.overdue} Tasks Overdue`,
        desc: 'Overdue execution deadlines require immediate supervisor clearance.',
        actionTab: 'my_tasks'
      });
    }
    if (pendingApprovals.length > 0 && canAccess(activeEmployee, PAGES.APPROVALS)) {
      alerts.push({
        id: 'alt_approvals',
        type: 'warning',
        title: `${pendingApprovals.length} Sign-Offs Pending Review`,
        desc: 'Task executions waiting for supervisor decision.',
        actionTab: 'approvals'
      });
    }
    return alerts;
  }, [taskCounts, pendingApprovals, activeEmployee]);

  // Quick Search Results
  const quickSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return { dealers: [], tasks: [], employees: [] };
    const q = searchQuery.toLowerCase();

    return {
      dealers: dealers.filter(d => (d.name || d.firmName || '').toLowerCase().includes(q)).slice(0, 4),
      tasks: tasks.filter(t => (t.title || '').toLowerCase().includes(q)).slice(0, 4),
      employees: employees.filter(e => (e.fullName || e.name || '').toLowerCase().includes(q)).slice(0, 4)
    };
  }, [searchQuery, dealers, tasks, employees]);

  // Handlers
  const handleTaskCreated = async (newTaskData) => {
    try {
      await createFirestoreTask(newTaskData, activeEmployee);
      showToast('Task created and assigned successfully!', 'success');
    } catch (err) {
      console.error('Failed to create task in Firestore:', err);
      showToast('Error creating task: ' + err.message, 'error');
    }
  };

  const handleTaskUpdated = async (updatedTask) => {
    try {
      await updateFirestoreTask(updatedTask.id, updatedTask, activeEmployee);
      showToast('Task updated successfully!', 'success');
    } catch (err) {
      console.error('Failed to update task in Firestore:', err);
      showToast('Error updating task: ' + err.message, 'error');
    }
  };

  // Quick Add To-Do from Dashboard
  const handleDashboardQuickAddTodo = async (title) => {
    if (!title || !currentUid) return;
    try {
      const todayDateObj = new Date();
      todayDateObj.setHours(18, 0, 0, 0);

      await addDoc(collection(db, 'todos'), {
        title,
        notes: '',
        dueAt: Timestamp.fromDate(todayDateObj),
        remindAt: null,
        priority: 'Medium',
        done: false,
        repeat: 'None',
        uid: currentUid,
        linkedTaskId: null,
        reminded: false,
        createdAt: serverTimestamp()
      });
      showToast('Note added to your Notebook!', 'success');
    } catch (err) {
      console.error('Failed to quick add to-do:', err);
      showToast('Failed to add note: ' + err.message, 'error');
    }
  };

  const handleToggleTodoDone = async (todoId, doneState) => {
    try {
      await updateDoc(doc(db, 'todos', todoId), {
        done: doneState,
        completedAt: doneState ? serverTimestamp() : null
      });
    } catch (err) {
      console.error('Failed to toggle to-do done state:', err);
    }
  };

  const handleFollowUpTask = async (task) => {
    try {
      const todayDateObj = new Date();
      todayDateObj.setHours(todayDateObj.getHours() + 2);

      await addDoc(collection(db, 'todos'), {
        title: `Follow-up: ${task.title}`,
        notes: `Assigned to: ${task.assignedToName || 'Team'}. Status: ${task.status}`,
        dueAt: Timestamp.fromDate(todayDateObj),
        remindAt: Timestamp.fromDate(todayDateObj),
        priority: task.priority || 'Medium',
        done: false,
        repeat: 'None',
        uid: currentUid,
        linkedTaskId: task.id,
        reminded: false,
        createdAt: serverTimestamp()
      });

      showToast(`Follow-up saved to your Notebook for "${task.title}"`, 'success');
    } catch (err) {
      console.error('Failed to add follow-up to to-dos:', err);
      showToast('Failed to add follow-up: ' + err.message, 'error');
    }
  };

  // Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#05331F] flex items-center justify-center font-bold text-white shadow-xl animate-pulse text-lg">
          SS
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-800">STARK STEEL DOORS</p>
          <p className="text-xs text-slate-400">Loading SalesDoor Enterprise Platform...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated
  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-row">

      {/* 1. Left Navigation Sidebar (In-flow fixed width column on desktop, NO double margin) */}
      <Sidebar
        currentUser={activeEmployee}
        activeTab={activeTab}
        onTabChange={(tab, sub) => {
          navigateToTabSafe(tab, sub);
          setIsMobileMoreOpen(false);
        }}
        employeeSubFilter={employeeSubFilter}
        onSubFilterChange={setEmployeeSubFilter}
        taskCounts={taskCounts}
        pendingApprovalsCount={pendingApprovals.length}
        escalationsCount={escalationsCount}
        dueRemindersCount={dueRemindersCount}
        onOpenAssignModal={() => setIsAssignModalOpen(true)}
        systemAlerts={systemAlerts}
        onNavigateToTab={navigateToTabSafe}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
      />

      {/* 2. Main Content Wrapper: flex-1 min-w-0, full height */}
      <div className="flex-1 min-w-0 flex flex-col">
        
        {/* Mobile Header Bar (lg:hidden) */}
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="w-8 h-8 rounded-xl bg-[#05331F] text-emerald-300 flex items-center justify-center font-bold shrink-0 shadow-xs cursor-pointer"
            aria-label="Open Navigation"
          >
            <Menu className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 tracking-wider">STARK STEEL</span>
          </div>

          <button
            onClick={() => logout()}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Global Announcement Banner */}
        {announcements.length > 0 && (
          <div className="bg-[#05331F] text-white px-4 sm:px-6 lg:px-8 py-2.5 text-xs flex items-center justify-between border-b border-[#07472B] w-full">
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <Megaphone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{announcements[0].title || 'Company Notice'}:</span>
                <span className="text-emerald-100/90 truncate">{announcements[0].message}</span>
              </div>
              <span className="text-[10px] text-emerald-300 font-medium shrink-0 ml-2">
                {announcements[0].department === 'all' ? 'All Personnel' : announcements[0].department}
              </span>
            </div>
          </div>
        )}

        {/* Main Body */}
        <main className="w-full flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8">
          <div className="w-full space-y-6">
            
            {/* VIEW 1: Performance Dashboard (Tailored strictly by scope) */}
            {activeTab === 'dashboard' && (
              <CompanyDashboardView 
                tasks={tasks} 
                departments={departments}
                employees={employees}
                teams={teams}
                currentUser={activeEmployee}
                todos={userTodos}
                bookings={dealerBookings}
                onNavigateToTab={navigateToTabSafe}
                onOpenTaskDetails={(task) => setSelectedTaskForExec(task)}
                onOpenAssignModal={() => setIsAssignModalOpen(true)}
                onQuickAddTodo={handleDashboardQuickAddTodo}
                onToggleTodoDone={handleToggleTodoDone}
              />
            )}

            {/* VIEW 1.5: Team Performance View (Company, Dept & Downline scopes) */}
            {activeTab === 'team_performance' && canAccess(activeEmployee, PAGES.TEAM_PERFORMANCE) && (
              <TeamPerformanceView
                employees={employees}
                tasks={tasks}
                departments={departments}
                teams={teams}
                currentUser={activeEmployee}
                onOpenAssignModal={(preset) => {
                  setAssignModalPreset(preset || null);
                  setIsAssignModalOpen(true);
                }}
                onNavigateToTab={navigateToTabSafe}
                onOpenTaskDetails={(task) => setSelectedTaskForExec(task)}
              />
            )}

            {/* VIEW 2: Dealer Bookings (Daily Order Management) */}
            {activeTab === 'bookings' && canAccess(activeEmployee, PAGES.BOOKINGS) && (
              <DealerBookingsView
                currentUser={activeEmployee}
                bookings={dealerBookings}
                dealers={dealers}
                employees={employees}
                onOpenAssignOrderModal={(preset) => {
                  setAssignModalPreset(preset);
                  setIsAssignModalOpen(true);
                }}
                onOpenTaskDetails={(task) => setSelectedTaskForExec(task)}
              />
            )}

            {/* VIEW 2.5: Dedicated Dealers Directory View */}
            {activeTab === 'dealers' && canAccess(activeEmployee, PAGES.DEALERS) && (
              <DealersDirectoryView
                currentUser={activeEmployee}
                dealers={dealers}
                bookings={dealerBookings}
                employees={employees}
                onOpenAssignOrderModal={(prefill) => {
                  setAssignModalPreset(prefill);
                  setIsAssignModalOpen(true);
                }}
                onNavigateToTab={navigateToTabSafe}
              />
            )}

            {/* VIEW 3: Organization Management & Real Employee Directory (Company scope only) */}
            {activeTab === 'organization' && canAccess(activeEmployee, PAGES.ORGANIZATION) && (
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

            {/* VIEW 3.5: Team Management Module */}
            {activeTab === 'teams' && canAccess(activeEmployee, PAGES.TEAMS) && (
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

            {/* VIEW 4: Approvals & Exception Queue */}
            {activeTab === 'approvals' && canAccess(activeEmployee, PAGES.APPROVALS) && (
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Approvals & Sign-Off Queue</h2>
                    <p className="text-xs text-slate-500">
                      Sign-off requests waiting for your approval
                    </p>
                  </div>
                  <span className="text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full border border-amber-200">
                    {pendingApprovals.length} Pending
                  </span>
                </div>

                {pendingApprovals.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 text-slate-400 space-y-2">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/50" />
                    <p className="font-semibold text-sm text-slate-600">All submissions are reviewed!</p>
                    <p className="text-xs">No pending sign-offs waiting for your account right now.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingApprovals.map(t => (
                      <div key={t.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                            {t.departmentName || t.department || 'Sales'}
                          </span>
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
                            Pending Sign-Off
                          </span>
                        </div>

                        <h3 className="font-bold text-sm text-slate-900">{t.title}</h3>
                        <p className="text-xs text-slate-600">{t.description}</p>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                          <div className="text-slate-500">Assignee: <span className="font-semibold text-slate-800">{t.assignedToName}</span></div>
                          {t.submissionNotes && (
                            <div className="text-slate-700 italic">"{t.submissionNotes}"</div>
                          )}
                        </div>

                        <div className="pt-2 flex items-center justify-between">
                          <button
                            onClick={() => handleFollowUpTask(t)}
                            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#05331F] font-semibold"
                            title="Bookmark follow-up in my to-dos"
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                            <span>Add to My Planner</span>
                          </button>

                          <button
                            onClick={() => setSelectedTaskForApproval(t)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#05331F] hover:bg-[#07472B] text-white rounded-xl text-xs font-bold shadow-2xs transition"
                          >
                            <span>Review & Decide</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VIEW 5: Escalations & Operational Bottlenecks (Company & Dept scope only) */}
            {activeTab === 'escalations' && canAccess(activeEmployee, PAGES.ESCALATIONS) && (
              <EscalationsView
                tasks={tasks}
                currentUser={activeEmployee}
                onNudgeTask={async (taskId) => {
                  try {
                    await updateFirestoreTask(taskId, {
                      lastNudgedAt: new Date().toISOString(),
                      lastNudgedBy: activeEmployee.fullName || activeEmployee.name
                    }, activeEmployee);
                    showToast('Nudge reminder sent to assignee successfully.', 'success');
                  } catch (e) {
                    showToast('Nudge failed: ' + e.message, 'error');
                  }
                }}
                onReassignTask={(task) => {
                  setAssignModalPreset({
                    title: `Reassigned: ${task.title}`,
                    description: task.description,
                    priority: TASK_PRIORITIES.HIGH,
                    department: task.departmentId || task.department
                  });
                  setIsAssignModalOpen(true);
                }}
              />
            )}

            {/* VIEW 6: To-Do & Reminders (Personal Planner) */}
            {activeTab === 'todos' && canAccess(activeEmployee, PAGES.TODOS) && (
              <TodoReminders
                currentUser={activeEmployee}
                onOpenAssignModal={(preset) => {
                  setAssignModalPreset(preset);
                  setIsAssignModalOpen(true);
                }}
                onOpenTaskDetails={(task) => setSelectedTaskForExec(task)}
              />
            )}

            {/* VIEW 7: Operational Reports (Company & Dept scopes) */}
            {activeTab === 'reports' && canAccess(activeEmployee, PAGES.REPORTS) && (
              <ReportsView
                tasks={tasks}
                employees={employees}
                currentUser={activeEmployee}
              />
            )}

            {/* VIEW 8: All Tasks & Pulse View */}
            {activeTab === 'my_tasks' && canAccess(activeEmployee, PAGES.MY_TASKS) && (
              <TaskPulseTeamView
                tasks={tasks}
                employees={employees}
                teams={teams}
                teamMembers={teamMembers}
                departments={departments}
                currentUser={activeEmployee}
                initialViewMode="my_tasks"
                onTaskCreated={handleTaskCreated}
                onTaskUpdated={handleTaskUpdated}
                onOpenTaskDetails={(task) => setSelectedTaskForExec(task)}
                onOpenAssignModal={() => setIsAssignModalOpen(true)}
                onFollowUpTask={handleFollowUpTask}
              />
            )}

            {/* VIEW 8B: Tasks Assigned By Me */}
            {activeTab === 'assigned_tasks' && (
              <TaskPulseTeamView
                tasks={tasks}
                employees={employees}
                teams={teams}
                teamMembers={teamMembers}
                departments={departments}
                currentUser={activeEmployee}
                initialViewMode="assigned_by_me"
                onTaskCreated={handleTaskCreated}
                onTaskUpdated={handleTaskUpdated}
                onOpenTaskDetails={(task) => setSelectedTaskForExec(task)}
                onOpenAssignModal={() => setIsAssignModalOpen(true)}
                onFollowUpTask={handleFollowUpTask}
              />
            )}

          </div>
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR FOR PWA */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 flex items-center justify-around shadow-lg safe-pb">
          <button
            onClick={() => {
              navigateToTabSafe('my_tasks');
              setIsMobileMoreOpen(false);
            }}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition ${
              activeTab === 'my_tasks' ? 'text-[#05331F] font-bold' : 'text-slate-400'
            }`}
          >
            <Inbox className="w-5 h-5" />
            <span className="text-[10px]">Tasks</span>
          </button>

          {isSales ? (
            <button
              onClick={() => {
                navigateToTabSafe('bookings');
                setIsMobileMoreOpen(false);
              }}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition ${
                activeTab === 'bookings' ? 'text-[#05331F] font-bold' : 'text-slate-400'
              }`}
            >
              <Package className="w-5 h-5" />
              <span className="text-[10px]">Bookings</span>
            </button>
          ) : (
            canAccess(activeEmployee, PAGES.TEAM_PERFORMANCE) && (
              <button
                onClick={() => {
                  navigateToTabSafe('team_performance');
                  setIsMobileMoreOpen(false);
                }}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition ${
                  activeTab === 'team_performance' ? 'text-[#05331F] font-bold' : 'text-slate-400'
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="text-[10px]">Team</span>
              </button>
            )
          )}

          {/* Central Action Button */}
          {(userScope === SCOPES.COMPANY || userScope === SCOPES.DEPARTMENT || userScope === SCOPES.DOWNLINE) && (
            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="w-11 h-11 -mt-5 rounded-2xl bg-[#05331F] text-white flex items-center justify-center shadow-lg active:scale-95 transition border-2 border-white"
              title="Assign Task"
            >
              <PlusCircle className="w-6 h-6 text-emerald-300" />
            </button>
          )}

          {canAccess(activeEmployee, PAGES.REPORTS) && (
            <button
              onClick={() => {
                navigateToTabSafe('reports');
                setIsMobileMoreOpen(false);
              }}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition ${
                activeTab === 'reports' ? 'text-[#05331F] font-bold' : 'text-slate-400'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-[10px]">Reports</span>
            </button>
          )}

          <button
            onClick={() => setIsMobileMoreOpen(prev => !prev)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition relative ${
              isMobileMoreOpen ? 'text-[#05331F] font-bold' : 'text-slate-400'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px]">More</span>
            {dueRemindersCount > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            )}
          </button>
        </nav>

        {/* Mobile More Sheet */}
        {isMobileMoreOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex flex-col justify-end">
            <div className="bg-white rounded-t-3xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-sm font-bold text-slate-900">All Modules & Shortcuts</span>
                <button 
                  onClick={() => setIsMobileMoreOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 3-column icon grid */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => { navigateToTabSafe('dashboard'); setIsMobileMoreOpen(false); }}
                  className="p-3 rounded-2xl bg-slate-50 flex flex-col items-center gap-1.5 text-center"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#05331F] flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">Dashboard</span>
                </button>

                {isSales && (
                  <>
                    <button
                      onClick={() => { navigateToTabSafe('bookings'); setIsMobileMoreOpen(false); }}
                      className="p-3 rounded-2xl bg-slate-50 flex flex-col items-center gap-1.5 text-center"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                        <Package className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700">Bookings</span>
                    </button>

                    <button
                      onClick={() => { navigateToTabSafe('dealers'); setIsMobileMoreOpen(false); }}
                      className="p-3 rounded-2xl bg-slate-50 flex flex-col items-center gap-1.5 text-center"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700">Dealers</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => { navigateToTabSafe('todos'); setIsMobileMoreOpen(false); }}
                  className="p-3 rounded-2xl bg-slate-50 flex flex-col items-center gap-1.5 text-center relative"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">Planner</span>
                  {dueRemindersCount > 0 && (
                    <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-[#10B981]" />
                  )}
                </button>

                {canAccess(activeEmployee, PAGES.APPROVALS) && (
                  <button
                    onClick={() => { navigateToTabSafe('approvals'); setIsMobileMoreOpen(false); }}
                    className="p-3 rounded-2xl bg-slate-50 flex flex-col items-center gap-1.5 text-center relative"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                      <CheckSquare className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Approvals</span>
                    {pendingApprovals.length > 0 && (
                      <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-amber-500" />
                    )}
                  </button>
                )}

                {canAccess(activeEmployee, PAGES.ESCALATIONS) && (
                  <button
                    onClick={() => { navigateToTabSafe('escalations'); setIsMobileMoreOpen(false); }}
                    className="p-3 rounded-2xl bg-slate-50 flex flex-col items-center gap-1.5 text-center relative"
                  >
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Escalations</span>
                    {escalationsCount > 0 && (
                      <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-rose-500" />
                    )}
                  </button>
                )}

                <button
                  onClick={() => { navigateToTabSafe('teams'); setIsMobileMoreOpen(false); }}
                  className="p-3 rounded-2xl bg-slate-50 flex flex-col items-center gap-1.5 text-center"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">My Team</span>
                </button>

                {canAccess(activeEmployee, PAGES.ORGANIZATION) && (
                  <button
                    onClick={() => { navigateToTabSafe('organization'); setIsMobileMoreOpen(false); }}
                    className="p-3 rounded-2xl bg-slate-50 flex flex-col items-center gap-1.5 text-center"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Employees</span>
                  </button>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => logout()}
                  className="w-full py-2.5 rounded-xl bg-slate-100 text-rose-600 font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Search Dialog (Ctrl+K) */}
      {isQuickSearchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 pt-16">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150">
            <div className="p-3.5 border-b border-slate-100 flex items-center gap-3">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Search tasks, dealers or personnel across the company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs outline-none bg-transparent"
              />
              <button 
                onClick={() => setIsQuickSearchOpen(false)}
                className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded"
              >
                ESC
              </button>
            </div>

            <div className="p-3 max-h-80 overflow-y-auto space-y-3 text-xs">
              {searchQuery.trim() === '' ? (
                <p className="text-slate-400 py-6 text-center text-xs">Type a keyword to search...</p>
              ) : (
                <>
                  {quickSearchResults.dealers.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dealers</p>
                      <div className="space-y-1">
                        {quickSearchResults.dealers.map(d => (
                          <div 
                            key={d.id}
                            onClick={() => {
                              navigateToTabSafe('dealers');
                              setIsQuickSearchOpen(false);
                            }}
                            className="p-2 rounded-xl hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                          >
                            <span className="font-semibold text-slate-800 truncate">{d.name}</span>
                            <span className="text-[10px] text-slate-400">{d.region}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {quickSearchResults.tasks.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tasks</p>
                      <div className="space-y-1">
                        {quickSearchResults.tasks.map(t => (
                          <div 
                            key={t.id}
                            onClick={() => {
                              setSelectedTaskForExec(t);
                              setIsQuickSearchOpen(false);
                            }}
                            className="p-2 rounded-xl hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                          >
                            <span className="font-semibold text-slate-800 truncate">{t.title}</span>
                            <span className="text-[10px] text-slate-400">{t.assignedToName || 'Assigned'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {quickSearchResults.employees.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Employees</p>
                      <div className="space-y-1">
                        {quickSearchResults.employees.map(e => (
                          <div 
                            key={e.id}
                            onClick={() => {
                              navigateToTabSafe('team_performance');
                              setIsQuickSearchOpen(false);
                            }}
                            className="p-2 rounded-xl hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                          >
                            <span className="font-semibold text-slate-800 truncate">{e.fullName || e.name}</span>
                            <span className="text-[10px] text-slate-400">{e.designation}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
        isOpen={!!selectedTaskForExec}
        onClose={() => setSelectedTaskForExec(null)}
        task={selectedTaskForExec}
        currentUser={activeEmployee}
        onTaskUpdated={handleTaskUpdated}
      />

      {/* Supervisor Approval Modal */}
      <SupervisorApprovalModal
        isOpen={!!selectedTaskForApproval}
        onClose={() => setSelectedTaskForApproval(null)}
        task={selectedTaskForApproval}
        currentUser={activeEmployee}
        onApprovalDecided={handleTaskUpdated}
      />

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => setIsAddEmployeeModalOpen(false)}
        currentUser={activeEmployee}
        departments={departments}
        designations={designations}
        employees={employees}
        onEmployeeAdded={(newEmp) => setEmployees(prev => [...prev, newEmp])}
      />

    </div>
  );
}
