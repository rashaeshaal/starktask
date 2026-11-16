import React, { useState, useMemo } from 'react';
import { 
  Users, User, CheckCircle2, Clock, AlertTriangle, AlertCircle, 
  ShieldAlert, Calendar, ChevronLeft, ChevronRight, Filter, Search,
  CheckSquare, Square, Eye, Edit3, ArrowRight, TrendingUp, Layers,
  Building2, Briefcase, UserCheck, Shield, Phone, Mail, Award, Check,
  PlusCircle, Plus
} from 'lucide-react';
import { TASK_STATUSES, TASK_PRIORITIES, isTaskLockedForUser } from './rbac';
import { getTodayDateString, getDateOffset } from './dateUtils';
import { getReportees, ROLE_HIERARCHY_LEVELS } from './orgStructure';
import AddTodayWorkModal from './AddTodayWorkModal';

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
 * 6. "Add Today's Work" quick logger with immediate row reflection
 * 7. Clean display of logged-in user's name (no "Tasks assigned to undefined")
 * 8. Dynamic data from Firestore (Zero hardcoding, real-time metrics, duplicate prevention)
 * 9. Role-Based Visibility (Hierarchy-scoped: Executive/GM -> Dept Heads -> Supervisors -> Staff)
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

  // Modal State: "Add Today's Work"
  const [isAddTodayWorkModalOpen, setIsAddTodayWorkModalOpen] = useState(false);

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
        blocked: 0,
        todayCount: 0
      };
    });

    tasks.forEach(task => {
      const assigneeIds = Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0 
        ? task.assigneeIds 
        : (task.assignedToId || task.assignedTo) ? [task.assignedToId || task.assignedTo] : [];

      assigneeIds.forEach(empId => {
        if (stats[empId]) {
          stats[empId].total += 1;
          const taskDateVal = task.taskDate || task.date;
          if (taskDateVal === todayStr) stats[empId].todayCount += 1;
          if (task.status === TASK_STATUSES.COMPLETED) stats[empId].completed += 1;
          if (task.status === TASK_STATUSES.IN_PROGRESS) stats[empId].inProgress += 1;
          if (task.status === TASK_STATUSES.BLOCKED) stats[empId].blocked += 1;
          if (task.deadlineDate < todayStr && task.status !== TASK_STATUSES.COMPLETED) stats[empId].overdue += 1;
          if (task.status === TASK_STATUSES.ASSIGNED || task.status === TASK_STATUSES.ACCEPTED || task.status === TASK_STATUSES.PENDING_REVIEW) {
            stats[empId].pending += 1;
          }
        }
      });
    });

    return stats;
  }, [tasks, authorizedEmployees, todayStr]);

  // Overall Team Aggregations
  const overallTeamMetrics = useMemo(() => {
    let total = 0;
    let completed = 0;
    let pending = 0;
    let inProgress = 0;
    let overdue = 0;
    let blocked = 0;

    const countedTaskIds = new Set();

    tasks.forEach(task => {
      const isAuthorizedTask = authorizedEmployees.some(emp => 
        task.assignedToId === emp.id || 
        task.assignedTo === emp.id || 
        (Array.isArray(task.assigneeIds) && task.assigneeIds.includes(emp.id))
      );

      if (isAuthorizedTask && !countedTaskIds.has(task.id)) {
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

  // Active User Display Name Helper (Avoids "undefined")
  const currentDisplayName = currentUser?.fullName || currentUser?.name || currentUser?.email || 'You';

  // 4. Filter Tasks based on Active Tab, Date Filter, and Search
  const filteredTasks = useMemo(() => {
    const currentUserId = currentUser?.id || currentUser?.authUid || currentUser?.employeeId;

    return tasks.filter(task => {
      const taskAssigneeId = task.assignedToId || task.assignedTo;
      const taskAssigneeIds = Array.isArray(task.assigneeIds) ? task.assigneeIds : [];

      // 1. Tab Scope Filter
      if (activeTab === 'my_tasks') {
        const isMine = taskAssigneeId === currentUserId || taskAssigneeIds.includes(currentUserId);
        if (!isMine) return false;
      } else if (activeTab === 'whole_team') {
        const isAuthorized = authorizedEmployees.some(emp => 
          taskAssigneeId === emp.id || taskAssigneeIds.includes(emp.id)
        );
        if (!isAuthorized) return false;
      } else {
        // Specific Employee
        const isSelectedEmp = taskAssigneeId === activeTab || taskAssigneeIds.includes(activeTab);
        if (!isSelectedEmp) return false;
      }

      // 2. Date Filter
      const taskDateVal = task.date || task.taskDate || task.deadlineDate;
      if (dateFilter === 'today') {
        const matchesDate = taskDateVal === todayStr || task.deadlineDate === todayStr;
        if (!matchesDate) return false;
      } else if (dateFilter === 'yesterday') {
        const yesterdayStr = getDateOffset(-1);
        const matchesDate = taskDateVal === yesterdayStr || task.deadlineDate === yesterdayStr;
        if (!matchesDate) return false;
      } else if (dateFilter === 'custom' && selectedDate) {
        const matchesDate = taskDateVal === selectedDate || task.deadlineDate === selectedDate;
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
        const matchAssignee = (task.assignedEmployee || task.assignedToName || '').toLowerCase().includes(query);
        const matchDealer = (task.dealerName || '').toLowerCase().includes(query);
        const matchId = (task.id || '').toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchAssignee && !matchDealer && !matchId) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort: Today's newest first
      const dateA = a.date || a.taskDate || a.createdAt || '';
      const dateB = b.date || b.taskDate || b.createdAt || '';
      return dateB.localeCompare(dateA);
    });
  }, [tasks, activeTab, currentUser, authorizedEmployees, dateFilter, todayStr, selectedDate, statusFilter, priorityFilter, searchTerm]);

  // Handler for toggle complete directly from table
  const handleToggleTaskComplete = (task, e) => {
    e.stopPropagation();
    if (!onTaskUpdated) return;

    const locked = isTaskLockedForUser(currentUser, task);
    if (locked && !isExecutiveLeadership) {
      alert("This task is locked! Tasks from previous dates cannot be modified.");
      return;
    }

    const nextStatus = task.status === TASK_STATUSES.COMPLETED ? TASK_STATUSES.IN_PROGRESS : TASK_STATUSES.COMPLETED;
    const nextProgress = nextStatus === TASK_STATUSES.COMPLETED ? 100 : 50;

    onTaskUpdated({
      ...task,
      status: nextStatus,
      progressPercentage: nextProgress,
      auditAction: 'STATUS_TOGGLED',
      auditDetails: `Task marked as ${nextStatus}`
    });
  };

  // Helper for Initials
  const getInitials = (name) => {
    if (!name) return 'ST';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans select-none">
      
      {/* 1. HORIZONTAL TEAM MEMBER NAVIGATION TABS */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-2 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-1">
          
          {/* Tab 1: My Tasks */}
          <button
            onClick={() => setActiveTab('my_tasks')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'my_tasks'
                ? 'bg-[#05331F] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <span>My Tasks</span>
            {currentUser && employeeTaskStats[currentUser.id]?.total > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'my_tasks' ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-200 text-slate-700'
              }`}>
                {employeeTaskStats[currentUser.id].total}
              </span>
            )}
          </button>

          {/* Tab 2: Whole Team (Visible if permitted) */}
          {canViewTeam && (
            <button
              onClick={() => setActiveTab('whole_team')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'whole_team'
                  ? 'bg-[#05331F] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Whole Team</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'whole_team' ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-200 text-slate-700'
              }`}>
                {overallTeamMetrics.total}
              </span>
            </button>
          )}

          {/* Divider */}
          {canViewTeam && authorizedEmployees.length > 0 && (
            <div className="h-6 w-px bg-slate-200 shrink-0 mx-1" />
          )}

          {/* Individual Employee Tabs */}
          {canViewTeam && authorizedEmployees.map(emp => {
            const isSelf = emp.id === currentUser?.id;
            const stats = employeeTaskStats[emp.id] || { total: 0, overdue: 0 };
            const isActive = activeTab === emp.id;

            return (
              <button
                key={emp.id}
                onClick={() => setActiveTab(emp.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-semibold transition-all shrink-0 ${
                  isActive
                    ? 'bg-[#05331F] text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                  isActive ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-200 text-slate-700'
                }`}>
                  {getInitials(emp.fullName || emp.name)}
                </div>
                <span className="truncate max-w-[120px]">{emp.fullName || emp.name}</span>
                {isSelf && <span className="text-[9px] text-emerald-400 font-mono">(You)</span>}
                
                {stats.total > 0 && (
                  <span className={`text-[10px] font-mono px-1 rounded ${
                    isActive ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {stats.total}
                  </span>
                )}
                {stats.overdue > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title={`${stats.overdue} overdue tasks`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. ACTIVE VIEW DETAILS / METRICS */}
      {activeTab === 'whole_team' ? (
        // WHOLE TEAM AGGREGATE SUMMARY
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#05331F] bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Operational Workgroup
                </span>
                <span className="text-xs text-slate-400 font-mono">• {authorizedEmployees.length} Supervised Members</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">Whole Team Performance Dashboard</h2>
            </div>

            {/* Overall Rate Indicator */}
            <div className="flex items-center gap-3 self-start sm:self-auto bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200">
              <TrendingUp className="w-5 h-5 text-emerald-700" />
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Team Completion Rate</div>
                <div className="text-lg font-black font-mono text-[#05331F]">{overallTeamMetrics.completionRate}%</div>
              </div>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Assigned', val: overallTeamMetrics.total, color: 'text-slate-900', bg: 'bg-slate-50 border-slate-200' },
              { label: 'Completed', val: overallTeamMetrics.completed, color: 'text-emerald-800', bg: 'bg-emerald-50 border-emerald-200' },
              { label: 'In Progress', val: overallTeamMetrics.inProgress, color: 'text-blue-800', bg: 'bg-blue-50 border-blue-200' },
              { label: 'Pending Review', val: overallTeamMetrics.pending, color: 'text-amber-800', bg: 'bg-amber-50 border-amber-200' },
              { label: 'Overdue SLA', val: overallTeamMetrics.overdue, color: 'text-rose-800', bg: 'bg-rose-50 border-rose-200' },
              { label: 'Blocked Items', val: overallTeamMetrics.blocked, color: 'text-red-900', bg: 'bg-red-50 border-red-200' },
            ].map((m, idx) => (
              <div key={idx} className={`p-3.5 rounded-2xl border ${m.bg}`}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{m.label}</div>
                <div className={`text-xl font-black font-mono mt-0.5 ${m.color}`}>{m.val}</div>
              </div>
            ))}
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
                  { label: "Today's Tasks", val: stats.todayCount || 0, color: 'text-slate-900', bg: 'bg-slate-50 border-slate-200' },
                  { label: 'Completed', val: stats.completed, color: 'text-emerald-800', bg: 'bg-emerald-50 border-emerald-200' },
                  { label: 'In Progress', val: stats.inProgress, color: 'text-blue-800', bg: 'bg-blue-50 border-blue-200' },
                  { label: 'Pending Review', val: stats.pending, color: 'text-amber-800', bg: 'bg-amber-50 border-amber-200' },
                  { label: 'Overdue SLA', val: stats.overdue, color: 'text-rose-800', bg: 'bg-rose-50 border-rose-200' },
                  { label: 'Blocked Items', val: stats.blocked, color: 'text-red-900', bg: 'bg-red-50 border-red-200' },
                ].map((m, idx) => (
                  <div key={idx} className={`p-3 rounded-2xl border ${m.bg}`}>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{m.label}</div>
                    <div className={`text-xl font-black font-mono mt-0.5 ${m.color}`}>{m.val}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      ) : null}

      {/* 3. DAILY TASK SHEET TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Table Top Header with Date Nav, Add Today's Work Button, Search & Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Daily Task Sheet</span>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-semibold">
                  {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                {activeTab === 'whole_team' ? 'Consolidated view across all team members' : 
                 activeTab === 'my_tasks' ? `Tasks assigned to ${currentDisplayName}` : 
                 `Tasks assigned to ${selectedEmployee?.fullName || selectedEmployee?.name || currentDisplayName}`}
              </p>
            </div>

            {/* Right Controls: Date Navigator Ribbon + Add Today's Work Button */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              
              {/* PRIMARY ACTION BUTTON: "Add Today's Work" */}
              <button
                onClick={() => setIsAddTodayWorkModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#05331F] hover:bg-[#07472b] active:bg-[#032214] text-white text-xs font-bold transition shadow-2xs cursor-pointer shrink-0"
                title="Record what you accomplished today"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>Add Today's Work</span>
              </button>

              {/* Date Navigator Ribbon (Today / Yesterday / All Dates / Custom) */}
              <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 text-xs shrink-0">
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
                    <div className="max-w-xs mx-auto space-y-3">
                      <Clock className="w-8 h-8 mx-auto text-slate-300" />
                      <div>
                        <p className="font-semibold text-slate-700 text-xs">No matching tasks found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          There are no tasks recorded for this filter. You can log what you worked on right now.
                        </p>
                      </div>
                      <button
                        onClick={() => setIsAddTodayWorkModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472b] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Add Today's Work</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTasks.map(task => {
                  const isCompleted = task.status === TASK_STATUSES.COMPLETED;
                  const locked = isTaskLockedForUser(currentUser, task);
                  const isOverdue = task.deadlineDate < todayStr && !isCompleted;
                  const taskDateDisplay = task.date || task.taskDate || todayStr;

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
                        <div className="font-bold text-slate-800">{taskDateDisplay}</div>
                        <span className="text-[9px] text-slate-400">{task.id?.slice(0, 10)}</span>
                      </td>

                      {/* 3. Task Title */}
                      <td className="py-3 px-4 align-top">
                        <div className="font-bold text-slate-900 leading-tight flex items-center gap-1.5 flex-wrap">
                          <span>{task.title}</span>
                          {task.selfLogged && (
                            <span className="text-[9px] font-mono bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-200">
                              Self-Logged
                            </span>
                          )}
                        </div>
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
                            {getInitials(task.assignedEmployee || task.assignedToName)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{task.assignedEmployee || task.assignedToName || 'Unassigned'}</div>
                            <div className="text-[10px] text-slate-400">By: {task.createdByName || (task.selfLogged ? 'Self' : 'Manager')}</div>
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
                          {task.projectDept || task.departmentId || task.department || 'Operations'}
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
                          {task.deadlineDate || task.date || task.taskDate}
                        </div>
                        {isOverdue && (
                          <span className="text-[9px] text-rose-700 font-bold uppercase">Overdue</span>
                        )}
                      </td>

                      {/* 10. Actions */}
                      <td className="py-3 px-4 align-top text-center whitespace-nowrap space-y-1">
                        <button
                          onClick={() => onOpenTaskDetails && onOpenTaskDetails(task)}
                          className="w-full flex items-center justify-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-[#05331F] hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer"
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

      {/* 4. MODAL: ADD TODAY'S WORK */}
      <AddTodayWorkModal
        isOpen={isAddTodayWorkModalOpen}
        onClose={() => setIsAddTodayWorkModalOpen(false)}
        currentUser={currentUser}
        departments={departments}
        onTaskCreated={(newTask) => {
          // Immediately update parent state so task appears without needing reload
          if (onTaskUpdated) {
            onTaskUpdated(newTask);
          }
        }}
      />

    </div>
  );
}
