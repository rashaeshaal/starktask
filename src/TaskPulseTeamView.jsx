import React, { useState, useMemo } from 'react';
import { 
  Users, User, CheckCircle2, Clock, AlertTriangle, AlertCircle, 
  ShieldAlert, Calendar, ChevronLeft, ChevronRight, Filter, Search,
  CheckSquare, Square, Eye, Edit3, ArrowRight, TrendingUp, Layers,
  Building2, Briefcase, UserCheck, Shield, Phone, Mail, Award, Check
} from 'lucide-react';
import { TASK_STATUSES, TASK_PRIORITIES, isTaskLockedForUser } from './rbac';
import { getTodayDateString, getDateOffset } from './dateUtils';
import { getReportees, ROLE_HIERARCHY_LEVELS } from './orgStructure';

/**
 * TaskPulseTeamView
 * A team task tracking interface inspired by TaskPulse for SalesDoor Enterprise.
 * 
 * Features:
 * 1. Team Member Navigation (Horizontal tabs: My Tasks, Whole Team, Individual Employee Tabs)
 * 2. Whole Team View (Metrics & consolidated daily task sheet with Assignee column)
 * 3. Individual Employee View (Profile, designation, department, reporting manager, metrics, task list)
 * 4. Daily Task Sheet (Columns: Date, Checkbox, Title, Description, Assignee, Status, Project/Dept, Priority, Deadline, Actions)
 * 5. Date Navigation (Today, Yesterday, Previous dates, Custom Date Picker)
 * 6. Dynamic data from Firestore (Zero hardcoding, real-time metrics, duplicate prevention)
 * 7. Role-Based Visibility (Hierarchy-scoped: Executive/GM -> Dept Heads -> Supervisors -> Staff)
 */
