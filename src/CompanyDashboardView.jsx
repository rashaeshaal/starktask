import React, { useState, useMemo } from 'react';
import { 
  Building2, Users, CheckCircle2, Clock, AlertTriangle, 
  BarChart3, ShieldAlert, Layers, ArrowUpRight, 
  UserCheck, Briefcase, ShieldCheck,
  Truck, PackageCheck, AlertCircle, CheckSquare, 
  DollarSign, ChevronRight, Activity, Bell, FileText, Search,
  TrendingUp, Plus, ArrowRight, Eye, Calendar, Sparkles, Filter
} from 'lucide-react';
import { TASK_STATUSES, TASK_PRIORITIES } from './rbac';
import { getTodayDateString } from './dateUtils';
import { SOP_CONSTANTS, LOADING_MILESTONES, ESCALATION_MATRIX } from './sopRules';
import { getReportees } from './orgStructure';

export default function CompanyDashboardView({ 
  tasks = [], 
  departments = [], 
  employees = [], 
  currentUser,
  onNavigateToTab,
  onOpenTaskDetails,
  onOpenAssignModal
}) {
  const todayStr = getTodayDateString();

  // Role categorization
  const isExecutive = currentUser?.role === 'Executive Director';
  const isGM = currentUser?.role === 'Director Operations' || currentUser?.role === 'General Manager';
  const isLeadership = isExecutive || isGM;
  const isDeptHead = ['HR Manager', 'Accounts Manager', 'Operations Head', 'CSO', 'Brand Manager', 'Transport Manager', 'Service Manager', 'Warehouse In-charge'].includes(currentUser?.role);
  const userDept = currentUser?.department || 'operations';

  // State for Task Monitoring table
  const [taskFilter, setTaskFilter] = useState('all'); // 'all' | 'my' | 'today' | 'in_progress' | 'pending_approval' | 'overdue' | 'blocked'
  const [taskSearch, setTaskSearch] = useState('');
  const [taskPage, setTaskPage] = useState(1);
  const tasksPerPage = 7;

  // Selected department for modal/drilldown
  const [selectedDeptDetail, setSelectedDeptDetail] = useState(null);

  // 1. KPI Metrics (Strictly 4 Primary KPI Cards)
  const accessibleTasks = useMemo(() => {
    if (isLeadership) return tasks;
    if (isDeptHead) return tasks.filter(t => t.departmentId === userDept || t.department === userDept);
    return tasks.filter(t => t.assignedToId === currentUser?.id || (Array.isArray(t.assigneeIds) && t.assigneeIds.includes(currentUser?.id)));
  }, [tasks, isLeadership, isDeptHead, userDept, currentUser]);

  const totalTasks = accessibleTasks.length;
  const completedTasks = accessibleTasks.filter(t => t.status === TASK_STATUSES.COMPLETED).length;
  const pendingTasks = accessibleTasks.filter(t => 
    t.status === TASK_STATUSES.ASSIGNED || 
    t.status === TASK_STATUSES.ACCEPTED || 
    t.status === TASK_STATUSES.PENDING_REVIEW
  ).length;
  const overdueTasks = accessibleTasks.filter(t => t.deadlineDate < todayStr && t.status !== TASK_STATUSES.COMPLETED).length;
  const inProgressTasks = accessibleTasks.filter(t => t.status === TASK_STATUSES.IN_PROGRESS).length;
  const blockedTasks = accessibleTasks.filter(t => t.status === TASK_STATUSES.BLOCKED).length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 2. Today's Operations Section Metrics
  const todayOrders = useMemo(() => {
    return tasks.filter(t => t.taskDate === todayStr || t.deadlineDate === todayStr || t.taskType === 'stark_door_order');
  }, [tasks, todayStr]);

  const totalDoorsOrdered = useMemo(() => {
    return todayOrders.reduce((sum, t) => sum + Number(t.quantity || t.doorsConfirmed || 0), 0);
  }, [todayOrders]);

  const totalDoorsLoaded = useMemo(() => {
    return todayOrders.reduce((sum, t) => sum + Number(t.doorsLoadedCount || (t.isLoaded ? t.quantity : 0) || 0), 0);
  }, [todayOrders]);

  const targetDoors = SOP_CONSTANTS.DAILY_LOADING_TARGET || 70;
  const targetPercent = Math.min(100, Math.round((totalDoorsLoaded / targetDoors) * 100));
  const remainingDoors = Math.max(0, targetDoors - totalDoorsLoaded);

  const qcClearedOrders = todayOrders.filter(t => t.qcCleared);
  const qcClearedDoors = qcClearedOrders.reduce((sum, t) => sum + Number(t.quantity || t.doorsConfirmed || 0), 0);
  const doorsPicked = todayOrders.filter(t => t.warehousePicked || t.sopStage === 'WAREHOUSE_PICKING' || t.doorsLoadedCount > 0)
    .reduce((sum, t) => sum + Number(t.quantity || t.doorsConfirmed || 0), 0);
  const doorsDispatched = todayOrders.filter(t => t.isDispatched || t.status === TASK_STATUSES.COMPLETED)
    .reduce((sum, t) => sum + Number(t.quantity || t.doorsConfirmed || 0), 0);

  const paymentHoldsCount = todayOrders.filter(t => t.paymentStatus === 'Payment Hold' || t.paymentStatus === 'Payment Pending Verification').length;
  const stockShortagesCount = todayOrders.filter(t => t.hasStockShortage || t.blockerReason?.toLowerCase().includes('stock')).length;

  // 3. Department Performance Table Data (All 10 Real Departments)
  const departmentPerformanceData = useMemo(() => {
    const deptList = [
      { id: 'hr_admin', name: 'HR & Administration', headRole: 'HR Manager' },
      { id: 'finance', name: 'Finance & Accounts', headRole: 'Accounts Manager' },
      { id: 'sales', name: 'Sales', headRole: 'CSO' },
      { id: 'operations', name: 'Operations', headRole: 'Operations Head' },
      { id: 'warehouse', name: 'Warehouse', headRole: 'Warehouse In-charge' },
      { id: 'qc', name: 'Quality Control (QC)', headRole: 'QC Inspector' },
      { id: 'transportation', name: 'Transportation', headRole: 'Transport Manager' },
      { id: 'service', name: 'Service', headRole: 'Service Manager' },
      { id: 'inventory', name: 'Inventory', headRole: 'Inventory Supervisor' },
      { id: 'marketing', name: 'Marketing', headRole: 'Brand Manager' }
    ];

    return deptList.map(dept => {
      const deptTasks = tasks.filter(t => t.departmentId === dept.id || t.department === dept.id);
      const total = deptTasks.length;
      const completed = deptTasks.filter(t => t.status === TASK_STATUSES.COMPLETED).length;
      const pending = deptTasks.filter(t => t.status === TASK_STATUSES.ASSIGNED || t.status === TASK_STATUSES.IN_PROGRESS || t.status === TASK_STATUSES.PENDING_REVIEW).length;
      const overdue = deptTasks.filter(t => t.deadlineDate < todayStr && t.status !== TASK_STATUSES.COMPLETED).length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      const headEmp = employees.find(e => e.role === dept.headRole);
      return {
        ...dept,
        headName: headEmp ? (headEmp.fullName || headEmp.name) : dept.headRole,
        total,
        completed,
        pending,
        overdue,
        pct
      };
    });
  }, [tasks, employees, todayStr]);

  // 4. Team Performance Table (Role-scoped)
  const teamOverview = useMemo(() => {
    let targetEmployees = employees;
    if (!isLeadership) {
      const reportees = getReportees(currentUser?.id, employees);
      const reporteeIds = new Set([currentUser?.id, ...reportees.map(r => r.id)]);
      targetEmployees = employees.filter(e => reporteeIds.has(e.id) || e.department === userDept);
    }

    const rows = targetEmployees.map(emp => {
      const empTasks = tasks.filter(t => t.assignedToId === emp.id || (Array.isArray(t.assigneeIds) && t.assigneeIds.includes(emp.id)));
      const assigned = empTasks.length;
      const completed = empTasks.filter(t => t.status === TASK_STATUSES.COMPLETED).length;
      const pending = empTasks.filter(t => t.status !== TASK_STATUSES.COMPLETED).length;
      const overdue = empTasks.filter(t => t.deadlineDate < todayStr && t.status !== TASK_STATUSES.COMPLETED).length;
      const rate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

      return {
        id: emp.id,
        name: emp.fullName || emp.name,
        role: emp.role,
        assigned,
        completed,
        pending,
        overdue,
        rate,
        status: overdue > 0 ? 'Overdue Action' : completed === assigned && assigned > 0 ? 'Completed' : 'On Track'
      };
    });

    const totalMembers = targetEmployees.length;
    const activeMembers = rows.filter(r => r.assigned > 0).length;
    const overdueMembers = rows.filter(r => r.overdue > 0).length;
    const completedMembers = rows.filter(r => r.completed > 0 && r.pending === 0).length;
    const teamRate = rows.reduce((s, r) => s + r.completed, 0) / Math.max(1, rows.reduce((s, r) => s + r.assigned, 0)) * 100;

    return {
      stats: {
        totalMembers,
        activeMembers,
        overdueMembers,
        completedMembers,
        teamRate: Math.round(teamRate) || 0
      },
      rows: rows.slice(0, 6)
    };
  }, [employees, tasks, isLeadership, currentUser, userDept, todayStr]);

  // 5. Critical Alerts & Escalations
  const criticalAlerts = useMemo(() => {
    const list = [];
    tasks.forEach(t => {
      if (t.status === 'Blocked' || t.status === 'Operational Blocker') {
        list.push({
          id: `alert-blk-${t.id}`,
          taskId: t.id,
          issue: t.blockerReason || 'Operational Blocker Reported',
          employee: t.assignedToName || 'Unassigned',
          department: t.departmentName || t.department || 'Operations',
          severity: 'Critical',
          escalationLevel: 'Operations Head',
          action: 'Clear warehouse roadblock immediately'
        });
      }
      if (t.paymentStatus === 'Payment Hold') {
        list.push({
          id: `alert-pay-${t.id}`,
          taskId: t.id,
          issue: 'Payment Hold on Order',
          employee: 'Accounts Manager',
          department: 'Finance & Accounts',
          severity: 'Critical',
          escalationLevel: 'Director Operations',
          action: 'Verify dealer advance token before release'
        });
      }
      if (t.deadlineDate && t.deadlineDate < todayStr && t.status !== TASK_STATUSES.COMPLETED) {
        list.push({
          id: `alert-ovd-${t.id}`,
          taskId: t.id,
          issue: `Task Overdue past deadline (${t.deadlineDate})`,
          employee: t.assignedToName || 'Staff',
          department: t.departmentName || t.department || 'Operations',
          severity: t.priority === 'Critical' ? 'Critical' : 'High',
          escalationLevel: 'Department Head',
          action: 'Expedite task completion or request extension'
        });
      }
    });
    return list.slice(0, 5);
  }, [tasks, todayStr]);

  // 6. Filtered Task Monitoring List
  const filteredTasks = useMemo(() => {
    return accessibleTasks.filter(t => {
      // Filter status
      if (taskFilter === 'my' && t.assignedToId !== currentUser?.id && !(Array.isArray(t.assigneeIds) && t.assigneeIds.includes(currentUser?.id))) return false;
      if (taskFilter === 'today' && t.deadlineDate !== todayStr && t.taskDate !== todayStr) return false;
      if (taskFilter === 'in_progress' && t.status !== TASK_STATUSES.IN_PROGRESS) return false;
      if (taskFilter === 'pending_approval' && t.status !== TASK_STATUSES.PENDING_REVIEW) return false;
      if (taskFilter === 'overdue' && (t.deadlineDate >= todayStr || t.status === TASK_STATUSES.COMPLETED)) return false;
      if (taskFilter === 'blocked' && t.status !== TASK_STATUSES.BLOCKED) return false;

      // Search
      if (taskSearch.trim()) {
        const q = taskSearch.toLowerCase();
        const mTitle = (t.title || '').toLowerCase().includes(q);
        const mId = (t.id || '').toLowerCase().includes(q);
        const mEmp = (t.assignedToName || '').toLowerCase().includes(q);
        const mDept = (t.departmentName || t.department || '').toLowerCase().includes(q);
        if (!mTitle && !mId && !mEmp && !mDept) return false;
      }
      return true;
    });
  }, [accessibleTasks, taskFilter, taskSearch, currentUser, todayStr]);

  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage) || 1;
  const paginatedTasks = filteredTasks.slice((taskPage - 1) * tasksPerPage, taskPage * tasksPerPage);

  // 7. Recent Audit Activities
  const recentActivities = useMemo(() => {
    const list = [];
    tasks.forEach(task => {
      if (Array.isArray(task.auditLogs)) {
        task.auditLogs.forEach(log => {
          list.push({
            taskId: task.id,
            action: log.action || 'UPDATE',
            performedByName: log.performedByName || 'Staff Member',
            timestamp: log.timestamp || task.lastUpdated || todayStr,
            details: log.details || task.title
          });
        });
      }
    });
    return list.slice(0, 6);
  }, [tasks, todayStr]);

  return (
    <div className="space-y-6 bg-[#F8FAFC] min-h-screen text-[#0F172A] pb-16">
      
      {/* 1. TOP HEADER & QUICK ACTIONS */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-xs font-bold text-[#05331F] bg-[#05331F]/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
              Command Centre
            </span>
            <span className="text-xs text-[#64748B]">• SalesDoor Enterprise</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-[#0F172A] mt-1">
            Enterprise Operations Dashboard
          </h1>
          <p className="text-xs text-[#64748B]">
            Welcome back, <span className="font-semibold text-[#0F172A]">{currentUser?.fullName || currentUser?.name}</span> ({currentUser?.role})
          </p>
        </div>

        {/* Useful Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenAssignModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#05331F] hover:bg-[#07472c] active:bg-[#032214] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Create Task</span>
          </button>

          <button
            onClick={() => onNavigateToTab && onNavigateToTab('my_tasks')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-[#64748B]" />
            <span>View All Tasks</span>
          </button>

          {isLeadership && (
            <button
              onClick={() => onNavigateToTab && onNavigateToTab('organization')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Staff Directory</span>
            </button>
          )}

          <button
            onClick={() => onNavigateToTab && onNavigateToTab('approvals')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-700" />
            <span>Approvals</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN DASHBOARD – FOUR IMPORTANT KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: totalTasks, trend: `${completionRate}% Done`, icon: Layers, color: 'text-[#05331F] bg-[#05331F]/5' },
          { label: 'Completed Tasks', value: completedTasks, trend: `${completedTasks} Finished`, icon: CheckCircle2, color: 'text-emerald-700 bg-emerald-50' },
          { label: 'Pending Tasks', value: pendingTasks, trend: `${inProgressTasks} Active`, icon: Clock, color: 'text-amber-700 bg-amber-50' },
          { label: 'Overdue Tasks', value: overdueTasks, trend: overdueTasks > 0 ? 'Requires Action' : 'All On Time', icon: AlertTriangle, color: 'text-rose-700 bg-rose-50' },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">{kpi.label}</span>
                <div className="text-2xl font-extrabold font-mono text-[#0F172A] mt-1">{kpi.value}</div>
                <div className="text-[11px] text-[#64748B] font-medium mt-0.5">{kpi.trend}</div>
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold ${kpi.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. TODAY'S OPERATIONS – CENTRAL FACTORY MONITORING SECTION */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#0F172A]">Today's Operations</h2>
              <span className="text-[10px] bg-emerald-100 text-[#05331F] font-bold px-2 py-0.5 rounded-full font-mono">
                Target: 70 Doors by 6:00 PM
              </span>
            </div>
            <p className="text-xs text-[#64748B]">Live order throughput, warehouse picking, QC clearance, loading and dispatches</p>
          </div>

          {/* Target Progress Bar & Indicator */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-bold text-[#0F172A]">
                {totalDoorsLoaded} / {targetDoors} Doors Loaded ({targetPercent}%)
              </div>
              <div className="text-[10px] text-[#64748B] font-mono">
                {remainingDoors} doors remaining to daily deadline
              </div>
            </div>
            <div className="w-28 bg-[#F8FAFC] rounded-full h-2.5 overflow-hidden border border-[#E2E8F0]">
              <div 
                className="bg-[#05331F] h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${targetPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 8 Connected Operational Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {[
            { label: 'Orders Received', value: todayOrders.length, sub: 'Confirmed orders', icon: FileText },
            { label: 'Doors Required', value: totalDoorsOrdered, sub: 'Total door units', icon: PackageCheck },
            { label: 'Doors Picked', value: doorsPicked, sub: 'Staged in bays', icon: PackageCheck },
            { label: 'QC-Cleared Doors', value: qcClearedDoors, sub: `${qcClearedOrders.length} batches`, icon: ShieldCheck },
            { label: 'Doors Loaded', value: totalDoorsLoaded, sub: `Milestone: ${totalDoorsLoaded}/70`, icon: Truck },
            { label: 'Doors Dispatched', value: doorsDispatched, sub: 'Gate pass signed', icon: CheckCircle2 },
            { label: 'Payment Holds', value: paymentHoldsCount, sub: 'Disallowed picking', icon: DollarSign, alert: paymentHoldsCount > 0 },
            { label: 'Stock Shortages', value: stockShortagesCount, sub: 'Quarantine / shortage', icon: AlertCircle, alert: stockShortagesCount > 0 },
          ].map((op, idx) => {
            const Icon = op.icon;
            return (
              <div key={idx} className={`p-3 rounded-xl border flex flex-col justify-between ${
                op.alert ? 'bg-rose-50/60 border-rose-200 text-rose-900' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A]'
              }`}>
                <div className="flex items-center justify-between text-[#64748B] mb-1">
                  <span className="text-[10px] font-bold uppercase truncate">{op.label}</span>
                  <Icon className="w-3.5 h-3.5 opacity-80" />
                </div>
                <div>
                  <div className="text-xl font-extrabold font-mono">{op.value}</div>
                  <div className="text-[10px] text-[#64748B] truncate mt-0.5">{op.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4 Intermediate Loading Milestones */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#E2E8F0] overflow-x-auto no-scrollbar">
          <span className="text-xs font-bold text-[#0F172A] shrink-0">Loading Milestones:</span>
          {LOADING_MILESTONES.map((m, idx) => {
            const achieved = totalDoorsLoaded >= m.target;
            return (
              <div 
                key={m.id}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shrink-0 ${
                  achieved ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
                }`}
              >
                <span className="font-mono">Milestone {idx + 1}: {m.target} Doors</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  achieved ? 'bg-emerald-200 text-emerald-900' : 'bg-[#E2E8F0] text-[#64748B]'
                }`}>
                  {achieved ? '✓ Reached' : 'Pending'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. DEPARTMENT PERFORMANCE TABLE */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Department Performance</h2>
            <p className="text-xs text-[#64748B]">Real-time departmental workload, completion quotas, and pending actions across 10 wings</p>
          </div>
          <span className="text-xs text-[#64748B] font-mono">10 Active Departments</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Department Head</th>
                <th className="py-2.5 px-2 text-center">Total Assigned</th>
                <th className="py-2.5 px-2 text-center">Completed</th>
                <th className="py-2.5 px-2 text-center">Pending</th>
                <th className="py-2.5 px-2 text-center">Overdue</th>
                <th className="py-2.5 px-3">Completion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {departmentPerformanceData.map(d => (
                <tr 
                  key={d.id}
                  onClick={() => setSelectedDeptDetail(d)}
                  className="hover:bg-[#F8FAFC] transition cursor-pointer"
                >
                  <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{d.name}</td>
                  <td className="py-2.5 px-3 text-[#64748B]">{d.headName}</td>
                  <td className="py-2.5 px-2 text-center font-mono font-bold text-[#0F172A]">{d.total}</td>
                  <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-700">{d.completed}</td>
                  <td className="py-2.5 px-2 text-center font-mono text-[#64748B]">{d.pending}</td>
                  <td className="py-2.5 px-2 text-center font-mono font-bold">
                    {d.overdue > 0 ? (
                      <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-bold">{d.overdue}</span>
                    ) : <span className="text-[#64748B]">0</span>}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-[#F8FAFC] rounded-full h-1.5 overflow-hidden border border-[#E2E8F0]">
                        <div className="bg-[#05331F] h-1.5 rounded-full" style={{ width: `${d.pct}%` }} />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#0F172A]">{d.pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MY TEAM OVERVIEW (Visible to Managers & Leadership) */}
      {(isLeadership || isDeptHead) && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">My Team Overview</h2>
              <p className="text-xs text-[#64748B]">Team member allocations, daily task achievements, and overdue accountability</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-[#64748B]">Team Completion Rate: <strong className="text-[#05331F] font-mono">{teamOverview.stats.teamRate}%</strong></span>
              <span className="text-[#64748B] font-mono">({teamOverview.stats.completedMembers}/{teamOverview.stats.totalMembers} members done)</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Employee</th>
                  <th className="py-2.5 px-3">Designation</th>
                  <th className="py-2.5 px-2 text-center">Assigned</th>
                  <th className="py-2.5 px-2 text-center">Completed</th>
                  <th className="py-2.5 px-2 text-center">Pending</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {teamOverview.rows.map(emp => (
                  <tr key={emp.id} className="hover:bg-[#F8FAFC] transition">
                    <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{emp.name}</td>
                    <td className="py-2.5 px-3 text-[#64748B]">{emp.role}</td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-[#0F172A]">{emp.assigned}</td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-700">{emp.completed}</td>
                    <td className="py-2.5 px-2 text-center font-mono text-[#64748B]">{emp.pending}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        emp.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                        emp.status === 'Overdue Action' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. TASK MONITORING TABLE WITH FILTERS & PAGINATION */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Task Monitoring</h2>
            <p className="text-xs text-[#64748B]">Real-time audit table of all active operations and corporate assignments</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search tasks, staff, ID..."
                value={taskSearch}
                onChange={(e) => { setTaskSearch(e.target.value); setTaskPage(1); }}
                className="w-56 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none focus:bg-white focus:border-[#05331F]"
              />
              <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          {[
            { id: 'all', label: 'All Tasks' },
            { id: 'my', label: 'My Tasks' },
            { id: 'today', label: 'Today’s Tasks' },
            { id: 'in_progress', label: 'In Progress' },
            { id: 'pending_approval', label: 'Pending Approval' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'blocked', label: 'Blocked' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => { setTaskFilter(f.id); setTaskPage(1); }}
              className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                taskFilter === f.id ? 'bg-[#05331F] text-white shadow-2xs' : 'text-[#64748B] hover:bg-[#F8FAFC]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tasks Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Task ID</th>
                <th className="py-2.5 px-3">Title</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Assigned Employee</th>
                <th className="py-2.5 px-2 text-center">Priority</th>
                <th className="py-2.5 px-3">Due Time</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {paginatedTasks.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-[#64748B] text-xs">
                    No tasks match the selected filter and query.
                  </td>
                </tr>
              ) : (
                paginatedTasks.map(task => (
                  <tr key={task.id} className="hover:bg-[#F8FAFC] transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#64748B]">{task.id.slice(0, 10)}</td>
                    <td className="py-2.5 px-3 font-semibold text-[#0F172A] max-w-xs truncate">{task.title}</td>
                    <td className="py-2.5 px-3 text-[#64748B]">{task.departmentName || task.department}</td>
                    <td className="py-2.5 px-3 text-[#0F172A]">{task.assignedToName || 'Unassigned'}</td>
                    <td className="py-2.5 px-2 text-center">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                        task.priority === 'Critical' ? 'bg-rose-100 text-rose-800' :
                        task.priority === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {task.priority || 'Normal'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#64748B]">{task.deadlineTime || task.deadlineDate || 'EOD'}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        task.status === TASK_STATUSES.COMPLETED ? 'bg-emerald-100 text-emerald-800' :
                        task.status === TASK_STATUSES.IN_PROGRESS ? 'bg-blue-100 text-blue-800' :
                        task.status === TASK_STATUSES.BLOCKED ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onOpenTaskDetails && onOpenTaskDetails(task)}
                        className="inline-flex items-center gap-1 text-[#05331F] font-bold hover:underline cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0] text-xs text-[#64748B]">
          <span>Page {taskPage} of {totalPages} ({filteredTasks.length} total tasks)</span>
          <div className="flex items-center gap-1">
            <button
              disabled={taskPage <= 1}
              onClick={() => setTaskPage(p => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] disabled:opacity-40 hover:bg-[#F8FAFC]"
            >
              Previous
            </button>
            <button
              disabled={taskPage >= totalPages}
              onClick={() => setTaskPage(p => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] disabled:opacity-40 hover:bg-[#F8FAFC]"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* 7. SPLIT SECTION: CRITICAL ALERTS & RECENT ACTIVITY TIMELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Critical Alerts and Escalations */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-bold text-[#0F172A]">Critical Alerts & Escalations</h3>
            </div>
            <button
              onClick={() => onNavigateToTab && onNavigateToTab('escalations')}
              className="text-xs font-bold text-[#05331F] hover:underline"
            >
              Escalation Matrix →
            </button>
          </div>

          <div className="space-y-2.5">
            {criticalAlerts.length === 0 ? (
              <div className="py-8 text-center text-[#64748B] text-xs">
                Zero active alerts. All department operations are within tolerance.
              </div>
            ) : (
              criticalAlerts.map(alert => (
                <div key={alert.id} className="p-3 rounded-xl bg-rose-50/50 border border-rose-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-900">{alert.issue}</span>
                    <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded">
                      {alert.escalationLevel}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    Assigned: <strong className="text-[#0F172A]">{alert.employee}</strong> ({alert.department})
                  </div>
                  <div className="text-[11px] text-rose-700 font-medium">
                    Required Action: {alert.action}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activities Timeline */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-[#0F172A]">Recent Activities</h3>
            </div>
            <span className="text-[10px] font-mono font-bold bg-[#F8FAFC] px-2 py-0.5 rounded text-[#64748B]">
              Immutable Audit Log
            </span>
          </div>

          <div className="space-y-2.5 max-h-[320px] overflow-y-auto no-scrollbar">
            {recentActivities.length === 0 ? (
              <div className="py-8 text-center text-[#64748B] text-xs">
                No recent task activity recorded today.
              </div>
            ) : (
              recentActivities.map((act, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs pb-2 border-b border-[#F8FAFC] last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0F172A] truncate">{act.performedByName}</span>
                      <span className="text-[10px] text-[#64748B] font-mono">{act.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-[#64748B] truncate">{act.details}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
