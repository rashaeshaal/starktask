import React, { useState, useMemo } from 'react';
import { 
  Package, CheckCircle2, Clock, AlertTriangle, Layers, 
  ArrowUpRight, Users, Play, Check, ShieldAlert, Award, FileText,
  Calendar, Filter, RefreshCw, ChevronRight, UserCheck, AlertCircle,
  ExternalLink, ArrowDownRight, Send, HelpCircle, BellRing, Search,
  CheckSquare, XCircle, RotateCcw
} from 'lucide-react';
import { TASK_STATUSES } from '../../rbac';
import { getTodayDateString, getDateOffset } from '../../dateUtils';
import { getLoadingMilestoneProgress, WAREHOUSE_TASK_IDS, WAREHOUSE_BLOCKER_CATEGORIES } from '../../warehouseWorkTypes';
import { canApproveTask } from '../../permissions';
import DashboardKPICard from '../common/DashboardKPICard';

/**
 * STARK STEEL – Warehouse Department Task Management Dashboard
 * Tailored for: 
 * 1. Warehouse Supervisor (`des_wh_sup`, L4–L5) - Floor-level leader managing Loading Staff, daily SOP execution, review queue & blockers
 * 2. Warehouse In-charge (`des_wh_inc`, L3–L4) - Overall warehouse oversight & supervisor performance
 * 3. Loading Staff (`des_load`, L6) - Personal execution
 * 
 * Strict Task Management ONLY (No ERP/inventory transactions).
 */
