import React, { useState, useMemo } from 'react';
import { 
  Truck, CheckCircle2, Clock, AlertTriangle, Layers, 
  ArrowUpRight, Users, Play, Check, ShieldAlert, Award, FileText,
  Calendar, Filter, RefreshCw, ChevronRight, UserCheck, AlertCircle,
  ExternalLink, ArrowDownRight, Send, HelpCircle, BellRing, Search,
  CheckSquare, XCircle, RotateCcw, MapPin, Camera, Navigation, Eye,
  Hourglass, Flame, Download
} from 'lucide-react';
import { TASK_STATUSES } from '../../rbac';
import { getTodayDateString, getDateOffset } from '../../dateUtils';
import { TRANSPORTATION_TASK_IDS, TRANSPORTATION_BLOCKER_CATEGORIES } from '../../transportationWorkTypes';
import DashboardKPICard from '../common/DashboardKPICard';

/**
 * STARK STEEL – Transport Manager (`des_tm`, NAYAN RAM) & Transportation Dashboard
 * Scope: Strict Task Management ONLY (No fleet management, GPS tracking, or fuel ERP).
 * 
 * Features for Transport Manager:
 * 1. 9 Management KPI Cards (including "Tasks At Risk of Missing 6 PM Departure")
 * 2. Dedicated Daily 6:00 PM Departure Protocol & Live Countdown Tracker
 * 3. Daily Operations Timeline (Readiness -> Routing -> Loading Coord -> Dispatch Clearance -> 6 PM Departure -> Delivery -> POD Collection)
 * 4. Coordinator Overview & Workload (ASWANI R)
 * 5. Driver Performance Overview (HAREESH BABU, AKHIL, SIRAJUDHEEN, ABHAY, GAUTHAM, etc.)
 * 6. Pending Approval Queue (Approving Coordinator & direct escalation sign-offs)
 * 7. Operational Blocker Management (Breakdown, driver unavailable, route mismatch, godown closed)
 * 8. Manager Execution Section: My Tasks Today (`tpl_trans_readiness`)
 * 9. Daily, Weekly, Monthly Performance & Departure Compliance Reports
 */
