import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, Clock, AlertTriangle, Layers, ArrowRight, 
  Search, Eye, ChevronDown, Check, ArrowUpRight, BarChart2,
  Calendar, CheckSquare, Plus, AlertCircle, TrendingUp, TrendingDown,
  Package, Users, Briefcase, UserCheck, Megaphone, ExternalLink, MessageSquare,
  Truck, Wrench, Play, CreditCard, ShieldAlert
} from 'lucide-react';
import { TASK_STATUSES } from './rbac';
import { getTodayDateString, getDateOffset } from './dateUtils';
import { COMPANY_DEPARTMENTS } from './orgTree';
import { 
  getScope, 
  getVisibleUserIds, 
  canAccess,
  SCOPES, 
  PAGES,
  normalizeRoleName,
  getPerformanceVisibleEmployees 
} from './permissions';
import { canAccessSales } from './salesPermissions';
import { formatName, formatDepartment } from './orgHelpers';
import WarehouseDashboardView from './components/warehouse/WarehouseDashboardView';
import TransportationDashboardView from './components/transportation/TransportationDashboardView';
import DashboardKPICard from './components/common/DashboardKPICard';

function getGreeting(name) {
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const rawFirst = (name || '').trim().split(' ')[0] || 'Team';
  const formattedName = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1).toLowerCase();
  return `${timeGreeting}, ${formattedName}`;
}