export default function WarehouseDashboardView({
  tasks = [],
  currentUser,
  employees = [],
  bookings = [],
  leaveCovers = [],
  onOpenTaskDetails,
  onOpenAssignModal,
  onNavigateToTab,
  onApproveTask,
  onRequestChanges
}) {
  const todayStr = getTodayDateString();
  const myIds = useMemo(() => {
    return new Set([
      currentUser?.id,
      currentUser?.uid,
      currentUser?.employeeId,
      currentUser?.employeeId ? `emp_${currentUser.employeeId}` : null
    ].filter(Boolean).map(String));
  }, [currentUser]);

  const currentUserName = (currentUser?.fullName || currentUser?.name || '').toLowerCase();
  const myId = String(currentUser?.id || currentUser?.uid || currentUser?.employeeId || '');
  const userRole = currentUser?.role || '';

  const isWarehouseInCharge = userRole === 'Warehouse In-charge';
  const isWarehouseSupervisor = userRole === 'Warehouse Supervisor' || userRole === 'Warehouse Executive';
  const isLoadingStaff = userRole === 'Loading Staff';

  // Date Filter State
  const [dateFilter, setDateFilter] = useState('today'); // 'today' | 'yesterday' | 'week' | 'month' | 'all'
  const [activeTabSection, setActiveTabSection] = useState('overview'); // 'overview' | 'team' | 'reviews' | 'blockers' | 'mytasks' | 'reports'

  // Selected Employee for Detailed Task Drilldown
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [reportDateRange, setReportDateRange] = useState('today');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Loading Staff Team reporting directly to this supervisor (or all loading staff for In-charge)
  const myTeamLoadingStaff = useMemo(() => {
    return employees.filter(e => {
      const isLoader = (e.role || '') === 'Loading Staff';
      if (!isLoader) return false;
      if (isWarehouseInCharge) return true;
      // Supervisor: show loaders reporting to me
      const reportsTo = String(e.reportingManagerId || e.reportsTo || '');
      return reportsTo === myId || reportsTo === String(currentUser?.employeeId || '');
    });
  }, [employees, isWarehouseInCharge, myId, currentUser]);

  const teamEmployeeIds = useMemo(() => {
    return new Set(myTeamLoadingStaff.map(e => String(e.id || e.uid || e.employeeId)));
  }, [myTeamLoadingStaff]);

  // 2. Warehouse-scoped tasks
  const allWarehouseTasks = useMemo(() => {
    return tasks.filter(t => {
      const d = (t.departmentId || t.department || '').toLowerCase();
      const isWhDept = d === 'warehouse';
      const isWhTpl = t.templateId && t.templateId.startsWith('tpl_wh_');
      const isWhTitle = (t.title && (t.title.toLowerCase().includes('warehouse') || t.title.toLowerCase().includes('picking')));
      const isAssignedToWarehouseUser = employees.some(e => {
        const eId = String(e.id || e.uid || e.employeeId);
        const tAssignee = String(t.assignedToId || t.assignedTo || '');
        const eDept = (e.department || '').toLowerCase();
        const eRole = (e.role || '').toLowerCase();
        return eId === tAssignee && (eDept === 'warehouse' || eRole.includes('warehouse') || eRole.includes('loading') || eRole.includes('qc') || eRole.includes('dispatch'));
      });
      return isWhDept || isWhTpl || isWhTitle || isAssignedToWarehouseUser;
    });
  }, [tasks, employees]);

  // Filter tasks based on selected date filter
  const warehouseTasks = useMemo(() => {
    const yesterdayStr = getDateOffset(-1);
    const weekAgoStr = getDateOffset(-7);
    const monthAgoStr = getDateOffset(-30);

    return allWarehouseTasks.filter(t => {
      const taskDate = (t.taskDate || t.deadlineDate || t.createdAt || '').slice(0, 10);
      if (dateFilter === 'today') return taskDate === todayStr;
      if (dateFilter === 'yesterday') return taskDate === yesterdayStr;
      if (dateFilter === 'week') return taskDate >= weekAgoStr;
      if (dateFilter === 'month') return taskDate >= monthAgoStr;
      return true; // 'all'
    });
  }, [allWarehouseTasks, dateFilter, todayStr]);

  // 3. Supervisor-specific KPI Metrics
  // Requirements: My Tasks Today, Team Tasks Assigned, Team Tasks Completed, Team Tasks In Progress, Pending Sign-Offs, Overdue Tasks, Active Operational Blockers
  const supervisorMetrics = useMemo(() => {
    const myTasksToday = warehouseTasks.filter(t => String(t.assignedToId || t.assignedTo) === myId);
    
    // Team Tasks (tasks assigned to my loading staff team)
    const teamTasks = warehouseTasks.filter(t => teamEmployeeIds.has(String(t.assignedToId || t.assignedTo)));
    const teamAssigned = teamTasks.length;
    const teamCompleted = teamTasks.filter(t => t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed').length;
    const teamInProgress = teamTasks.filter(t => t.status === TASK_STATUSES.IN_PROGRESS || t.status === 'In Progress').length;

    // Pending Sign-Offs (Loading Staff tasks awaiting supervisor review)
    const pendingSignOffs = allWarehouseTasks.filter(t => {
      const s = (t.status || '').toLowerCase();
      const isSubmitted = s === 'pending review' || s === 'pending sign-off' || s === 'completed';
      const isFromMyTeam = teamEmployeeIds.has(String(t.assignedToId || t.assignedTo));
      return isSubmitted && isFromMyTeam;
    }).length;

    // Overdue Tasks across team + self
    const overdueTasks = [...teamTasks, ...myTasksToday].filter(t => {
      const isDone = t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed';
      const isOverdue = t.deadlineDate && t.deadlineDate < todayStr && !isDone;
      return isOverdue;
    }).length;

    // Active Operational Blockers reported by team or on warehouse tasks
    const activeBlockers = allWarehouseTasks.filter(t => {
      const isBlk = t.status === TASK_STATUSES.BLOCKED || t.status === 'Operational Blocker' || t.isBlocked;
      const isRelevant = teamEmployeeIds.has(String(t.assignedToId || t.assignedTo)) || String(t.assignedToId || t.assignedTo) === myId;
      return isBlk && isRelevant;
    }).length;

    // Door counts (Loaded / Picked)
    let totalLoadedDoors = 0;
    allWarehouseTasks.forEach(t => {
      const isDone = t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed';
      if (t.templateId === WAREHOUSE_TASK_IDS.LOADING || (t.title && t.title.toLowerCase().includes('loading'))) {
        totalLoadedDoors += Number(t.completedQuantity || (isDone ? 70 : 0));
      }
    });

    const completionRate = teamAssigned > 0 ? Math.round((teamCompleted / teamAssigned) * 100) : 0;

    return {
      myTasksCount: myTasksToday.length,
      teamAssigned,
      teamCompleted,
      teamInProgress,
      pendingSignOffs,
      overdueTasks,
      activeBlockers,
      totalLoadedDoors,
      completionRate
    };
  }, [warehouseTasks, allWarehouseTasks, myId, teamEmployeeIds, todayStr]);

  // Loading milestone calculation (Milestones: 20, 40, 60, 70 doors)
  const milestoneProgress = getLoadingMilestoneProgress(supervisorMetrics.totalLoadedDoors);

  // 4. Loading Staff Team Cards Data
  const teamOverviewData = useMemo(() => {
    return myTeamLoadingStaff.map(emp => {
      const empId = String(emp.id || emp.uid || emp.employeeId);
      const empTasks = allWarehouseTasks.filter(t => String(t.assignedToId || t.assignedTo) === empId);
      
      const assigned = empTasks.length;
      const completed = empTasks.filter(t => t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed').length;
      const inProgress = empTasks.filter(t => t.status === TASK_STATUSES.IN_PROGRESS || t.status === 'In Progress').length;
      const pendingApproval = empTasks.filter(t => {
        const s = (t.status || '').toLowerCase();
        return s === 'pending review' || s === 'pending sign-off';
      }).length;
      const overdue = empTasks.filter(t => t.deadlineDate && t.deadlineDate < todayStr && t.status !== 'Completed').length;
      const pct = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
      
      // Last activity
      const latestTask = [...empTasks].sort((a, b) => (b.lastUpdated || b.createdAt || '').localeCompare(a.lastUpdated || a.createdAt || ''))[0];
      const lastActivity = latestTask ? (latestTask.lastUpdated || latestTask.createdAt || 'Today') : 'No recent activity';

      return {
        id: empId,
        name: emp.fullName || emp.name,
        role: emp.role || 'Loading Staff',
        designation: emp.designation || 'Frontline Loading Staff',
        phone: emp.phone,
        avatar: emp.photoUrl || emp.avatar || null,
        assigned,
        completed,
        inProgress,
        pendingApproval,
        overdue,
        completionRate: pct,
        lastActivity,
        tasks: empTasks
      };
    });
  }, [myTeamLoadingStaff, allWarehouseTasks, todayStr]);

  // 5. Pending Review Queue (Submissions from Loading Staff)
  const pendingReviewQueue = useMemo(() => {
    return allWarehouseTasks.filter(t => {
      const s = (t.status || '').toLowerCase();
      const isSub = s === 'pending review' || s === 'pending sign-off' || s === 'completed';
      const isSubordinate = teamEmployeeIds.has(String(t.assignedToId || t.assignedTo));
      return isSub && isSubordinate;
    });
  }, [allWarehouseTasks, teamEmployeeIds]);

  // 6. Supervisor's My Tasks Today
  const mySupervisorTasks = useMemo(() => {
    return allWarehouseTasks.filter(t => {
      const aId = String(t.assignedToId || t.assignedTo || '');
      const aIds = Array.isArray(t.assigneeIds) ? t.assigneeIds.map(String) : [];
      const aName = (t.assignedToName || '').toLowerCase();
      const isMine = myIds.has(aId) || aIds.some(id => myIds.has(id)) || (currentUserName && aName.includes(currentUserName));
      if (!isMine) return false;

      // Apply date filter if set and not 'all'
      if (dateFilter === 'all') return true;
      const taskDate = (t.taskDate || t.deadlineDate || t.createdAt || '').slice(0, 10);
      const yesterdayStr = getDateOffset(-1);
      const weekAgoStr = getDateOffset(-7);
      const monthAgoStr = getDateOffset(-30);
      if (dateFilter === 'today') return taskDate === todayStr || !taskDate;
      if (dateFilter === 'yesterday') return taskDate === yesterdayStr;
      if (dateFilter === 'week') return taskDate >= weekAgoStr;
      if (dateFilter === 'month') return taskDate >= monthAgoStr;
      return true;
    });
  }, [allWarehouseTasks, myIds, currentUserName, dateFilter, todayStr]);

  // 6.5 Door Orders & Picking Queue (Linked to Sales Dealer Bookings & Accounts Cleared)
  const pickingOrdersQueue = useMemo(() => {
    // 1. Direct picking tasks created from order chain
    const pickingTasks = allWarehouseTasks.filter(t => {
      const isPickingTpl = t.templateId === WAREHOUSE_TASK_IDS.PICKING || (t.title && t.title.toLowerCase().includes('picking'));
      const isSalesLinked = t.isLinkedSalesWork || t.bookingId || t.sourceBookingId;
      return isPickingTpl || isSalesLinked;
    });

    // 2. Door bookings (either cleared by accounts or booked)
    const bookingCards = bookings.map(b => {
      const linkedPickingTask = pickingTasks.find(pt => pt.bookingId === b.id || pt.sourceBookingId === b.id);
      return {
        bookingId: b.id,
        dealerName: b.dealerName,
        region: b.region,
        status: b.status,
        paymentStatus: b.paymentStatus || (b.status === 'Accounts Cleared' ? 'Verified' : 'Pending'),
        totalQuantity: b.totalQuantity || (b.lines || []).reduce((sum, l) => sum + (parseInt(l.quantity, 10) || 1), 0),
        lines: b.lines || [],
        requiredBy: b.requiredBy,
        bookingDate: b.bookingDate || b.bookedAt,
        linkedTask: linkedPickingTask,
        isReadyToPick: b.status === 'Accounts Cleared' || b.paymentStatus === 'Verified' || (linkedPickingTask && linkedPickingTask.status !== 'Blocked')
      };
    });

    return bookingCards;
  }, [allWarehouseTasks, bookings]);

  // 7. Active Operational Blockers
  const supervisorBlockersList = useMemo(() => {
    return allWarehouseTasks.filter(t => {
      const isBlk = t.status === TASK_STATUSES.BLOCKED || t.status === 'Operational Blocker' || t.isBlocked;
      const isTeamOrSelf = teamEmployeeIds.has(String(t.assignedToId || t.assignedTo)) || String(t.assignedToId || t.assignedTo) === myId;
      return isBlk && (isWarehouseInCharge || isTeamOrSelf);
    });
  }, [allWarehouseTasks, teamEmployeeIds, myId, isWarehouseInCharge]);

  return (
    <div className="space-y-6">
      
      {/* HEADER & 70-DOOR LOADING MILESTONE TRACKER */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 text-[#05331F] flex items-center justify-center">
              <Package className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900 tracking-tight">Warehouse Operations</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                <span className="font-medium text-slate-800">{currentUser?.fullName || currentUser?.name}</span> ({userRole})
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {(isWarehouseSupervisor || isWarehouseInCharge) && onOpenAssignModal && (
              <button
                onClick={() => onOpenAssignModal({
                  department: 'warehouse',
                  priority: 'High'
                })}
                className="px-3.5 py-2 bg-[#05331F] hover:bg-[#07472B] text-white font-medium text-xs rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>+ Assign Crew Task</span>
              </button>
            )}
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('team_performance')}
                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-lg border border-slate-200/80 transition flex items-center gap-1.5"
              >
                <span>Performance</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* 70-Door Factory Loading Milestone Tracker (Clean SaaS Data Bar) */}
        <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-200/80 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span className="font-medium text-slate-700 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Daily Vehicle Loading Milestones</span>
            </span>
            <span className="font-semibold text-slate-900 font-mono">
              {supervisorMetrics.totalLoadedDoors} / 70 Doors ({milestoneProgress.percent}%)
            </span>
          </div>

          <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden flex">
            <div 
              className="bg-[#05331F] h-full transition-all duration-300 rounded-full" 
              style={{ width: `${milestoneProgress.percent}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-0.5">
            <span className={supervisorMetrics.totalLoadedDoors >= 20 ? 'text-slate-800 font-semibold' : ''}>M1: 20</span>
            <span className={supervisorMetrics.totalLoadedDoors >= 40 ? 'text-slate-800 font-semibold' : ''}>M2: 40</span>
            <span className={supervisorMetrics.totalLoadedDoors >= 60 ? 'text-slate-800 font-semibold' : ''}>M3: 60</span>
            <span className={supervisorMetrics.totalLoadedDoors >= 70 ? 'text-emerald-700 font-semibold' : ''}>70 Target</span>
          </div>
        </div>
      </div>

      {/* TIMEFRAME & SECTION NAVIGATION TABS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 mr-2 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Timeframe:</span>
          </span>
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'all', label: 'All History' }
          ].map(tf => (
            <button
              key={tf.id}
              onClick={() => setDateFilter(tf.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer min-h-[36px] ${
                dateFilter === tf.id 
                  ? 'bg-[#05331F] text-white shadow-2xs' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTabSection('overview')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${activeTabSection === 'overview' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTabSection('picking')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${activeTabSection === 'picking' ? 'bg-[#05331F] text-white shadow-2xs' : 'text-slate-600'}`}
          >
            Order Picking Queue ({pickingOrdersQueue.length})
          </button>
          <button
            onClick={() => setActiveTabSection('team')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${activeTabSection === 'team' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
          >
            Loading Staff ({myTeamLoadingStaff.length})
          </button>
          <button
            onClick={() => setActiveTabSection('reviews')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${activeTabSection === 'reviews' ? 'bg-amber-600 text-white shadow-2xs' : 'text-amber-800'}`}
          >
            Pending Review ({pendingReviewQueue.length})
          </button>
          <button
            onClick={() => setActiveTabSection('mytasks')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${activeTabSection === 'mytasks' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
          >
            My Tasks ({mySupervisorTasks.length})
          </button>
          <button
            onClick={() => setActiveTabSection('blockers')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${activeTabSection === 'blockers' ? 'bg-rose-700 text-white shadow-2xs' : 'text-rose-700'}`}
          >
            Blockers ({supervisorBlockersList.length})
          </button>
          <button
            onClick={() => setActiveTabSection('reports')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${activeTabSection === 'reports' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
          >
            Reports
          </button>
        </div>
      </div>

      {/* SUPERVISOR KPI CARDS (Actual database records) - Premium SaaS Design */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <DashboardKPICard
          label="My Tasks"
          value={supervisorMetrics.myTasksCount}
          subtext="Assigned SOPs"
          icon={Layers}
          variant="default"
        />

        <DashboardKPICard
          label="Team Assigned"
          value={supervisorMetrics.teamAssigned}
          subtext="Loading crew tasks"
          icon={Users}
          variant="default"
        />

        <DashboardKPICard
          label="Completed"
          value={supervisorMetrics.teamCompleted}
          subtext={`${supervisorMetrics.completionRate}% completion`}
          icon={CheckCircle2}
          variant="success"
        />

        <DashboardKPICard
          label="In Progress"
          value={supervisorMetrics.teamInProgress}
          subtext="Active floor work"
          icon={Clock}
          variant="info"
        />

        <DashboardKPICard
          label="Pending Review"
          value={supervisorMetrics.pendingSignOffs}
          subtext="Requires sign-off"
          icon={Award}
          variant={supervisorMetrics.pendingSignOffs > 0 ? "warning" : "default"}
          onClick={() => setActiveTabSection('reviews')}
        />

        <DashboardKPICard
          label="Overdue / Blocked"
          value={supervisorMetrics.overdueTasks + supervisorMetrics.activeBlockers}
          subtext={`${supervisorMetrics.overdueTasks} missed · ${supervisorMetrics.activeBlockers} blocked`}
          icon={AlertTriangle}
          variant={(supervisorMetrics.overdueTasks + supervisorMetrics.activeBlockers) > 0 ? "danger" : "default"}
          onClick={() => setActiveTabSection('blockers')}
        />
      </div>

      {/* SECTION A.5: DOOR ORDERS & PICKING QUEUE (From Sales & Accounts) */}
      {(activeTabSection === 'overview' || activeTabSection === 'picking') && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Door Orders Ready for Warehouse Picking</h2>
                <p className="text-xs text-slate-500">Sales orders verified by Accounts awaiting warehouse door picking & staging</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg">
                {pickingOrdersQueue.length} Orders in Queue
              </span>
              {onNavigateToTab && (
                <button
                  onClick={() => onNavigateToTab('bookings')}
                  className="text-xs font-semibold text-[#05331F] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>All Bookings</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {pickingOrdersQueue.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border border-slate-100 rounded-2xl space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/50" />
              <p className="text-xs font-semibold text-slate-700">No pending orders waiting for warehouse picking!</p>
              <p className="text-[11px]">When sales logs a booking and accounts verifies advance payment, it appears here immediately.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {pickingOrdersQueue.map(order => {
                const isCleared = order.status === 'Accounts Cleared' || order.paymentStatus === 'Verified';
                const isHold = order.status === 'Payment Hold' || order.paymentStatus === 'Payment Hold';

                return (
                  <div
                    key={order.bookingId}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          #{order.bookingId.slice(-6).toUpperCase()}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isCleared ? 'bg-emerald-100 text-emerald-800' :
                          isHold ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {isCleared ? 'Accounts Cleared' : (isHold ? 'Payment Hold' : order.status || 'Booked')}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-xs text-slate-900 line-clamp-1">{order.dealerName}</h3>
                        <p className="text-[10px] text-slate-400">{order.region || 'Kerala'} · Due: {order.requiredBy || 'Pending'}</p>
                      </div>

                      {/* Line items summary */}
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-700 font-semibold">
                          <span>Total Doors:</span>
                          <span className="text-emerald-800 font-bold">{order.totalQuantity} Door(s)</span>
                        </div>
                        {order.lines && order.lines.length > 0 && (
                          <div className="text-[11px] text-slate-500 pt-0.5 border-t border-slate-200/60 line-clamp-2">
                            {order.lines.map((l, i) => (
                              <span key={i} className="inline-block mr-2">
                                {l.quantity}x {l.model}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        {order.linkedTask ? `Task: ${order.linkedTask.status}` : 'Chain linked'}
                      </span>
                      <button
                        onClick={() => {
                          if (order.linkedTask && onOpenTaskDetails) {
                            onOpenTaskDetails(order.linkedTask);
                          } else if (onOpenAssignModal) {
                            onOpenAssignModal({
                              department: 'warehouse',
                              title: `[Warehouse Picking] ${order.dealerName} - ${order.totalQuantity} Doors`,
                              description: `Pick & quality pack doors for dealer order #${order.bookingId.slice(-6).toUpperCase()}.`,
                              priority: 'High'
                            });
                          } else if (onNavigateToTab) {
                            onNavigateToTab('bookings');
                          }
                        }}
                        className="px-3 py-1.5 bg-[#05331F] hover:bg-[#07472B] text-white text-[11px] font-semibold rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <span>{order.linkedTask ? 'Execute Task' : 'Assign Crew'}</span>
                        <ArrowUpRight className="w-3 h-3 text-emerald-300" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION B: LOADING STAFF TEAM OVERVIEW & WORKLOAD */}
      {(activeTabSection === 'overview' || activeTabSection === 'team') && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Loading Staff Workload</h2>
              <p className="text-xs text-slate-500">Live operational tasks and progress</p>
            </div>
            <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
              {teamOverviewData.length} Loading Staff Members
            </span>
          </div>

          {teamOverviewData.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No loading staff currently assigned to your downline.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {teamOverviewData.map(member => (
                <div 
                  key={member.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-slate-900">{member.name}</h3>
                      <p className="text-[10px] text-slate-400">{member.designation}{member.phone ? ` · ${member.phone}` : ''}</p>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-100 text-[#05331F] px-2 py-0.5 rounded-full">
                      {member.completionRate}%
                    </span>
                  </div>

                  {/* Workload Stats */}
                  <div className="grid grid-cols-4 gap-2 text-center bg-slate-50 p-2 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Assigned</span>
                      <strong className="text-slate-800">{member.assigned}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-blue-600 block">Active</span>
                      <strong className="text-blue-700">{member.inProgress}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-600 block">Done</span>
                      <strong className="text-emerald-700">{member.completed}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-600 block">Review</span>
                      <strong className="text-amber-700">{member.pendingApproval}</strong>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Task Completion</span>
                      <span>{member.completed}/{member.assigned} Done</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-[#05331F] h-full" style={{ width: `${member.completionRate}%` }} />
                    </div>
                  </div>

                  {/* Actions: View Tasks, Assign Task, Send Reminder */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <button
                      onClick={() => {
                        if (onOpenAssignModal) {
                          onOpenAssignModal({
                            department: 'warehouse',
                            assigneeId: member.id,
                            priority: 'High'
                          });
                        }
                      }}
                      className="text-[#05331F] font-bold hover:underline flex items-center gap-1 cursor-pointer min-h-[36px]"
                    >
                      <span>+ Assign Task</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => alert(`Reminder notification sent to ${member.name} for active warehouse tasks.`)}
                        className="text-slate-500 hover:text-slate-800 text-[11px] font-semibold cursor-pointer min-h-[36px] px-1"
                        title="Send Reminder"
                      >
                        Send Reminder
                      </button>
                      <button
                        onClick={() => setSelectedStaffId(selectedStaffId === member.id ? null : member.id)}
                        className="text-slate-500 hover:text-slate-800 text-[11px] font-medium flex items-center gap-0.5 cursor-pointer min-h-[36px]"
                      >
                        <span>{selectedStaffId === member.id ? 'Hide' : 'Tasks'}</span>
                        <ChevronRight className={`w-3.5 h-3.5 transition ${selectedStaffId === member.id ? 'rotate-90' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Drilldown tasks for selected employee */}
                  {selectedStaffId === member.id && (
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <h4 className="text-[11px] font-bold text-slate-700">Tasks for {member.name} ({member.tasks.length})</h4>
                      {member.tasks.length === 0 ? (
                        <p className="text-[10px] text-slate-400">No active tasks</p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {member.tasks.map(t => (
                            <div 
                              key={t.id}
                              onClick={() => onOpenTaskDetails && onOpenTaskDetails(t)}
                              className="p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer flex items-center justify-between text-[11px]"
                            >
                              <span className="font-semibold text-slate-800 truncate mr-2">{t.title}</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                                {t.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION D: PENDING REVIEW QUEUE (Supervisor Approvals & Corrections) */}
      {(activeTabSection === 'overview' || activeTabSection === 'reviews') && (
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Loading Staff Pending Review Queue</h2>
                <p className="text-xs text-slate-500">Tasks submitted by Loading Staff requiring supervisor verification</p>
              </div>
            </div>
            <span className="text-xs font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-300">
              {pendingReviewQueue.length} Pending
            </span>
          </div>

          {pendingReviewQueue.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border border-slate-100 rounded-2xl space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/50" />
              <p className="text-xs font-semibold text-slate-700">All Loading Staff submissions reviewed!</p>
              <p className="text-[11px]">No items waiting for supervisor sign-off right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {pendingReviewQueue.map(item => (
                <div 
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {item.taskType || 'Warehouse SOP'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Waiting Supervisor Sign-Off
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs space-y-1">
                    <div>
                      <span className="text-slate-500">Submitted by: </span>
                      <strong className="text-slate-800">{item.completedByName || item.assignedToName}</strong>
                    </div>
                    {item.completedQuantity && (
                      <div className="text-[#05331F] font-semibold">
                        Quantity Completed: {item.completedQuantity} Doors
                      </div>
                    )}
                    {item.executionNotes && (
                      <div className="text-slate-600 text-[11px] italic">
                        Note: "{item.executionNotes}"
                      </div>
                    )}
                  </div>

                  {/* Actions: Direct Review / Approve / Request Changes */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                    <button
                      onClick={() => onOpenTaskDetails && onOpenTaskDetails(item)}
                      className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition min-h-[40px] cursor-pointer"
                    >
                      Inspect Evidence
                    </button>
                    <button
                      onClick={() => {
                        if (onOpenTaskDetails) {
                          onOpenTaskDetails(item);
                        } else if (onApproveTask) {
                          onApproveTask(item);
                        }
                      }}
                      className="px-4 py-2 bg-[#05331F] hover:bg-[#07472B] text-white font-bold text-xs rounded-xl shadow-2xs transition min-h-[40px] cursor-pointer"
                    >
                      Review & Sign Off
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 9: MY TASKS TODAY (SUPERVISOR DAILY SOP EXECUTION) */}
      {(activeTabSection === 'overview' || activeTabSection === 'mytasks') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">My Tasks Today (Supervisor SOP Execution)</h2>
              <p className="text-xs text-slate-500">Floor-level execution: Picking, Staging Bay, QC Handover, and Vehicle Loading</p>
            </div>
            <span className="text-xs font-semibold bg-emerald-50 text-[#05331F] px-2.5 py-1 rounded-lg">
              {mySupervisorTasks.length} Assigned Tasks
            </span>
          </div>

          {mySupervisorTasks.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/50" />
              <p className="text-xs font-semibold text-slate-600">No warehouse tasks assigned directly to you right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {mySupervisorTasks.map(t => (
                <div
                  key={t.id}
                  onClick={() => onOpenTaskDetails && onOpenTaskDetails(t)}
                  className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-2xs transition cursor-pointer space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {t.taskType || t.category || 'Warehouse SOP'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      t.status === TASK_STATUSES.COMPLETED ? 'bg-emerald-100 text-emerald-800' :
                      t.status === TASK_STATUSES.IN_PROGRESS ? 'bg-blue-100 text-blue-800' :
                      t.status === TASK_STATUSES.BLOCKED ? 'bg-rose-100 text-rose-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {t.status}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900">{t.title}</h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{t.description}</p>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                    <span className="text-slate-400 font-mono">Due: {t.deadlineTime || t.deadlineDate || 'Today'}</span>
                    <span className="font-bold text-[#05331F] flex items-center gap-1">
                      <span>Execute</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 8: OPERATIONAL BLOCKER MANAGEMENT */}
      {(activeTabSection === 'overview' || activeTabSection === 'blockers') && (
        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Operational Blocker Management</h2>
                <p className="text-xs text-slate-500">Floor-level resolution & escalation to Warehouse In-charge</p>
              </div>
            </div>
            <span className="text-xs font-bold bg-rose-100 text-rose-800 px-3 py-1 rounded-full border border-rose-200">
              {supervisorBlockersList.length} Active
            </span>
          </div>

          {supervisorBlockersList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border border-slate-100 rounded-2xl space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/50" />
              <p className="text-xs font-semibold text-slate-700">Zero active operational blockers!</p>
              <p className="text-[11px]">Warehouse floor is operating without impediments.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {supervisorBlockersList.map(blk => (
                <div 
                  key={blk.id}
                  className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                        {blk.blockerSeverity || 'Critical'}
                      </span>
                      <span className="text-[11px] font-bold text-rose-900">
                        {blk.blockerCategory || 'Operational Impediment'}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500">
                      Reported by: <strong>{blk.reportedByName || blk.assignedToName}</strong>
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-900">{blk.title}</h4>
                    <p className="text-xs text-slate-700">{blk.blockerReason || blk.description}</p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 text-xs">
                    <button
                      onClick={() => {
                        if (onOpenAssignModal) {
                          onOpenAssignModal({
                            title: `Escalation: ${blk.title}`,
                            description: `Escalated by Warehouse Supervisor to Warehouse In-charge: ${blk.blockerReason || blk.description}`,
                            department: 'warehouse',
                            priority: 'Critical'
                          });
                        }
                      }}
                      className="px-3 py-1.5 bg-[#05331F] hover:bg-[#07472B] text-white font-bold rounded-lg shadow-2xs min-h-[36px] cursor-pointer"
                    >
                      Escalate Upward
                    </button>
                    <button
                      onClick={() => onOpenTaskDetails && onOpenTaskDetails(blk)}
                      className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg min-h-[36px] cursor-pointer"
                    >
                      View & Resolve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 12: TASK REPORTS & PERFORMANCE SECTION */}
      {activeTabSection === 'reports' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Warehouse Performance & Execution Reports</h2>
              <p className="text-xs text-slate-500">Live operational task metrics based on database records</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Period:</span>
              {['today', 'week', 'month'].map(p => (
                <button
                  key={p}
                  onClick={() => setReportDateRange(p)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-semibold ${
                    reportDateRange === p ? 'bg-[#05331F] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Task Completion Summary</span>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Assigned:</span>
                  <strong className="text-slate-800">{supervisorMetrics.teamAssigned}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Completed:</span>
                  <strong className="text-emerald-700">{supervisorMetrics.teamCompleted}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pending Review:</span>
                  <strong className="text-amber-700">{supervisorMetrics.pendingSignOffs}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Overdue:</span>
                  <strong className="text-rose-700">{supervisorMetrics.overdueTasks}</strong>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Loading Milestones Reached</span>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Doors Loaded:</span>
                  <strong className="text-emerald-700">{supervisorMetrics.totalLoadedDoors} / 70</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Progress:</span>
                  <strong className="text-slate-800">{milestoneProgress.percent}%</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Next Target:</span>
                  <strong className="text-[#05331F]">{milestoneProgress.nextMilestone} Doors</strong>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Blockers & Impediments</span>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Active Blockers:</span>
                  <strong className="text-rose-700">{supervisorMetrics.activeBlockers}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Resolution Rate:</span>
                  <strong className="text-slate-800">
                    {supervisorMetrics.activeBlockers === 0 ? '100%' : 'In Resolution'}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