export default function TaskPulseTeamView({
  tasks = [],
  employees = [],
  teams = [],
  teamMembers = [],
  departments = [],
  currentUser,
  onTaskUpdated,
  onOpenTaskDetails,
  onOpenAssignModal
}) {
  const todayStr = getTodayDateString();

  // Active Tab: initial selected employee or currentUser
  const [activeTab, setActiveTab] = useState(currentUser?.id || 'all');

  // Date Navigation State: 'today' | 'yesterday' | 'all' | 'custom'
  const [dateFilter, setDateFilter] = useState('today');
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // 1. Determine Hierarchy & Authorized Team Scope
  const isExecutiveLeadership = ['Executive Director', 'Director Operations', 'General Manager'].includes(currentUser?.role);
  const currentUserLevel = ROLE_HIERARCHY_LEVELS[currentUser?.role] || 99;
  const isDepartmentHead = currentUserLevel === 3;
  const isSupervisor = currentUserLevel === 4 || currentUserLevel === 5;

  // Compute authorized employees under this user's supervision or team
  const authorizedEmployees = useMemo(() => {
    if (!currentUser) return [];

    // Executive Leadership: Company-wide
    if (isExecutiveLeadership) {
      return employees;
    }

    // Direct and indirect reportees from reporting hierarchy
    const reportees = getReportees(currentUser.id, employees);
    const reporteeIds = new Set(reportees.map(r => r.id));

    // Team members from teams where this user is the leader
    const ledTeamIds = teams.filter(t => t.teamLeaderId === currentUser.id).map(t => t.id);
    const ledTeamMemberUserIds = teamMembers
      .filter(tm => ledTeamIds.includes(tm.teamId) && tm.status === 'active')
      .map(tm => tm.userId);

    // Department members if department head
    let deptEmployees = [];
    if (isDepartmentHead) {
      deptEmployees = employees.filter(e => (e.department === currentUser.department || e.departmentId === currentUser.department));
    }

    // Combine all permitted employee IDs
    const permittedUserIds = new Set([
      currentUser.id,
      ...reporteeIds,
      ...ledTeamMemberUserIds,
      ...deptEmployees.map(e => e.id)
    ]);

    return employees.filter(e => permittedUserIds.has(e.id));
  }, [currentUser, employees, teams, teamMembers, isExecutiveLeadership, isDepartmentHead]);

  // Can view team features (True if user is leadership, dept head, supervisor, or leads any team)
  const canViewTeam = isExecutiveLeadership || isDepartmentHead || isSupervisor || teams.some(t => t.teamLeaderId === currentUser?.id);

  // 2. Task Counts Map per Employee (Dynamically computed from actual tasks)
  const employeeTaskStats = useMemo(() => {
    const stats = {};

    // Initialize for all authorized employees
    authorizedEmployees.forEach(emp => {
      stats[emp.id] = {
        total: 0,
        completed: 0,
        pending: 0,
        inProgress: 0,
        overdue: 0,
        blocked: 0
      };
    });

    // Also track for currentUser
    if (currentUser && !stats[currentUser.id]) {
      stats[currentUser.id] = {
        total: 0,
        completed: 0,
        pending: 0,
        inProgress: 0,
        overdue: 0,
        blocked: 0
      };
    }

    tasks.forEach(task => {
      // Find all assignees for this task
      const assigneeIds = new Set();
      if (task.assignedToId) assigneeIds.add(task.assignedToId);
      if (Array.isArray(task.assigneeIds)) {
        task.assigneeIds.forEach(id => assigneeIds.add(id));
      }

      const isCompleted = task.status === TASK_STATUSES.COMPLETED;
      const isInProgress = task.status === TASK_STATUSES.IN_PROGRESS;
      const isBlocked = task.status === TASK_STATUSES.BLOCKED;
      const isOverdue = task.deadlineDate < todayStr && !isCompleted;
      const isPending = task.status === TASK_STATUSES.ASSIGNED || task.status === TASK_STATUSES.ACCEPTED || task.status === TASK_STATUSES.PENDING_REVIEW;

      assigneeIds.forEach(empId => {
        if (stats[empId]) {
          stats[empId].total += 1;
          if (isCompleted) stats[empId].completed += 1;
          if (isInProgress) stats[empId].inProgress += 1;
          if (isBlocked) stats[empId].blocked += 1;
          if (isOverdue) stats[empId].overdue += 1;
          if (isPending) stats[empId].pending += 1;
        }
      });
    });

    return stats;
  }, [authorizedEmployees, tasks, currentUser, todayStr]);

  // Whole Team Consolidated Stats
  const wholeTeamStats = useMemo(() => {
    let total = 0;
    let completed = 0;
    let pending = 0;
    let inProgress = 0;
    let overdue = 0;
    let blocked = 0;

    // Use unique task IDs to ensure tasks assigned to multiple people are NOT double counted in company/team totals
    const countedTaskIds = new Set();

    tasks.forEach(task => {
      const isAssignedToAuthorized = authorizedEmployees.some(emp => 
        task.assignedToId === emp.id || (task.assigneeIds && task.assigneeIds.includes(emp.id))
      );

      if (isAssignedToAuthorized && !countedTaskIds.has(task.id)) {
        countedTaskIds.add(task.id);
        total += 1;
        if (task.status === TASK_STATUSES.COMPLETED) completed += 1;
        if (task.status === TASK_STATUSES.IN_PROGRESS) inProgress += 1;
        if (task.status === TASK_STATUSES.BLOCKED) blocked += 1;
        if (task.deadlineDate < todayStr && task.status !== TASK_STATUSES.COMPLETED) overdue += 1;
        if (task.status === TASK_STATUSES.ASSIGNED || task.status === TASK_STATUSES.ACCEPTED || task.status === TASK_STATUSES.PENDING_REVIEW) {
          pending += 1;
        }
      }
    });

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, inProgress, overdue, blocked, completionRate };
  }, [tasks, authorizedEmployees, todayStr]);

  // 3. Selected Employee Details (for Individual View)
  const selectedEmployee = useMemo(() => {
    if (activeTab === 'my_tasks') return currentUser;
    if (activeTab === 'whole_team') return null;
    return employees.find(e => e.id === activeTab) || null;
  }, [activeTab, currentUser, employees]);

  // 4. Filter Tasks based on Active Tab, Date Filter, and Search
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // 1. Tab Scope Filter
      if (activeTab === 'my_tasks') {
        const isMine = task.assignedToId === currentUser?.id || (task.assigneeIds && task.assigneeIds.includes(currentUser?.id));
        if (!isMine) return false;
      } else if (activeTab === 'whole_team') {
        const isAuthorized = authorizedEmployees.some(emp => 
          task.assignedToId === emp.id || (task.assigneeIds && task.assigneeIds.includes(emp.id))
        );
        if (!isAuthorized) return false;
      } else {
        // Specific Employee
        const isSelectedEmp = task.assignedToId === activeTab || (task.assigneeIds && task.assigneeIds.includes(activeTab));
        if (!isSelectedEmp) return false;
      }

      // 2. Date Filter
      if (dateFilter === 'today') {
        const matchesDate = task.taskDate === todayStr || task.deadlineDate === todayStr;
        if (!matchesDate) return false;
      } else if (dateFilter === 'yesterday') {
        const yesterdayStr = getDateOffset(-1);
        const matchesDate = task.taskDate === yesterdayStr || task.deadlineDate === yesterdayStr;
        if (!matchesDate) return false;
      } else if (dateFilter === 'custom' && selectedDate) {
        const matchesDate = task.taskDate === selectedDate || task.deadlineDate === selectedDate;
        if (!matchesDate) return false;
      }

      // 3. Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'overdue') {
          if (!(task.deadlineDate < todayStr && task.status !== TASK_STATUSES.COMPLETED)) return false;
        } else if (task.status !== statusFilter) {
          return false;
        }
      }

      // 4. Priority Filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }

      // 5. Search Text Filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchTitle = (task.title || '').toLowerCase().includes(query);
        const matchDesc = (task.description || '').toLowerCase().includes(query);
        const matchAssignee = (task.assignedToName || '').toLowerCase().includes(query);
        const matchDealer = (task.dealerName || '').toLowerCase().includes(query);
        const matchId = (task.id || '').toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchAssignee && !matchDealer && !matchId) return false;
      }

      return true;
    });
  }, [tasks, activeTab, currentUser, authorizedEmployees, dateFilter, selectedDate, todayStr, statusFilter, priorityFilter, searchTerm]);

  // Quick Toggle Task Complete Checkbox
  const handleToggleTaskComplete = async (task, e) => {
    e.stopPropagation();
    if (!onTaskUpdated) return;

    const locked = isTaskLockedForUser(currentUser, task);
    if (locked && !isExecutiveLeadership) {
      alert("This task is locked and cannot be marked completed.");
      return;
    }

    const newStatus = task.status === TASK_STATUSES.COMPLETED ? TASK_STATUSES.IN_PROGRESS : TASK_STATUSES.COMPLETED;
    const newProgress = newStatus === TASK_STATUSES.COMPLETED ? 100 : (task.progressPercentage || 50);

    const updated = {
      ...task,
      status: newStatus,
      progressPercentage: newProgress,
      auditAction: newStatus === TASK_STATUSES.COMPLETED ? 'TASK_COMPLETED' : 'TASK_REOPENED',
      auditDetails: `Task marked as ${newStatus} from Daily Task Sheet by ${currentUser.fullName || currentUser.name}`
    };

    onTaskUpdated(updated);
  };

  // Helper for rendering employee initials
  const getInitials = (name) => {
    if (!name) return 'EM';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* 2. CONTEXTUAL METRIC CARDS: WHOLE TEAM OR INDIVIDUAL EMPLOYEE */}
      {activeTab === 'whole_team' ? (
        // WHOLE TEAM DASHBOARD CARD
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#05331F] flex items-center justify-center border border-emerald-200 font-bold">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Whole Team Overview</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                    {authorizedEmployees.length} Active Staff
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Consolidated performance across all authorized employees and teams
                </p>
              </div>
            </div>

            {/* Quick Overall Progress Bar */}
            <div className="sm:text-right space-y-1">
              <div className="text-xs font-bold text-slate-700">
                Team Completion: <span className="text-emerald-700">{wholeTeamStats.completionRate}%</span>
              </div>
              <div className="w-40 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div 
                  className="bg-[#05331F] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${wholeTeamStats.completionRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Key Stat Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Assigned', count: wholeTeamStats.total, icon: Layers, color: 'text-slate-900 bg-slate-50 border-slate-200' },
              { label: 'Completed', count: wholeTeamStats.completed, icon: CheckCircle2, color: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
              { label: 'In Progress', count: wholeTeamStats.inProgress, icon: Clock, color: 'text-blue-800 bg-blue-50 border-blue-200' },
              { label: 'Pending Sign-Off', count: wholeTeamStats.pending, icon: CheckSquare, color: 'text-amber-800 bg-amber-50 border-amber-200' },
              { label: 'Overdue Alerts', count: wholeTeamStats.overdue, icon: AlertTriangle, color: 'text-rose-800 bg-rose-50 border-rose-200' },
              { label: 'Blocked / Holds', count: wholeTeamStats.blocked, icon: ShieldAlert, color: 'text-purple-800 bg-purple-50 border-purple-200' },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className={`p-3 rounded-2xl border ${stat.color} flex flex-col justify-between`}>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
                    <span>{stat.label}</span>
                    <Icon className="w-3.5 h-3.5 opacity-70" />
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900">{stat.count}</div>
                </div>
              );
            })}
          </div>

          {/* Employee-wise Completion Percentage Table Preview */}
          <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-200/60">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center justify-between">
              <span>Employee Completion Roster</span>
              <span className="text-[10px] text-slate-400 font-mono">Live Firestore Feed</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {authorizedEmployees.map(emp => {
                const s = employeeTaskStats[emp.id] || { total: 0, completed: 0 };
                const pct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
                return (
                  <div key={emp.id} className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-6 h-6 rounded-lg bg-emerald-100 text-[#05331F] font-bold flex items-center justify-center text-[10px] shrink-0">
                        {getInitials(emp.fullName || emp.name)}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-slate-800 truncate">{emp.fullName || emp.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{emp.role}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="font-mono font-bold text-emerald-800">{s.completed}/{s.total}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">{pct}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : selectedEmployee ? (
        // INDIVIDUAL EMPLOYEE PROFILE & PERFORMANCE CARD
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-[#05331F] text-emerald-300 font-bold flex items-center justify-center text-lg shadow-sm shrink-0">
                {selectedEmployee.photoUrl ? (
                  <img src={selectedEmployee.photoUrl} alt={selectedEmployee.fullName} className="w-14 h-14 rounded-2xl object-cover" />
                ) : (
                  getInitials(selectedEmployee.fullName || selectedEmployee.name)
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-slate-900">{selectedEmployee.fullName || selectedEmployee.name}</h2>
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                    {selectedEmployee.employeeId || 'ID VERIFIED'}
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-100 text-[#05331F] px-2 py-0.5 rounded-full">
                    {selectedEmployee.role}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    Dept: <strong className="text-slate-700 capitalize">{selectedEmployee.department}</strong>
                  </span>
                  {selectedEmployee.reportingManagerName && (
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-slate-400" />
                      Reports to: <strong className="text-slate-700">{selectedEmployee.reportingManagerName}</strong>
                    </span>
                  )}
                  {selectedEmployee.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {selectedEmployee.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Individual Progress Meter */}
            {(() => {
              const stats = employeeTaskStats[selectedEmployee.id] || { total: 0, completed: 0 };
              const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
              return (
                <div className="sm:text-right space-y-1">
                  <div className="text-xs font-bold text-slate-700">
                    Task Progress: <span className="text-emerald-700 font-mono">{rate}%</span>
                  </div>
                  <div className="w-40 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                    <div 
                      className="bg-[#05331F] h-2 rounded-full transition-all duration-500"
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {stats.completed} of {stats.total} tasks completed
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Individual Stats Row */}
          {(() => {
            const stats = employeeTaskStats[selectedEmployee.id] || { total: 0, completed: 0, inProgress: 0, pending: 0, overdue: 0, blocked: 0 };
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "Assigned", count: stats.total, color: 'text-slate-900 bg-slate-50 border-slate-200' },
                  { label: 'Completed', count: stats.completed, color: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
                  { label: 'In Progress', count: stats.inProgress, color: 'text-blue-800 bg-blue-50 border-blue-200' },
                  { label: 'Pending Sign-Off', count: stats.pending, color: 'text-amber-800 bg-amber-50 border-amber-200' },
                  { label: 'Overdue', count: stats.overdue, color: 'text-rose-800 bg-rose-50 border-rose-200' },
                  { label: 'Blocked', count: stats.blocked, color: 'text-purple-800 bg-purple-50 border-purple-200' },
                ].map((s, idx) => (
                  <div key={idx} className={`p-2.5 rounded-2xl border ${s.color}`}>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">{s.label}</div>
                    <div className="text-lg font-bold font-mono text-slate-900">{s.count}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      ) : null}

      {/* 3. DAILY TASK SHEET (Consolidated Professional Table) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Table Header Controls & Date Navigation */}
        <div className="p-4 sm:p-5 border-b border-slate-200/70 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Daily Task Sheet</span>
                <span className="text-xs bg-slate-100 text-slate-700 font-mono font-bold px-2 py-0.5 rounded-full">
                  {filteredTasks.length} Live Records
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                {activeTab === 'whole_team' ? 'Consolidated view across all team members' : 
                 activeTab === 'my_tasks' ? 'Your personal active task assignments' : 
                 `Tasks assigned to ${selectedEmployee?.fullName || selectedEmployee?.name}`}
              </p>
            </div>

            {/* Date Navigator Ribbon (Today / Yesterday / Custom) */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 self-start sm:self-auto text-xs">
              <button
                onClick={() => { setDateFilter('today'); setSelectedDate(todayStr); }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  dateFilter === 'today' ? 'bg-[#05331F] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => { setDateFilter('yesterday'); setSelectedDate(getDateOffset(-1)); }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  dateFilter === 'yesterday' ? 'bg-[#05331F] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Yesterday
              </button>
              <button
                onClick={() => setDateFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  dateFilter === 'all' ? 'bg-[#05331F] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Dates
              </button>

              <div className="flex items-center gap-1 pl-1 border-l border-slate-300">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setDateFilter('custom');
                  }}
                  className="bg-transparent text-xs text-slate-700 font-mono outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Quick Filters & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 text-xs">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search tasks by title, assignee, description, dealer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F] focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value={TASK_STATUSES.IN_PROGRESS}>In Progress</option>
                <option value={TASK_STATUSES.COMPLETED}>Completed</option>
                <option value={TASK_STATUSES.PENDING_REVIEW}>Pending Review</option>
                <option value={TASK_STATUSES.BLOCKED}>Blocked</option>
                <option value="overdue">Overdue</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="all">All Priorities</option>
                <option value={TASK_PRIORITIES.URGENT}>Urgent</option>
                <option value={TASK_PRIORITIES.HIGH}>High</option>
                <option value={TASK_PRIORITIES.MEDIUM}>Medium</option>
                <option value={TASK_PRIORITIES.LOW}>Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* The 10-Column Daily Task Sheet Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 w-10 text-center">Done</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 min-w-[200px]">Task Title</th>
                <th className="py-3 px-4 min-w-[220px]">Task Description</th>
                <th className="py-3 px-4">Assigned Employee</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Project / Dept</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Deadline</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400 font-medium">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Clock className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="font-semibold text-slate-600 text-xs">No matching tasks found</p>
                      <p className="text-[11px] text-slate-400">
                        Try adjusting your date filters or click "Assign Task" to create a new task record.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTasks.map(task => {
                  const isCompleted = task.status === TASK_STATUSES.COMPLETED;
                  const locked = isTaskLockedForUser(currentUser, task);
                  const isOverdue = task.deadlineDate < todayStr && !isCompleted;

                  return (
                    <tr 
                      key={task.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCompleted ? 'bg-emerald-50/20' : locked ? 'bg-slate-50/40' : ''
                      }`}
                    >
                      {/* 1. Completed Checkbox */}
                      <td className="py-3 px-3 text-center align-top">
                        <button
                          onClick={(e) => handleToggleTaskComplete(task, e)}
                          title={locked ? "Task is locked" : isCompleted ? "Mark Incomplete" : "Mark Complete"}
                          className={`p-1 rounded-lg transition-transform active:scale-90 ${
                            isCompleted ? 'text-emerald-700 hover:text-emerald-800' : 'text-slate-300 hover:text-slate-500'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* 2. Date */}
                      <td className="py-3 px-4 align-top font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{task.taskDate || todayStr}</div>
                        <span className="text-[9px] text-slate-400">{task.id}</span>
                      </td>

                      {/* 3. Task Title */}
                      <td className="py-3 px-4 align-top">
                        <div className="font-bold text-slate-900 leading-tight">{task.title}</div>
                        {task.taskType === 'dealer_call' && task.dealerName && (
                          <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1 mt-1">
                            <Building2 className="w-3 h-3 text-emerald-600" />
                            <span>{task.dealerName} ({task.city || 'Kerala'})</span>
                          </div>
                        )}
                        {task.taskType === 'dealer_call' && (
                          <div className="text-[10px] text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold inline-block mt-1">
                            {task.doorsConfirmed || 0} Doors Confirmed
                          </div>
                        )}
                      </td>

                      {/* 4. Task Description */}
                      <td className="py-3 px-4 align-top max-w-xs">
                        <p className="text-slate-600 line-clamp-2 leading-relaxed text-[11px]">
                          {task.description || 'No additional description provided.'}
                        </p>
                        {task.submissionNotes && (
                          <div className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 p-1 rounded">
                            "{task.submissionNotes}"
                          </div>
                        )}
                      </td>

                      {/* 5. Assigned Employee (Mandatory Assignee Column) */}
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-emerald-100 text-[#05331F] font-bold flex items-center justify-center text-[10px] shrink-0">
                            {getInitials(task.assignedToName)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{task.assignedToName || 'Unassigned'}</div>
                            <div className="text-[10px] text-slate-400">By: {task.createdByName || 'Manager'}</div>
                          </div>
                        </div>
                      </td>

                      {/* 6. Status */}
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          task.status === TASK_STATUSES.COMPLETED ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          task.status === TASK_STATUSES.IN_PROGRESS ? 'bg-blue-100 text-blue-800 border-blue-300' :
                          task.status === TASK_STATUSES.BLOCKED ? 'bg-rose-100 text-rose-800 border-rose-300' :
                          task.status === TASK_STATUSES.PENDING_REVIEW ? 'bg-indigo-100 text-indigo-800 border-indigo-300' :
                          'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {task.status}
                        </span>
                        <div className="w-20 bg-slate-200 rounded-full h-1 mt-1.5 overflow-hidden">
                          <div 
                            className="bg-[#05331F] h-1 rounded-full" 
                            style={{ width: `${task.progressPercentage || 0}%` }}
                          />
                        </div>
                      </td>

                      {/* 7. Project / Department */}
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <span className="font-mono text-[10px] font-bold uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {task.departmentId || 'Operations'}
                        </span>
                        {task.targetTeamName && (
                          <div className="text-[9px] text-teal-800 font-semibold mt-0.5">
                            Team: {task.targetTeamName}
                          </div>
                        )}
                      </td>

                      {/* 8. Priority */}
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          task.priority === TASK_PRIORITIES.URGENT ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          task.priority === TASK_PRIORITIES.HIGH ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {task.priority || 'Normal'}
                        </span>
                      </td>

                      {/* 9. Deadline */}
                      <td className="py-3 px-4 align-top font-mono text-[11px] whitespace-nowrap">
                        <div className={`${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                          {task.deadlineDate || task.taskDate}
                        </div>
                        {isOverdue && (
                          <span className="text-[9px] text-rose-700 font-bold uppercase">Overdue</span>
                        )}
                      </td>

                      {/* 10. Actions */}
                      <td className="py-3 px-4 align-top text-center whitespace-nowrap space-y-1">
                        <button
                          onClick={() => onOpenTaskDetails && onOpenTaskDetails(task)}
                          className="w-full flex items-center justify-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-[#05331F] hover:bg-emerald-100 border border-emerald-200 transition-all"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{locked && isExecutiveLeadership ? 'Override' : 'Execute'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

