import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  CheckCircle2, Clock, AlertTriangle, AlertCircle, Calendar, 
  Search, CheckSquare, Square, Eye, Edit3, Trash2, MoreHorizontal,
  PlusCircle, Filter, X, Check, Loader2
} from 'lucide-react';
import { TASK_STATUSES, TASK_PRIORITIES, isTaskLockedForUser } from './rbac';
import { getTodayDateString, getDateOffset } from './dateUtils';
import AddTodayWorkModal from './AddTodayWorkModal';
import { updateFirestoreTask } from './firestoreService';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Clean Date Formatter:
 * - "Today" if today
 * - "Tomorrow" if tomorrow
 * - "Yesterday" if yesterday
 * - Otherwise "16 Nov 2026"
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

/**
 * Format Department / Project text:
 * E.g. "HR_ADMIN" -> "HR & Admin", "SALES" -> "Sales"
 */
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
  onOpenTaskDetails
}) {
  const todayStr = getTodayDateString();

  // Date Navigation State: 'today' | 'yesterday' | 'all' | 'custom'
  const [dateFilter, setDateFilter] = useState('today');
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Mobile Bottom Sheet Filter State
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Overflow menu state: openTaskId
  const [activeMenuTaskId, setActiveMenuTaskId] = useState(null);
  const menuRef = useRef(null);

  // Modal State: "Add Today's Work"
  const [isAddTodayWorkModalOpen, setIsAddTodayWorkModalOpen] = useState(false);

  // Toast / Feedback message
  const [toastMessage, setToastMessage] = useState(null);

  // Debounce search (250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Click outside to dismiss overflow menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuTaskId(null);
      }
    };
    if (activeMenuTaskId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuTaskId]);

  // Keyboard accessibility: ESC closes modal, mobile filter sheet, or menus
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (activeMenuTaskId) setActiveMenuTaskId(null);
        if (isMobileFilterOpen) setIsMobileFilterOpen(false);
        if (isAddTodayWorkModalOpen) setIsAddTodayWorkModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMenuTaskId, isMobileFilterOpen, isAddTodayWorkModalOpen]);

  // Auto-clear toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (text, type = 'error') => {
    setToastMessage({ text, type });
  };

  const currentUserId = currentUser?.id || currentUser?.uid || currentUser?.employeeId;

  // Filter tasks belonging to current logged-in user
  const userFilteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // 1. User Filter: Belongs to logged-in user
      const taskAssigneeId = task.assignedToId || task.assignedTo;
      const taskAssigneeIds = Array.isArray(task.assigneeIds) ? task.assigneeIds : [];
      const isMine = taskAssigneeId === currentUserId || taskAssigneeIds.includes(currentUserId);
      if (!isMine) return false;

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
      if (priorityFilter !== 'all') {
        const pNorm = String(task.priority || '').toLowerCase();
        if (pNorm !== priorityFilter.toLowerCase()) return false;
      }

      // 5. Search Text Filter (Debounced)
      if (debouncedSearch.trim()) {
        const query = debouncedSearch.toLowerCase();
        const matchTitle = (task.title || '').toLowerCase().includes(query);
        const matchDesc = (task.description || '').toLowerCase().includes(query);
        const matchDept = (task.projectDept || task.department || task.departmentId || '').toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchDept) return false;
      }

      return true;
    }).sort((a, b) => {
      // Completed at bottom, then newest
      const aDone = a.status === TASK_STATUSES.COMPLETED;
      const bDone = b.status === TASK_STATUSES.COMPLETED;
      if (aDone !== bDone) return aDone ? 1 : -1;
      const dateA = a.date || a.taskDate || a.createdAt || '';
      const dateB = b.date || b.taskDate || b.createdAt || '';
      return String(dateB).localeCompare(String(dateA));
    });
  }, [tasks, currentUserId, dateFilter, todayStr, selectedDate, statusFilter, priorityFilter, debouncedSearch]);

  // Today's total count for subtitle
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

  // Subtitle text (Never says "undefined")
  const subtitleCountText = useMemo(() => {
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
  }, [dateFilter, todayCount, userFilteredTasks.length]);

  // Optimistic Toggle Task Done
  const handleToggleTaskComplete = async (task, e) => {
    e?.stopPropagation();

    const locked = isTaskLockedForUser(currentUser, task);
    if (locked) {
      showToast('This task is locked and historical records cannot be modified.');
      return;
    }

    const prevStatus = task.status;
    const prevProgress = task.progressPercentage || 0;
    const isCompleted = prevStatus === TASK_STATUSES.COMPLETED;
    const nextStatus = isCompleted ? TASK_STATUSES.IN_PROGRESS : TASK_STATUSES.COMPLETED;
    const nextProgress = isCompleted ? 50 : 100;

    const optimisticTask = {
      ...task,
      status: nextStatus,
      progressPercentage: nextProgress
    };

    // 1. Optimistic UI update
    if (onTaskUpdated) onTaskUpdated(optimisticTask);

    // 2. Persist to Firestore
    try {
      await updateFirestoreTask(task.id, {
        status: nextStatus,
        progressPercentage: nextProgress,
        auditAction: 'STATUS_TOGGLED',
        auditDetails: `Task marked as ${nextStatus}`
      }, currentUser);
    } catch (err) {
      console.error('Failed to update task status:', err);
      // Rollback on error
      if (onTaskUpdated) {
        onTaskUpdated({
          ...task,
          status: prevStatus,
          progressPercentage: prevProgress
        });
      }
      showToast('Failed to update task status. Changes rolled back.');
    }
  };

  // Delete Task
  const handleDeleteTask = async (task, e) => {
    e?.stopPropagation();
    setActiveMenuTaskId(null);

    const locked = isTaskLockedForUser(currentUser, task);
    if (locked) {
      showToast('Action Denied: Historical locked tasks cannot be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${task.title}"?`)) return;

    try {
      await deleteDoc(doc(db, 'tasks', task.id));
      showToast('Task deleted successfully.', 'success');
    } catch (err) {
      console.error('Delete task error:', err);
      showToast(err.message || 'Failed to delete task.');
    }
  };

  // Status Badge Component (Soft-tinted pills, no dark filled backgrounds)
  const renderStatusBadge = (status) => {
    if (status === TASK_STATUSES.COMPLETED) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-[#10B981] border border-emerald-200">
          Completed
        </span>
      );
    }
    if (status === TASK_STATUSES.IN_PROGRESS) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          In progress
        </span>
      );
    }
    if (status === TASK_STATUSES.BLOCKED) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
          Blocked
        </span>
      );
    }
    if (status === TASK_STATUSES.PENDING_REVIEW) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          Review
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
        Pending
      </span>
    );
  };

  // Priority Badge Component
  const renderPriorityBadge = (priority) => {
    const p = String(priority || 'Medium').toLowerCase();
    if (p === 'urgent' || p === 'critical' || p === 'high') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
          High
        </span>
      );
    }
    if (p === 'low') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
          Low
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        Medium
      </span>
    );
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12 font-sans select-none">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div 
          className={`fixed top-4 right-4 z-50 p-3.5 rounded-2xl shadow-lg border text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-3 ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. PAGE HEADER (No card box) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#05331F] tracking-tight">
            My Tasks
          </h1>
          <p className="text-sm text-slate-500">
            {subtitleCountText}
          </p>
        </div>

        {/* Primary Action Button: "Add today's work" */}
        <button
          type="button"
          onClick={() => setIsAddTodayWorkModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#05331F] hover:bg-[#07472B] active:bg-[#032214] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer self-start sm:self-auto min-h-[44px]"
          title="Record what you did today"
        >
          <PlusCircle className="w-4 h-4 text-emerald-300" />
          <span>Add today's work</span>
        </button>
      </div>

      {/* MAIN CARD CONTAINER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* 2. SINGLE TOOLBAR ROW */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Left: Segmented date control + compact date picker button */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="inline-flex p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => { setDateFilter('today'); setSelectedDate(todayStr); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer min-h-[36px] sm:min-h-0 ${
                  dateFilter === 'today'
                    ? 'bg-[#05331F] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => { setDateFilter('yesterday'); setSelectedDate(getDateOffset(-1)); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer min-h-[36px] sm:min-h-0 ${
                  dateFilter === 'yesterday'
                    ? 'bg-[#05331F] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer min-h-[36px] sm:min-h-0 ${
                  dateFilter === 'all'
                    ? 'bg-[#05331F] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All dates
              </button>
            </div>

            {/* Compact date picker */}
            <div className="relative inline-flex items-center">
              <label 
                htmlFor="customDatePicker" 
                className={`p-2 rounded-xl border text-xs font-medium cursor-pointer transition flex items-center gap-1.5 min-h-[40px] sm:min-h-0 ${
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

          {/* Right: Search Input + Status & Priority Filter Dropdowns (Desktop) / Filter Button (Mobile) */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            
            {/* Search Input (Full width on mobile) */}
            <div className="relative flex-1 md:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#05331F]/20 min-h-[44px] md:min-h-0"
                aria-label="Search tasks"
              />
            </div>

            {/* Desktop Status & Priority Filter Dropdowns */}
            <div className="hidden md:flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#05331F]/20 cursor-pointer"
                aria-label="Filter by status"
              >
                <option value="all">Status: All</option>
                <option value={TASK_STATUSES.ASSIGNED}>Pending</option>
                <option value={TASK_STATUSES.IN_PROGRESS}>In progress</option>
                <option value={TASK_STATUSES.PENDING_REVIEW}>Pending review</option>
                <option value={TASK_STATUSES.COMPLETED}>Completed</option>
                <option value={TASK_STATUSES.BLOCKED}>Blocked</option>
                <option value="overdue">Overdue</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#05331F]/20 cursor-pointer"
                aria-label="Filter by priority"
              >
                <option value="all">Priority: All</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            {/* Mobile Filter Button (Collapsed into bottom sheet trigger) */}
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(true)}
              className="md:hidden p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 flex items-center justify-center min-h-[44px] min-w-[44px] shrink-0"
              title="Open filters"
              aria-label="Open filters"
            >
              <Filter className="w-4 h-4" />
            </button>

          </div>

        </div>

        {/* 3. TASK LIST VIEW */}
        {loading ? (
          /* SKELETON LOADING STATE */
          <div className="p-6 space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0">
                <div className="w-5 h-5 bg-slate-200 rounded" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-48 bg-slate-200 rounded" />
                  <div className="h-3 w-72 bg-slate-100 rounded" />
                </div>
                <div className="h-5 w-20 bg-slate-100 rounded-full" />
                <div className="h-5 w-16 bg-slate-100 rounded-full" />
                <div className="h-8 w-8 bg-slate-100 rounded-lg" />
              </div>
            ))}
          </div>
        ) : userFilteredTasks.length === 0 ? (
          /* 4. EMPTY STATE */
          <div className="p-12 text-center space-y-3">
            <Clock className="w-10 h-10 mx-auto text-slate-300" />
            <div>
              <p className="text-sm font-semibold text-slate-800">No tasks for this day</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Record your accomplishments or assign yourself a task to get started.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddTodayWorkModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472B] text-white text-xs font-semibold shadow-xs transition cursor-pointer min-h-[44px]"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Add today's work</span>
            </button>
          </div>
        ) : (
          <>
            {/* DESKTOP & TABLET TABLE (No horizontal scroll at 1024px and above) */}
            <div className="hidden md:block">
              <table className="w-full text-left text-xs table-fixed">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs">
                    <th className="py-3 px-3 w-10 text-center font-medium">Done</th>
                    <th className="py-3 px-3 font-medium w-[40%]">Task</th>
                    {dateFilter === 'all' && (
                      <th className="py-3 px-3 font-medium w-24">Date</th>
                    )}
                    <th className="py-3 px-3 font-medium w-28 hidden lg:table-cell">Project</th>
                    <th className="py-3 px-3 font-medium w-20">Priority</th>
                    <th className="py-3 px-3 font-medium w-24">Deadline</th>
                    <th className="py-3 px-3 font-medium w-24">Status</th>
                    <th className="py-3 px-3 font-medium w-16 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userFilteredTasks.map(task => {
                    const isCompleted = task.status === TASK_STATUSES.COMPLETED;
                    const locked = isTaskLockedForUser(currentUser, task);
                    const isOverdue = task.deadlineDate < todayStr && !isCompleted;
                    const hasAssigner = task.createdByName && task.createdByName !== (task.assignedEmployee || task.assignedToName);

                    return (
                      <tr
                        key={task.id}
                        onClick={() => onOpenTaskDetails && onOpenTaskDetails(task)}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                          isCompleted ? 'bg-slate-50/40 text-slate-400' : ''
                        }`}
                      >
                        {/* 1. Checkbox (Done) */}
                        <td 
                          className="py-2.5 px-3 text-center align-middle"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => handleToggleTaskComplete(task, e)}
                            title={locked ? "Task is locked" : isCompleted ? "Mark incomplete" : "Mark complete"}
                            aria-label={isCompleted ? "Mark task incomplete" : "Mark task complete"}
                            className="p-1 rounded-lg transition-transform active:scale-90 text-slate-400 hover:text-[#05331F] focus:outline-none cursor-pointer"
                          >
                            {isCompleted ? (
                              <CheckSquare className="w-4 h-4 text-[#10B981]" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                            )}
                          </button>
                        </td>

                        {/* 2. Task (Title + truncated 1-line description + optional From: Name) */}
                        <td className="py-2.5 px-3 align-middle pr-4 min-w-0">
                          <div className={`font-medium truncate ${
                            isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}>
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="text-slate-500 text-[11px] truncate">
                              {task.description}
                            </div>
                          )}
                          {hasAssigner && (
                            <div className="text-[10px] text-slate-400 truncate">
                              From: {task.createdByName.split(' ')[0]}
                            </div>
                          )}
                        </td>

                        {/* Date (Only under "All dates") */}
                        {dateFilter === 'all' && (
                          <td className="py-2.5 px-3 align-middle text-slate-500 whitespace-nowrap">
                            {formatCleanDate(task.date || task.taskDate)}
                          </td>
                        )}

                        {/* 3. Project / Dept (Hidden on tablet, shown on lg) */}
                        <td className="py-2.5 px-3 align-middle text-slate-500 truncate hidden lg:table-cell">
                          {formatDepartmentName(task.projectDept || task.department || task.departmentId)}
                        </td>

                        {/* 4. Priority */}
                        <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                          {renderPriorityBadge(task.priority)}
                        </td>

                        {/* 5. Deadline (Turns red if overdue) */}
                        <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                          <span className={`text-[11px] ${
                            isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-500'
                          }`}>
                            {formatCleanDate(task.deadlineDate || task.date || task.taskDate)}
                          </span>
                        </td>

                        {/* 6. Status */}
                        <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                          {renderStatusBadge(task.status)}
                        </td>

                        {/* 7. Action column (Execute check/pencil + overflow menu) */}
                        <td 
                          className="py-2.5 px-3 align-middle text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1 relative">
                            {/* Primary Action Button (Check or Pencil) */}
                            <button
                              type="button"
                              onClick={() => onOpenTaskDetails && onOpenTaskDetails(task)}
                              title={isCompleted ? "View task details" : "Execute task"}
                              aria-label={isCompleted ? "View details" : "Execute task"}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#05331F] hover:bg-slate-100 transition cursor-pointer"
                            >
                              {isCompleted ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                            </button>

                            {/* Overflow Menu (⋯) */}
                            <button
                              type="button"
                              onClick={() => setActiveMenuTaskId(activeMenuTaskId === task.id ? null : task.id)}
                              aria-label="More actions"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>

                            {/* Dropdown Menu */}
                            {activeMenuTaskId === task.id && (
                              <div
                                ref={menuRef}
                                className="absolute right-0 top-8 z-30 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1 text-left text-xs animate-in fade-in zoom-in-95 duration-100"
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
                                  <span>View & Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteTask(task, e)}
                                  className="w-full px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                  <span>Delete</span>
                                </button>
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

            {/* MOBILE STACKED CARDS VIEW (Below 768px, 44px tap targets, zero horizontal scroll) */}
            <div className="md:hidden divide-y divide-slate-100">
              {userFilteredTasks.map(task => {
                const isCompleted = task.status === TASK_STATUSES.COMPLETED;
                const locked = isTaskLockedForUser(currentUser, task);
                const isOverdue = task.deadlineDate < todayStr && !isCompleted;
                const hasAssigner = task.createdByName && task.createdByName !== (task.assignedEmployee || task.assignedToName);

                return (
                  <div
                    key={task.id}
                    onClick={() => onOpenTaskDetails && onOpenTaskDetails(task)}
                    className="p-4 space-y-2.5 active:bg-slate-50/80 transition-colors cursor-pointer min-h-[44px]"
                  >
                    {/* Header: Checkbox + Title */}
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={(e) => handleToggleTaskComplete(task, e)}
                        title={locked ? "Task is locked" : isCompleted ? "Mark incomplete" : "Mark complete"}
                        aria-label={isCompleted ? "Mark task incomplete" : "Mark task complete"}
                        className="p-1 -ml-1 text-slate-400 hover:text-[#05331F] min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        {isCompleted ? (
                          <CheckSquare className="w-5 h-5 text-[#10B981]" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1 pt-1">
                        <h4 className={`text-xs font-semibold leading-snug line-clamp-2 ${
                          isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}>
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {task.description}
                          </p>
                        )}
                        {hasAssigner && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            From: {task.createdByName.split(' ')[0]}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer Row: Status Pill, Priority Pill, Deadline */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50 flex-wrap gap-2 pl-9">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {renderStatusBadge(task.status)}
                        {renderPriorityBadge(task.priority)}
                      </div>

                      <span className={`text-[11px] font-medium ${
                        isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-500'
                      }`}>
                        {formatCleanDate(task.deadlineDate || task.date || task.taskDate)}
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
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none min-h-[44px]"
              >
                <option value="all">All statuses</option>
                <option value={TASK_STATUSES.ASSIGNED}>Pending</option>
                <option value={TASK_STATUSES.IN_PROGRESS}>In progress</option>
                <option value={TASK_STATUSES.PENDING_REVIEW}>Pending review</option>
                <option value={TASK_STATUSES.COMPLETED}>Completed</option>
                <option value={TASK_STATUSES.BLOCKED}>Blocked</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none min-h-[44px]"
              >
                <option value="all">All priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            {/* Reset & Apply */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setIsMobileFilterOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 min-h-[44px]"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-[#05331F] text-white min-h-[44px]"
              >
                Apply
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: ADD TODAY'S WORK */}
      <AddTodayWorkModal
        isOpen={isAddTodayWorkModalOpen}
        onClose={() => setIsAddTodayWorkModalOpen(false)}
        currentUser={currentUser}
        departments={departments}
        onTaskCreated={(newTask) => {
          if (onTaskCreated) {
            onTaskCreated(newTask);
          } else if (onTaskUpdated) {
            onTaskUpdated(newTask);
          }
          showToast("Today's work logged successfully.", "success");
        }}
      />

    </div>
  );
}
