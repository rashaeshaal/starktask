import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  CheckCircle2, Clock, AlertTriangle, AlertCircle, Calendar, 
  Search, CheckSquare, Square, Eye, Edit3, Trash2, MoreHorizontal,
  PlusCircle, Filter, X, Check, Loader2, Megaphone, GitFork, User,
  Camera, MapPin, Truck, ExternalLink
} from 'lucide-react';
import { TASK_STATUSES, TASK_PRIORITIES, isTaskLockedForUser } from './rbac';
import { getTodayDateString, getDateOffset } from './dateUtils';
import AddTodayWorkModal from './AddTodayWorkModal';
import { updateFirestoreTask } from './firestoreService';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { useToast } from './ToastContext';

/**
 * Clean Date Formatter:
 */
function formatCleanDate(dateStr) {
  if (!dateStr) return '';
  const todayStr = getTodayDateString();
  const yesterdayStr = getDateOffset(-1);
  const tomorrowStr = getDateOffset(1);

  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';
  if (dateStr === tomorrowStr) return 'Tomorrow';

  try {
    const parts = String(dateStr).split('T')[0].split(' ')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  } catch {}
  return String(dateStr);
}

function formatDepartmentName(raw) {
  if (!raw) return 'Operations';
  const val = String(raw).trim();
  const lower = val.toLowerCase();
  if (lower === 'hr_admin' || lower === 'hr') return 'HR & Admin';
  if (lower === 'operations' || lower === 'ops') return 'Operations';
  if (lower === 'warehouse' || lower === 'wh') return 'Warehouse';
  if (lower === 'sales') return 'Sales';
  if (lower === 'finance' || lower === 'accounts') return 'Finance & Accounts';
  if (lower === 'transportation' || lower === 'trans') return 'Transportation';
  if (lower === 'service') return 'Service';
  if (lower === 'inventory') return 'Inventory';
  if (lower === 'marketing' || lower === 'mkt') return 'Marketing';
  if (lower === 'qc') return 'Quality Control';
  if (lower === 'management' || lower === 'exec') return 'Management';

  return val
    .replace(/_/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function TaskPulseTeamView({
  tasks = [],
  departments = [],
  currentUser,
  loading = false,
  onTaskCreated,
  onTaskUpdated,
  onOpenTaskDetails,
  onOpenAssignModal,
  onFollowUpTask
}) {
  const todayStr = getTodayDateString();
  const userRole = currentUser?.role || '';
  const currentUserId = currentUser?.id || currentUser?.uid;

  const isBrandManager = userRole === 'Brand Manager';
  const isOperationsHead = userRole === 'Operations Head';
  const isWarehouseInCharge = userRole === 'Warehouse In-charge';
  const isTransportManager = userRole === 'Transport Manager';
  const isServiceManager = userRole === 'Service Manager';
  const isInventorySupervisor = userRole === 'Inventory Supervisor';
  const isFinanceRole = (currentUser?.department || '').toLowerCase() === 'finance' ||
                        ['Accounts Manager', 'Accounts Executive', 'Accountant', 'Junior Accountant'].includes(userRole);
  const isAccountsManager = userRole === 'Accounts Manager' || userRole === 'Accounts Executive';
  const isAccountant = userRole === 'Accountant' || userRole === 'Junior Accountant';

  const isSupervisorOrManager = isOperationsHead || isWarehouseInCharge || isTransportManager || 
                                isServiceManager || isInventorySupervisor || userRole.includes('Supervisor') || 
                                userRole.includes('Coordinator') || userRole.includes('Manager');

  // View Mode: 'my_tasks' | 'sales_linked' | 'marketing_requests'
  const [viewMode, setViewMode] = useState('my_tasks');

  // Date Navigation State
  const [dateFilter, setDateFilter] = useState('today');
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Mobile Bottom Sheet Filter State
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Active overflow menu
  const [activeMenuTaskId, setActiveMenuTaskId] = useState(null);
  const menuRef = useRef(null);

  // Modal State: "Add Today's Work"
  const [isAddTodayWorkModalOpen, setIsAddTodayWorkModalOpen] = useState(false);
  const { showToast, confirm } = useToast();

  // Photo viewer lightbox
  const [activePhotoViewer, setActivePhotoViewer] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuTaskId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Linked tasks from Sales (For Warehouse In-charge, Transport Manager & Finance)
  const salesLinkedTasks = useMemo(() => {
    return tasks.filter(t => {
      const isSalesWork = t.isLinkedSalesWork || t.taskCategory === 'stark_door_order' || Boolean(t.sourceBookingId) || Boolean(t.bookingId);
      const isMyDept = isWarehouseInCharge 
        ? (t.departmentId === 'warehouse' || t.department === 'warehouse')
        : isTransportManager
        ? (t.departmentId === 'transportation' || t.department === 'transportation')
        : isFinanceRole
        ? (t.departmentId === 'finance' || t.department === 'finance' || t.taskType === 'Payment verification')
        : false;
      return isSalesWork && (isMyDept || isOperationsHead);
    }).sort((a, b) => {
      // Sort by required-by / deadline date
      const dateA = a.requiredBy || a.deadlineDate || a.createdAt || '';
      const dateB = b.requiredBy || b.deadlineDate || b.createdAt || '';
      return String(dateA).localeCompare(String(dateB));
    });
  }, [tasks, isWarehouseInCharge, isTransportManager, isFinanceRole, isOperationsHead]);

  // 2. Incoming Cross-Department Requests for Brand Manager
  const marketingRequests = useMemo(() => {
    return tasks.filter(t => {
      const isReq = t.isMarketingRequest || t.category === 'Marketing Request' || t.taskCategory === 'Marketing Request';
      const isMktDept = (t.departmentId || t.department || '').toLowerCase() === 'marketing';
      return isReq || (isMktDept && t.requestedBy != null);
    });
  }, [tasks]);

  // 3. User Filtered Tasks
  const userFilteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Tab 1: Sales Linked Tab
      if (viewMode === 'sales_linked') {
        const isSalesWork = task.isLinkedSalesWork || task.taskCategory === 'stark_door_order' || Boolean(task.sourceBookingId) || Boolean(task.bookingId);
        if (!isSalesWork) return false;
      } else if (viewMode === 'marketing_requests') {
        const isReq = task.isMarketingRequest || task.category === 'Marketing Request' || (task.departmentId === 'marketing' && task.requestedBy != null);
        if (!isReq) return false;
      } else {
        // Standard My Tasks view
        const taskAssigneeId = task.assignedToId || task.assignedTo;
        const taskAssigneeIds = Array.isArray(task.assigneeIds) ? task.assigneeIds : [];
        const isMine = taskAssigneeId === currentUserId || taskAssigneeIds.includes(currentUserId);
        if (!isMine) return false;
      }

      // Date Filter
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

      // Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'overdue') {
          if (!(task.deadlineDate < todayStr && task.status !== TASK_STATUSES.COMPLETED)) return false;
        } else if (task.status !== statusFilter) {
          return false;
        }
      }

      // Priority Filter
      if (priorityFilter !== 'all') {
        const pNorm = String(task.priority || '').toLowerCase();
        if (pNorm !== priorityFilter.toLowerCase()) return false;
      }

      // Search Query
      if (debouncedSearch.trim()) {
        const query = debouncedSearch.toLowerCase();
        const matchTitle = (task.title || '').toLowerCase().includes(query);
        const matchDesc = (task.description || '').toLowerCase().includes(query);
        const matchDealer = (task.dealerName || '').toLowerCase().includes(query);
        const matchRef = (task.reference || '').toLowerCase().includes(query);
        const matchLoc = (task.location || '').toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchDealer && !matchRef && !matchLoc) return false;
      }

      return true;
    }).sort((a, b) => {
      if (viewMode === 'sales_linked') {
        const dateA = a.requiredBy || a.deadlineDate || '';
        const dateB = b.requiredBy || b.deadlineDate || '';
        return String(dateA).localeCompare(String(dateB));
      }
      const aDone = a.status === TASK_STATUSES.COMPLETED;
      const bDone = b.status === TASK_STATUSES.COMPLETED;
      if (aDone !== bDone) return aDone ? 1 : -1;
      const dateA = a.date || a.taskDate || a.createdAt || '';
      const dateB = b.date || b.taskDate || b.createdAt || '';
      return String(dateB).localeCompare(String(dateA));
    });
  }, [tasks, viewMode, currentUserId, dateFilter, todayStr, selectedDate, statusFilter, priorityFilter, debouncedSearch]);

  const todayCount = useMemo(() => {
    return tasks.filter(task => {
      const taskAssigneeId = task.assignedToId || task.assignedTo;
      const taskAssigneeIds = Array.isArray(task.assigneeIds) ? task.assigneeIds : [];
      const isMine = taskAssigneeId === currentUserId || taskAssigneeIds.includes(currentUserId);
      if (!isMine) return false;
      const taskDateVal = task.date || task.taskDate || task.deadlineDate;
      return taskDateVal === todayStr || task.deadlineDate === todayStr;
    }).length;
  }, [tasks, currentUserId, todayStr]);

  const subtitleCountText = useMemo(() => {
    if (viewMode === 'sales_linked') {
      return `${salesLinkedTasks.length} linked dispatch orders from Sales`;
    }
    if (viewMode === 'marketing_requests') {
      return `${marketingRequests.length} incoming cross-department requests`;
    }
    if (dateFilter === 'today') {
      return `${todayCount} ${todayCount === 1 ? 'task today' : 'tasks today'}`;
    }
    if (dateFilter === 'yesterday') {
      return `${userFilteredTasks.length} ${userFilteredTasks.length === 1 ? 'task yesterday' : 'tasks yesterday'}`;
    }
    if (dateFilter === 'custom') {
      return `${userFilteredTasks.length} ${userFilteredTasks.length === 1 ? 'task on date' : 'tasks on date'}`;
    }
    return `${userFilteredTasks.length} ${userFilteredTasks.length === 1 ? 'task in total' : 'tasks in total'}`;
  }, [viewMode, salesLinkedTasks.length, marketingRequests.length, dateFilter, todayCount, userFilteredTasks.length]);

  // Toggle Complete / Sign-Off
  const handleToggleTaskComplete = async (task, e) => {
    e?.stopPropagation();

    const locked = isTaskLockedForUser(currentUser, task);
    if (locked) {
      showToast('This task is locked and historical records cannot be modified.', 'error');
      return;
    }

    const prevStatus = task.status;
    const prevProgress = task.progressPercentage || 0;
    const isCompleted = prevStatus === TASK_STATUSES.COMPLETED;
    const nextStatus = isCompleted ? TASK_STATUSES.IN_PROGRESS : TASK_STATUSES.PENDING_REVIEW;
    const nextProgress = isCompleted ? 50 : 100;

    const optimisticTask = {
      ...task,
      status: nextStatus,
      progressPercentage: nextProgress
    };

    if (onTaskUpdated) onTaskUpdated(optimisticTask);

    try {
      await updateFirestoreTask(task.id, {
        status: nextStatus,
        progressPercentage: nextProgress,
        auditAction: 'STATUS_TOGGLED',
        auditDetails: `Task marked as ${nextStatus}`
      }, currentUser);
    } catch (err) {
      console.error('Failed to update task status:', err);
      if (onTaskUpdated) {
        onTaskUpdated({
          ...task,
          status: prevStatus,
          progressPercentage: prevProgress
        });
      }
      showToast('Failed to update task status.', 'error');
    }
  };

  // Delete Task
  const handleDeleteTask = async (task, e) => {
    e?.stopPropagation();
    setActiveMenuTaskId(null);

    const locked = isTaskLockedForUser(currentUser, task);
    if (locked) {
      showToast('Action Denied: Locked tasks cannot be deleted.', 'error');
      return;
    }

    const confirmed = await confirm({
      title: 'Delete Task',
      message: `Are you sure you want to delete "${task.title}"? This cannot be undone.`,
      confirmText: 'Delete Task',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'tasks', task.id));
      showToast('Task deleted successfully', 'success');
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Failed to delete task', 'error');
    }
  };

  // Subtask Split for Downline
  const handleSplitTask = (parentTask, e) => {
    e?.stopPropagation();
    setActiveMenuTaskId(null);
    if (onOpenAssignModal) {
      onOpenAssignModal({
        parentTaskId: parentTask.id,
        parentTitle: parentTask.title,
        title: `Subtask: ${parentTask.title}`,
        description: `Split from: ${parentTask.title}\nBrief: ${parentTask.description || ''}`,
        priority: parentTask.priority || TASK_PRIORITIES.MEDIUM,
        department: parentTask.department || 'operations',
        reference: parentTask.reference || null,
        location: parentTask.location || null
      });
    }
  };

  // Handle Direct Status Change from Dropdown
  const handleStatusChange = async (task, newStatus, e) => {
    e?.stopPropagation();

    const locked = isTaskLockedForUser(currentUser, task);
    if (locked) {
      showToast('This task is locked and historical records cannot be modified.', 'error');
      return;
    }

    if (task.status === newStatus) return;

    const prevStatus = task.status;
    const prevProgress = task.progressPercentage || 0;

    let nextProgress = prevProgress;
    if (newStatus === TASK_STATUSES.COMPLETED || newStatus === 'Completed') nextProgress = 100;
    else if (newStatus === TASK_STATUSES.PENDING_REVIEW || newStatus === 'Pending Review') nextProgress = 90;
    else if (newStatus === TASK_STATUSES.IN_PROGRESS || newStatus === 'In Progress') nextProgress = Math.max(30, prevProgress);
    else if (newStatus === TASK_STATUSES.ASSIGNED || newStatus === 'Pending') nextProgress = 0;

    const optimisticTask = {
      ...task,
      status: newStatus,
      progressPercentage: nextProgress
    };

    if (onTaskUpdated) onTaskUpdated(optimisticTask);

    try {
      await updateFirestoreTask(task.id, {
        status: newStatus,
        progressPercentage: nextProgress,
        auditAction: 'STATUS_CHANGED',
        auditDetails: `Status changed from ${prevStatus} to ${newStatus}`
      }, currentUser);
      showToast(`Status updated to ${newStatus}`);
    } catch (err) {
      console.error('Failed to update task status:', err);
      if (onTaskUpdated) {
        onTaskUpdated({
          ...task,
          status: prevStatus,
          progressPercentage: prevProgress
        });
      }
      showToast('Failed to update task status.', 'error');
    }
  };

  const renderStatusBadge = (task) => {
    const s = (typeof task === 'string' ? task : task?.status) || TASK_STATUSES.ASSIGNED;
    const taskObj = typeof task === 'object' ? task : null;
    const locked = taskObj ? isTaskLockedForUser(currentUser, taskObj) : false;

    // Badge styling helpers
    let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
    if (s === TASK_STATUSES.COMPLETED || s === 'Completed') {
      badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    } else if (s === TASK_STATUSES.PENDING_REVIEW || s === 'Pending Review' || s === 'In Review') {
      badgeClass = 'bg-blue-50 text-blue-800 border-blue-200';
    } else if (s === 'Correction Requested' || s === 'Changes Requested') {
      badgeClass = 'bg-amber-50 text-amber-800 border-amber-300';
    } else if (s === TASK_STATUSES.BLOCKED || s === 'Blocked' || s === 'Payment Hold') {
      badgeClass = 'bg-rose-50 text-rose-800 border-rose-200';
    } else if (s === TASK_STATUSES.IN_PROGRESS || s === 'In Progress') {
      badgeClass = 'bg-sky-50 text-sky-800 border-sky-200';
    }

    if (!taskObj || locked) {
      return (
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badgeClass}`}>
          {s === TASK_STATUSES.PENDING_REVIEW ? 'In review' : s === 'Correction Requested' ? 'Changes requested' : s}
        </span>
      );
    }

    return (
      <div 
        className="relative inline-block" 
        onClick={(e) => {
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <select
          value={s}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => handleStatusChange(taskObj, e.target.value, e)}
          className={`appearance-none text-[11px] font-semibold rounded-full pl-2.5 pr-6 py-1 border cursor-pointer focus:outline-none transition-shadow shadow-2xs ${badgeClass}`}
        >
          <option value={TASK_STATUSES.ASSIGNED}>Pending</option>
          <option value={TASK_STATUSES.IN_PROGRESS}>In Progress</option>
          <option value={TASK_STATUSES.PENDING_REVIEW}>In Review / Sign-Off</option>
          <option value={TASK_STATUSES.COMPLETED}>Completed</option>
          <option value={TASK_STATUSES.BLOCKED}>Blocked</option>
          <option value="Changes Requested">Changes Requested</option>
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] opacity-70">
          ▼
        </span>
      </div>
    );
  };

  const renderPriorityBadge = (priority) => {
    const p = String(priority || '').toLowerCase();
    if (p === 'urgent' || p === 'critical') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          Critical
        </span>
      );
    }
    if (p === 'high') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          High
        </span>
      );
    }
    if (p === 'low') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
          Low
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        Medium
      </span>
    );
  };

  return (
    <>
      <div className="space-y-4">

        {/* 1. PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold text-[#05331F] tracking-tight">
                {viewMode === 'sales_linked' 
                  ? 'Orders from Sales' 
                  : viewMode === 'marketing_requests' 
                  ? 'Marketing Requests' 
                  : 'My Tasks'}
              </h1>

              {/* Tab Toggles for Operations Leadership & Marketing */}
              <div className="flex items-center p-0.5 bg-slate-200 rounded-xl ml-2 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('my_tasks')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition min-h-[36px] ${
                    viewMode === 'my_tasks' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  My Work
                </button>

                {(isWarehouseInCharge || isTransportManager || isOperationsHead || isFinanceRole) && (
                  <button
                    type="button"
                    onClick={() => setViewMode('sales_linked')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 min-h-[36px] ${
                      viewMode === 'sales_linked' ? 'bg-[#05331F] text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>From Sales</span>
                    {salesLinkedTasks.length > 0 && (
                      <span className="text-[10px] bg-emerald-400 text-[#05331F] font-bold px-1.5 py-0.2 rounded-full">
                        {salesLinkedTasks.length}
                      </span>
                    )}
                  </button>
                )}

                {isBrandManager && (
                  <button
                    type="button"
                    onClick={() => setViewMode('marketing_requests')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1 min-h-[36px] ${
                      viewMode === 'marketing_requests' ? 'bg-[#05331F] text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Megaphone className="w-3 h-3" />
                    <span>Requests</span>
                    {marketingRequests.length > 0 && (
                      <span className="text-[10px] bg-emerald-400 text-[#05331F] font-bold px-1.5 py-0.2 rounded-full">
                        {marketingRequests.length}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-slate-500">
              {subtitleCountText}
            </p>
          </div>

          {/* Primary Action Button: "Add today's work" */}
          <button
            type="button"
            onClick={() => setIsAddTodayWorkModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#05331F] hover:bg-[#07472B] active:bg-[#032214] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer self-start sm:self-auto min-h-[48px]"
            title="Record what you did today"
          >
            <PlusCircle className="w-4 h-4 text-emerald-300" />
            <span>Add today's work</span>
          </button>
        </div>

        {/* MAIN CARD CONTAINER */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          
          {/* TOOLBAR */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Date buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setDateFilter('today'); setSelectedDate(todayStr); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer min-h-[40px] ${
                    dateFilter === 'today' ? 'bg-[#05331F] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => { setDateFilter('yesterday'); setSelectedDate(getDateOffset(-1)); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer min-h-[40px] ${
                    dateFilter === 'yesterday' ? 'bg-[#05331F] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer min-h-[40px] ${
                    dateFilter === 'all' ? 'bg-[#05331F] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All dates
                </button>
              </div>

              <div className="relative inline-flex items-center">
                <label 
                  htmlFor="customDatePicker" 
                  className={`p-2 rounded-xl border text-xs font-medium cursor-pointer transition flex items-center gap-1.5 min-h-[40px] ${
                    dateFilter === 'custom' 
                      ? 'bg-emerald-50 border-emerald-300 text-[#05331F]' 
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Select specific date"
                >
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="hidden sm:inline">
                    {dateFilter === 'custom' ? formatCleanDate(selectedDate) : 'Date'}
                  </span>
                </label>
                <input
                  id="customDatePicker"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setDateFilter('custom');
                  }}
                  className="sr-only"
                />
              </div>
            </div>

            {/* Search Input & Dropdowns */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={viewMode === 'sales_linked' ? "Search dealer or order..." : "Search tasks..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#05331F]/20 min-h-[44px] md:min-h-0"
                  aria-label="Search tasks"
                />
              </div>

              <div className="hidden md:flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#05331F]/20 cursor-pointer min-h-[40px]"
                >
                  <option value="all">Status: All</option>
                  <option value={TASK_STATUSES.ASSIGNED}>Pending</option>
                  <option value={TASK_STATUSES.IN_PROGRESS}>In progress</option>
                  <option value={TASK_STATUSES.PENDING_REVIEW}>In review</option>
                  <option value="Correction Requested">Changes requested</option>
                  <option value={TASK_STATUSES.COMPLETED}>Completed</option>
                  <option value={TASK_STATUSES.BLOCKED}>Blocked</option>
                  <option value="overdue">Overdue</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#05331F]/20 cursor-pointer min-h-[40px]"
                >
                  <option value="all">Priority: All</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Critical</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                className="md:hidden p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 flex items-center justify-center min-h-[44px] min-w-[44px] shrink-0"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* TASK LIST */}
          {loading ? (
            <div className="p-6 space-y-4 animate-pulse">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0">
                  <div className="w-5 h-5 bg-slate-200 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-48 bg-slate-200 rounded" />
                    <div className="h-3 w-72 bg-slate-100 rounded" />
                  </div>
                  <div className="h-5 w-20 bg-slate-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : userFilteredTasks.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Clock className="w-10 h-10 mx-auto text-slate-300" />
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {viewMode === 'sales_linked' ? 'No linked orders from Sales right now' : 'No tasks for this day'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {viewMode === 'sales_linked'
                    ? 'When sales bookings are created, picking and dispatch tasks will appear here.'
                    : 'Record your accomplishments or assign yourself a task to get started.'}
                </p>
              </div>
              {viewMode === 'my_tasks' && (
                <button
                  type="button"
                  onClick={() => setIsAddTodayWorkModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#05331F] hover:bg-[#07472B] text-white text-xs font-semibold shadow-xs transition cursor-pointer min-h-[48px]"
                >
                  <PlusCircle className="w-4 h-4 text-emerald-400" />
                  <span>Add today's work</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden md:block">
                <table className="w-full text-left text-xs table-fixed">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-semibold uppercase text-[10px]">
                      <th className="py-2.5 px-3 w-10 text-center">Done</th>
                      <th className="py-2.5 px-3 w-2/5">Task & Reference</th>
                      {dateFilter === 'all' && <th className="py-2.5 px-3 w-24">Date</th>}
                      <th className="py-2.5 px-3 w-28 hidden lg:table-cell">Dept / Location</th>
                      <th className="py-2.5 px-3 w-20">Priority</th>
                      <th className="py-2.5 px-3 w-28">Required By</th>
                      <th className="py-2.5 px-3 w-28">Status</th>
                      <th className="py-2.5 px-3 w-24 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {userFilteredTasks.map(task => {
                      const isCompleted = task.status === TASK_STATUSES.COMPLETED;
                      const locked = isTaskLockedForUser(currentUser, task);
                      const isOverdue = task.deadlineDate < todayStr && !isCompleted;
                      const isFromSales = task.isLinkedSalesWork || task.taskCategory === 'stark_door_order';

                      return (
                        <tr 
                          key={task.id}
                          onClick={() => onOpenTaskDetails && onOpenTaskDetails(task)}
                          className={`hover:bg-slate-50/70 transition-colors cursor-pointer group ${
                            isCompleted ? 'bg-slate-50/30' : ''
                          }`}
                        >
                          <td 
                            className="py-2.5 px-3 text-center align-middle"
                            onClick={(e) => handleToggleTaskComplete(task, e)}
                          >
                            <button
                              type="button"
                              className="p-1 rounded text-slate-400 hover:text-[#05331F] transition cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                            >
                              {isCompleted ? (
                                <CheckSquare className="w-4 h-4 text-[#10B981]" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                              )}
                            </button>
                          </td>

                          {/* Task details */}
                          <td className="py-2.5 px-3 align-middle pr-4 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-semibold truncate ${
                                isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                              }`}>
                                {task.title}
                              </span>
                              {isFromSales && (
                                <span className="text-[9px] bg-emerald-100 text-[#05331F] font-bold px-1.5 py-0.2 rounded-full border border-emerald-300">
                                  From Sales
                                </span>
                              )}
                              {task.taskType && (
                                <span className="text-[9px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.2 rounded border border-slate-200">
                                  {task.taskType}
                                </span>
                              )}
                            </div>
                            {task.description && (
                              <div className="text-slate-500 text-[11px] truncate mt-0.5">
                                {task.description}
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 flex-wrap">
                              {task.reference && <span>Ref: <strong className="text-slate-600">{task.reference}</strong></span>}
                              {task.dealerName && <span>Dealer: <strong className="text-slate-600">{task.dealerName}</strong></span>}
                              {task.yesterdayLateReason && (
                                <span className="text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-semibold truncate max-w-[220px]" title={`Late Reason: ${task.yesterdayLateReason}`}>
                                  Reason: {task.yesterdayLateReason}
                                </span>
                              )}
                              {task.photos && task.photos.length > 0 && (
                                <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                                  <Camera className="w-2.5 h-2.5" />
                                  {task.photos.length} photo proof
                                </span>
                              )}
                            </div>
                          </td>

                          {dateFilter === 'all' && (
                            <td className="py-2.5 px-3 align-middle text-slate-500 whitespace-nowrap">
                              {formatCleanDate(task.date || task.taskDate)}
                            </td>
                          )}

                          <td className="py-2.5 px-3 align-middle text-slate-500 truncate hidden lg:table-cell">
                            {task.location ? (
                              <span className="flex items-center gap-1 text-slate-700 font-medium truncate">
                                <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
                                <span>{task.location}</span>
                              </span>
                            ) : (
                              formatDepartmentName(task.departmentId || task.department)
                            )}
                          </td>

                          <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                            {renderPriorityBadge(task.priority)}
                          </td>

                          <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                            <span className={`text-[11px] font-semibold ${
                              isOverdue ? 'text-rose-600' : 'text-slate-700'
                            }`}>
                              {formatCleanDate(task.requiredBy || task.deadlineDate || task.date || task.taskDate)}
                            </span>
                          </td>

                          <td 
                            className="py-2.5 px-3 align-middle whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {renderStatusBadge(task)}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3 align-middle text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1 relative">
                              {(isSupervisorOrManager || isAccountant) && (
                                <button
                                  type="button"
                                  onClick={(e) => handleSplitTask(task, e)}
                                  title="Split task into subtask"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                                >
                                  <GitFork className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => onOpenTaskDetails && onOpenTaskDetails(task)}
                                title={locked ? 'View (Locked)' : 'View & Edit'}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-[#05331F] hover:bg-slate-100 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                              >
                                {locked ? <Eye className="w-3.5 h-3.5 text-slate-500" /> : isCompleted ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                              </button>

                              <button
                                type="button"
                                onClick={() => setActiveMenuTaskId(activeMenuTaskId === task.id ? null : task.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>

                              {activeMenuTaskId === task.id && (
                                <div
                                  ref={menuRef}
                                  className="absolute right-0 top-8 z-30 w-40 bg-white border border-slate-200 rounded-xl shadow-lg py-1 text-left text-xs animate-in fade-in zoom-in-95 duration-100"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuTaskId(null);
                                      if (onOpenTaskDetails) onOpenTaskDetails(task);
                                    }}
                                    className="w-full px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{locked ? 'View Details' : 'View & Edit'}</span>
                                  </button>
                                  {(isSupervisorOrManager || isAccountant) && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleSplitTask(task, e)}
                                      className="w-full px-3 py-1.5 hover:bg-emerald-50 text-[#05331F] flex items-center gap-2 cursor-pointer font-medium"
                                    >
                                      <GitFork className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Split into Subtask</span>
                                    </button>
                                  )}
                                  {!locked && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteTask(task, e)}
                                      className="w-full px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                      <span>Delete</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE STACKED CARDS VIEW (Tap targets >= 48px) */}
              <div className="md:hidden divide-y divide-slate-100">
                {userFilteredTasks.map(task => {
                  const isCompleted = task.status === TASK_STATUSES.COMPLETED;
                  const isOverdue = task.deadlineDate < todayStr && !isCompleted;
                  const isFromSales = task.isLinkedSalesWork || task.taskCategory === 'stark_door_order';

                  return (
                    <div
                      key={task.id}
                      onClick={() => onOpenTaskDetails && onOpenTaskDetails(task)}
                      className="p-4 space-y-2.5 active:bg-slate-50/80 transition-colors cursor-pointer min-h-[48px]"
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={(e) => handleToggleTaskComplete(task, e)}
                          className="p-1 -ml-1 text-slate-400 hover:text-[#05331F] min-h-[48px] min-w-[48px] flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          {isCompleted ? (
                            <CheckSquare className="w-5 h-5 text-[#10B981]" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1 pt-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className={`text-xs font-semibold leading-snug ${
                              isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}>
                              {task.title}
                            </h4>
                            {isFromSales && (
                              <span className="text-[9px] bg-emerald-100 text-[#05331F] font-bold px-1.5 py-0.2 rounded-full border border-emerald-300">
                                From Sales
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 flex-wrap">
                            {task.reference && <span>Ref: <strong>{task.reference}</strong></span>}
                            {task.location && <span>Loc: <strong>{task.location}</strong></span>}
                            {task.yesterdayLateReason && (
                              <span className="text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-semibold truncate max-w-[200px]">
                                Reason: {task.yesterdayLateReason}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div 
                        className="flex items-center justify-between text-xs pt-1 border-t border-slate-50 flex-wrap gap-2 pl-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {renderStatusBadge(task)}
                          {renderPriorityBadge(task.priority)}
                        </div>

                        <span className={`text-[11px] font-semibold ${
                          isOverdue ? 'text-rose-600' : 'text-slate-600'
                        }`}>
                          Req: {formatCleanDate(task.requiredBy || task.deadlineDate || task.date || task.taskDate)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

        </div>

        {/* MOBILE BOTTOM SHEET FOR FILTERS */}
        {isMobileFilterOpen && (
          <div 
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end justify-center md:hidden"
            onClick={() => setIsMobileFilterOpen(false)}
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-white rounded-t-3xl p-5 space-y-4 max-h-[80vh] overflow-y-auto safe-pb animate-in slide-in-from-bottom duration-200"
            >
              <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Filter Tasks</h3>
                <button 
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 min-h-[48px] min-w-[48px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 min-h-[48px]"
                  >
                    <option value="all">All statuses</option>
                    <option value={TASK_STATUSES.ASSIGNED}>Pending</option>
                    <option value={TASK_STATUSES.IN_PROGRESS}>In progress</option>
                    <option value={TASK_STATUSES.PENDING_REVIEW}>In review</option>
                    <option value="Correction Requested">Changes requested</option>
                    <option value={TASK_STATUSES.COMPLETED}>Completed</option>
                    <option value={TASK_STATUSES.BLOCKED}>Blocked</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 min-h-[48px]"
                  >
                    <option value="all">All priorities</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Critical</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="w-full py-3.5 bg-[#05331F] text-white rounded-xl text-xs font-semibold min-h-[48px]"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: "Add Work" (Today or Yesterday) */}
        <AddTodayWorkModal
          isOpen={isAddTodayWorkModalOpen}
          onClose={() => setIsAddTodayWorkModalOpen(false)}
          currentUser={currentUser}
          departments={departments}
          onTaskCreated={(newTask) => {
            if (onTaskCreated) onTaskCreated(newTask);
            const dateLabel = newTask?.taskDate === getDateOffset(-1) ? "Yesterday's" : "Today's";
            showToast(`${dateLabel} work logged successfully!`);
          }}
        />

      </div>

      {/* Lightbox photo viewer */}
      {activePhotoViewer && (
        <div 
          onClick={() => setActivePhotoViewer(null)}
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <button
              onClick={() => setActivePhotoViewer(null)}
              className="absolute -top-10 right-0 text-white font-bold text-sm bg-black/40 px-3 py-1 rounded-full"
            >
              Close ✕
            </button>
            <img 
              src={activePhotoViewer} 
              alt="Operational Proof Full Preview" 
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl" 
            />
          </div>
        </div>
      )}
    </>
  );
}
