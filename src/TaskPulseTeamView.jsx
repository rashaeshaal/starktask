// src/TaskPulseTeamView.jsx
// Main view for "My Tasks" page in STARK STEEL SalesDoor Enterprise

import React, { useState, useMemo, useEffect } from 'react';
import { TASK_STATUSES, TASK_PRIORITIES } from './rbac';
import { getTodayDateString, getDateOffset } from './dateUtils';
import { updateFirestoreTask } from './firestoreService';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { useToast } from './ToastContext';

// Modular Sub-components
import TasksHeader from './TasksHeader';
import TaskStatsStrip from './TaskStatsStrip';
import TasksToolbar from './TasksToolbar';
import TasksTable from './TasksTable';
import TaskDrawer from './TaskDrawer';
import AddTodayWorkModal from './AddTodayWorkModal';

export default function TaskPulseTeamView({
  tasks = [],
  departments = [],
  currentUser,
  loading = false,
  initialViewMode = 'my_tasks',
  onTaskCreated,
  onTaskUpdated,
  onOpenTaskDetails,
  onOpenAssignModal,
  onFollowUpTask
}) {
  const todayStr = getTodayDateString();
  const userRole = currentUser?.role || '';
  const currentUserId = String(currentUser?.id || currentUser?.uid || currentUser?.employeeId || '');
  const currentUserEmpId = String(currentUser?.employeeId || '');
  const currentUserDirectoryId = currentUser?.employeeId ? `emp_${currentUser.employeeId}` : '';
  const currentUserEmail = String(currentUser?.email || '').toLowerCase();
  const currentUserName = String(currentUser?.fullName || currentUser?.name || '').toLowerCase();

  // Toast & confirmation context
  const { showToast, confirm } = useToast();

  // Aliases for matching current user
  const currentUserAliases = useMemo(() => {
    return new Set([
      currentUserId,
      currentUserEmpId,
      currentUserDirectoryId,
      currentUserEmail,
      currentUser?.uid ? String(currentUser.uid) : null,
      currentUser?.id ? String(currentUser.id) : null,
      currentUser?.employeeId ? String(currentUser.employeeId) : null,
      currentUser?.id && String(currentUser.id).startsWith('emp_') ? String(currentUser.id).replace('emp_', '') : null
    ].filter(Boolean));
  }, [currentUser, currentUserId, currentUserEmpId, currentUserDirectoryId, currentUserEmail]);

  // Roles permissions checks
  const isBrandManager = userRole === 'Brand Manager';
  const isOperationsHead = userRole === 'Operations Head';
  const isWarehouseInCharge = userRole === 'Warehouse In-charge';
  const isTransportManager = userRole === 'Transport Manager';
  const isFinanceRole = (currentUser?.department || '').toLowerCase() === 'finance' ||
                        ['Accounts Manager', 'Accounts Executive', 'Accountant', 'Junior Accountant'].includes(userRole);

  const canSeeSalesLinked = isWarehouseInCharge || isTransportManager || isOperationsHead || isFinanceRole;
  const canSeeMarketingRequests = isBrandManager;

  // View Mode: 'my_tasks' | 'assigned_by_me' | 'sales_linked' | 'marketing_requests'
  const [viewMode, setViewMode] = useState(initialViewMode);

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  // Filters State
  const [dateFilter, setDateFilter] = useState('today'); // 'today' | 'yesterday' | 'all' | 'custom'
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [groupByStatus, setGroupByStatus] = useState(false);

  // Pagination state (25 items per page)
  const [visibleCount, setVisibleCount] = useState(25);

  // Modals & Drawer State
  const [isAddWorkOpen, setIsAddWorkOpen] = useState(false);
  const [drawerTask, setDrawerTask] = useState(null);

  // Linked Sales Tasks
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
    });
  }, [tasks, isWarehouseInCharge, isTransportManager, isFinanceRole, isOperationsHead]);

  // Marketing Requests
  const marketingRequests = useMemo(() => {
    return tasks.filter(t => {
      const isReq = t.isMarketingRequest || t.category === 'Marketing Request' || t.taskCategory === 'Marketing Request';
      const isMktDept = (t.departmentId || t.department || '').toLowerCase() === 'marketing';
      return isReq || (isMktDept && t.requestedBy != null);
    });
  }, [tasks]);

  // Tasks assigned by me count
  const assignedByMeTasks = useMemo(() => {
    return tasks.filter(task => {
      const byId = String(task.assignedById || task.createdById || '');
      const byName = String(task.assignedByName || '').toLowerCase();
      return currentUserAliases.has(byId) || (currentUserName && byName.includes(currentUserName));
    });
  }, [tasks, currentUserAliases, currentUserName]);

  // Tasks assigned to me count today
  const todayMyTasksCount = useMemo(() => {
    return tasks.filter(task => {
      const taskAssigneeId = String(task.assignedToId || task.assignedTo || '');
      const taskAssigneeIds = Array.isArray(task.assigneeIds) ? task.assigneeIds.map(String) : [];
      const taskAssigneeName = String(task.assignedToName || '').toLowerCase();
      const isMine = currentUserAliases.has(taskAssigneeId) ||
                     taskAssigneeIds.some(id => currentUserAliases.has(id)) ||
                     (currentUserName && taskAssigneeName.includes(currentUserName));
      if (!isMine) return false;
      const taskDateVal = task.date || task.taskDate || task.deadlineDate;
      return taskDateVal === todayStr || task.deadlineDate === todayStr;
    }).length;
  }, [tasks, currentUserAliases, currentUserName, todayStr]);

  // Filtered Tasks for Active View
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // 1. View Mode Slice
      if (viewMode === 'sales_linked') {
        const isSalesWork = task.isLinkedSalesWork || task.taskCategory === 'stark_door_order' || Boolean(task.sourceBookingId) || Boolean(task.bookingId);
        if (!isSalesWork) return false;
      } else if (viewMode === 'marketing_requests') {
        const isReq = task.isMarketingRequest || task.category === 'Marketing Request' || (task.departmentId === 'marketing' && task.requestedBy != null);
        if (!isReq) return false;
      } else if (viewMode === 'assigned_by_me') {
        const byId = String(task.assignedById || task.createdById || '');
        const byName = String(task.assignedByName || '').toLowerCase();
        const isAssignedByMe = currentUserAliases.has(byId) || (currentUserName && byName.includes(currentUserName));
        if (!isAssignedByMe) return false;
      } else {
        // My Tasks View
        const taskAssigneeId = String(task.assignedToId || task.assignedTo || '');
        const taskAssigneeIds = Array.isArray(task.assigneeIds) ? task.assigneeIds.map(String) : [];
        const taskAssigneeName = String(task.assignedToName || '').toLowerCase();
        const isMine = currentUserAliases.has(taskAssigneeId) ||
                       taskAssigneeIds.some(id => currentUserAliases.has(id)) ||
                       (currentUserName && taskAssigneeName.includes(currentUserName));
        if (!isMine) return false;
      }

      // 2. Date Filter
      const taskDateVal = task.date || task.taskDate || task.deadlineDate;
      if (dateFilter === 'today') {
        if (taskDateVal !== todayStr && task.deadlineDate !== todayStr) return false;
      } else if (dateFilter === 'yesterday') {
        const yStr = getDateOffset(-1);
        if (taskDateVal !== yStr && task.deadlineDate !== yStr) return false;
      } else if (dateFilter === 'custom' && selectedDate) {
        if (taskDateVal !== selectedDate && task.deadlineDate !== selectedDate) return false;
      }

      // 3. Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'overdue') {
          const isDone = task.status === TASK_STATUSES.COMPLETED || task.status === 'Completed';
          if (isDone || !(task.deadlineDate && task.deadlineDate < todayStr)) return false;
        } else if (task.status !== statusFilter) {
          return false;
        }
      }

      // 4. Priority Filter
      if (priorityFilter !== 'all') {
        const pNorm = String(task.priority || '').toLowerCase();
        if (pNorm !== priorityFilter.toLowerCase()) return false;
      }

      // 5. Search Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const mTitle = (task.title || '').toLowerCase().includes(q);
        const mDesc = (task.description || '').toLowerCase().includes(q);
        const mRef = (task.reference || '').toLowerCase().includes(q);
        const mDealer = (task.dealerName || '').toLowerCase().includes(q);
        const mAssignee = (task.assignedToName || '').toLowerCase().includes(q);
        if (!mTitle && !mDesc && !mRef && !mDealer && !mAssignee) return false;
      }

      return true;
    }).sort((a, b) => {
      const aDone = a.status === TASK_STATUSES.COMPLETED || a.status === 'Completed';
      const bDone = b.status === TASK_STATUSES.COMPLETED || b.status === 'Completed';
      if (aDone !== bDone) return aDone ? 1 : -1;
      const dateA = a.date || a.taskDate || a.createdAt || '';
      const dateB = b.date || b.taskDate || b.createdAt || '';
      return String(dateB).localeCompare(String(dateA));
    });
  }, [
    tasks, viewMode, currentUserAliases, currentUserName, dateFilter, 
    todayStr, selectedDate, statusFilter, priorityFilter, searchTerm
  ]);

  // Reset Filters
  const handleResetFilters = () => {
    setDateFilter('today');
    setSelectedDate(todayStr);
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setVisibleCount(25);
  };

  // Optimistic Toggle Checkbox
  const handleToggleTaskComplete = async (task, e) => {
    e?.stopPropagation();
    const prevStatus = task.status;
    const isCompleted = prevStatus === TASK_STATUSES.COMPLETED || prevStatus === 'Completed';
    const nextStatus = isCompleted ? TASK_STATUSES.IN_PROGRESS : TASK_STATUSES.COMPLETED;
    const nextProgress = isCompleted ? 50 : 100;

    const optimistic = {
      ...task,
      status: nextStatus,
      progressPercentage: nextProgress
    };

    if (onTaskUpdated) onTaskUpdated(optimistic);

    try {
      await updateFirestoreTask(task.id, {
        status: nextStatus,
        progressPercentage: nextProgress,
        auditAction: 'STATUS_TOGGLED',
        auditDetails: `Task marked as ${nextStatus}`
      }, currentUser);
      showToast(`Task marked as ${nextStatus === TASK_STATUSES.COMPLETED ? 'completed' : 'in progress'}`);
    } catch (err) {
      console.error('Failed to toggle status:', err);
      if (onTaskUpdated) onTaskUpdated(task); // Rollback
      showToast('Failed to update task status.', 'error');
    }
  };

  // Optimistic Status Change from Dropdown
  const handleStatusChange = async (task, newStatus) => {
    if (task.status === newStatus) return;
    const prevStatus = task.status;

    let nextProgress = task.progressPercentage || 0;
    if (newStatus === TASK_STATUSES.COMPLETED) nextProgress = 100;
    else if (newStatus === TASK_STATUSES.PENDING_REVIEW) nextProgress = 90;
    else if (newStatus === TASK_STATUSES.IN_PROGRESS) nextProgress = Math.max(30, nextProgress);

    const optimistic = {
      ...task,
      status: newStatus,
      progressPercentage: nextProgress
    };

    if (onTaskUpdated) onTaskUpdated(optimistic);

    try {
      await updateFirestoreTask(task.id, {
        status: newStatus,
        progressPercentage: nextProgress,
        auditAction: 'STATUS_CHANGED',
        auditDetails: `Status changed from ${prevStatus} to ${newStatus}`
      }, currentUser);
      showToast(`Status changed to ${newStatus}`);
    } catch (err) {
      console.error('Failed to change status:', err);
      if (onTaskUpdated) onTaskUpdated(task); // Rollback
      showToast('Failed to change status.', 'error');
    }
  };

  // Delete Task
  const handleDeleteTask = async (task) => {
    const confirmed = await confirm({
      title: 'Delete Task',
      message: `Are you sure you want to delete "${task.title}"? This cannot be undone.`,
      confirmText: 'Delete Task',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'tasks', task.id));
      showToast('Task deleted successfully');
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Failed to delete task', 'error');
    }
  };

  // Split / Delegate Task
  const handleSplitTask = (task) => {
    if (onOpenAssignModal) {
      onOpenAssignModal({
        parentTaskId: task.id,
        parentTitle: task.title,
        title: `Subtask: ${task.title}`,
        description: `Split from: ${task.title}\n${task.description || ''}`,
        priority: task.priority || TASK_PRIORITIES.MEDIUM,
        department: task.department || 'operations',
        reference: task.reference || null,
        location: task.location || null
      });
    }
  };

  // Duplicate Task
  const handleDuplicateTask = (task) => {
    if (onOpenAssignModal) {
      onOpenAssignModal({
        title: `Copy: ${task.title}`,
        description: task.description || '',
        priority: task.priority || TASK_PRIORITIES.MEDIUM,
        department: task.departmentId || task.department || 'operations',
        reference: task.reference || null
      });
    }
  };

  // Reassign Task
  const handleReassignTask = (task) => {
    if (onOpenAssignModal) {
      onOpenAssignModal({
        taskId: task.id,
        title: task.title,
        description: task.description || '',
        priority: task.priority || TASK_PRIORITIES.MEDIUM,
        department: task.departmentId || task.department || 'operations'
      });
    }
  };

  // Update Task from Drawer
  const handleUpdateTaskDetails = async (taskId, fields) => {
    try {
      await updateFirestoreTask(taskId, fields, currentUser);
      showToast('Task details updated');
      if (drawerTask && drawerTask.id === taskId) {
        setDrawerTask(prev => ({ ...prev, ...fields }));
      }
    } catch (err) {
      console.error('Update error:', err);
      showToast('Failed to update task details', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      
      {/* 1. Page Header with Title, Count, Add Button & Underline Tab Bar */}
      <TasksHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        todayCount={todayMyTasksCount}
        assignedByMeCount={assignedByMeTasks.length}
        salesLinkedCount={salesLinkedTasks.length}
        marketingRequestsCount={marketingRequests.length}
        canSeeSalesLinked={canSeeSalesLinked}
        canSeeMarketingRequests={canSeeMarketingRequests}
        onOpenAddWork={() => setIsAddWorkOpen(true)}
      />

      {/* 2. Summary Stat Strip (Quick Status Filter) */}
      <TaskStatsStrip
        tasks={filteredTasks}
        currentStatusFilter={statusFilter}
        onSelectStatusFilter={setStatusFilter}
      />

      {/* 3. Toolbar (Segmented Date, Search, Selects, Group toggle, Reset) */}
      <TasksToolbar
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        selectedDate={selectedDate}
        onSelectedDateChange={setSelectedDate}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        groupByStatus={groupByStatus}
        onToggleGroupByStatus={() => setGroupByStatus(!groupByStatus)}
        onResetFilters={handleResetFilters}
      />

      {/* 4. Tasks Table / Cards */}
      <TasksTable
        tasks={filteredTasks}
        loading={loading}
        currentUserId={currentUserId}
        groupByStatus={groupByStatus}
        visibleCount={visibleCount}
        onLoadMore={() => setVisibleCount(prev => prev + 25)}
        onToggleComplete={handleToggleTaskComplete}
        onStatusChange={handleStatusChange}
        onOpenDetails={(task) => setDrawerTask(task)}
        onSplitTask={handleSplitTask}
        onDeleteTask={handleDeleteTask}
        onDuplicateTask={handleDuplicateTask}
        onReassignTask={handleReassignTask}
        onOpenAddWork={() => setIsAddWorkOpen(true)}
      />

      {/* 5. Right-side Task Detail Drawer */}
      <TaskDrawer
        isOpen={Boolean(drawerTask)}
        onClose={() => setDrawerTask(null)}
        task={drawerTask}
        currentUser={currentUser}
        onStatusChange={handleStatusChange}
        onUpdateTask={handleUpdateTaskDetails}
        onSplitTask={handleSplitTask}
      />

      {/* 6. Add Today Work Modal */}
      <AddTodayWorkModal
        isOpen={isAddWorkOpen}
        onClose={() => setIsAddWorkOpen(false)}
        currentUser={currentUser}
        departments={departments}
        onTaskCreated={(newTask) => {
          if (onTaskCreated) onTaskCreated(newTask);
          showToast("Work logged successfully!");
        }}
      />

    </div>
  );
}
