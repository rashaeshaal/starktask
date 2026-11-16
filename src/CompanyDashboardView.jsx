import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, Clock, AlertTriangle, Layers, ArrowRight, 
  Search, Eye, ChevronDown, Check, ArrowUpRight, BarChart2,
  Calendar, CheckSquare, Plus, AlertCircle, TrendingUp, TrendingDown,
  Package, Users, Briefcase, UserCheck
} from 'lucide-react';
import { TASK_STATUSES } from './rbac';
import { getTodayDateString, getDateOffset } from './dateUtils';
import { COMPANY_DEPARTMENTS } from './orgTree';
import { 
  getScope, 
  getVisibleUserIds, 
  canAccess,
  SCOPES, 
  PAGES 
} from './permissions';
import { canAccessSales, filterBookingsByScope } from './salesPermissions';

function getGreeting(name) {
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const rawFirst = (name || '').trim().split(' ')[0] || 'Team';
  const formattedName = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1).toLowerCase();
  return `${timeGreeting}, ${formattedName}`;
}

export default function CompanyDashboardView({ 
  tasks = [], 
  currentUser,
  departments = [],
  employees = [],
  teams = [],
  todos = [],
  bookings = [],
  onNavigateToTab,
  onOpenTaskDetails,
  onOpenAssignModal,
  onQuickAddTodo,
  onToggleTodoDone
}) {
  const todayStr = getTodayDateString();
  const yesterdayStr = getDateOffset(-1);
  const [dashQuickTodo, setDashQuickTodo] = useState('');

  const scope = getScope(currentUser);
  const isSales = canAccessSales(currentUser);

  // 1. Get visible user IDs according to RBAC scope
  const visibleUserIds = useMemo(() => {
    return getVisibleUserIds(currentUser, employees);
  }, [currentUser, employees]);

  // 2. Filter tasks strictly by visible user IDs
  const scopedTasks = useMemo(() => {
    if (scope === SCOPES.COMPANY) {
      return tasks;
    }
    const idSet = new Set(visibleUserIds.map(String));
    return tasks.filter(t => {
      const assignedId = String(t.assignedToId || t.assignedTo || '');
      const createdId = String(t.createdById || t.createdBy || '');
      return idSet.has(assignedId) || idSet.has(createdId);
    });
  }, [tasks, scope, visibleUserIds]);

  // Filter tasks: Today vs Yesterday
  const todayTasks = useMemo(() => {
    return scopedTasks.filter(t => (t.taskDate || t.deadlineDate || t.createdAt || '').startsWith(todayStr));
  }, [scopedTasks, todayStr]);

  const yesterdayTasks = useMemo(() => {
    return scopedTasks.filter(t => (t.taskDate || t.deadlineDate || t.createdAt || '').startsWith(yesterdayStr));
  }, [scopedTasks, yesterdayStr]);

  // Overall KPIs
  const totalTasksToday = todayTasks.length;
  const completedToday = todayTasks.filter(t => t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed').length;
  const pendingToday = todayTasks.filter(t => t.status === TASK_STATUSES.PENDING || t.status === 'Pending' || t.status === TASK_STATUSES.IN_PROGRESS).length;
  const overdueToday = todayTasks.filter(t => {
    const isDone = t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed';
    const isOvd = (t.deadlineDate && t.deadlineDate < todayStr) || t.status === TASK_STATUSES.OVERDUE || t.status === 'Overdue';
    return !isDone && isOvd;
  }).length;

  const yesterdayTotal = yesterdayTasks.length;
  const yesterdayCompleted = yesterdayTasks.filter(t => t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed').length;
  const yesterdayPending = yesterdayTasks.filter(t => t.status === TASK_STATUSES.PENDING || t.status === 'Pending' || t.status === TASK_STATUSES.IN_PROGRESS).length;

  const totalDiff = totalTasksToday - yesterdayTotal;
  const completedDiff = completedToday - yesterdayCompleted;
  const pendingDiff = pendingToday - yesterdayPending;

  const completionPct = totalTasksToday > 0 ? Math.round((completedToday / totalTasksToday) * 100) : 0;

  // Sub-label matching scope
  const scopeKpiLabel = useMemo(() => {
    if (scope === SCOPES.COMPANY) return 'Across the company';
    if (scope === SCOPES.DEPARTMENT) return 'Your department';
    if (scope === SCOPES.DOWNLINE) return 'Your squad';
    return 'Assigned to you';
  }, [scope]);

  // Department cards (for COMPANY SCOPE only, 10 operational depts, excluding management)
  const departmentStats = useMemo(() => {
    if (scope !== SCOPES.COMPANY) return [];

    const operationalDepts = COMPANY_DEPARTMENTS.filter(d => d.id !== 'management');

    return operationalDepts.map(dept => {
      // Find real head
      const deptEmployees = employees.filter(e => {
        const d = (e.department || e.departmentId || '').toLowerCase();
        return d.includes(dept.id.toLowerCase()) || d.includes(dept.name.toLowerCase());
      });

      const headEmp = deptEmployees.find(e => {
        const r = (e.role || e.designation || '').toLowerCase();
        return r.includes('head') || r.includes('manager') || r.includes('officer') || r.includes('supervisor');
      });

      const realHeadName = headEmp ? (headEmp.fullName || headEmp.name) : '';

      const deptTasks = tasks.filter(t => {
        const d = (t.departmentId || t.department || '').toLowerCase();
        return d.includes(dept.id.toLowerCase()) || d.includes(dept.name.toLowerCase());
      });

      const todayDeptTasks = deptTasks.filter(t => (t.taskDate || t.deadlineDate || t.createdAt || '').startsWith(todayStr));
      const total = todayDeptTasks.length;
      const completed = todayDeptTasks.filter(t => t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed').length;
      const overdue = todayDeptTasks.filter(t => {
        const isDone = t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed';
        const isOvd = (t.deadlineDate && t.deadlineDate < todayStr) || t.status === TASK_STATUSES.OVERDUE || t.status === 'Overdue';
        return !isDone && isOvd;
      }).length;

      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        ...dept,
        headName: realHeadName,
        total,
        completed,
        overdue,
        rate
      };
    });
  }, [scope, employees, tasks, todayStr]);

  // Department Team cards (for DEPARTMENT SCOPE)
  const departmentTeamStats = useMemo(() => {
    if (scope !== SCOPES.DEPARTMENT) return [];
    const userDept = (currentUser.department || currentUser.departmentId || '').toLowerCase();

    const deptTeams = teams.filter(tm => {
      const td = (tm.departmentId || tm.department || '').toLowerCase();
      return td.includes(userDept);
    });

    return deptTeams.map(tm => {
      const teamTasks = scopedTasks.filter(t => t.teamId === tm.id || (t.assignedToName && (tm.memberNames || []).includes(t.assignedToName)));
      const todayTeamTasks = teamTasks.filter(t => (t.taskDate || t.deadlineDate || t.createdAt || '').startsWith(todayStr));
      const total = todayTeamTasks.length;
      const completed = todayTeamTasks.filter(t => t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed').length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        ...tm,
        total,
        completed,
        rate
      };
    });
  }, [scope, currentUser, teams, scopedTasks, todayStr]);

  // Squad table members (for DOWNLINE SCOPE)
  const squadMembersStats = useMemo(() => {
    if (scope !== SCOPES.DOWNLINE) return [];
    
    const myId = String(currentUser.id || currentUser.uid || currentUser.employeeId);
    const downlineEmp = employees.filter(e => {
      const eId = String(e.id || e.uid || e.employeeId);
      return eId !== myId && visibleUserIds.includes(eId);
    });

    return downlineEmp.map(emp => {
      const empId = String(emp.id || emp.uid || emp.employeeId);
      const empTasks = tasks.filter(t => String(t.assignedToId || t.assignedTo) === empId);
      const todayEmpTasks = empTasks.filter(t => (t.taskDate || t.deadlineDate || t.createdAt || '').startsWith(todayStr));
      const total = todayEmpTasks.length;
      const done = todayEmpTasks.filter(t => t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed').length;
      const ovd = todayEmpTasks.filter(t => {
        const isCompleted = t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed';
        return !isCompleted && ((t.deadlineDate && t.deadlineDate < todayStr) || t.status === 'Overdue');
      }).length;

      return {
        id: empId,
        name: emp.fullName || emp.name,
        designation: emp.designation || emp.role || 'Staff',
        total,
        done,
        ovd,
        status: ovd > 0 ? 'Needs Attention' : total > 0 && done === total ? 'All Complete' : total > 0 ? 'In Progress' : 'No Tasks'
      };
    });
  }, [scope, currentUser, employees, visibleUserIds, tasks, todayStr]);

  // Frontline Next Deadlines (for SELF SCOPE)
  const myNextDeadlines = useMemo(() => {
    if (scope !== SCOPES.SELF) return [];
    return scopedTasks
      .filter(t => t.status !== TASK_STATUSES.COMPLETED && t.status !== 'Completed')
      .sort((a, b) => (a.deadlineDate || '').localeCompare(b.deadlineDate || ''))
      .slice(0, 5);
  }, [scope, scopedTasks]);

  // Open To-Dos
  const openTodos = useMemo(() => {
    return todos.filter(t => !t.done).slice(0, 5);
  }, [todos]);

  // Recent 6 Activity Events
  const recentActivities = useMemo(() => {
    return [...scopedTasks]
      .filter(t => t.lastUpdated || t.createdAt)
      .sort((a, b) => (b.lastUpdated || b.createdAt || '').localeCompare(a.lastUpdated || a.createdAt || ''))
      .slice(0, 6);
  }, [scopedTasks]);

  const handleDashQuickSubmit = (e) => {
    e.preventDefault();
    if (!dashQuickTodo.trim()) return;
    if (onQuickAddTodo) {
      onQuickAddTodo(dashQuickTodo.trim());
      setDashQuickTodo('');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Clean Greeting Header with Role */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {getGreeting(currentUser?.fullName || currentUser?.name || 'User')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            {' \u00B7 '}
            <span className="font-semibold text-slate-700">{currentUser?.role || 'Staff'}</span>
            {' \u00B7 '}
            <span className="capitalize text-emerald-800 font-medium">({scope} scope)</span>
          </p>
        </div>
      </div>

      {/* 2. Unified KPI Cards (Total, Completed, Pending, Overdue) Computed over visibleUserIds */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Tasks */}
        <div 
          onClick={() => onNavigateToTab && onNavigateToTab('my_tasks')} 
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Tasks</span>
            <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{totalTasksToday}</span>
            {scope === SCOPES.COMPANY && (
              <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${totalDiff >= 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                {totalDiff >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{totalDiff >= 0 ? `+${totalDiff}` : totalDiff} vs yesterday</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{scopeKpiLabel}</p>
        </div>

        {/* Completed */}
        <div 
          onClick={() => onNavigateToTab && onNavigateToTab('my_tasks')} 
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Completed</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{completedToday}</span>
            {scope === SCOPES.COMPANY && (
              <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${completedDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {completedDiff >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{completedDiff >= 0 ? `+${completedDiff}` : completedDiff} vs yesterday</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">{completionPct}% finished today</p>
        </div>

        {/* Pending / In Progress */}
        <div 
          onClick={() => onNavigateToTab && onNavigateToTab('my_tasks')} 
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending / In Progress</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{pendingToday}</span>
            {scope === SCOPES.COMPANY && (
              <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${pendingDiff <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {pendingDiff >= 0 ? `+${pendingDiff}` : pendingDiff} vs yesterday
              </span>
            )}
          </div>
          <p className="text-[11px] text-amber-600 font-medium mt-1">Active execution</p>
        </div>

        {/* Overdue */}
        <div 
          onClick={() => onNavigateToTab && onNavigateToTab('my_tasks')} 
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Overdue</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-bold ${overdueToday > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {overdueToday}
            </span>
          </div>
          <p className="text-[11px] text-rose-500 font-medium mt-1">Requires follow-up</p>
        </div>

      </div>

      {/* 3. Scope-Appropriate Middle Block */}

      {/* CASE A: COMPANY SCOPE -> 10 Department Cards */}
      {scope === SCOPES.COMPANY && departmentStats.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Department Status</h2>
              <p className="text-xs text-slate-500">
                Live throughput across all 10 company departments
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab && onNavigateToTab('team_performance')}
              className="text-xs font-semibold text-[#05331F] hover:underline flex items-center gap-1"
            >
              <span>View team performance</span>
              <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {departmentStats.map(dept => (
              <div 
                key={dept.id}
                onClick={() => onNavigateToTab && onNavigateToTab('team_performance')}
                className="p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 hover:border-slate-300 cursor-pointer transition relative group"
              >
                {dept.overdue > 0 && (
                  <span 
                    title={`${dept.overdue} overdue task(s)`}
                    className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse"
                  />
                )}

                <p className="text-xs font-bold text-slate-900 truncate">{dept.name}</p>
                {dept.headName ? (
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{dept.headName}</p>
                ) : null}

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{dept.completed} / {dept.total}</span>
                  <span className="text-[11px] font-bold text-[#05331F]">{dept.rate}%</span>
                </div>

                <div className="w-full bg-slate-200 h-1 rounded-full mt-1.5 overflow-hidden">
                  <div 
                    className={`h-full ${dept.rate === 100 ? 'bg-[#10B981]' : 'bg-[#05331F]'}`}
                    style={{ width: `${dept.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CASE B: DEPARTMENT SCOPE -> Team Cards */}
      {scope === SCOPES.DEPARTMENT && departmentTeamStats.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Department Squads</h2>
              <p className="text-xs text-slate-500">Live throughput for teams in your department</p>
            </div>
            <button
              onClick={() => onNavigateToTab && onNavigateToTab('teams')}
              className="text-xs font-semibold text-[#05331F] hover:underline"
            >
              Manage Teams
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {departmentTeamStats.map(tm => (
              <div key={tm.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <p className="text-xs font-bold text-slate-900">{tm.name}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">{tm.completed} / {tm.total} Done</span>
                  <span className="font-bold text-[#05331F]">{tm.rate}%</span>
                </div>
                <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                  <div className="bg-[#05331F] h-full" style={{ width: `${tm.rate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CASE C: DOWNLINE SCOPE -> Squad Table */}
      {scope === SCOPES.DOWNLINE && squadMembersStats.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Your Squad Performance</h2>
              <p className="text-xs text-slate-500">Today's direct downline task execution</p>
            </div>
            {canAccess(currentUser, PAGES.TEAM_PERFORMANCE) && (
              <button
                onClick={() => onNavigateToTab && onNavigateToTab('team_performance')}
                className="text-xs font-semibold text-[#05331F] hover:underline flex items-center gap-1"
              >
                <span>View team performance</span>
                <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Designation</th>
                  <th className="py-2.5 px-3 text-center">Today's Tasks</th>
                  <th className="py-2.5 px-3 text-center">Overdue</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {squadMembersStats.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{m.name}</td>
                    <td className="py-2.5 px-3 text-slate-500">{m.designation}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700">{m.done} / {m.total}</td>
                    <td className="py-2.5 px-3 text-center">
                      {m.ovd > 0 ? (
                        <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{m.ovd}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        m.status === 'All Complete' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        m.status === 'Needs Attention' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                        m.status === 'In Progress' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Two-Column Row: My To-Dos & Recent Activity (or Next Deadlines for Self Scope) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Compact "My To-Dos" Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">My To-Dos</h3>
              </div>
              <button 
                onClick={() => onNavigateToTab && onNavigateToTab('todos')}
                className="text-xs text-[#05331F] font-semibold hover:underline"
              >
                View all ({todos.filter(t => !t.done).length})
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {openTodos.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No pending to-dos. You're all caught up!
                </div>
              ) : (
                openTodos.map(todo => (
                  <div key={todo.id} className="py-2.5 flex items-start gap-2.5 group">
                    <button
                      onClick={() => onToggleTodoDone && onToggleTodoDone(todo.id, !todo.done)}
                      className="mt-0.5 w-4 h-4 rounded-md border border-slate-300 hover:border-emerald-700 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      {todo.done && <Check className="w-3 h-3 text-emerald-700" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-800 font-medium truncate">{todo.title}</p>
                      {todo.dueAtDate && (
                        <p className="text-[10px] text-slate-400">
                          Due: {todo.dueAtDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Add To-Do Input */}
          <form onSubmit={handleDashQuickSubmit} className="pt-3 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              placeholder="+ Add a quick to-do..."
              value={dashQuickTodo}
              onChange={(e) => setDashQuickTodo(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#05331F]"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-[#05331F] hover:bg-[#07472B] text-white text-xs font-semibold rounded-xl"
            >
              Add
            </button>
          </form>
        </div>

        {/* Right Card: Next Deadlines (for Self) OR Recent Activity (for Others) */}
        {scope === SCOPES.SELF ? (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">Upcoming Task Deadlines</h3>
              </div>
              <button 
                onClick={() => onNavigateToTab && onNavigateToTab('my_tasks')}
                className="text-xs text-[#05331F] font-semibold hover:underline"
              >
                Open Daily Sheet
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {myNextDeadlines.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No upcoming deadlines pending.
                </div>
              ) : (
                myNextDeadlines.map(t => (
                  <div key={t.id} onClick={() => onOpenTaskDetails && onOpenTaskDetails(t)} className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 p-1.5 rounded-lg transition">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-slate-800 truncate">{t.title}</p>
                      <p className="text-[10px] text-slate-400">Priority: {t.priority || 'Medium'}</p>
                    </div>
                    <span className="text-[11px] font-bold text-[#05331F] shrink-0 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      {t.deadlineDate || 'Today'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">Recent Operational Activity</h3>
              </div>
              <button 
                onClick={() => onNavigateToTab && onNavigateToTab('my_tasks')}
                className="text-xs text-[#05331F] font-semibold hover:underline"
              >
                View all tasks
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentActivities.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No recent task activity recorded yet.
                </div>
              ) : (
                recentActivities.map(task => (
                  <div 
                    key={task.id}
                    onClick={() => onOpenTaskDetails && onOpenTaskDetails(task)}
                    className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 p-1.5 rounded-lg transition"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-xs font-semibold text-slate-800 truncate">{task.title}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {task.assignedToName || 'Unassigned'} {' \u00B7 '} {task.departmentId || task.department || 'Operations'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        task.status === TASK_STATUSES.COMPLETED || task.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : task.status === 'Blocked'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