const OPERATIONS_BRANCHES_META = [
  { id: 'warehouse', name: 'Warehouse', headRole: 'Warehouse In-charge', defaultHead: 'MUHAMMED SUHAIB' },
  { id: 'transportation', name: 'Transportation', headRole: 'Transport Manager', defaultHead: 'NAYAN RAM' },
  { id: 'service', name: 'Service', headRole: 'Service Manager', defaultHead: 'AMAL KUMAR T K' },
  { id: 'inventory', name: 'Inventory', headRole: 'Inventory Supervisor', defaultHead: 'TOBIN THOMAS' }
];

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
  const userRole = normalizeRoleName(currentUser?.role || '');
  const userDept = (currentUser?.department || '').toLowerCase();

  // Finance Role Heuristics
  const isFinanceRole = userDept === 'finance' || userDept === 'accounts' ||
                        ['Accounts Manager', 'Accountant'].includes(userRole);
  const isAccountsManager = userRole === 'Accounts Manager';
  const isAccountant = userRole === 'Accountant';

  // Operations Role Heuristics
  const isOperationsHead = userRole === 'Operations Head';
  const isWarehouseInCharge = userRole === 'Warehouse In-charge';
  const isWarehouseSupervisor = userRole === 'Warehouse Supervisor' || userRole === 'Warehouse Executive';
  const isLoadingStaff = userRole === 'Loading Staff';
  const isWarehouseDepartmentRole = (userDept === 'warehouse' || isWarehouseInCharge || isWarehouseSupervisor || isLoadingStaff);
  const isTransportManager = userRole === 'Transport Manager';
  const isTransportCoordinator = userRole === 'Transport Coordinator';
  const isDriver = userRole === 'Driver' || userRole === 'Delivery Partner';
  const isTransportationDepartmentRole = (userDept === 'transportation' || userDept === 'trans' || isTransportManager || isTransportCoordinator || isDriver);
  const isServiceManager = userRole === 'Service Manager';
  const isInventorySupervisor = userRole === 'Inventory Supervisor';

  const isOperationsBranchManager = isWarehouseInCharge || isTransportManager || isServiceManager || isInventorySupervisor;
  const isOperationsSupervisor = userRole.includes('Supervisor') || userRole.includes('Coordinator');

  const isFrontline = ['Loading Staff', 'Driver', 'Delivery Partner', 'Technician', 'Service Technician', 'Storekeeper'].includes(userRole);

  const isOperationsRole = isOperationsHead || isOperationsBranchManager || isOperationsSupervisor || isFrontline || userRole === 'Operations Assistant';

  // Marketing Persona Check
  const isMarketingRole = userDept === 'marketing' || ['Brand Manager', 'Leads Coordinator', 'Graphic Designer', 'Photographer'].includes(userRole);
  const isBrandManager = userRole === 'Brand Manager';
  const isLeadsCoordinator = userRole === 'Leads Coordinator';
  const isMarketingReviewer = isBrandManager || isLeadsCoordinator;

  // HR Leadership Check
  const isHRManager = useMemo(() => {
    const r = userRole.toLowerCase();
    return r.includes('hr manager') || r.includes('admin manager');
  }, [userRole]);

  // 1. Get visible user IDs according to RBAC scope
  const visibleUserIds = useMemo(() => {
    return getVisibleUserIds(currentUser, employees);
  }, [currentUser, employees]);

  // 2. Filter tasks strictly by visible user IDs / scope
  const scopedTasks = useMemo(() => {
    if (scope === SCOPES.COMPANY && !isHRManager) {
      return tasks;
    }
    const idSet = new Set(visibleUserIds.map(String));
    // Also include currentUser aliases
    if (currentUser?.id) idSet.add(String(currentUser.id));
    if (currentUser?.uid) idSet.add(String(currentUser.uid));
    if (currentUser?.employeeId) {
      idSet.add(String(currentUser.employeeId));
      idSet.add(`emp_${currentUser.employeeId}`);
    }

    return tasks.filter(t => {
      const assignedId = String(t.assignedToId || t.assignedTo || '');
      const driverId = String(t.assignedDriverId || t.driverId || '');
      const taskAssigneeIds = Array.isArray(t.assigneeIds) ? t.assigneeIds.map(String) : [];
      const isMine = idSet.has(assignedId) || (driverId && idSet.has(driverId)) || taskAssigneeIds.some(id => idSet.has(id));
      // For Brand Manager: include marketing requests
      const isMktReq = isBrandManager && (t.isMarketingRequest || t.category === 'Marketing Request');
      // For Operations Head: include all operations branch tasks
      const isOpsDept = isOperationsHead && ['operations', 'warehouse', 'transportation', 'service', 'inventory', 'qc'].includes((t.departmentId || t.department || '').toLowerCase());
      // For Finance: include all finance tasks
      const isFinTask = isFinanceRole && ((t.departmentId || t.department || '').toLowerCase() === 'finance' || t.taskType === 'Payment verification');
      return isMine || isMktReq || isOpsDept || isFinTask;
    });
  }, [scope, isHRManager, visibleUserIds, tasks, isBrandManager, isOperationsHead, isFinanceRole]);

  // 3. Computed KPI metrics (Total, Completed, Pending, Overdue)
  const todayTasks = useMemo(() => {
    return scopedTasks.filter(t => {
      const taskDate = t.taskDate || t.deadlineDate || t.createdAt || '';
      return taskDate.startsWith(todayStr);
    });
  }, [scopedTasks, todayStr]);

  const yesterdayTasks = useMemo(() => {
    return scopedTasks.filter(t => {
      const taskDate = t.taskDate || t.deadlineDate || t.createdAt || '';
      return taskDate.startsWith(yesterdayStr);
    });
  }, [scopedTasks, yesterdayStr]);

  const totalTasksToday = todayTasks.length;
  const completedToday = todayTasks.filter(t => t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed').length;
  const pendingToday = todayTasks.filter(t => t.status !== TASK_STATUSES.COMPLETED && t.status !== 'Completed').length;
  
  const overdueToday = useMemo(() => {
    return scopedTasks.filter(t => {
      const isDone = t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed';
      const isOverdue = (t.deadlineDate && t.deadlineDate < todayStr) || t.status === TASK_STATUSES.OVERDUE || t.status === 'Overdue' || t.status === 'Blocked';
      return !isDone && isOverdue;
    }).length;
  }, [scopedTasks, todayStr]);

  const completionPct = totalTasksToday > 0 ? Math.round((completedToday / totalTasksToday) * 100) : 0;

  // Sub-label matching scope ("Your team")
  const scopeKpiLabel = useMemo(() => {
    if (isFinanceRole) return 'Your team';
    if (isOperationsRole) {
      if (isOperationsHead) return 'All Operations branches';
      if (isOperationsBranchManager) return 'Your branch';
      if (isOperationsSupervisor) return 'Your team';
      return 'Assigned to you';
    }
    if (isMarketingRole) {
      if (isBrandManager) return 'Marketing department';
      if (isLeadsCoordinator) return 'Your squad';
      return 'Assigned to you';
    }
    if (isHRManager) return 'Your team';
    if (scope === SCOPES.COMPANY) return 'Across the company';
    if (scope === SCOPES.DEPARTMENT) return 'Your department';
    if (scope === SCOPES.DOWNLINE) return 'Your squad';
    return 'Assigned to you';
  }, [scope, isFinanceRole, isHRManager, isOperationsRole, isOperationsHead, isOperationsBranchManager, isOperationsSupervisor, isMarketingRole, isBrandManager, isLeadsCoordinator]);

  // 4. FINANCE PAYMENT VERIFICATION LIST (Pending verifications sorted by required-by date, age, holds on top)
  const financePaymentVerifications = useMemo(() => {
    if (!isFinanceRole) return [];
    
    // Find all payment verification tasks
    const payTasks = scopedTasks.filter(t => 
      t.taskType === 'Payment verification' ||
      (t.title && t.title.toLowerCase().includes('payment')) ||
      (t.title && t.title.toLowerCase().includes('token'))
    );

    const now = new Date();
    const formatted = payTasks.map(t => {
      const reqDate = t.requiredBy || t.deadlineDate || todayStr;
      const createdDate = t.createdAt ? new Date(t.createdAt) : now;
      const ageHours = Math.max(0, Math.floor((now - createdDate) / (1000 * 60 * 60)));
      const ageDays = Math.floor(ageHours / 24);
      const isHold = t.paymentStatus === 'Payment Hold' || t.accountsClearance === 'Payment Hold';

      return {
        ...t,
        reqDate,
        ageStr: ageDays > 0 ? `${ageDays}d ${ageHours % 24}h` : `${ageHours}h`,
        isHold
      };
    });

    // Sort: Holds on top, then by required-by date ascending
    return formatted.sort((a, b) => {
      if (a.isHold && !b.isHold) return -1;
      if (!a.isHold && b.isHold) return 1;
      return a.reqDate.localeCompare(b.reqDate);
    });
  }, [isFinanceRole, scopedTasks, todayStr]);

  // 5. BRANCH GRID FOR OPERATIONS HEAD (Warehouse, Transportation, Service, Inventory)
  const operationsBranchStats = useMemo(() => {
    if (!isOperationsHead) return [];

    const stats = OPERATIONS_BRANCHES_META.map(branch => {
      const branchTasks = tasks.filter(t => {
        const d = (t.departmentId || t.department || '').toLowerCase();
        return d.includes(branch.id);
      });

      const todayBranchTasks = branchTasks.filter(t => (t.taskDate || t.deadlineDate || t.createdAt || '').startsWith(todayStr));
      const total = todayBranchTasks.length;
      const completed = todayBranchTasks.filter(t => t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed').length;
      const overdue = todayBranchTasks.filter(t => {
        const isDone = t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed';
        const isOvd = (t.deadlineDate && t.deadlineDate < todayStr) || t.status === 'Overdue' || t.status === 'Blocked';
        return !isDone && isOvd;
      }).length;

      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Find branch head name
      const headEmp = employees.find(e => (e.role || '').toLowerCase().includes(branch.headRole.toLowerCase()));
      const headName = headEmp ? (headEmp.fullName || headEmp.name) : branch.defaultHead;

      return {
        ...branch,
        headName,
        total,
        completed,
        overdue,
        rate
      };
    });

    // Sort by most urgent first (overdue desc, then total desc)
    return stats.sort((a, b) => b.overdue - a.overdue || b.total - a.total);
  }, [isOperationsHead, tasks, employees, todayStr]);

  // 6. SQUAD MEMBERS TABLE (Accounts Manager, Branch Managers & Supervisors: Name, Role, Tasks done/total, overdue, waiting for sign-off)
  const squadMembersStats = useMemo(() => {
    const isSquadLeader = (isAccountsManager || isOperationsBranchManager || isOperationsSupervisor || isHRManager || (isMarketingRole && isMarketingReviewer));
    if (!isSquadLeader) return [];

    const myId = String(currentUser?.id || currentUser?.uid || currentUser?.employeeId);
    const downlineEmp = employees.filter(emp => {
      const eId = String(emp.id || emp.uid || emp.employeeId);
      return eId !== myId && visibleUserIds.includes(eId);
    });

    return downlineEmp.map(emp => {
      const empId = String(emp.id || emp.uid || emp.employeeId);
      const empTasks = tasks.filter(t => String(t.assignedToId || t.assignedTo) === empId);
      const todayEmpTasks = empTasks.filter(t => (t.taskDate || t.deadlineDate || t.createdAt || '').startsWith(todayStr));
      const total = todayEmpTasks.length;
      const done = todayEmpTasks.filter(t => t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed').length;
      const inReview = todayEmpTasks.filter(t => t.status === TASK_STATUSES.PENDING_REVIEW || t.status === 'Pending Review' || t.status === 'In Review').length;
      const ovd = todayEmpTasks.filter(t => {
        const isCompleted = t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed';
        return !isCompleted && ((t.deadlineDate && t.deadlineDate < todayStr) || t.status === 'Overdue' || t.status === 'Blocked');
      }).length;

      return {
        id: empId,
        name: emp.fullName || emp.name,
        designation: emp.designation || emp.role || 'Staff',
        total,
        done,
        inReview,
        ovd,
        status: ovd > 0 ? 'Needs Attention' : inReview > 0 ? 'In Review' : total > 0 && done === total ? 'All Complete' : total > 0 ? 'In Progress' : 'No Tasks'
      };
    });
  }, [isAccountsManager, isOperationsBranchManager, isOperationsSupervisor, isHRManager, isMarketingRole, isMarketingReviewer, currentUser, employees, visibleUserIds, tasks, todayStr]);

  // 7. Frontline Today Tasks (Large Cards with Start, Done, Next Deadline)
  const frontlineTasks = useMemo(() => {
    if (!isFrontline) return [];
    return scopedTasks.filter(t => {
      const isDone = t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed';
      return !isDone;
    });
  }, [isFrontline, scopedTasks]);

  const nextFrontlineDeadline = useMemo(() => {
    if (!isFrontline || frontlineTasks.length === 0) return null;
    return [...frontlineTasks].sort((a, b) => (a.deadlineDate || '').localeCompare(b.deadlineDate || ''))[0];
  }, [isFrontline, frontlineTasks]);

  // Open To-Dos
  const openTodos = useMemo(() => {
    return todos.filter(t => !t.done).slice(0, 5);
  }, [todos]);

  // Team-Based Performance Breakdown (Dynamic Graph for All Teams & In-Scope Employees)
  const [selectedPerfTeamId, setSelectedPerfTeamId] = useState('all');
  const [perfTimeframe, setPerfTimeframe] = useState('today'); // 'today' | '7days' | 'month'
  const [perfGraphType, setPerfGraphType] = useState('bars'); // 'bars' | 'trend' | 'donut' | 'radar'

  const inScopePerfEmployees = useMemo(() => {
    return getPerformanceVisibleEmployees(currentUser, employees);
  }, [currentUser, employees]);

  // Determine timeframe boundary
  const perfStartDate = useMemo(() => {
    if (perfTimeframe === 'today') return todayStr;
    if (perfTimeframe === '7days') return getDateOffset(-7);
    return getDateOffset(-30);
  }, [perfTimeframe, todayStr]);

  // Pre-calculate per-employee metrics across the timeframe
  const empPerfMap = useMemo(() => {
    const map = new Map();
    const timeframeTasks = tasks.filter(t => {
      const taskDate = (t.taskDate || t.date || t.deadlineDate || t.createdAt || '').slice(0, 10);
      if (!taskDate) return true;
      return taskDate >= perfStartDate && taskDate <= todayStr;
    });

    inScopePerfEmployees.forEach(emp => {
      const eId = String(emp.id || emp.uid || emp.employeeId);
      const empTasks = timeframeTasks.filter(t => String(t.assignedToId || t.assignedTo) === eId);
      const total = empTasks.length;
      const done = empTasks.filter(t => t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed').length;
      const ovd = empTasks.filter(t => {
        const isDone = t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed';
        const taskDeadline = (t.deadlineDate || '').slice(0, 10);
        return !isDone && (taskDeadline && taskDeadline < todayStr);
      }).length;
      const rate = total > 0 ? Math.round((done / total) * 100) : 0;

      map.set(eId, {
        total,
        done,
        ovd,
        rate,
        pending: total - done
      });
    });

    return map;
  }, [inScopePerfEmployees, tasks, perfStartDate, todayStr]);

  // 7-day trend breakdown per team
  const last7DaysList = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = getDateOffset(i - 6);
      return {
        dateStr: d,
        dayLabel: new Date(d).toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.slice(8)
      };
    });
  }, []);

  // Aggregate by Team
  const teamPerformanceData = useMemo(() => {
    const inScopeEmpIdSet = new Set(inScopePerfEmployees.map(e => String(e.id || e.uid || e.employeeId)));

    // Active teams that have in-scope members or leaders
    const validTeams = teams.filter(t => {
      if (t.status === 'inactive') return false;
      const mIds = (t.members || []).map(m => String(m.id || m.userId || m.employeeId));
      const hasMember = mIds.some(id => inScopeEmpIdSet.has(id));
      const hasLeader = inScopeEmpIdSet.has(String(t.leaderId));
      return hasMember || hasLeader;
    });

    const list = validTeams.map(t => {
      const mIds = (t.members || []).map(m => String(m.id || m.userId || m.employeeId));
      // Include leader as well
      const allTeamIds = Array.from(new Set([...mIds, String(t.leaderId)].filter(Boolean)));
      
      const inScopeTeamMembers = allTeamIds
        .filter(id => inScopeEmpIdSet.has(id))
        .map(id => {
          const emp = inScopePerfEmployees.find(e => String(e.id || e.uid || e.employeeId) === id);
          const stats = empPerfMap.get(id) || { total: 0, done: 0, ovd: 0, rate: 0, pending: 0 };
          return {
            id,
            name: formatName(emp?.fullName || emp?.name || 'Member'),
            role: emp?.designation || emp?.role || 'Staff',
            isLeader: String(t.leaderId) === id,
            ...stats
          };
        });

      let teamTotal = 0;
      let teamDone = 0;
      let teamOvd = 0;

      inScopeTeamMembers.forEach(m => {
        teamTotal += m.total;
        teamDone += m.done;
        teamOvd += m.ovd;
      });

      const teamRate = teamTotal > 0 ? Math.round((teamDone / teamTotal) * 100) : 0;

      // Calculate 7-day trend history for this team
      const memberIdSet = new Set(allTeamIds);
      const trend7Days = last7DaysList.map(d => {
        const dayTasks = tasks.filter(task => {
          const aId = String(task.assignedToId || task.assignedTo || '');
          if (!memberIdSet.has(aId)) return false;
          const taskDate = (task.taskDate || task.date || task.deadlineDate || task.createdAt || '').slice(0, 10);
          return taskDate === d.dateStr;
        });
        const dTotal = dayTasks.length;
        const dDone = dayTasks.filter(t => t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed').length;
        const dRate = dTotal > 0 ? Math.round((dDone / dTotal) * 100) : 0;
        return {
          ...d,
          total: dTotal,
          done: dDone,
          rate: dRate
        };
      });

      return {
        id: t.id,
        name: formatName(t.name),
        department: formatDepartment(t.departmentId || t.department),
        leaderName: formatName(t.leaderName || 'Team Leader'),
        members: inScopeTeamMembers,
        total: teamTotal,
        done: teamDone,
        ovd: teamOvd,
        pending: Math.max(0, teamTotal - teamDone - teamOvd),
        rate: teamRate,
        trend7Days
      };
    });

    return list;
  }, [teams, inScopePerfEmployees, empPerfMap, last7DaysList, tasks]);

  // Determine teams to show (or all)
  const activeDisplayedTeams = useMemo(() => {
    if (selectedPerfTeamId === 'all') return teamPerformanceData;
    return teamPerformanceData.filter(t => t.id === selectedPerfTeamId);
  }, [selectedPerfTeamId, teamPerformanceData]);

  // If user belongs to Warehouse department (Warehouse In-charge, Supervisor, Loading Staff), render specialized Warehouse Dashboard
  if (isWarehouseDepartmentRole && !isOperationsHead) {
    return (
      <WarehouseDashboardView
        tasks={tasks}
        currentUser={currentUser}
        employees={employees}
        bookings={bookings}
        onOpenTaskDetails={onOpenTaskDetails}
        onOpenAssignModal={onOpenAssignModal}
        onNavigateToTab={onNavigateToTab}
      />
    );
  }

  // If user belongs to Transportation department (Transport Manager, Coordinator, Drivers), render specialized Transportation Dashboard
  if (isTransportationDepartmentRole && !isOperationsHead) {
    return (
      <TransportationDashboardView
        tasks={tasks}
        currentUser={currentUser}
        employees={employees}
        bookings={bookings}
        onOpenTaskDetails={onOpenTaskDetails}
        onOpenAssignModal={onOpenAssignModal}
        onNavigateToTab={onNavigateToTab}
      />
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Clean Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {getGreeting(currentUser?.fullName || currentUser?.name)}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })} • {currentUser?.role || 'Staff'}
          </p>
        </div>

        {/* Action shortcut: Assign Task & Team Performance */}
        <div className="flex items-center gap-2">
          {onOpenAssignModal && (
            <button
              onClick={onOpenAssignModal}
              className="px-3.5 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472B] text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-300" />
              <span>Assign Task</span>
            </button>
          )}

          {canAccess(currentUser, PAGES.TEAM_PERFORMANCE) && (
            <button
              onClick={() => onNavigateToTab && onNavigateToTab('team_performance')}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition bg-white"
            >
              <BarChart2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Team Performance</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Metric Cards (Total, Completed, Pending, Overdue) - Premium SaaS Design */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardKPICard
          label="Total Tasks"
          value={totalTasksToday}
          subtext={scopeKpiLabel}
          icon={Layers}
          variant="default"
          onClick={() => onNavigateToTab && onNavigateToTab('all_tasks')}
        />

        <DashboardKPICard
          label="Completed"
          value={completedToday}
          subtext={`${completionPct}% finished today`}
          icon={CheckCircle2}
          variant="success"
          onClick={() => onNavigateToTab && onNavigateToTab('all_tasks')}
        />

        <DashboardKPICard
          label="In Progress"
          value={pendingToday}
          subtext="Active execution"
          icon={Clock}
          variant="warning"
          onClick={() => onNavigateToTab && onNavigateToTab('all_tasks')}
        />

        <DashboardKPICard
          label="Overdue"
          value={overdueToday}
          subtext={overdueToday > 0 ? "Requires attention" : "All on schedule"}
          icon={AlertTriangle}
          variant={overdueToday > 0 ? "danger" : "default"}
          onClick={() => onNavigateToTab && onNavigateToTab('all_tasks')}
        />
      </div>

      {/* 2.5 TEAM-BASED EMPLOYEE PERFORMANCE GRAPH & BENCHMARK */}
      {teamPerformanceData.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#05331F] flex items-center justify-center font-bold">
                  <BarChart2 className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                    Team Squads Performance & Employee Breakdown
                  </h2>
                  <p className="text-xs text-slate-500">
                    Live execution graph of employees grouped by their assigned squads
                  </p>
                </div>
              </div>
            </div>

            {/* Filter controls: Graph Type, Squad Selector & Timeframe */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Variety Graph Type Switcher */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
                {[
                  { id: 'bars', label: 'Bar Graph' },
                  { id: 'trend', label: '7-Day Trend' },
                  { id: 'donut', label: 'Donut Share' }
                ].map(g => (
                  <button
                    key={g.id}
                    onClick={() => setPerfGraphType(g.id)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                      perfGraphType === g.id 
                        ? 'bg-[#05331F] text-white shadow-2xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

              <select
                value={selectedPerfTeamId}
                onChange={(e) => setSelectedPerfTeamId(e.target.value)}
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-[#05331F] cursor-pointer"
              >
                <option value="all">All Teams ({teamPerformanceData.length})</option>
                {teamPerformanceData.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.department})</option>
                ))}
              </select>

              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
                {[
                  { id: 'today', label: 'Today' },
                  { id: '7days', label: '7 Days' },
                  { id: 'month', label: '30 Days' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPerfTimeframe(p.id)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                      perfTimeframe === p.id 
                        ? 'bg-[#05331F] text-white shadow-2xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Teams Grid of Graphs with Selected Variety View */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {activeDisplayedTeams.map(team => (
              <div 
                key={team.id}
                className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-4 hover:border-emerald-300 transition"
              >
                {/* Team Header & Overall Progress */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{team.name}</h3>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                        {team.department}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Leader: <span className="font-semibold text-slate-700">{team.leaderName}</span> • {team.members.length} members
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-extrabold text-[#05331F]">{team.rate}%</span>
                    <p className="text-[10px] text-slate-400">{team.done} of {team.total} done</p>
                  </div>
                </div>

                {/* GRAPH VARIETY 1: Horizontal Progress Bar Breakdown */}
                {perfGraphType === 'bars' && (
                  <div className="space-y-3">
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-[#05331F] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${team.rate}%` }}
                      />
                    </div>

                    <div className="space-y-2 pt-1">
                      {team.members.length === 0 ? (
                        <div className="text-center py-4 text-slate-400 text-xs">
                          No members assigned to this squad yet.
                        </div>
                      ) : (
                        team.members.map(member => (
                          <div key={member.id} className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-bold text-slate-800 truncate">{member.name}</span>
                                {member.isLeader && (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold shrink-0">
                                    Lead
                                  </span>
                                )}
                                <span className="text-[11px] text-slate-400 truncate">({member.role})</span>
                              </div>

                              <div className="flex items-center gap-3 shrink-0 text-[11px]">
                                {member.ovd > 0 && (
                                  <span className="text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.2 rounded">
                                    {member.ovd} overdue
                                  </span>
                                )}
                                <span className="text-slate-600 font-medium">
                                  {member.done}/{member.total}
                                </span>
                                <span className="font-bold text-[#05331F] min-w-[32px] text-right">
                                  {member.rate}%
                                </span>
                              </div>
                            </div>

                            {/* Multi-segment execution bar */}
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                              {member.total > 0 ? (
                                <>
                                  <div 
                                    className="bg-emerald-600 h-full transition-all duration-300"
                                    style={{ width: `${(member.done / member.total) * 100}%` }}
                                    title={`Completed: ${member.done}`}
                                  />
                                  <div 
                                    className="bg-amber-400 h-full transition-all duration-300"
                                    style={{ width: `${(Math.max(0, member.total - member.done - member.ovd) / member.total) * 100}%` }}
                                    title={`In Progress: ${Math.max(0, member.total - member.done - member.ovd)}`}
                                  />
                                  <div 
                                    className="bg-rose-500 h-full transition-all duration-300"
                                    style={{ width: `${(member.ovd / member.total) * 100}%` }}
                                    title={`Overdue: ${member.ovd}`}
                                  />
                                </>
                              ) : (
                                <div className="bg-slate-200 h-full w-full" title="No tasks logged" />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* GRAPH VARIETY 2: 7-Day Velocity Column Trend Chart */}
                {perfGraphType === 'trend' && (
                  <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">Squad 7-Day Velocity Trend</span>
                      <span className="text-[11px] text-slate-400">Tasks Completed Daily</span>
                    </div>

                    <div className="h-32 flex items-end justify-between gap-2 pt-4 px-2 border-b border-slate-100">
                      {team.trend7Days.map(d => {
                        const maxH = Math.max(...team.trend7Days.map(x => x.total), 1);
                        const totalPct = Math.round((d.total / maxH) * 100);
                        const donePct = d.total > 0 ? Math.round((d.done / d.total) * 100) : 0;
                        const isToday = d.dateStr === todayStr;

                        return (
                          <div key={d.dateStr} className="flex-1 flex flex-col items-center gap-1 group relative">
                            {/* Hover tooltip */}
                            <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-md pointer-events-none whitespace-nowrap z-10">
                              {d.done} / {d.total} Done ({d.rate}%)
                            </div>

                            {/* Bar Column */}
                            <div className="w-full max-w-[28px] h-24 bg-slate-100 rounded-t-lg flex flex-col justify-end overflow-hidden">
                              <div 
                                className={`w-full rounded-t-lg transition-all duration-300 ${isToday ? 'bg-[#05331F]' : 'bg-emerald-600'}`}
                                style={{ height: `${Math.max(totalPct > 0 ? 12 : 4, (d.done / maxH) * 100)}%` }}
                              />
                            </div>

                            {/* Label */}
                            <span className={`text-[10px] ${isToday ? 'font-bold text-[#05331F]' : 'text-slate-500'}`}>
                              {d.dayLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Member trend list */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                      {team.members.map(m => (
                        <div key={m.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <span className="truncate text-slate-700 font-medium text-[11px]">{m.name}</span>
                          <span className="font-bold text-[#05331F] text-[11px]">{m.rate}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* GRAPH VARIETY 3: SVG Circular Donut Chart with Status Distribution */}
                {perfGraphType === 'donut' && (
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-2xs space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
                      {/* Interactive SVG Donut */}
                      <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                        {(() => {
                          const circumference = 2 * Math.PI * 40; // ~251.3
                          const total = Math.max(team.total, 1);
                          const doneDash = (team.done / total) * circumference;
                          const pendDash = (team.pending / total) * circumference;
                          const ovdDash = (team.ovd / total) * circumference;

                          return (
                            <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                className="text-slate-100"
                                strokeWidth="12"
                                stroke="currentColor"
                                fill="transparent"
                              />
                              {/* Completed Ring (Emerald) */}
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                className="text-emerald-600 transition-all duration-500"
                                strokeWidth="12"
                                strokeDasharray={`${doneDash} ${circumference}`}
                                strokeDashoffset="0"
                                stroke="currentColor"
                                fill="transparent"
                              />
                              {/* Pending Ring (Amber) */}
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                className="text-amber-400 transition-all duration-500"
                                strokeWidth="12"
                                strokeDasharray={`${pendDash} ${circumference}`}
                                strokeDashoffset={`-${doneDash}`}
                                stroke="currentColor"
                                fill="transparent"
                              />
                              {/* Overdue Ring (Rose) */}
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                className="text-rose-500 transition-all duration-500"
                                strokeWidth="12"
                                strokeDasharray={`${ovdDash} ${circumference}`}
                                strokeDashoffset={`-${doneDash + pendDash}`}
                                stroke="currentColor"
                                fill="transparent"
                              />
                            </svg>
                          );
                        })()}

                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-base font-extrabold text-slate-900">{team.rate}%</span>
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Done</span>
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="space-y-1.5 text-xs w-full max-w-[180px]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                            <span className="text-slate-600 text-[11px]">Completed</span>
                          </div>
                          <span className="font-bold text-slate-800">{team.done}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                            <span className="text-slate-600 text-[11px]">In Progress</span>
                          </div>
                          <span className="font-bold text-slate-800">{team.pending}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                            <span className="text-slate-600 text-[11px]">Overdue</span>
                          </div>
                          <span className="font-bold text-rose-600">{team.ovd}</span>
                        </div>
                      </div>
                    </div>

                    {/* Member contributions */}
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Squad Member Breakdown
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {team.members.map(m => (
                          <div key={m.id} className="p-2 rounded-lg bg-slate-50 flex items-center justify-between">
                            <span className="truncate text-slate-800 font-medium text-[11px]">{m.name}</span>
                            <span className="font-bold text-emerald-700 text-[11px]">{m.done}/{m.total}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. FINANCE PAYMENT VERIFICATION LIST (Pending verifications sorted by required-by date, age, holds on top) */}
      {isFinanceRole && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#05331F] flex items-center justify-center font-bold">
                <CreditCard className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Payment Verification Queue</h2>
                <p className="text-xs text-slate-500">
                  Pending sales payment clearances
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#05331F]">
              {financePaymentVerifications.length} Orders
            </span>
          </div>

          {financePaymentVerifications.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 space-y-1">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600/50" />
              <p className="text-xs font-bold text-slate-700">No pending payment verifications</p>
              <p className="text-[11px]">All Sales bookings have been cleared for operations dispatch.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Order / Dealer</th>
                    <th className="py-2.5 px-3">Salesperson</th>
                    <th className="py-2.5 px-3 text-center">Required By</th>
                    <th className="py-2.5 px-3 text-center">Age</th>
                    <th className="py-2.5 px-3 text-center">Payment Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {financePaymentVerifications.map(t => (
                    <tr 
                      key={t.id} 
                      onClick={() => onOpenTaskDetails && onOpenTaskDetails(t)}
                      className={`hover:bg-slate-50/80 cursor-pointer transition ${t.isHold ? 'bg-rose-50/40' : ''}`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{t.partyName || t.dealerName || t.title}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="bg-slate-100 px-1.5 py-0.2 rounded font-mono font-semibold text-slate-700">
                            #{t.reference || t.bookingId || t.id.slice(-6)}
                          </span>
                          {t.isHold && (
                            <span className="text-rose-700 font-semibold">Hold: {t.holdReason}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-slate-600">
                        {t.salespersonName || t.createdByName || 'Sales Desk'}
                      </td>

                      <td className="py-2.5 px-3 text-center font-bold text-rose-600">
                        {t.reqDate}
                      </td>

                      <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                        {t.ageStr}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          t.paymentStatus === 'Payment Hold' 
                            ? 'bg-rose-100 text-rose-800 border-rose-300' 
                            : t.paymentStatus === 'Cleared' 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {t.paymentStatus || 'Pending Token'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenTaskDetails && onOpenTaskDetails(t);
                          }}
                          className="px-3 py-1 rounded-xl bg-[#05331F] hover:bg-[#07472B] text-white font-bold text-[11px] shadow-2xs"
                        >
                          Verify
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. OPERATIONS HEAD BRANCH STATUS GRID (Warehouse, Transportation, Service, Inventory) */}
      {isOperationsHead && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Operations Branches Throughput</h2>
              <p className="text-xs text-slate-500">
                Departmental active queues and completion
              </p>
            </div>
            <span className="text-xs bg-emerald-100 text-[#05331F] font-bold px-2.5 py-0.5 rounded-full">
              4 Operational Branches
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {operationsBranchStats.map(branch => (
              <div 
                key={branch.id}
                onClick={() => onNavigateToTab && onNavigateToTab('all_tasks')}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 cursor-pointer hover:border-emerald-300 transition"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#05331F] flex items-center justify-center font-bold">
                      {branch.id === 'warehouse' ? <Package className="w-3.5 h-3.5" /> :
                       branch.id === 'transportation' ? <Truck className="w-3.5 h-3.5" /> :
                       branch.id === 'service' ? <Wrench className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-900">{branch.name}</h3>
                      <p className="text-[10px] text-slate-400">{branch.headName}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#05331F]">{branch.rate}%</span>
                </div>

                <div className="grid grid-cols-3 gap-1 text-center">
                  <div className="p-1.5 rounded-xl bg-slate-50">
                    <span className="text-[10px] text-slate-400 block">Total</span>
                    <strong className="text-xs text-slate-800">{branch.total}</strong>
                  </div>
                  <div className="p-1.5 rounded-xl bg-emerald-50/60">
                    <span className="text-[10px] text-emerald-700 block">Done</span>
                    <strong className="text-xs text-emerald-800">{branch.completed}</strong>
                  </div>
                  <div className="p-1.5 rounded-xl bg-rose-50/60">
                    <span className="text-[10px] text-rose-700 block">Overdue</span>
                    <strong className="text-xs text-rose-800">{branch.overdue}</strong>
                  </div>
                </div>

                {/* Micro progress bar */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-1.5 rounded-full transition-all" 
                    style={{ width: `${branch.rate}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. SQUAD TABLE FOR MANAGERS AND SUPERVISORS (Hide if no data) */}
      {(isAccountsManager || isOperationsBranchManager || isOperationsSupervisor || isHRManager) && squadMembersStats.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {isAccountsManager 
                  ? 'Finance & Accounts Squad Performance' 
                  : isOperationsBranchManager 
                  ? `${currentUser.role.replace(' Manager', '').replace(' In-charge', '')} Squad Performance` 
                  : 'Your Team Squad'}
              </h2>
              <p className="text-xs text-slate-500">
                Direct downline execution, overdue tracking and completion status
              </p>
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
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3 text-center">Tasks Done / Total</th>
                  <th className="py-2.5 px-3 text-center">Overdue</th>
                  <th className="py-2.5 px-3 text-center">In Review</th>
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
                    <td className="py-2.5 px-3 text-center">
                      {m.inReview > 0 ? (
                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{m.inReview}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        m.status === 'All Complete' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        m.status === 'Needs Attention' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                        m.status === 'In Review' ? 'bg-blue-50 text-blue-800 border-blue-200' :
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

      {/* 6. FRONTLINE DASHBOARD: Large Action Cards (Loading Staff, Driver, Technician, Storekeeper) */}
      {isFrontline && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Today's Assigned Work</h2>
            {nextFrontlineDeadline && (
              <span className="text-xs bg-amber-50 text-amber-900 font-bold px-3 py-1 rounded-full border border-amber-200">
                Next Deadline: {nextFrontlineDeadline.deadlineDate}
              </span>
            )}
          </div>

          {frontlineTasks.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/50" />
              <p className="font-semibold text-sm text-slate-700">All tasks completed!</p>
              <p className="text-xs">No pending operations tasks assigned to you right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {frontlineTasks.map(task => (
                <div 
                  key={task.id}
                  onClick={() => onOpenTaskDetails && onOpenTaskDetails(task)}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 cursor-pointer hover:border-slate-300 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                      {task.taskType || 'Operation'}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      task.status === 'In Progress' 
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                      {task.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900">{task.title}</h3>
                  {task.description && (
                    <p className="text-xs text-slate-600 line-clamp-2">{task.description}</p>
                  )}

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs flex items-center justify-between text-slate-500">
                    <span>Deadline: <strong className="text-slate-800">{task.deadlineDate || 'Today'}</strong></span>
                    {task.location && <span>Location: <strong className="text-slate-800">{task.location}</strong></span>}
                  </div>

                  {/* Large Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onOpenTaskDetails && onOpenTaskDetails(task)}
                      className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 min-h-[48px]"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Start / Update</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenTaskDetails && onOpenTaskDetails(task)}
                      className="py-2.5 rounded-xl bg-[#05331F] hover:bg-[#07472B] text-white font-bold text-xs flex items-center justify-center gap-1.5 min-h-[48px]"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Submit Done</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. Recent Operational Activity */}
      <div className="w-full">
        {/* Recent Operational Highlights Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-700" />
                <h3 className="font-bold text-sm text-slate-900">Today's Execution Activity</h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">{todayTasks.length} active tasks</span>
            </div>

            {todayTasks.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No task activities logged yet today.</p>
            ) : (
              <div className="space-y-2 mt-3 max-h-56 overflow-y-auto">
                {todayTasks.slice(0, 5).map(task => (
                  <div 
                    key={task.id}
                    onClick={() => onOpenTaskDetails && onOpenTaskDetails(task)}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-slate-800 truncate">{task.title}</p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {task.assignedToName || 'Unassigned'} • {task.department || 'Operations'}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                      task.status === TASK_STATUSES.COMPLETED || task.status === 'Completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      task.status === TASK_STATUSES.PENDING_REVIEW || task.status === 'Pending Review' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                      task.status === 'Payment Hold' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                      'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Live operational ledger</span>
            <button
              onClick={() => onNavigateToTab && onNavigateToTab('all_tasks')}
              className="font-bold text-[#05331F] hover:underline"
            >
              View all tasks →
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