export default function TransportationDashboardView({
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

  const isTransportManager = userRole === 'Transport Manager';
  const isTransportCoordinator = userRole === 'Transport Coordinator';
  const isDriver = userRole === 'Driver' || userRole === 'Delivery Partner';

  // State
  const [dateFilter, setDateFilter] = useState('today'); // 'today' | 'yesterday' | 'week' | 'month' | 'all'
  const [activeTabSection, setActiveTabSection] = useState('overview'); // 'overview' | 'timeline' | 'coordinators' | 'drivers' | 'departure6pm' | 'pod_reviews' | 'mytasks' | 'blockers' | 'reports'
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [reportDateRange, setReportDateRange] = useState('today');

  // 1. Team Hierarchies
  const coordinatorsList = useMemo(() => {
    return employees.filter(e => {
      const r = (e.role || '').toLowerCase();
      return r.includes('transport coordinator');
    });
  }, [employees]);

  const driversList = useMemo(() => {
    return employees.filter(e => {
      const r = (e.role || '').toLowerCase();
      return r === 'driver' || r === 'delivery partner';
    });
  }, [employees]);

  const driverIdsSet = useMemo(() => {
    return new Set(driversList.map(d => String(d.id || d.uid || d.employeeId)));
  }, [driversList]);

  // 2. Transportation-Scoped Tasks
  const allTransportationTasks = useMemo(() => {
    return tasks.filter(t => {
      const d = (t.departmentId || t.department || '').toLowerCase();
      const isTransDept = d === 'transportation' || d === 'trans';
      const isTransTpl = t.templateId && t.templateId.startsWith('tpl_trans_');
      const isAssignedToTransUser = employees.some(e => {
        const eId = String(e.id || e.uid || e.employeeId);
        const tAssignee = String(t.assignedToId || t.assignedTo || '');
        const eDept = (e.department || '').toLowerCase();
        return eId === tAssignee && (eDept === 'transportation' || (e.role || '').toLowerCase().includes('transport') || (e.role || '').toLowerCase().includes('driver'));
      });
      return isTransDept || isTransTpl || isAssignedToTransUser;
    });
  }, [tasks, employees]);

  // Date-filtered tasks
  const transportationTasks = useMemo(() => {
    const yesterdayStr = getDateOffset(-1);
    const weekAgoStr = getDateOffset(-7);
    const monthAgoStr = getDateOffset(-30);

    return allTransportationTasks.filter(t => {
      const taskDate = (t.taskDate || t.deadlineDate || t.createdAt || '').slice(0, 10);
      if (dateFilter === 'today') return taskDate === todayStr;
      if (dateFilter === 'yesterday') return taskDate === yesterdayStr;
      if (dateFilter === 'week') return taskDate >= weekAgoStr;
      if (dateFilter === 'month') return taskDate >= monthAgoStr;
      return true; // 'all'
    });
  }, [allTransportationTasks, dateFilter, todayStr]);

  // 3. Manager KPI Metrics Calculation
  const metrics = useMemo(() => {
    let totalAssigned = transportationTasks.length;
    let completed = 0;
    let inProgress = 0;
    let pendingApproval = 0;
    let overdue = 0;
    let blockersCount = 0;
    let atRisk6pmCount = 0;

    // Driver specific counters
    let driverTasksAssigned = 0;
    let driverTasksCompleted = 0;
    let driversInProgress = 0;
    let pendingPodReviews = 0;

    transportationTasks.forEach(t => {
      const isDone = t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed';
      const isInProg = t.status === TASK_STATUSES.IN_PROGRESS || t.status === 'In Progress';
      const isPending = t.status === TASK_STATUSES.PENDING_REVIEW || t.status === 'Pending Review' || t.status === 'Waiting for Sign-Off';
      const isOvd = t.deadlineDate && t.deadlineDate < todayStr && !isDone;
      const isBlk = t.status === TASK_STATUSES.BLOCKED || t.status === 'Operational Blocker' || t.isBlocked;

      if (isDone) completed += 1;
      if (isInProg) inProgress += 1;
      if (isPending) pendingApproval += 1;
      if (isOvd) overdue += 1;
      if (isBlk) blockersCount += 1;

      // Risk detection for 6:00 PM departure
      const isDispatchRelated = t.templateId === TRANSPORTATION_TASK_IDS.DISPATCH_CLEARANCE || 
                                (t.title && t.title.toLowerCase().includes('dispatch')) ||
                                (t.deadlineTime && t.deadlineTime <= '18:00');
      if (isDispatchRelated && !isDone && (isBlk || isInProg || t.priority === 'Critical')) {
        atRisk6pmCount += 1;
      }

      const isDriverTask = driverIdsSet.has(String(t.assignedToId || t.assignedTo));
      if (isDriverTask) {
        driverTasksAssigned += 1;
        if (isDone) driverTasksCompleted += 1;
        if (isInProg) driversInProgress += 1;
        if (isPending) pendingPodReviews += 1;
      }
    });

    const completionRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;

    return {
      totalAssigned,
      completed,
      inProgress,
      pendingApproval,
      overdue,
      blockersCount,
      atRisk6pmCount,
      driverTasksAssigned,
      driverTasksCompleted,
      driversInProgress,
      pendingPodReviews,
      completionRate
    };
  }, [transportationTasks, driverIdsSet, todayStr]);

  // 4. Daily Operations Timeline Items (7 Key Milestones)
  const operationsTimeline = useMemo(() => {
    const step1Task = allTransportationTasks.find(t => t.templateId === TRANSPORTATION_TASK_IDS.READINESS);
    const step2Task = allTransportationTasks.find(t => (t.title && t.title.toLowerCase().includes('route')));
    const step3Task = allTransportationTasks.find(t => (t.title && t.title.toLowerCase().includes('loading bay')) || t.templateId === 'tpl_wh_loading');
    const step4Task = allTransportationTasks.find(t => t.templateId === TRANSPORTATION_TASK_IDS.DISPATCH_CLEARANCE);
    const step6Task = allTransportationTasks.find(t => t.templateId === TRANSPORTATION_TASK_IDS.DELIVERY);
    const step7Task = allTransportationTasks.find(t => t.templateId === TRANSPORTATION_TASK_IDS.DELIVERY && (t.photos && t.photos.length > 0));

    return [
      {
        step: 1,
        name: 'Fleet & Driver Readiness',
        time: step1Task?.deadlineTime ? `Due by ${step1Task.deadlineTime}` : 'Configured Shift Window',
        templateId: TRANSPORTATION_TASK_IDS.READINESS,
        ownerRole: 'Transport Manager',
        task: step1Task
      },
      {
        step: 2,
        name: 'Route Sequence & Drop Verification',
        time: step2Task?.deadlineTime ? `Due by ${step2Task.deadlineTime}` : 'Pre-Dispatch Review',
        ownerRole: 'Transport Manager & Coordinator',
        task: step2Task
      },
      {
        step: 3,
        name: 'Warehouse Loading Bay Coordination',
        time: step3Task?.deadlineTime ? `Due by ${step3Task.deadlineTime}` : 'Bay Staging Alignment',
        ownerRole: 'Transport Coordinator & Warehouse Sup',
        task: step3Task
      },
      {
        step: 4,
        name: 'Dispatch Clearance & Document Verification',
        time: step4Task?.deadlineTime ? `Due by ${step4Task.deadlineTime}` : 'Gate-Pass Handover',
        templateId: TRANSPORTATION_TASK_IDS.DISPATCH_CLEARANCE,
        ownerRole: 'Transport Coordinator',
        task: step4Task
      },
      {
        step: 5,
        name: 'Vehicle Dispatch Departure',
        time: step4Task?.deadlineTime ? `Target ${step4Task.deadlineTime}` : 'Scheduled Departure',
        ownerRole: 'Transport Manager & Coordinator',
        task: step4Task
      },
      {
        step: 6,
        name: 'Driver Delivery Execution & Unloading',
        time: step6Task?.deadlineTime ? `Due by ${step6Task.deadlineTime}` : 'Transit Destination Window',
        templateId: TRANSPORTATION_TASK_IDS.DELIVERY,
        ownerRole: 'Drivers / Delivery Partners',
        task: step6Task
      },
      {
        step: 7,
        name: 'Dealer Signed POD Collection & Sign-Off',
        time: step7Task?.deadlineTime ? `Due by ${step7Task.deadlineTime}` : 'POD Delivery Sign-Off',
        ownerRole: 'Drivers & Transport Coordinator',
        task: step7Task
      }
    ];
  }, [allTransportationTasks]);

  // 5. Coordinator Workload (ASWANI R)
  const coordinatorStats = useMemo(() => {
    return coordinatorsList.map(coord => {
      const cId = String(coord.id || coord.uid || coord.employeeId);
      const cTasks = allTransportationTasks.filter(t => String(t.assignedToId || t.assignedTo) === cId);
      
      const total = cTasks.length;
      const done = cTasks.filter(t => t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed').length;
      const inProg = cTasks.filter(t => t.status === TASK_STATUSES.IN_PROGRESS || t.status === 'In Progress').length;
      const pending = cTasks.filter(t => (t.status || '').toLowerCase() === 'pending review').length;
      const ovd = cTasks.filter(t => t.deadlineDate && t.deadlineDate < todayStr && t.status !== 'Completed').length;
      const blk = cTasks.filter(t => t.status === TASK_STATUSES.BLOCKED || t.isBlocked).length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;

      return {
        id: cId,
        name: coord.fullName || coord.name,
        role: coord.role,
        phone: coord.phone,
        totalTasks: total,
        completedTasks: done,
        inProgressTasks: inProg,
        pendingReviewTasks: pending,
        overdueTasks: ovd,
        blockersCount: blk,
        completionRate: pct,
        tasks: cTasks
      };
    });
  }, [coordinatorsList, allTransportationTasks, todayStr]);

  // 6. Driver Performance Cards Data
  const driverOverviewData = useMemo(() => {
    return driversList.map(driver => {
      const dId = String(driver.id || driver.uid || driver.employeeId);
      const dTasks = allTransportationTasks.filter(t => String(t.assignedToId || t.assignedTo) === dId);
      
      const assigned = dTasks.length;
      const completed = dTasks.filter(t => t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed').length;
      const inProg = dTasks.filter(t => t.status === TASK_STATUSES.IN_PROGRESS || t.status === 'In Progress').length;
      const pendingPod = dTasks.filter(t => (t.status || '').toLowerCase() === 'pending review').length;
      const overdue = dTasks.filter(t => t.deadlineDate && t.deadlineDate < todayStr && t.status !== 'Completed').length;
      const activeBlk = dTasks.filter(t => t.status === TASK_STATUSES.BLOCKED || t.isBlocked).length;
      const pct = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

      const latestTask = [...dTasks].sort((a, b) => (b.lastUpdated || b.createdAt || '').localeCompare(a.lastUpdated || a.createdAt || ''))[0];
      const lastActivity = latestTask ? (latestTask.lastUpdated || latestTask.createdAt || 'Today') : 'No recent trips';

      return {
        id: dId,
        name: driver.fullName || driver.name,
        role: driver.role || 'Delivery Partner',
        phone: driver.phone,
        assigned,
        completed,
        inProgress: inProg,
        pendingPod,
        overdue,
        activeBlockers: activeBlk,
        completionRate: pct,
        lastActivity,
        tasks: dTasks
      };
    });
  }, [driversList, allTransportationTasks, todayStr]);

  // 6.5 Dispatch Orders Queue (Only bookings that are Picked by Warehouse and ready for vehicle assignment)
  const dispatchOrdersQueue = useMemo(() => {
    return bookings
      .filter(b => b.status === 'Picked' || b.status === 'Dispatched' || b.status === 'Completed')
      .map(b => {
        const isPicked = b.status === 'Picked' || b.status === 'Dispatched' || b.status === 'Completed';
        const totalUnits = b.totalQuantity || (b.lines || []).reduce((sum, l) => sum + (parseInt(l.quantity, 10) || 1), 0);
        const linkedTask = allTransportationTasks.find(t => 
          (b.linkedTaskIds && b.linkedTaskIds.includes(t.id)) ||
          t.bookingId === b.id || 
          t.sourceBookingId === b.id ||
          (t.dealerName === b.dealerName && (t.title || '').toLowerCase().includes('dispatch'))
        );

        return {
          ...b,
          totalUnits,
          isPicked,
          linkedTask
        };
      });
  }, [bookings, allTransportationTasks]);

  // 6.6 Regional Pending Door Deliveries Report (Groups orders by Region / Place showing doors pending delivery & due date)
  const regionalPendingDeliveries = useMemo(() => {
    const regionMap = {};

    dispatchOrdersQueue.forEach(order => {
      const isDelivered = order.status === 'Delivered' || order.status === 'Completed';
      if (isDelivered) return; // Only pending delivery

      const regionKey = order.region || order.deliveryRegion || 'Kerala North';
      if (!regionMap[regionKey]) {
        regionMap[regionKey] = {
          region: regionKey,
          pendingOrdersCount: 0,
          pendingDoorsCount: 0,
          orders: []
        };
      }

      regionMap[regionKey].pendingOrdersCount += 1;
      regionMap[regionKey].pendingDoorsCount += order.totalUnits || 1;
      regionMap[regionKey].orders.push(order);
    });

    return Object.values(regionMap).sort((a, b) => b.pendingDoorsCount - a.pendingDoorsCount);
  }, [dispatchOrdersQueue]);

  // 7. Pending Approval Queue for Transport Manager
  // Approves Coordinator submissions (such as Dispatch Clearance) & escalating submissions
  const managerApprovalsQueue = useMemo(() => {
    const subordinateIds = new Set([
      ...coordinatorsList.map(c => String(c.id || c.uid || c.employeeId)),
      ...driversList.map(d => String(d.id || d.uid || d.employeeId))
    ]);

    return allTransportationTasks.filter(t => {
      const s = (t.status || '').toLowerCase();
      const isSub = s === 'pending review' || s === 'pending sign-off' || s === 'completed';
      const isFromSubordinate = subordinateIds.has(String(t.assignedToId || t.assignedTo));
      // Manager cannot approve self tasks
      const isNotSelf = String(t.assignedToId || t.assignedTo) !== myId && String(t.completedById || '') !== myId;
      return isSub && isFromSubordinate && isNotSelf;
    });
  }, [allTransportationTasks, coordinatorsList, driversList, myId]);

  // 8. Personal Tasks for Transport Manager or Driver
  const myManagerTasks = useMemo(() => {
    return transportationTasks.filter(t => {
      const assigned = String(t.assignedToId || t.assignedTo || '');
      const driver = String(t.assignedDriverId || t.driverId || '');
      const assignees = Array.isArray(t.assigneeIds) ? t.assigneeIds.map(String) : [];
      return myIds.has(assigned) || (driver && myIds.has(driver)) || assignees.some(id => myIds.has(id));
    });
  }, [transportationTasks, myIds]);

  // 9. Active Transportation Blockers
  const activeTransportationBlockers = useMemo(() => {
    return allTransportationTasks.filter(t => t.status === TASK_STATUSES.BLOCKED || t.status === 'Operational Blocker' || t.isBlocked);
  }, [allTransportationTasks]);

  // -------------------------------------------------------------
  // RENDER: DRIVER MOBILE DASHBOARD INTERFACE
  // -------------------------------------------------------------
  if (isDriver) {
    return (
      <div className="space-y-4 max-w-xl mx-auto pb-10">
        <div className="bg-gradient-to-r from-[#05331F] via-[#07472B] to-[#0A4D2E] text-white p-5 rounded-3xl shadow-lg space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-400/20 flex items-center justify-center text-emerald-300">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">{currentUser?.fullName || currentUser?.name}</h1>
              <p className="text-xs text-emerald-200">Delivery Partner / Driver · Vehicle Transit & POD Desk</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Assigned</span>
            <span className="text-xl font-bold text-slate-900">{myManagerTasks.length}</span>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-emerald-600 block uppercase">Done</span>
            <span className="text-xl font-bold text-emerald-700">
              {myManagerTasks.filter(t => t.status === TASK_STATUSES.COMPLETED || t.status === 'Completed').length}
            </span>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-amber-600 block uppercase">In Review</span>
            <span className="text-xl font-bold text-amber-700">
              {myManagerTasks.filter(t => (t.status || '').toLowerCase().includes('pending')).length}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-900">Today's Delivery Deliverables</h2>
            <span className="text-xs font-semibold text-slate-500">{myManagerTasks.length} Trips Assigned</span>
          </div>

          {myManagerTasks.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/50" />
              <p className="text-sm font-bold text-slate-700">No active delivery tasks assigned today!</p>
              <p className="text-xs">Check with the Transport Coordinator if a dispatch trip is scheduled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myManagerTasks.map(t => (
                <div 
                  key={t.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {t.taskType || 'Transit Delivery'}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      t.status === TASK_STATUSES.COMPLETED ? 'bg-emerald-100 text-emerald-800' :
                      t.status === TASK_STATUSES.IN_PROGRESS ? 'bg-blue-100 text-blue-800' :
                      t.status === TASK_STATUSES.BLOCKED ? 'bg-rose-100 text-rose-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {t.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{t.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{t.description}</p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Destination: <strong>{t.location || t.destination || 'Assigned Dealer Showroom'}</strong></span>
                    </div>
                    {t.reference && (
                      <div className="text-[11px] text-slate-500">
                        Vehicle / Challan Ref: <strong>{t.reference}</strong>
                      </div>
                    )}
                  </div>

                  <div className="pt-1">
                    <button
                      onClick={() => onOpenTaskDetails && onOpenTaskDetails(t)}
                      className="w-full py-3.5 bg-[#05331F] hover:bg-[#07472B] active:bg-[#032214] text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 min-h-[48px] cursor-pointer"
                    >
                      <Navigation className="w-4 h-4 text-emerald-300" />
                      <span>Open Trip / Submit POD</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: TRANSPORT MANAGER & COORDINATOR DESKTOP DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="space-y-6">
      
      {/* 1. HEADER & DISPATCH ADHERENCE HERO CARD */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 text-[#05331F] flex items-center justify-center">
              <Truck className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900 tracking-tight">Transportation Department Operations</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Leader: <span className="font-medium text-slate-800">{currentUser?.fullName || currentUser?.name}</span> ({userRole}) · Vehicle Readiness, Clearance & Departure Compliance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAssignModal && (
              <button
                onClick={() => onOpenAssignModal({
                  department: 'transportation',
                  priority: 'High'
                })}
                className="px-3.5 py-2 bg-[#05331F] hover:bg-[#07472B] text-white font-medium text-xs rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>+ Assign Delivery Task</span>
              </button>
            )}
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('team_performance')}
                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-lg border border-slate-200/80 transition flex items-center gap-1.5"
              >
                <span>Analytics</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Daily Dispatch Departure Adherence Protocol (Modern SaaS Panel) */}
        <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="font-medium text-slate-800">Factory Vehicle Dispatch Protocol</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500 text-[11px]">Readiness, loading coordination, and gate-pass clearance</span>
          </div>

          <div className="flex items-center gap-2">
            {metrics.atRisk6pmCount > 0 ? (
              <span className="font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                <Flame className="w-3 h-3 text-rose-600" />
                <span>{metrics.atRisk6pmCount} Task(s) At Risk</span>
              </span>
            ) : (
              <span className="font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Routes On Schedule</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. TIMEFRAME & SECTION NAVIGATION TABS */}
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

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTabSection('overview')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${activeTabSection === 'overview' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTabSection('dispatch_orders')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${activeTabSection === 'dispatch_orders' ? 'bg-[#05331F] text-white shadow-2xs' : 'text-slate-600'}`}
          >
            Dispatch Orders ({dispatchOrdersQueue.length})
          </button>
          <button
            onClick={() => setActiveTabSection('timeline')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${activeTabSection === 'timeline' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
          >
            Operations Timeline (7)
          </button>
          {isTransportManager && (
            <button
              onClick={() => setActiveTabSection('coordinators')}
              className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${activeTabSection === 'coordinators' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
            >
              Coordinator ({coordinatorStats.length})
            </button>
          )}
          <button
            onClick={() => setActiveTabSection('drivers')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${activeTabSection === 'drivers' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
          >
            Drivers ({driverOverviewData.length})
          </button>
          <button
            onClick={() => setActiveTabSection('pod_reviews')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${activeTabSection === 'pod_reviews' ? 'bg-amber-600 text-white shadow-2xs' : 'text-amber-800'}`}
          >
            Approvals ({managerApprovalsQueue.length})
          </button>
          <button
            onClick={() => setActiveTabSection('mytasks')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${activeTabSection === 'mytasks' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
          >
            My Tasks ({myManagerTasks.length})
          </button>
          <button
            onClick={() => setActiveTabSection('blockers')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${activeTabSection === 'blockers' ? 'bg-rose-700 text-white shadow-2xs' : 'text-rose-700'}`}
          >
            Blockers ({activeTransportationBlockers.length})
          </button>
          <button
            onClick={() => setActiveTabSection('reports')}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${activeTabSection === 'reports' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'}`}
          >
            Reports
          </button>
        </div>
      </div>

      {/* 3. MANAGEMENT KPI METRIC CARDS - Premium SaaS Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <DashboardKPICard
          label="Total Tasks"
          value={metrics.totalAssigned}
          subtext="Department operations"
          icon={Layers}
          variant="default"
        />

        <DashboardKPICard
          label="Completed"
          value={metrics.completed}
          subtext={`${metrics.completionRate}% completion`}
          icon={CheckCircle2}
          variant="success"
        />

        <DashboardKPICard
          label="In Progress"
          value={metrics.inProgress}
          subtext="Active deliveries & loading"
          icon={Clock}
          variant="info"
        />

        <DashboardKPICard
          label="Pending Approvals"
          value={managerApprovalsQueue.length}
          subtext="Awaiting verification"
          icon={FileText}
          variant={managerApprovalsQueue.length > 0 ? "warning" : "default"}
          onClick={() => setActiveTabSection('pod_reviews')}
        />

        <DashboardKPICard
          label="Active Blockers"
          value={metrics.blockersCount}
          subtext={`${metrics.overdue} overdue items`}
          icon={AlertTriangle}
          variant={(metrics.blockersCount + metrics.overdue) > 0 ? "danger" : "default"}
          onClick={() => setActiveTabSection('blockers')}
        />

        <DashboardKPICard
          label="At Risk"
          value={metrics.atRisk6pmCount}
          subtext="Departure clearance risk"
          icon={Flame}
          variant={metrics.atRisk6pmCount > 0 ? "danger" : "default"}
          onClick={() => setActiveTabSection('timeline')}
        />
      </div>

      {/* SECTION 3.5: DISPATCH ORDERS QUEUE (Door Bookings Picked by Warehouse) */}
      {(activeTabSection === 'overview' || activeTabSection === 'dispatch_orders') && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-800">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Door Orders Dispatch & Vehicle Allocation</h2>
                <p className="text-xs text-slate-500">Orders staged by Warehouse ready for transport route, vehicle clearance and driver delivery</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-lg">
                {dispatchOrdersQueue.length} Orders
              </span>
              <button
                type="button"
                onClick={() => {
                  const csvRows = [
                    ['Booking Code', 'Dealer Showroom', 'Region', 'Total Doors', 'Target Due Date', 'Status', 'Driver', 'Vehicle'],
                    ...dispatchOrdersQueue.map(o => [
                      `"#${(o.id || '').slice(-6).toUpperCase()}"`,
                      `"${o.dealerName || ''}"`,
                      `"${o.region || o.deliveryRegion || 'Kerala'}"`,
                      o.totalUnits || 1,
                      `"${o.requiredBy || 'Today'}"`,
                      `"${o.status || 'Picked'}"`,
                      `"${o.linkedTask?.driverName || 'Unassigned'}"`,
                      `"${o.linkedTask?.vehicleNumber || 'Pending Vehicle'}"`
                    ])
                  ];
                  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.map(e => e.join(',')).join('\n');
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement('a');
                  link.setAttribute('href', encodedUri);
                  link.setAttribute('download', `StarkSteel_Dispatch_Orders_${todayStr}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
                title="Export dispatch orders to Excel"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export Excel</span>
              </button>
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

          {dispatchOrdersQueue.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border border-slate-100 rounded-2xl space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/50" />
              <p className="text-xs font-semibold text-slate-700">No active dispatch orders waiting!</p>
              <p className="text-[11px]">When warehouse finishes picking doors, orders appear here for vehicle loading and driver departure.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {dispatchOrdersQueue.map(order => {
                const isPicked = order.isPicked;
                const isDispatched = order.status === 'Dispatched';

                return (
                  <div
                    key={order.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          #{order.id.slice(-6).toUpperCase()}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isDispatched ? 'bg-purple-100 text-purple-800' :
                          isPicked ? 'bg-emerald-100 text-emerald-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {isDispatched ? 'Dispatched' : (isPicked ? 'Picked & Staged' : order.status || 'Booked')}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-xs text-slate-900 line-clamp-1">{order.dealerName}</h3>
                        <p className="text-[10px] text-slate-400">{order.region || 'Kerala'} · Target: {order.requiredBy || 'Today'}</p>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-700 font-semibold">
                          <span>Total Doors:</span>
                          <span className="text-blue-900 font-bold">{order.totalUnits} Door(s)</span>
                        </div>
                        {order.deliveryAddress && (
                          <p className="text-[10px] text-slate-500 truncate">Dest: {order.deliveryAddress}</p>
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
                          } else if (onOpenTaskDetails) {
                            const taskToOpen = {
                              id: `temp_trans_${order.id}`,
                              taskType: 'Dispatch Route',
                              title: `[Dispatch Route] ${order.dealerName} - ${order.totalUnits} Doors`,
                              partyName: order.dealerName,
                              dealerName: order.dealerName,
                              bookingId: order.id,
                              sourceBookingId: order.id,
                              reference: order.dealerCode || order.id?.slice(-6).toUpperCase(),
                              taskDate: todayStr,
                              date: todayStr,
                              requiredBy: order.requiredBy,
                              deadlineDate: order.requiredBy,
                              department: 'transportation',
                              departmentId: 'transportation',
                              status: 'Pending',
                              quantity: order.totalUnits
                            };
                            onOpenTaskDetails(taskToOpen);
                          } else if (onOpenAssignModal) {
                            onOpenAssignModal({
                              department: 'transportation',
                              title: `[Dispatch Route] ${order.dealerName} - ${order.totalUnits} Doors`,
                              description: `Loading and dispatch delivery to ${order.deliveryAddress || order.dealerName} by required date: ${order.requiredBy}.`,
                              priority: 'High'
                            });
                          } else if (onNavigateToTab) {
                            onNavigateToTab('bookings');
                          }
                        }}
                        className="px-3 py-1.5 bg-[#05331F] hover:bg-[#07472B] text-white text-[11px] font-semibold rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <span>{order.linkedTask ? 'Execute Dispatch' : 'Assign Driver'}</span>
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

      {/* 4. DAILY OPERATIONS TIMELINE (7 CORE ACTIVITIES) */}
      {(activeTabSection === 'overview' || activeTabSection === 'timeline') && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Daily Transportation Operations Timeline</h2>
              <p className="text-xs text-slate-500">Scheduled sequence from Fleet Readiness through 6 PM Departure to Signed POD</p>
            </div>
            <span className="text-xs font-semibold bg-emerald-50 text-[#05331F] px-2.5 py-1 rounded-lg">
              Target: 100% On-Time 6:00 PM Dispatches
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
            {operationsTimeline.map(step => {
              const hasTask = Boolean(step.task);
              const isDone = step.task?.status === TASK_STATUSES.COMPLETED || step.task?.status === 'Completed';
              const isInProg = step.task?.status === TASK_STATUSES.IN_PROGRESS || step.task?.status === 'In Progress';
              const isBlk = step.task?.status === TASK_STATUSES.BLOCKED || step.task?.isBlocked;

              return (
                <div 
                  key={step.step}
                  onClick={() => step.task && onOpenTaskDetails && onOpenTaskDetails(step.task)}
                  className={`p-3.5 rounded-2xl border transition space-y-2 cursor-pointer ${
                    isDone ? 'border-emerald-200 bg-emerald-50/30' :
                    isBlk ? 'border-rose-300 bg-rose-50/30' :
                    isInProg ? 'border-blue-300 bg-blue-50/30' :
                    'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      Step {step.step}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      isDone ? 'bg-emerald-100 text-emerald-800' :
                      isBlk ? 'bg-rose-100 text-rose-800' :
                      isInProg ? 'bg-blue-100 text-blue-800' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {step.task?.status || 'Scheduled'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-xs text-slate-900 line-clamp-2">{step.name}</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{step.time}</p>
                  </div>

                  <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                    Owner: <strong className="text-slate-700">{step.ownerRole}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. COORDINATOR WORKLOAD & PERFORMANCE SECTION */}
      {(activeTabSection === 'overview' || activeTabSection === 'coordinators') && isTransportManager && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Transport Coordinator Oversight</h2>
              <p className="text-xs text-slate-500">Warehouse coordination and dispatch clearance</p>
            </div>
            <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
              {coordinatorStats.length} Coordinator Assigned
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coordinatorStats.map(coord => (
              <div 
                key={coord.id}
                className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-slate-900">{coord.name}</h3>
                    <p className="text-[10px] text-slate-400">{coord.role}{coord.phone ? ` · ${coord.phone}` : ''}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-100 text-[#05331F] px-2 py-0.5 rounded-full">
                    {coord.completionRate}% Done
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center bg-slate-50 p-2 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total</span>
                    <strong className="text-slate-800">{coord.totalTasks}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-600 block">Active</span>
                    <strong className="text-blue-700">{coord.inProgressTasks}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600 block">Done</span>
                    <strong className="text-emerald-700">{coord.completedTasks}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-600 block">Review</span>
                    <strong className="text-amber-700">{coord.pendingReviewTasks}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <button
                    onClick={() => {
                      if (onOpenAssignModal) {
                        onOpenAssignModal({
                          department: 'transportation',
                          assigneeId: coord.id,
                          priority: 'High'
                        });
                      }
                    }}
                    className="text-[#05331F] font-bold hover:underline flex items-center gap-1 cursor-pointer min-h-[36px]"
                  >
                    <span>+ Delegate Task</span>
                  </button>

                  <button
                    onClick={() => alert(`Reminder notification sent to ${coord.name} for active transportation coordination deliverables.`)}
                    className="text-slate-500 hover:text-slate-800 text-[11px] font-semibold cursor-pointer min-h-[36px] px-1"
                  >
                    Send Reminder
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. DRIVER PERFORMANCE OVERVIEW (Direct Driver Accountability) */}
      {(activeTabSection === 'overview' || activeTabSection === 'drivers') && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Drivers & Delivery Partners Execution</h2>
              <p className="text-xs text-slate-500">Live delivery assignments, transit status, and signed POD submissions</p>
            </div>
            <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
              {driverOverviewData.length} Delivery Partners
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {driverOverviewData.map(driver => (
              <div 
                key={driver.id}
                className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-slate-900">{driver.name}</h3>
                    <p className="text-[10px] text-slate-400">{driver.role}{driver.phone ? ` · ${driver.phone}` : ''}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-100 text-[#05331F] px-2 py-0.5 rounded-full">
                    {driver.completionRate}%
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center bg-slate-50 p-2 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Trips</span>
                    <strong className="text-slate-800">{driver.assigned}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-600 block">Transit</span>
                    <strong className="text-blue-700">{driver.inProgress}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600 block">Done</span>
                    <strong className="text-emerald-700">{driver.completed}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-600 block">POD</span>
                    <strong className="text-amber-700">{driver.pendingPod}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <button
                    onClick={() => {
                      if (onOpenAssignModal) {
                        onOpenAssignModal({
                          department: 'transportation',
                          assigneeId: driver.id,
                          priority: 'High'
                        });
                      }
                    }}
                    className="text-[#05331F] font-bold hover:underline flex items-center gap-1 cursor-pointer min-h-[36px]"
                  >
                    <span>+ Assign Trip</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => alert(`Reminder notification sent to ${driver.name} for active delivery task and signed POD capture.`)}
                      className="text-slate-500 hover:text-slate-800 text-[11px] font-semibold cursor-pointer min-h-[36px] px-1"
                    >
                      Send Reminder
                    </button>
                    <button
                      onClick={() => setSelectedDriverId(selectedDriverId === driver.id ? null : driver.id)}
                      className="text-slate-500 hover:text-slate-800 text-[11px] font-medium flex items-center gap-0.5 cursor-pointer min-h-[36px]"
                    >
                      <span>{selectedDriverId === driver.id ? 'Hide' : 'Tasks'}</span>
                      <ChevronRight className={`w-3.5 h-3.5 transition ${selectedDriverId === driver.id ? 'rotate-90' : ''}`} />
                    </button>
                  </div>
                </div>

                {selectedDriverId === driver.id && (
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <h4 className="text-[11px] font-bold text-slate-700">Tasks for {driver.name} ({driver.tasks.length})</h4>
                    {driver.tasks.length === 0 ? (
                      <p className="text-[10px] text-slate-400">No active trips</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {driver.tasks.map(t => (
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
        </div>
      )}

      {/* 7. PENDING APPROVAL QUEUE (Coordinator Submissions & Driver Approvals) */}
      {(activeTabSection === 'overview' || activeTabSection === 'pod_reviews') && (
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Transportation Deliverable Sign-Off Queue</h2>
                <p className="text-xs text-slate-500">Tasks submitted by Coordinator and Drivers awaiting manager review</p>
              </div>
            </div>
            <span className="text-xs font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-300">
              {managerApprovalsQueue.length} Pending Sign-Offs
            </span>
          </div>

          {managerApprovalsQueue.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border border-slate-100 rounded-2xl space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/50" />
              <p className="text-xs font-semibold text-slate-700">All transportation submissions reviewed!</p>
              <p className="text-[11px]">No pending sign-off requests waiting for your approval right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {managerApprovalsQueue.map(item => (
                <div 
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {item.taskType || 'Transportation SOP'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Waiting Manager Sign-Off
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
                    {item.location && (
                      <div className="text-slate-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-600 shrink-0" />
                        <span>Destination: {item.location}</span>
                      </div>
                    )}
                    {item.photos && item.photos.length > 0 && (
                      <div className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        <span>{item.photos.length} Photo Proof(s) Attached</span>
                      </div>
                    )}
                  </div>

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
                      Review & Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 8. MY TASKS TODAY (MANAGER READINESS EXECUTION - `tpl_trans_readiness`) */}
      {(activeTabSection === 'overview' || activeTabSection === 'mytasks') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">My Tasks Today (Transport Manager Execution)</h2>
              <p className="text-xs text-slate-500">Fleet & Driver readiness verification (2:00 PM – 4:00 PM window)</p>
            </div>
            <span className="text-xs font-semibold bg-emerald-50 text-[#05331F] px-2.5 py-1 rounded-lg">
              {myManagerTasks.length} Assigned Tasks
            </span>
          </div>

          {myManagerTasks.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/50" />
              <p className="text-xs font-semibold text-slate-600">No readiness tasks currently assigned directly to you.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {myManagerTasks.map(t => (
                <div
                  key={t.id}
                  onClick={() => onOpenTaskDetails && onOpenTaskDetails(t)}
                  className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-2xs transition cursor-pointer space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {t.taskType || t.category || 'Transportation SOP'}
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

      {/* 9. OPERATIONAL BLOCKER MANAGEMENT */}
      {(activeTabSection === 'overview' || activeTabSection === 'blockers') && (
        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Centralized Transportation Blockers & Delays</h2>
                <p className="text-xs text-slate-500">Vehicle breakdowns, driver unavailability, route blockage, and godown closures</p>
              </div>
            </div>
            <span className="text-xs font-bold bg-rose-100 text-rose-800 px-3 py-1 rounded-full border border-rose-200">
              {activeTransportationBlockers.length} Active Blockers
            </span>
          </div>

          {activeTransportationBlockers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border border-slate-100 rounded-2xl space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/50" />
              <p className="text-xs font-semibold text-slate-700">Zero active transit blockers!</p>
              <p className="text-[11px]">All vehicle routes and loading bays are operating without impediment.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTransportationBlockers.map(blk => (
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
                        {blk.blockerCategory || 'Transit Delay'}
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
                            title: `Escalated Blocker: ${blk.title}`,
                            description: `Escalated by Transport Manager to Operations Head: ${blk.blockerReason || blk.description}`,
                            department: 'operations',
                            priority: 'Critical'
                          });
                        }
                      }}
                      className="px-3 py-1.5 bg-[#05331F] hover:bg-[#07472B] text-white font-bold rounded-lg shadow-2xs min-h-[36px] cursor-pointer"
                    >
                      Escalate to Operations Head
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

      {/* 10. DEPARTMENT REPORTS & PERFORMANCE */}
      {activeTabSection === 'reports' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Transportation Department Reports</h2>
              <p className="text-xs text-slate-500">Live operational task metrics and 6 PM compliance based on database records</p>
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
              <span className="text-xs font-bold text-slate-700 block">Dispatch Deadline Compliance</span>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Scheduled Target:</span>
                  <strong className="text-slate-800">Per Shift Schedule</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trips Dispatched:</span>
                  <strong className="text-emerald-700">{metrics.completed}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">At-Risk Trips:</span>
                  <strong className={metrics.atRisk6pmCount > 0 ? 'text-rose-700 font-bold' : 'text-slate-700'}>
                    {metrics.atRisk6pmCount}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">On-Time Compliance:</span>
                  <strong className="text-emerald-700">
                    {metrics.totalAssigned > 0 ? Math.round(((metrics.totalAssigned - metrics.overdue) / metrics.totalAssigned) * 100) : 100}%
                  </strong>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Fleet & Driver Availability</span>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Active Drivers:</span>
                  <strong className="text-slate-800">{driversList.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Drivers in Transit:</span>
                  <strong className="text-blue-700">{metrics.driversInProgress}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pending POD Review:</span>
                  <strong className="text-amber-700">{metrics.pendingPodReviews}</strong>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Blockers & Road Delays</span>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Active Blockers:</span>
                  <strong className="text-rose-700">{activeTransportationBlockers.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Resolution Status:</span>
                  <strong className="text-slate-800">
                    {activeTransportationBlockers.length === 0 ? 'Clear (100%)' : 'In Progress'}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* REGIONAL PENDING DOOR DELIVERIES TABLE & REPORT */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900">Regional Pending Deliveries Breakdown</h3>
                <p className="text-[11px] text-slate-500">Doors awaiting delivery grouped by region/place with target due dates</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold bg-blue-50 text-blue-900 px-2.5 py-1 rounded-lg border border-blue-200">
                  {regionalPendingDeliveries.reduce((sum, r) => sum + r.pendingDoorsCount, 0)} Total Pending Doors
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const csvRows = [
                      ['Region / Place', 'Dealer Showroom', 'Booking Code', 'Pending Doors', 'Target Due Date', 'Status', 'Driver Assigned', 'Vehicle Plate'],
                      ...regionalPendingDeliveries.flatMap(reg => 
                        reg.orders.map(o => [
                          `"${reg.region}"`,
                          `"${o.dealerName || ''}"`,
                          `"#${(o.id || '').slice(-6).toUpperCase()}"`,
                          o.totalUnits || 1,
                          `"${o.requiredBy || 'Today'}"`,
                          `"${o.status || 'Picked'}"`,
                          `"${o.linkedTask?.driverName || 'Unassigned'}"`,
                          `"${o.linkedTask?.vehicleNumber || 'Pending Vehicle'}"`
                        ])
                      )
                    ];

                    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.map(e => e.join(',')).join('\n');
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement('a');
                    link.setAttribute('href', encodedUri);
                    link.setAttribute('download', `StarkSteel_Regional_Pending_Deliveries_${todayStr}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-3 py-1.5 bg-[#05331F] hover:bg-[#07472B] active:bg-[#032214] text-white text-xs font-semibold rounded-lg transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Export Excel (CSV)</span>
                </button>
              </div>
            </div>

            {regionalPendingDeliveries.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center border border-dashed border-slate-200 rounded-xl">
                No pending door deliveries across any region! All dispatched orders are delivered.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {regionalPendingDeliveries.map(reg => (
                  <div key={reg.region} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">{reg.region}</span>
                      <span className="text-xs font-bold bg-[#05331F] text-white px-2 py-0.5 rounded-md">
                        {reg.pendingDoorsCount} Door(s)
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-200/60">
                      <div className="flex justify-between">
                        <span>Pending Orders:</span>
                        <strong className="text-slate-700">{reg.pendingOrdersCount}</strong>
                      </div>
                      <div className="space-y-1 pt-1">
                        {reg.orders.slice(0, 3).map(o => (
                          <div key={o.id} className="flex justify-between items-center text-[10px] bg-white p-1.5 rounded border border-slate-200">
                            <span className="font-semibold text-slate-800 truncate mr-1">{o.dealerName}</span>
                            <span className="text-slate-500 shrink-0 font-mono">Due: {o.requiredBy || 'Today'}</span>
                          </div>
                        ))}
                        {reg.orders.length > 3 && (
                          <p className="text-[10px] text-slate-400 text-center">+{reg.orders.length - 3} more orders</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* REGIONAL PENDING DOOR DELIVERIES TABLE & REPORT */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900">Regional Pending Deliveries Breakdown</h3>
                <p className="text-[11px] text-slate-500">Doors awaiting delivery grouped by region/place with target due dates</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold bg-blue-50 text-blue-900 px-2.5 py-1 rounded-lg border border-blue-200">
                  {regionalPendingDeliveries.reduce((sum, r) => sum + r.pendingDoorsCount, 0)} Total Pending Doors
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const csvRows = [
                      ['Region / Place', 'Dealer Showroom', 'Booking Code', 'Pending Doors', 'Target Due Date', 'Status', 'Driver Assigned', 'Vehicle Plate'],
                      ...regionalPendingDeliveries.flatMap(reg => 
                        reg.orders.map(o => [
                          `"${reg.region}"`,
                          `"${o.dealerName || ''}"`,
                          `"#${(o.id || '').slice(-6).toUpperCase()}"`,
                          o.totalUnits || 1,
                          `"${o.requiredBy || 'Today'}"`,
                          `"${o.status || 'Picked'}"`,
                          `"${o.linkedTask?.driverName || 'Unassigned'}"`,
                          `"${o.linkedTask?.vehicleNumber || 'Pending Vehicle'}"`
                        ])
                      )
                    ];

                    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.map(e => e.join(',')).join('\n');
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement('a');
                    link.setAttribute('href', encodedUri);
                    link.setAttribute('download', `StarkSteel_Regional_Pending_Deliveries_${todayStr}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-3 py-1.5 bg-[#05331F] hover:bg-[#07472B] active:bg-[#032214] text-white text-xs font-semibold rounded-lg transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Export Excel (CSV)</span>
                </button>
              </div>
            </div>

            {regionalPendingDeliveries.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center border border-dashed border-slate-200 rounded-xl">
                No pending door deliveries across any region! All dispatched orders are delivered.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {regionalPendingDeliveries.map(reg => (
                  <div key={reg.region} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">{reg.region}</span>
                      <span className="text-xs font-bold bg-[#05331F] text-white px-2 py-0.5 rounded-md">
                        {reg.pendingDoorsCount} Door(s)
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-200/60">
                      <div className="flex justify-between">
                        <span>Pending Orders:</span>
                        <strong className="text-slate-700">{reg.pendingOrdersCount}</strong>
                      </div>
                      <div className="space-y-1 pt-1">
                        {reg.orders.slice(0, 3).map(o => (
                          <div key={o.id} className="flex justify-between items-center text-[10px] bg-white p-1.5 rounded border border-slate-200">
                            <span className="font-semibold text-slate-800 truncate mr-1">{o.dealerName}</span>
                            <span className="text-slate-500 shrink-0 font-mono">Due: {o.requiredBy || 'Today'}</span>
                          </div>
                        ))}
                        {reg.orders.length > 3 && (
                          <p className="text-[10px] text-slate-400 text-center">+{reg.orders.length - 3} more orders</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
