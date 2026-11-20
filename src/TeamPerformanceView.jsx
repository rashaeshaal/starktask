import React, { useState, useMemo } from 'react';
import { 
  Users, CheckCircle2, Clock, AlertTriangle, AlertCircle, 
  Search, Filter, ArrowUpDown, ChevronRight, X, Calendar, 
  TrendingUp, TrendingDown, Download, Award, ShieldAlert,
  Send, UserCheck, Flame, ExternalLink, BarChart2, Check, User
} from 'lucide-react';
import { TASK_STATUSES } from './rbac';
import { getTodayDateString, getDateOffset } from './dateUtils';
import { 
  getPerformanceScope, 
  getPerformanceVisibleEmployees, 
  isAllAccessPerformanceRole,
  SCOPES 
} from './permissions';
import { formatName, formatDepartment } from './orgHelpers';

/**
 * TeamPerformanceView (STARK STEEL SalesDoor Enterprise)
 * Dynamic Team Performance dashboard with real-time stats, 
 * dynamic Firestore departments & teams, real 14-day task-based heatmap,
 * Title Case formatting, and strict RBAC scopes.
 */
export default function TeamPerformanceView({
  employees = [],
  tasks = [],
  departments = [],
  teams = [],
  currentUser,
  onOpenAssignModal,
  onNavigateToTab,
  onOpenTaskDetails
}) {
  const perfScope = getPerformanceScope(currentUser);
  const isCompanyScope = perfScope === SCOPES.COMPANY;
  const isDeptScope = perfScope === SCOPES.DEPARTMENT;
  const isDownlineScope = perfScope === SCOPES.DOWNLINE;

  const todayStr = getTodayDateString();
  const yesterdayStr = getDateOffset(-1);

  const myId = String(currentUser?.id || currentUser?.uid || currentUser?.employeeId || '');

  // 1. In-Scope Employees strictly calculated by permissions layer
  const inScopeEmployees = useMemo(() => {
    return getPerformanceVisibleEmployees(currentUser, employees);
  }, [currentUser, employees]);

  const inScopeEmpIdSet = useMemo(() => {
    return new Set(inScopeEmployees.map(e => String(e.id || e.uid || e.employeeId)));
  }, [inScopeEmployees]);

  // Dynamic Departments list from Firestore or fallback
  const dynamicDepartments = useMemo(() => {
    if (departments && departments.length > 0) {
      return departments.map(d => ({
        id: String(d.id || d.slug || d.code || '').toLowerCase(),
        name: formatDepartment(d.name || d.label || d.id)
      }));
    }
    // Fallback if empty
    return [
      { id: 'sales', name: 'Sales' },
      { id: 'operations', name: 'Operations' },
      { id: 'hr_admin', name: 'HR & Admin' },
      { id: 'finance', name: 'Finance & Accounts' },
      { id: 'marketing', name: 'Marketing & Branding' },
      { id: 'purchase', name: 'Purchase' },
      { id: 'maintenance', name: 'Maintenance' },
      { id: 'warehouse', name: 'Warehouse & Logistics' }
    ];
  }, [departments]);

  // Period Control
  const [period, setPeriod] = useState('today'); // 'today' | 'yesterday' | 'week' | 'month' | 'custom'
  const [customStart, setCustomStart] = useState(getDateOffset(-7));
  const [customEnd, setCustomEnd] = useState(todayStr);

  // Quick Tab Filter
  const [quickTab, setQuickTab] = useState('all'); // 'all' | 'top' | 'attention'

  // Table Filters (Scope aware)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedTeamMember, setSelectedTeamMember] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'active' | 'completed' | 'overdue' | 'not_started'
  const [sortField, setSortField] = useState('completionRate');
  const [sortAsc, setSortAsc] = useState(false);

  // Selected Employee for Side Drawer (Must be in-scope)
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Title and subtitle matching scope
  const { titleText, subtitleText } = useMemo(() => {
    if (isCompanyScope) {
      return {
        titleText: 'Team Performance',
        subtitleText: 'All departments company-wide performance tracking'
      };
    }
    if (isDeptScope) {
      return {
        titleText: 'Team Performance',
        subtitleText: `Your department performance (${formatDepartment(currentUser?.department || 'Department')})`
      };
    }
    return {
      titleText: 'Team Performance',
      subtitleText: 'Your team and downline squad performance'
    };
  }, [isCompanyScope, isDeptScope, currentUser]);

  // Calculate Date Bounds
  const { startDate, endDate } = useMemo(() => {
    if (period === 'today') return { startDate: todayStr, endDate: todayStr };
    if (period === 'yesterday') return { startDate: yesterdayStr, endDate: yesterdayStr };
    if (period === 'week') return { startDate: getDateOffset(-7), endDate: todayStr };
    if (period === 'month') return { startDate: getDateOffset(-30), endDate: todayStr };
    return { startDate: customStart || todayStr, endDate: customEnd || todayStr };
  }, [period, todayStr, yesterdayStr, customStart, customEnd]);

  // Filter Tasks by Selected Period AND In-Scope Assignees
  const periodTasks = useMemo(() => {
    return tasks.filter(t => {
      const assignedId = String(t.assignedToId || t.assignedTo || '');
      if (!isCompanyScope && !inScopeEmpIdSet.has(assignedId)) {
        return false;
      }
      const taskDate = (t.taskDate || t.date || t.deadlineDate || t.createdAt || '').slice(0, 10);
      if (!taskDate) return true;
      return taskDate >= startDate && taskDate <= endDate;
    });
  }, [tasks, isCompanyScope, inScopeEmpIdSet, startDate, endDate]);

  // Aggregate stats per in-scope employee
  const employeePerformance = useMemo(() => {
    return inScopeEmployees.map(emp => {
      const empId = String(emp.id || emp.uid || emp.employeeId);
      const isSelf = empId === myId;
      
      // All period tasks for this specific employee
      const empTasks = periodTasks.filter(t => String(t.assignedToId || t.assignedTo) === empId);
      // All historical tasks for this employee (for the 14-day heatmap)
      const allEmpTasks = tasks.filter(t => String(t.assignedToId || t.assignedTo) === empId);

      const totalTasks = empTasks.length;
      const completedTasks = empTasks.filter(t => t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed').length;
      const pendingTasks = empTasks.filter(t => t.status === TASK_STATUSES.PENDING || t.status === 'Pending' || t.status === 'Assigned').length;
      const inProgressTasks = empTasks.filter(t => t.status === TASK_STATUSES.IN_PROGRESS || t.status === 'In Progress').length;
      
      const overdueTasks = empTasks.filter(t => {
        const isCompleted = t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed';
        const isOverdue = (t.deadlineDate && t.deadlineDate < todayStr) || t.status === TASK_STATUSES.OVERDUE || t.status === 'Overdue';
        return !isCompleted && isOverdue;
      }).length;

      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Dynamic On-time rate
      const onTimeCompleted = empTasks.filter(t => {
        const isCompleted = t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed';
        if (!isCompleted) return false;
        if (!t.deadlineDate) return true;
        const compDate = (t.lastUpdated || t.completedAt || t.deadlineDate).slice(0, 10);
        return compDate <= t.deadlineDate;
      }).length;
      const onTimeRate = completedTasks > 0 ? Math.round((onTimeCompleted / completedTasks) * 100) : (totalTasks === 0 ? 100 : 0);

      // Current Dynamic Live Status
      let liveStatus = 'not_started';
      if (completedTasks === totalTasks && totalTasks > 0) liveStatus = 'completed';
      else if (overdueTasks > 0) liveStatus = 'overdue';
      else if (inProgressTasks > 0 || completedTasks > 0) liveStatus = 'active';

      // Last activity
      let lastActivityTime = 'No recent activity';
      const sortedEmpTasks = [...empTasks].sort((a, b) => (b.lastUpdated || b.createdAt || '').localeCompare(a.lastUpdated || a.createdAt || ''));
      if (sortedEmpTasks.length > 0 && (sortedEmpTasks[0].lastUpdated || sortedEmpTasks[0].createdAt)) {
        lastActivityTime = sortedEmpTasks[0].lastUpdated || sortedEmpTasks[0].createdAt;
      }

      // Compute dynamic 14-day history for drawer heatmap
      const dailyHeatmap = Array.from({ length: 14 }).map((_, i) => {
        const dateStr = getDateOffset(i - 13);
        const dayTasks = allEmpTasks.filter(t => {
          const tDate = (t.taskDate || t.date || t.deadlineDate || t.createdAt || '').slice(0, 10);
          return tDate === dateStr;
        });
        const dayTotal = dayTasks.length;
        const dayDone = dayTasks.filter(t => t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed').length;
        const dayOverdue = dayTasks.filter(t => {
          const isDone = t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed';
          return !isDone && (dateStr < todayStr || t.status === 'Overdue');
        }).length;

        let statusType = 'none'; // 'none' | 'perfect' | 'partial' | 'overdue'
        if (dayTotal > 0) {
          if (dayDone === dayTotal) statusType = 'perfect';
          else if (dayOverdue > 0) statusType = 'overdue';
          else statusType = 'partial';
        }

        return {
          date: dateStr,
          dayNum: dateStr.slice(8),
          total: dayTotal,
          done: dayDone,
          statusType
        };
      });

      return {
        ...emp,
        id: empId,
        displayName: formatName(emp.fullName || emp.name || 'Employee'),
        displayDept: formatDepartment(emp.department || emp.departmentId || 'Operations'),
        isSelf,
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        overdueTasks,
        completionRate,
        onTimeRate,
        liveStatus,
        lastActivityTime,
        tasks: empTasks,
        dailyHeatmap
      };
    });
  }, [inScopeEmployees, periodTasks, tasks, todayStr, myId]);

  // Overall Summary Strip Metrics
  const summaryMetrics = useMemo(() => {
    let activeToday = 0;
    let notStarted = 0;
    let completedToday = 0;
    let totalOverdue = 0;

    employeePerformance.forEach(emp => {
      if (emp.liveStatus === 'active') activeToday += 1;
      if (emp.liveStatus === 'not_started') notStarted += 1;
      if (emp.liveStatus === 'completed') completedToday += 1;
      totalOverdue += emp.overdueTasks;
    });

    return {
      activeToday,
      notStarted,
      completedToday,
      totalOverdue,
      totalEmployees: employeePerformance.length
    };
  }, [employeePerformance]);

  // Filter & Sort In-Scope Employees
  const filteredEmployees = useMemo(() => {
    return employeePerformance.filter(emp => {
      // Quick tabs
      if (quickTab === 'top' && (emp.completionRate < 80 || emp.totalTasks === 0)) return false;
      if (quickTab === 'attention' && (emp.overdueTasks === 0 && emp.liveStatus !== 'not_started')) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (emp.displayName || '').toLowerCase().includes(q);
        const matchesDesignation = (emp.designation || '').toLowerCase().includes(q);
        const matchesDept = (emp.displayDept || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesignation && !matchesDept) return false;
      }

      // Department filter (Company Scope only)
      if (isCompanyScope && selectedDept !== 'all') {
        const empDept = (emp.department || emp.departmentId || '').toLowerCase();
        if (!empDept.includes(selectedDept.toLowerCase())) return false;
      }

      // Member/Leader filter (Non-company scope)
      if (!isCompanyScope && selectedTeamMember !== 'all') {
        if (emp.id !== selectedTeamMember) return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && emp.liveStatus !== selectedStatus) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      // Keep "You" row at the top if downline
      if (a.isSelf && !b.isSelf) return -1;
      if (!a.isSelf && b.isSelf) return 1;

      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'name') {
        valA = a.displayName || '';
        valB = b.displayName || '';
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [employeePerformance, quickTab, searchQuery, isCompanyScope, selectedDept, selectedTeamMember, selectedStatus, sortField, sortAsc]);

  // CSV Export helper (Uses strictly in-scope filtered data)
  const handleExportCSV = () => {
    const headers = ['Employee Name', 'Designation', 'Department', 'Status', 'Tasks Done', 'Total Tasks', 'Completion %', 'Overdue Count', 'On-Time %'];
    const rows = filteredEmployees.map(emp => [
      `"${emp.displayName}${emp.isSelf ? ' (You)' : ''}"`,
      `"${emp.designation || ''}"`,
      `"${emp.displayDept}"`,
      `"${emp.liveStatus}"`,
      emp.completedTasks,
      emp.totalTasks,
      `${emp.completionRate}%`,
      emp.overdueTasks,
      `${emp.onTimeRate}%`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `StarkSteel_Team_Performance_${period}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Safe handler to open employee drawer (strictly in-scope check)
  const handleOpenEmployeeDrawer = (emp) => {
    const empId = String(emp.id || emp.uid || emp.employeeId);
    if (!isCompanyScope && !inScopeEmpIdSet.has(empId)) {
      return;
    }
    setSelectedEmployee(emp);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{titleText}</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {isCompanyScope ? 'All Departments' : isDeptScope ? 'Your Department' : 'Your Team'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {subtitleText} {' \u00B7 '} {inScopeEmployees.length} personnel in your scope
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period selector */}
          <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-xs text-xs">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: 'This week' },
              { id: 'month', label: 'This month' },
              { id: 'custom', label: 'Custom' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-xl font-medium transition ${
                  period === p.id 
                    ? 'bg-[#05331F] text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {period === 'custom' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
          <Calendar className="w-4 h-4 text-emerald-700" />
          <span className="font-semibold text-slate-700">Custom Date Range:</span>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50"
          />
        </div>
      )}

      {/* Summary Strip (Calculated dynamically over in-scope employees) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Execution</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">{summaryMetrics.activeToday}</p>
          <p className="text-[11px] text-amber-600 font-medium mt-1">Currently progressing tasks</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Not Started</span>
            <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">{summaryMetrics.notStarted}</p>
          <p className="text-[11px] text-slate-400 mt-1">Zero tasks logged for period</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Completed All</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#10B981] mt-2">{summaryMetrics.completedToday}</p>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">100% finished tasks</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Overdue Tasks</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl sm:text-3xl font-bold mt-2 ${summaryMetrics.totalOverdue > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {summaryMetrics.totalOverdue}
          </p>
          <p className="text-[11px] text-rose-500 font-medium mt-1">Pending past deadline</p>
        </div>

      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Quick Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
            <button
              onClick={() => setQuickTab('all')}
              className={`px-3 py-1.5 rounded-xl font-medium transition ${
                quickTab === 'all' 
                  ? 'bg-[#05331F] text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All In Scope ({inScopeEmployees.length})
            </button>
            <button
              onClick={() => setQuickTab('top')}
              className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1 ${
                quickTab === 'top' 
                  ? 'bg-[#05331F] text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Top Performers</span>
            </button>
            <button
              onClick={() => setQuickTab('attention')}
              className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1 ${
                quickTab === 'attention' 
                  ? 'bg-[#05331F] text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Needs Attention</span>
            </button>
          </div>

          {/* Search & Scope-Aware Dynamic Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Search Input */}
            <div className="relative flex-1 sm:w-52">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#05331F]"
              />
            </div>

            {/* Dynamic Department Filter (Company Scope only) */}
            {isCompanyScope ? (
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 text-slate-700 cursor-pointer"
              >
                <option value="all">All Departments ({dynamicDepartments.length})</option>
                {dynamicDepartments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            ) : (
              /* Non-company scope sees Team/Member filter */
              <select
                value={selectedTeamMember}
                onChange={(e) => setSelectedTeamMember(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 text-slate-700 cursor-pointer"
              >
                <option value="all">All Squad Members ({inScopeEmployees.length})</option>
                {inScopeEmployees.map(emp => {
                  const empId = String(emp.id || emp.uid || emp.employeeId);
                  const isSelf = empId === myId;
                  return (
                    <option key={empId} value={empId}>
                      {formatName(emp.fullName || emp.name)} {isSelf ? '(You)' : ''}
                    </option>
                  );
                })}
              </select>
            )}

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 text-slate-700 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Execution</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
              <option value="not_started">Not Started</option>
            </select>

          </div>

        </div>
      </div>

      {/* Employees Table (Desktop) & Stacked Cards (Mobile) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredEmployees.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No personnel found in this scope/filter.</p>
            <p className="text-xs text-slate-400">Try adjusting your search criteria or date filter.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4 cursor-pointer hover:text-slate-900" onClick={() => toggleSort('name')}>
                      <div className="flex items-center gap-1">
                        <span>Employee</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4">Role & Department</th>
                    <th className="py-3 px-4 text-center">Live Status</th>
                    <th className="py-3 px-4 text-center cursor-pointer hover:text-slate-900" onClick={() => toggleSort('completedTasks')}>
                      <div className="flex items-center justify-center gap-1">
                        <span>Tasks Done</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center cursor-pointer hover:text-slate-900" onClick={() => toggleSort('overdueTasks')}>
                      <div className="flex items-center justify-center gap-1">
                        <span>Overdue</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center cursor-pointer hover:text-slate-900" onClick={() => toggleSort('completionRate')}>
                      <div className="flex items-center justify-center gap-1">
                        <span>Completion %</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center cursor-pointer hover:text-slate-900" onClick={() => toggleSort('onTimeRate')}>
                      <div className="flex items-center justify-center gap-1">
                        <span>On-Time %</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((emp) => (
                    <tr 
                      key={emp.id}
                      onClick={() => handleOpenEmployeeDrawer(emp)}
                      className={`hover:bg-slate-50/80 cursor-pointer transition ${
                        emp.isSelf ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            emp.isSelf ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {(emp.displayName || 'EM').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{emp.displayName}</span>
                              {emp.isSelf && (
                                <span className="text-[10px] bg-[#05331F] text-white px-1.5 py-0.2 rounded font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-normal">{emp.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{emp.designation || emp.role}</div>
                        <div className="text-[11px] text-slate-500">{emp.displayDept}</div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          emp.liveStatus === 'completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          emp.liveStatus === 'active' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          emp.liveStatus === 'overdue' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                          'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                          {emp.liveStatus === 'completed' ? 'All Complete' :
                           emp.liveStatus === 'active' ? 'In Progress' :
                           emp.liveStatus === 'overdue' ? 'Overdue' : 'Not Started'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {emp.completedTasks} / {emp.totalTasks}
                      </td>

                      <td className="py-3 px-4 text-center font-bold">
                        {emp.overdueTasks > 0 ? (
                          <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{emp.overdueTasks}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1 font-bold text-slate-900">
                          <span>{emp.completionRate}%</span>
                        </div>
                        <div className="w-16 bg-slate-100 h-1 rounded-full mx-auto mt-1 overflow-hidden">
                          <div className="bg-[#05331F] h-full" style={{ width: `${emp.completionRate}%` }} />
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-semibold text-slate-700">
                        {emp.onTimeRate}%
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEmployeeDrawer(emp);
                          }}
                          className="px-2.5 py-1 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg font-semibold"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards View */}
            <div className="block md:hidden divide-y divide-slate-100 p-3 space-y-3">
              {filteredEmployees.map((emp) => (
                <div 
                  key={emp.id}
                  onClick={() => handleOpenEmployeeDrawer(emp)}
                  className={`p-3.5 rounded-xl border border-slate-200 space-y-2.5 ${
                    emp.isSelf ? 'bg-emerald-50/30' : 'bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        emp.isSelf ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {(emp.displayName || 'EM').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1">
                          <span>{emp.displayName}</span>
                          {emp.isSelf && (
                            <span className="text-[9px] bg-[#05331F] text-white px-1.5 py-0.2 rounded font-bold">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">{emp.designation}</p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      emp.liveStatus === 'completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      emp.liveStatus === 'active' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                      emp.liveStatus === 'overdue' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                      'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      {emp.liveStatus === 'completed' ? 'Complete' :
                       emp.liveStatus === 'active' ? 'Active' :
                       emp.liveStatus === 'overdue' ? 'Overdue' : 'Not Started'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400">Tasks</span>
                      <p className="font-bold text-slate-800">{emp.completedTasks}/{emp.totalTasks}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Done %</span>
                      <p className="font-bold text-[#05331F]">{emp.completionRate}%</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Overdue</span>
                      <p className={`font-bold ${emp.overdueTasks > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        {emp.overdueTasks}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Employee Details Side Drawer (Opens only for in-scope employees, full-screen on mobile) */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="w-full sm:max-w-lg h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-800 font-bold flex items-center justify-center border border-emerald-200">
                  {(selectedEmployee.displayName || 'EM').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{selectedEmployee.displayName}</span>
                    {selectedEmployee.isSelf && (
                      <span className="text-[10px] bg-[#05331F] text-white px-2 py-0.5 rounded font-bold">
                        You
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">{selectedEmployee.designation} {' \u00B7 '} {selectedEmployee.displayDept}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedEmployee(null)} 
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Close details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-xs">
              
              {/* Top Metrics Strip */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400">Total Tasks</span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">{selectedEmployee.totalTasks}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400">Completed</span>
                  <p className="text-lg font-bold text-[#10B981] mt-0.5">{selectedEmployee.completedTasks}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400">Overdue</span>
                  <p className="text-lg font-bold text-rose-600 mt-0.5">{selectedEmployee.overdueTasks}</p>
                </div>
              </div>

              {/* Real Dynamic 14-Day Calendar Heatmap */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                    14-Day Performance Heatmap
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span> 100%</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Partial</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span> Overdue</span>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5 pt-1">
                  {(selectedEmployee.dailyHeatmap || []).map((day) => {
                    const isToday = day.date === todayStr;
                    
                    let bgStyle = "bg-white border-slate-200 text-slate-700";
                    let badgeText = "—";
                    
                    if (day.statusType === 'perfect') {
                      bgStyle = isToday 
                        ? "bg-[#05331F] text-white border-[#05331F]" 
                        : "bg-emerald-600 text-white border-emerald-700";
                      badgeText = `${day.done}/${day.total}`;
                    } else if (day.statusType === 'overdue') {
                      bgStyle = "bg-rose-50 text-rose-700 border-rose-300";
                      badgeText = `${day.done}/${day.total}`;
                    } else if (day.statusType === 'partial') {
                      bgStyle = "bg-amber-50 text-amber-700 border-amber-300";
                      badgeText = `${day.done}/${day.total}`;
                    } else if (isToday) {
                      bgStyle = "bg-slate-100 border-slate-300 text-slate-900 font-semibold";
                    }

                    return (
                      <div 
                        key={day.date} 
                        className={`p-2 rounded-lg text-center border transition ${bgStyle}`}
                        title={`${day.date}: ${day.total > 0 ? `${day.done}/${day.total} tasks completed` : 'No tasks'}`}
                      >
                        <span className="block text-[9px] opacity-75">{day.dayNum}</span>
                        <span className="block font-bold text-[10px] truncate">{badgeText}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tasks List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                    Tasks for Selected Period ({selectedEmployee.tasks?.length || 0})
                  </p>
                  {onOpenAssignModal && !selectedEmployee.isSelf && (
                    <button
                      onClick={() => {
                        onOpenAssignModal({
                          memberId: selectedEmployee.id,
                          memberName: selectedEmployee.displayName,
                          department: selectedEmployee.department
                        });
                        setSelectedEmployee(null);
                      }}
                      className="text-xs font-semibold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>Assign Task</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {(selectedEmployee.tasks || []).length === 0 ? (
                    <div className="py-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      No tasks assigned for this timeframe.
                    </div>
                  ) : (
                    selectedEmployee.tasks.map(t => (
                      <div 
                        key={t.id} 
                        onClick={() => {
                          if (onOpenTaskDetails) onOpenTaskDetails(t);
                          setSelectedEmployee(null);
                        }}
                        className="p-3 bg-white hover:bg-slate-50/80 border border-slate-200 rounded-xl cursor-pointer transition space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-900 text-xs truncate max-w-[240px]">{t.title}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                            t.status === 'Completed' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                          }`}>
                            {t.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{t.description}</p>
                        <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                          <span>Deadline: {t.deadlineDate || 'None'}</span>
                          <span>Priority: {t.priority || 'Medium'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-[11px] text-slate-500">
                Last activity: {selectedEmployee.lastActivityTime}
              </span>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
