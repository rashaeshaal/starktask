import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, Clock, AlertTriangle, Layers, ArrowRight, 
  Search, Eye, Filter, ChevronDown, PackageCheck, Truck,
  ShieldCheck, AlertCircle, DollarSign, Calendar
} from 'lucide-react';
import { TASK_STATUSES, TASK_PRIORITIES } from './rbac';
import { getTodayDateString } from './dateUtils';
import { SOP_CONSTANTS } from './sopRules';

// Relative time helper
function formatRelativeTime(dateString) {
  if (!dateString) return 'Just now';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // If it's "YYYY-MM-DD HH:MM:SS" or similar
      const parts = String(dateString).split(' ');
      if (parts[0] && parts[0].includes('-')) {
        const d = new Date(parts[0]);
        if (!isNaN(d.getTime())) return parts[0];
      }
      return String(dateString);
    }
    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

// Greeting helper
function getGreeting(name) {
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (name || '').trim().split(' ')[0] || 'Team';
  // Capitalize nicely
  const formattedName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  return `${timeGreeting}, ${formattedName}`;
}

export default function CompanyDashboardView({ 
  tasks = [], 
  departments = [], 
  employees = [], 
  currentUser,
  onNavigateToTab,
  onOpenTaskDetails
}) {
  const todayStr = getTodayDateString();

  // Role categorization
  const isExecutive = currentUser?.role === 'Executive Director';
  const isGM = currentUser?.role === 'Director Operations' || currentUser?.role === 'General Manager';
  const isLeadership = isExecutive || isGM;
  const isDeptHead = ['HR Manager', 'Accounts Manager', 'Operations Head', 'CSO', 'Brand Manager', 'Transport Manager', 'Service Manager', 'Warehouse In-charge'].includes(currentUser?.role);
  const userDept = currentUser?.department || 'operations';

  // State: Department Performance list expand
  const [showAllDepartments, setShowAllDepartments] = useState(false);

  // State: Recent Tasks filtering & search
  const [taskFilterChip, setTaskFilterChip] = useState('all'); // 'all' | 'mine' | 'overdue'
  const [taskDropdownFilter, setTaskDropdownFilter] = useState('none'); // 'none' | 'today' | 'in_progress' | 'pending_approval' | 'blocked'
  const [taskSearch, setTaskSearch] = useState('');

  // 1. Role-Accessible Tasks
  const accessibleTasks = useMemo(() => {
    if (isLeadership) return tasks;
    if (isDeptHead) return tasks.filter(t => t.departmentId === userDept || t.department === userDept);
    return tasks.filter(t => t.assignedToId === currentUser?.id || (Array.isArray(t.assigneeIds) && t.assigneeIds.includes(currentUser?.id)));
  }, [tasks, isLeadership, isDeptHead, userDept, currentUser]);

  // 2. Four Primary KPI Counts
  const totalTasks = accessibleTasks.length;
  const completedTasks = accessibleTasks.filter(t => t.status === TASK_STATUSES.COMPLETED).length;
  const pendingTasks = accessibleTasks.filter(t => 
    t.status === TASK_STATUSES.ASSIGNED || 
    t.status === TASK_STATUSES.ACCEPTED || 
    t.status === TASK_STATUSES.PENDING_REVIEW ||
    t.status === TASK_STATUSES.IN_PROGRESS
  ).length;
  const overdueTasks = accessibleTasks.filter(t => t.deadlineDate < todayStr && t.status !== TASK_STATUSES.COMPLETED).length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 3. Today's Operations Section (Shown for operations, warehouse, sales, admin; hidden for HR)
  const isHRUser = currentUser?.department === 'hr' || 
                   currentUser?.department === 'hr_admin' || 
                   (currentUser?.role && currentUser.role.toLowerCase().includes('hr'));
  const canViewOperations = !isHRUser;

  const todayOrders = useMemo(() => {
    return tasks.filter(t => t.taskDate === todayStr || t.deadlineDate === todayStr || t.taskType === 'stark_door_order');
  }, [tasks, todayStr]);

  const totalDoorsLoaded = useMemo(() => {
    return todayOrders.reduce((sum, t) => sum + Number(t.doorsLoadedCount || (t.isLoaded ? t.quantity : 0) || 0), 0);
  }, [todayOrders]);

  const targetDoors = SOP_CONSTANTS.DAILY_LOADING_TARGET || 70;
  const targetPercent = Math.min(100, Math.round((totalDoorsLoaded / targetDoors) * 100));

  const doorsPicked = useMemo(() => {
    return todayOrders.filter(t => t.warehousePicked || t.sopStage === 'WAREHOUSE_PICKING' || t.doorsLoadedCount > 0)
      .reduce((sum, t) => sum + Number(t.quantity || t.doorsConfirmed || 0), 0);
  }, [todayOrders]);

  const qcClearedDoors = useMemo(() => {
    return todayOrders.filter(t => t.qcCleared)
      .reduce((sum, t) => sum + Number(t.quantity || t.doorsConfirmed || 0), 0);
  }, [todayOrders]);

  const doorsDispatched = useMemo(() => {
    return todayOrders.filter(t => t.isDispatched || t.status === TASK_STATUSES.COMPLETED)
      .reduce((sum, t) => sum + Number(t.quantity || t.doorsConfirmed || 0), 0);
  }, [todayOrders]);

  const paymentHoldsCount = useMemo(() => {
    return todayOrders.filter(t => t.paymentStatus === 'Payment Hold' || t.paymentStatus === 'Payment Pending Verification').length;
  }, [todayOrders]);

  const stockShortagesCount = useMemo(() => {
    return todayOrders.filter(t => t.hasStockShortage || t.blockerReason?.toLowerCase().includes('stock')).length;
  }, [todayOrders]);

  // 4. Department Performance (Sorted by pending + overdue descending)
  const departmentPerformanceData = useMemo(() => {
    const deptList = [
      { id: 'operations', name: 'Operations' },
      { id: 'sales', name: 'Sales' },
      { id: 'warehouse', name: 'Warehouse' },
      { id: 'transportation', name: 'Transportation' },
      { id: 'qc', name: 'Quality Control (QC)' },
      { id: 'finance', name: 'Finance & Accounts' },
      { id: 'service', name: 'Service' },
      { id: 'inventory', name: 'Inventory' },
      { id: 'marketing', name: 'Marketing' },
      { id: 'hr_admin', name: 'HR & Administration' }
    ];

    const mapped = deptList.map(dept => {
      const deptTasks = tasks.filter(t => t.departmentId === dept.id || t.department === dept.id);
      const total = deptTasks.length;
      const completed = deptTasks.filter(t => t.status === TASK_STATUSES.COMPLETED).length;
      const overdue = deptTasks.filter(t => t.deadlineDate < todayStr && t.status !== TASK_STATUSES.COMPLETED).length;
      const pending = deptTasks.filter(t => t.status !== TASK_STATUSES.COMPLETED).length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        ...dept,
        total,
        completed,
        pending,
        overdue,
        pct,
        urgencyScore: (overdue * 3) + pending
      };
    });

    // Sort by pending & overdue (highest first)
    return mapped.sort((a, b) => b.urgencyScore - a.urgencyScore || b.total - a.total);
  }, [tasks, todayStr]);

  // Filtered department list based on toggle and zero-task rules
  const visibleDepartments = useMemo(() => {
    if (showAllDepartments) {
      return departmentPerformanceData;
    }
    // Show top 5 that have tasks > 0
    const nonZero = departmentPerformanceData.filter(d => d.total > 0);
    return nonZero.slice(0, 5);
  }, [departmentPerformanceData, showAllDepartments]);

  // 5. Recent Tasks (Latest 5 filtered)
  const recentTasks = useMemo(() => {
    const list = accessibleTasks.filter(t => {
      // 1. Chip Filter
      if (taskFilterChip === 'mine') {
        const isAssigned = t.assignedToId === currentUser?.id || (Array.isArray(t.assigneeIds) && t.assigneeIds.includes(currentUser?.id));
        if (!isAssigned) return false;
      } else if (taskFilterChip === 'overdue') {
        if (!(t.deadlineDate < todayStr && t.status !== TASK_STATUSES.COMPLETED)) return false;
      }

      // 2. Dropdown Filter
      if (taskDropdownFilter === 'today') {
        if (t.deadlineDate !== todayStr && t.taskDate !== todayStr && t.date !== todayStr) return false;
      } else if (taskDropdownFilter === 'in_progress') {
        if (t.status !== TASK_STATUSES.IN_PROGRESS) return false;
      } else if (taskDropdownFilter === 'pending_approval') {
        if (t.status !== TASK_STATUSES.PENDING_REVIEW) return false;
      } else if (taskDropdownFilter === 'blocked') {
        if (t.status !== TASK_STATUSES.BLOCKED) return false;
      }

      // 3. Search Query
      if (taskSearch.trim()) {
        const q = taskSearch.toLowerCase();
        const mTitle = (t.title || '').toLowerCase().includes(q);
        const mAssignee = (t.assignedEmployee || t.assignedToName || '').toLowerCase().includes(q);
        const mDept = (t.departmentName || t.department || '').toLowerCase().includes(q);
        if (!mTitle && !mAssignee && !mDept) return false;
      }

      return true;
    });

    // Sort newest first
    list.sort((a, b) => {
      const dateA = a.createdAt || a.date || a.taskDate || '';
      const dateB = b.createdAt || b.date || b.taskDate || '';
      return String(dateB).localeCompare(String(dateA));
    });

    return list.slice(0, 5);
  }, [accessibleTasks, taskFilterChip, taskDropdownFilter, taskSearch, currentUser, todayStr]);

  // 6. Recent Activity Timeline (Latest 5 events)
  const recentActivityEvents = useMemo(() => {
    const events = [];
    tasks.forEach(task => {
      if (Array.isArray(task.auditLogs) && task.auditLogs.length > 0) {
        task.auditLogs.forEach(log => {
          events.push({
            taskId: task.id,
            action: log.action || 'Updated',
            performedByName: log.performedByName || 'Team Member',
            timestamp: log.timestamp || task.lastUpdated || task.createdAt,
            details: log.details || task.title
          });
        });
      } else if (task.createdAt) {
        events.push({
          taskId: task.id,
          action: 'Created',
          performedByName: task.assignedEmployee || task.assignedToName || 'System',
          timestamp: task.createdAt,
          details: task.title
        });
      }
    });

    events.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
    return events.slice(0, 5);
  }, [tasks]);

  // Status & Priority Badge Helpers (Small soft-tinted pills)
  const getStatusBadge = (status) => {
    if (status === TASK_STATUSES.COMPLETED) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-[#10B981] border border-emerald-200">Completed</span>;
    }
    if (status === TASK_STATUSES.IN_PROGRESS) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-[#05331F] border border-emerald-200">In Progress</span>;
    }
    if (status === TASK_STATUSES.BLOCKED) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">Blocked</span>;
    }
    if (status === TASK_STATUSES.PENDING_REVIEW) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Review</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">Pending</span>;
  };

  const getPriorityBadge = (priority) => {
    const p = (priority || 'Medium').toLowerCase();
    if (p === 'urgent' || p === 'critical' || p === 'high') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">High</span>;
    }
    if (p === 'low') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">Low</span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Medium</span>;
  };

  const todayDisplayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans select-none">
      
      {/* 1. GREETING (No box around it) */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#05331F] tracking-tight">
          {getGreeting(currentUser?.fullName || currentUser?.name)}
        </h1>
        <p className="text-sm text-slate-500">
          <span>{currentUser?.role || 'Team Member'}</span>
          <span className="mx-2">•</span>
          <span>{todayDisplayDate}</span>
        </p>
      </div>

      {/* 2. FOUR KPI CARDS (Click opens All Tasks with that filter applied) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Total Tasks */}
        <button
          type="button"
          onClick={() => onNavigateToTab && onNavigateToTab('my_tasks')}
          className="text-left bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-[#05331F]/30 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#05331F]/20 cursor-pointer flex flex-col justify-between"
          aria-label="View all tasks"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Total</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-semibold text-slate-900">{totalTasks}</div>
            <div className="text-xs text-slate-500 mt-1">Across all categories</div>
          </div>
        </button>

        {/* Completed Tasks */}
        <button
          type="button"
          onClick={() => onNavigateToTab && onNavigateToTab('my_tasks')}
          className="text-left bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer flex flex-col justify-between"
          aria-label="View completed tasks"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Completed</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-[#10B981]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-semibold text-slate-900">{completedTasks}</div>
            <div className="text-xs text-emerald-600 font-medium mt-1">{completionRate}% done</div>
          </div>
        </button>

        {/* Pending Tasks */}
        <button
          type="button"
          onClick={() => onNavigateToTab && onNavigateToTab('my_tasks')}
          className="text-left bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-amber-300 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer flex flex-col justify-between"
          aria-label="View pending tasks"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Pending</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-semibold text-slate-900">{pendingTasks}</div>
            <div className="text-xs text-amber-600 font-medium mt-1">
              {pendingTasks > 0 ? `${pendingTasks} remaining` : 'All caught up'}
            </div>
          </div>
        </button>

        {/* Overdue Tasks */}
        <button
          type="button"
          onClick={() => onNavigateToTab && onNavigateToTab('my_tasks')}
          className="text-left bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-rose-300 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer flex flex-col justify-between"
          aria-label="View overdue tasks"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Overdue</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-semibold text-slate-900">{overdueTasks}</div>
            <div className={`text-xs mt-1 font-medium ${overdueTasks > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
              {overdueTasks > 0 ? 'Action required' : 'None overdue'}
            </div>
          </div>
        </button>

      </div>

      {/* 3. TODAY'S OPERATIONS (Visible only for operations, warehouse, sales, admin; hidden for HR) */}
      {canViewOperations && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-[#05331F]">Today's Operations</h2>
              <p className="text-sm text-slate-500">Live order throughput, warehouse staging, and dispatch</p>
            </div>
            <div className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{totalDoorsLoaded}</span>
              <span> of </span>
              <span className="font-semibold text-slate-900">{targetDoors}</span>
              <span> target doors (deadline 6:00 PM)</span>
            </div>
          </div>

          {/* Progress Bar with markers at 20, 40, 60, and 70 */}
          <div className="space-y-2">
            <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div 
                className="h-full bg-[#10B981] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${targetPercent}%` }}
              />
              {/* Markers at 20, 40, 60, 70 */}
              <div className="absolute top-0 bottom-0 left-[28.57%] w-0.5 bg-white/80" title="Milestone 20" />
              <div className="absolute top-0 bottom-0 left-[57.14%] w-0.5 bg-white/80" title="Milestone 40" />
              <div className="absolute top-0 bottom-0 left-[85.71%] w-0.5 bg-white/80" title="Milestone 60" />
            </div>
            <div className="flex justify-between text-xs text-slate-400 font-normal px-0.5">
              <span>0</span>
              <span className="translate-x-1">20</span>
              <span className="translate-x-1">40</span>
              <span className="translate-x-1">60</span>
              <span className="font-medium text-slate-600">70 Target</span>
            </div>
          </div>

          {/* 4 Key Stats: Orders, Picked, QC Cleared, Dispatched */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>Orders</span>
                <PackageCheck className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-xl font-semibold text-slate-900 mt-1">{todayOrders.length}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>Picked</span>
                <PackageCheck className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-xl font-semibold text-slate-900 mt-1">{doorsPicked}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>QC Cleared</span>
                <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
              </div>
              <div className="text-xl font-semibold text-slate-900 mt-1">{qcClearedDoors}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>Dispatched</span>
                <Truck className="w-3.5 h-3.5 text-[#05331F]" />
              </div>
              <div className="text-xl font-semibold text-slate-900 mt-1">{doorsDispatched}</div>
            </div>
          </div>

          {/* Needs Attention Chip Row (shows only if count > 0) */}
          {(paymentHoldsCount > 0 || stockShortagesCount > 0) && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
              <span className="text-xs font-medium text-slate-600">Needs attention:</span>
              {paymentHoldsCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  <DollarSign className="w-3 h-3" />
                  <span>{paymentHoldsCount} Payment {paymentHoldsCount === 1 ? 'Hold' : 'Holds'}</span>
                </span>
              )}
              {stockShortagesCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200">
                  <AlertCircle className="w-3 h-3" />
                  <span>{stockShortagesCount} Stock {stockShortagesCount === 1 ? 'Shortage' : 'Shortages'}</span>
                </span>
              )}
            </div>
          )}

        </div>
      )}

      {/* 4. DEPARTMENT PERFORMANCE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#05331F]">Department Performance</h2>
            <p className="text-sm text-slate-500">Sorted by pending and overdue priorities</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAllDepartments(prev => !prev)}
            className="text-xs font-medium text-[#05331F] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{showAllDepartments ? 'Show top 5' : 'View all departments'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllDepartments ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {visibleDepartments.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            No active departmental tasks found.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleDepartments.map(dept => (
              <div 
                key={dept.id} 
                className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between sm:justify-start gap-2">
                    <span className="font-medium text-sm text-slate-900 truncate">{dept.name}</span>
                    {dept.overdue > 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        {dept.overdue} overdue
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {dept.completed} of {dept.total} completed • {dept.pending} pending
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:w-48">
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-[#10B981] h-1.5 rounded-full" 
                      style={{ width: `${dept.pct}%` }} 
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 w-9 text-right">{dept.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5 & 6. RECENT TASKS & RECENT ACTIVITY (Desktop: 2 columns; Mobile/Tablet: stacked) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Recent Tasks (xl: 2 columns wide) */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#05331F]">Recent Tasks</h2>
              <p className="text-sm text-slate-500">Latest active assignments</p>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                className="w-full sm:w-48 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#05331F]/20"
                aria-label="Search tasks"
              />
            </div>
          </div>

          {/* Filter Chips + Filter Dropdown */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <div className="flex items-center gap-1.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'mine', label: 'Mine' },
                { id: 'overdue', label: 'Overdue' }
              ].map(chip => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setTaskFilterChip(chip.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer min-h-[36px] sm:min-h-0 ${
                    taskFilterChip === chip.id
                      ? 'bg-[#05331F] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Filter Dropdown for others */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 hidden sm:inline">Filter:</span>
              <select
                value={taskDropdownFilter}
                onChange={(e) => setTaskDropdownFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none cursor-pointer"
                aria-label="Additional status filter"
              >
                <option value="none">Status (All)</option>
                <option value="today">Today's</option>
                <option value="in_progress">In Progress</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>

          {/* Desktop Table View (Hidden on mobile) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs">
                  <th className="pb-2.5 font-medium">Title</th>
                  <th className="pb-2.5 font-medium">Assignee</th>
                  <th className="pb-2.5 font-medium">Priority</th>
                  <th className="pb-2.5 font-medium">Due</th>
                  <th className="pb-2.5 font-medium">Status</th>
                  <th className="pb-2.5 font-medium text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No matching tasks found.
                    </td>
                  </tr>
                ) : (
                  recentTasks.map(task => (
                    <tr key={task.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 pr-2 font-medium text-slate-900 max-w-[180px] truncate">
                        {task.title}
                      </td>
                      <td className="py-3 pr-2 text-slate-600 truncate max-w-[120px]">
                        {task.assignedEmployee || task.assignedToName || 'Unassigned'}
                      </td>
                      <td className="py-3 pr-2">
                        {getPriorityBadge(task.priority)}
                      </td>
                      <td className="py-3 pr-2 text-slate-500 whitespace-nowrap">
                        {task.deadlineDate || task.date || 'Today'}
                      </td>
                      <td className="py-3 pr-2">
                        {getStatusBadge(task.status)}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenTaskDetails && onOpenTaskDetails(task)}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-[#05331F] transition cursor-pointer"
                          aria-label={`View task ${task.title}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards View (No horizontal scroll, 44px minimum tap targets) */}
          <div className="md:hidden space-y-2.5">
            {recentTasks.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No matching tasks found.
              </div>
            ) : (
              recentTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => onOpenTaskDetails && onOpenTaskDetails(task)}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2 min-h-[44px] cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-xs text-slate-900 line-clamp-2">{task.title}</span>
                    {getStatusBadge(task.status)}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                    <span className="truncate max-w-[140px]">{task.assignedEmployee || task.assignedToName || 'Unassigned'}</span>
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {task.deadlineDate || task.date || 'Today'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* View All Tasks Footer Link */}
          <div className="pt-2 border-t border-slate-100 text-right">
            <button
              type="button"
              onClick={() => onNavigateToTab && onNavigateToTab('my_tasks')}
              className="text-xs font-semibold text-[#05331F] hover:underline inline-flex items-center gap-1 cursor-pointer min-h-[44px] sm:min-h-0"
            >
              <span>View all tasks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Recent Activity (Timeline of last 5 events) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-semibold text-[#05331F]">Recent Activity</h2>
            <p className="text-sm text-slate-500">Latest updates across the workspace</p>
          </div>

          {recentActivityEvents.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No recent activity recorded yet today.
            </div>
          ) : (
            <div className="space-y-4 relative before:absolute before:top-2 before:bottom-2 before:left-2 before:w-0.5 before:bg-slate-100">
              {recentActivityEvents.map((evt, idx) => (
                <div key={idx} className="relative flex items-start gap-3 pl-6">
                  {/* Timeline bullet */}
                  <div className="absolute left-1 top-1.5 w-2 h-2 rounded-full bg-[#10B981] ring-4 ring-white" />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-xs text-slate-900 font-medium truncate">
                      {evt.performedByName}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {evt.details}
                    </p>
                    <span className="text-[11px] text-slate-400 block pt-0.5">
                      {formatRelativeTime(evt.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
