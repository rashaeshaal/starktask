import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Share2, Star, Filter, LayoutGrid, List, 
  Search, Calendar, Clock, ChevronDown, Check, ShieldAlert, 
  PanelRightClose, PanelRightOpen, Lock 
} from 'lucide-react';
import { TASK_STATUSES } from '../../rbac';
import { getTodayDateString, getDateOffset, isTodayLogWindowOpen } from '../../dateUtils';
import { useToast } from '../../ToastContext';
import TaskBoard, { COLUMNS } from './TaskBoard';
import TaskTable from './TaskTable';
import TaskStatsPanel from './TaskStatsPanel';
import AvatarStack from './AvatarStack';
import { TaskItem } from './TaskCard';
import AddTodayWorkModal from '../../AddTodayWorkModal';

interface MyTasksPageProps {
  tasks: any[];
  currentUser: any;
  employees?: any[];
  departments?: any[];
  teams?: any[];
  userTodos?: any[];
  loading?: boolean;
  initialViewMode?: string;
  onTaskCreated?: (task: any) => void;
  onTaskUpdated?: (task: any) => void;
  onOpenTaskDetails?: (task: any) => void;
  onOpenAssignModal?: () => void;
  onFollowUpTask?: (task: any) => void;
  onToggleTodoDone?: (todoId: string, done: boolean) => void;
  onQuickAddTodo?: (text: string) => void;
}

export default function MyTasksPage({
  tasks = [],
  currentUser,
  employees = [],
  departments = [],
  teams = [],
  userTodos = [],
  loading = false,
  initialViewMode = 'my_tasks',
  onTaskCreated,
  onTaskUpdated,
  onOpenTaskDetails,
  onOpenAssignModal,
  onFollowUpTask,
  onToggleTodoDone,
  onQuickAddTodo
}: MyTasksPageProps) {
  const { showToast } = useToast();
  const todayStr = getTodayDateString();

  // Persisted view mode: 'board' | 'table'
  const [layoutMode, setLayoutMode] = useState<'board' | 'table'>(() => {
    try {
      const saved = localStorage.getItem('stark_task_layout_mode');
      return saved === 'table' ? 'table' : 'board';
    } catch {
      return 'board';
    }
  });

  const handleLayoutChange = (mode: 'board' | 'table') => {
    setLayoutMode(mode);
    try {
      localStorage.setItem('stark_task_layout_mode', mode);
    } catch {}
  };

  // Right Side Stats Panel Visibility (persisted, collapsible)
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isAddTodayWorkOpen, setIsAddTodayWorkOpen] = useState(false);

  // Filters State
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'all' | 'custom'>('today');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isFavorite, setIsFavorite] = useState(false);

  // Aliases for matching current user
  const currentUserId = String(currentUser?.id || currentUser?.uid || currentUser?.employeeId || '');
  const currentUserEmpId = String(currentUser?.employeeId || '');
  const currentUserDirectoryId = currentUser?.employeeId ? `emp_${currentUser.employeeId}` : '';
  const currentUserEmail = String(currentUser?.email || '').toLowerCase();
  const currentUserName = String(currentUser?.fullName || currentUser?.name || '').toLowerCase();

  const currentUserAliases = useMemo(() => {
    return new Set([
      currentUserId,
      currentUserEmpId,
      currentUserDirectoryId,
      currentUserEmail,
      currentUser?.uid ? String(currentUser.uid) : null,
      currentUser?.id ? String(currentUser.id) : null,
      currentUser?.employeeId ? String(currentUser.employeeId) : null
    ].filter(Boolean));
  }, [currentUser, currentUserId, currentUserEmpId, currentUserDirectoryId, currentUserEmail]);

  // Teammates Avatars list
  const teammates = useMemo(() => {
    return employees.slice(0, 5).map((e) => ({
      name: e.fullName || e.name || 'Teammate',
      avatar: e.avatar
    }));
  }, [employees]);

  // Transform raw tasks to TaskItems with fallback realistic data if empty
  const formattedTasks: TaskItem[] = useMemo(() => {
    // Deduplicate incoming tasks by unique task ID to prevent duplicate React keys
    const taskMap = new Map();
    (tasks || []).forEach(t => {
      if (t && t.id) taskMap.set(String(t.id), t);
    });
    let sourceTasks = Array.from(taskMap.values());

    // Filter by assignee (My Tasks)
    if (initialViewMode === 'my_tasks') {
      sourceTasks = tasks.filter((task) => {
        const taskAssigneeId = String(task.assignedToId || task.assignedTo || '');
        const taskAssigneeIds = Array.isArray(task.assigneeIds) ? task.assigneeIds.map(String) : [];
        const taskAssigneeName = String(task.assignedToName || '').toLowerCase();
        const taskDriverId = String(task.assignedDriverId || task.driverId || '');
        return (
          currentUserAliases.has(taskAssigneeId) ||
          taskAssigneeIds.some((id) => currentUserAliases.has(id)) ||
          (taskDriverId && currentUserAliases.has(taskDriverId)) ||
          (currentUserName && taskAssigneeName.includes(currentUserName))
        );
      });
    }

    // Apply Date Filter
    if (dateFilter === 'today') {
      sourceTasks = sourceTasks.filter((t) => {
        const d = t.date || t.taskDate || t.deadlineDate;
        return d === todayStr || t.deadlineDate === todayStr;
      });
    } else if (dateFilter === 'yesterday') {
      const yStr = getDateOffset(-1);
      sourceTasks = sourceTasks.filter((t) => {
        const d = t.date || t.taskDate || t.deadlineDate;
        return d === yStr || t.deadlineDate === yStr;
      });
    } else if (dateFilter === 'custom' && selectedDate) {
      sourceTasks = sourceTasks.filter((t) => {
        const d = t.date || t.taskDate || t.deadlineDate;
        return d === selectedDate || t.deadlineDate === selectedDate;
      });
    }

    // Apply Status Filter
    if (statusFilter !== 'all') {
      sourceTasks = sourceTasks.filter((t) => {
        const s = (t.status || '').toLowerCase();
        if (statusFilter === 'overdue') {
          return t.deadlineDate && t.deadlineDate < todayStr && s !== 'completed';
        }
        return s === statusFilter.toLowerCase();
      });
    }

    // Apply Priority Filter
    if (priorityFilter !== 'all') {
      sourceTasks = sourceTasks.filter((t) => (t.priority || 'medium').toLowerCase() === priorityFilter.toLowerCase());
    }

    // Apply Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      sourceTasks = sourceTasks.filter((t) => {
        return (
          (t.title || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          (t.dealerName || '').toLowerCase().includes(q) ||
          (t.assignedToName || '').toLowerCase().includes(q)
        );
      });
    }

    // Fallback Mock Data if sourceTasks is empty so user sees realistic Aventik & Streamline UI
    if (sourceTasks.length === 0 && tasks.length === 0) {
      return [
        {
          id: 'mock_1',
          title: 'Verify door security specs for Royal Showroom',
          description: 'Double check lock cylinder tolerances against master drawing specifications #SRK-77.',
          status: 'Todo',
          priority: 'urgent',
          assignedToName: currentUser?.fullName || 'Hareesh Babu',
          assignees: [{ name: currentUser?.fullName || 'Hareesh Babu' }],
          dueDate: 'Today',
          labels: ['Showroom', 'Quality'],
          reminder: true,
          iconEmoji: '🚪'
        },
        {
          id: 'mock_2',
          title: 'Dispatch route clearance & transit sign-off',
          description: 'Coordinate trailer loading for Kerala North line and secure transport insurance slip.',
          status: 'In Progress',
          priority: 'high',
          assignedToName: 'Aswani R',
          assignees: [{ name: 'Aswani R' }, { name: 'Hareesh Babu' }],
          dueDate: 'Today',
          labels: ['Dispatch', 'Logistics'],
          reminder: false,
          iconEmoji: '🚚'
        },
        {
          id: 'mock_3',
          title: 'Payment token verification - A S Company',
          description: 'Accounts clearance for advance token transaction before warehouse dispatch staging.',
          status: 'Review',
          priority: 'medium',
          assignedToName: 'Shamna',
          assignees: [{ name: 'Shamna' }],
          dueDate: '2026-11-26',
          labels: ['Finance', 'Accounts'],
          reminder: true,
          iconEmoji: '💳'
        },
        {
          id: 'mock_4',
          title: 'Dealer showroom handover & POD stamp',
          description: 'Final physical delivery inspection and customer signed copy returned to coordinator.',
          status: 'Done',
          priority: 'basic',
          assignedToName: currentUser?.fullName || 'Hareesh Babu',
          assignees: [{ name: currentUser?.fullName || 'Hareesh Babu' }],
          dueDate: 'Yesterday',
          labels: ['Delivery', 'POD'],
          reminder: false,
          iconEmoji: '✅'
        }
      ];
    }

    return sourceTasks.map((t) => {
      let st: 'Todo' | 'In Progress' | 'Review' | 'Done' = 'Todo';
      const s = (t.status || '').toLowerCase();
      if (s === 'completed' || s === 'done') st = 'Done';
      else if (s === 'pending review' || s === 'review' || s === 'waiting for sign-off') st = 'Review';
      else if (s === 'in progress' || s === 'paused') st = 'In Progress';

      return {
        id: t.id,
        title: t.title || 'Untitled Operational Task',
        description: t.description || t.notes || '',
        status: st,
        priority: t.priority || 'medium',
        assignedToName: t.assignedToName || 'Assigned Staff',
        assignees: t.assignedToName ? [{ name: t.assignedToName }] : [],
        dueDate: t.deadlineDate || t.taskDate || t.date || 'Today',
        labels: t.department ? [t.department] : ['Operations'],
        reminder: Boolean(t.reminder),
        progressPercentage: t.progressPercentage || 0,
        rawTask: t
      };
    });
  }, [tasks, initialViewMode, currentUserAliases, currentUserName, dateFilter, todayStr, selectedDate, statusFilter, priorityFilter, searchTerm, currentUser]);

  const isTodayLocked = !isTodayLogWindowOpen();

  // Drag and Drop move task status handler
  const handleTaskMove = async (taskId: string, targetStatus: string) => {
    let newStatusStr = TASK_STATUSES.ASSIGNED;
    let newProgress = 0;

    if (targetStatus === 'Todo') {
      newStatusStr = TASK_STATUSES.ASSIGNED;
      newProgress = 0;
    } else if (targetStatus === 'In Progress') {
      newStatusStr = TASK_STATUSES.IN_PROGRESS;
      newProgress = 50;
    } else if (targetStatus === 'Review') {
      newStatusStr = TASK_STATUSES.PENDING_REVIEW;
      newProgress = 90;
    } else if (targetStatus === 'Done') {
      newStatusStr = TASK_STATUSES.COMPLETED;
      newProgress = 100;
    }

    const taskObj = formattedTasks.find((t) => t.id === taskId);
    if (!taskObj) return;

    if (onTaskUpdated) {
      onTaskUpdated({
        ...(taskObj.rawTask || taskObj),
        id: taskId,
        status: newStatusStr,
        progressPercentage: newProgress,
        completed: targetStatus === 'Done'
      });
      showToast(`Task moved to ${targetStatus}`, 'success');
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Page link copied to clipboard!', 'success');
    }
  };

  return (
    <div className="flex gap-6 max-w-[1700px] mx-auto font-sans pb-16">
      
      {/* MAIN CONTENT AREA */}
      <div className="flex-1 min-w-0 space-y-5">
        
        {/* 1. Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>My Tasks</span>
              <button
                type="button"
                onClick={() => setIsFavorite(!isFavorite)}
                className={`p-1 rounded-lg transition ${
                  isFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-300 hover:text-slate-500'
                }`}
                title="Star this view"
              >
                <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
              </button>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {formattedTasks.length} {formattedTasks.length === 1 ? 'task' : 'tasks'} today • STARK Steel Operations
            </p>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Stacked Teammate Avatars */}
            <div className="hidden sm:flex items-center pr-1">
              <AvatarStack assignees={teammates} limit={3} onAdd={onOpenAssignModal} />
            </div>

            {/* Share Button */}
            <button
              type="button"
              onClick={handleShare}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition shadow-2xs cursor-pointer"
              title="Share task list"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Quick Filters Toggle */}
            <button
              type="button"
              onClick={() => {
                if (statusFilter !== 'all' || priorityFilter !== 'all') {
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  showToast('Filters reset to All', 'info');
                } else {
                  setStatusFilter('todo');
                  showToast('Filtered to Todo tasks', 'info');
                }
              }}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer ${
                statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
              title="Toggle Quick Filter"
            >
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Filter</span>
              {(statusFilter !== 'all' || priorityFilter !== 'all') && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              )}
            </button>

            {/* Toggle Right Panel (Screens < 1280px) */}
            <button
              type="button"
              onClick={() => setIsPanelOpen(!isPanelOpen)}
              className="xl:hidden p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition shadow-2xs cursor-pointer"
              title={isPanelOpen ? 'Collapse side panel' : 'Open side panel'}
            >
              {isPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>

            {/* Primary Action: Add Today's Work */}
            <button
              type="button"
              onClick={() => setIsAddTodayWorkOpen(true)}
              disabled={isTodayLocked}
              className={`h-10 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer ${
                isTodayLocked
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-[#0B3D2E] hover:bg-[#07472B] text-white'
              }`}
            >
              <Plus className="w-4 h-4 text-emerald-300" />
              <span>Add today's work</span>
            </button>
          </div>
        </div>

        {/* 2. Controls Toolbar: View Switcher (Board/Table) & Filters Bar */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#E5E7EB] shadow-[0_1px_2px_rgba(16,24,40,0.06)] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* View Switcher: [Board] [Table] */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => handleLayoutChange('board')}
              className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                layoutMode === 'board'
                  ? 'bg-white text-[#0B3D2E] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => handleLayoutChange('table')}
              className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                layoutMode === 'table'
                  ? 'bg-white text-[#0B3D2E] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          {/* Date Segmented Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'all', label: 'All dates' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDateFilter(tab.id as any)}
                className={`h-8 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  dateFilter === tab.id
                    ? 'bg-[#0B3D2E] text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}

            <div className="relative inline-flex items-center">
              <label 
                htmlFor="customDatePicker" 
                className={`h-8 px-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
                  dateFilter === 'custom' 
                    ? 'bg-emerald-50 border-emerald-300 text-[#0B3D2E]' 
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                title="Select date"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">{dateFilter === 'custom' ? selectedDate : 'Date'}</span>
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

          {/* Search & Filters */}
          <div className="flex items-center gap-2 flex-1 lg:justify-end">
            <div className="relative flex-1 max-w-xs min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tasks, orders…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#0B3D2E]"
              />
            </div>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="todo">Todo</option>
              <option value="in progress">In Progress</option>
              <option value="review">Review</option>
              <option value="completed">Done</option>
              <option value="overdue">Overdue</option>
            </select>

            {/* Priority Dropdown */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

        </div>

        {/* 3. VIEW CONTAINER: BOARD OR TABLE */}
        {layoutMode === 'board' ? (
          <TaskBoard
            tasks={formattedTasks}
            onTaskClick={(task) => onOpenTaskDetails && onOpenTaskDetails(task.rawTask || task)}
            onTaskMove={handleTaskMove}
          />
        ) : (
          <TaskTable
            tasks={formattedTasks}
            onTaskClick={(task) => onOpenTaskDetails && onOpenTaskDetails(task.rawTask || task)}
            onStatusChange={(taskId, newStatus) => handleTaskMove(taskId, newStatus)}
          />
        )}

      </div>

      {/* 4. COLLAPSIBLE RIGHT STATS PANEL (320px) */}
      {isPanelOpen && (
        <div className="hidden xl:block">
          <TaskStatsPanel
            currentUser={currentUser}
            tasks={formattedTasks}
            userTodos={userTodos}
            onToggleTodo={onToggleTodoDone}
            onAddTodo={onQuickAddTodo}
          />
        </div>
      )}

      {/* Add Today's Work Modal */}
      {isAddTodayWorkOpen && (
        <AddTodayWorkModal
          isOpen={isAddTodayWorkOpen}
          onClose={() => setIsAddTodayWorkOpen(false)}
          currentUser={currentUser}
          departments={departments}
          onTaskCreated={(newTask) => {
            if (onTaskCreated) onTaskCreated(newTask);
            setIsAddTodayWorkOpen(false);
            showToast("Work logged successfully!");
          }}
        />
      )}

    </div>
  );
}
