// src/TasksTable.jsx
// Main task list container: desktop table, mobile cards, collapsible sections, skeleton loader, and empty state

import React, { useState } from 'react';
import { 
  ClipboardCheck, ChevronDown, ChevronRight, AlertCircle, 
  Clock, Calendar, CheckCircle2, PlusCircle, Lock 
} from 'lucide-react';
import TaskRow from './TaskRow';
import TaskCard from './TaskCard';
import { TASK_STATUSES } from './rbac';
import { formatDue } from './taskHelpers';
import { isTodayLogWindowOpen } from './dateUtils';

export default function TasksTable({
  tasks = [],
  loading = false,
  currentUserId,
  groupByStatus = false,
  visibleCount = 25,
  onLoadMore,
  onToggleComplete,
  onStatusChange,
  onOpenDetails,
  onSplitTask,
  onDeleteTask,
  onDuplicateTask,
  onReassignTask,
  onOpenAddWork
}) {
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  const toggleGroup = (groupId) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // Group tasks into Overdue / Today / Upcoming / Completed
  const groupedSections = React.useMemo(() => {
    if (!groupByStatus) return null;

    const overdue = [];
    const today = [];
    const upcoming = [];
    const completed = [];

    tasks.forEach(task => {
      const isDone = task.status === TASK_STATUSES.COMPLETED || task.status === 'Completed';
      if (isDone) {
        completed.push(task);
        return;
      }
      const dueInfo = formatDue(task.requiredBy || task.deadlineDate || task.date || task.taskDate);
      if (dueInfo.isOverdue) {
        overdue.push(task);
      } else if (dueInfo.isToday) {
        today.push(task);
      } else {
        upcoming.push(task);
      }
    });

    return [
      { id: 'overdue', label: 'Overdue', count: overdue.length, items: overdue, color: 'text-red-700 bg-red-50 border-red-200' },
      { id: 'today', label: 'Today', count: today.length, items: today, color: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
      { id: 'upcoming', label: 'Upcoming', count: upcoming.length, items: upcoming, color: 'text-blue-800 bg-blue-50 border-blue-200' },
      { id: 'completed', label: 'Completed', count: completed.length, items: completed, color: 'text-slate-700 bg-slate-100 border-slate-200' }
    ].filter(section => section.count > 0);
  }, [tasks, groupByStatus]);

  // Paginated flat slice
  const displayedTasks = tasks.slice(0, visibleCount);

  // Render Table Header
  const renderTableHeader = () => (
    <thead className="sticky top-0 bg-white/95 backdrop-blur-xs z-10 border-b border-slate-200 shadow-2xs">
      <tr className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
        <th className="w-12 py-3 px-3 text-center">Done</th>
        <th className="py-3 px-3">Task</th>
        <th className="w-40 py-3 px-3">Assignee</th>
        <th className="w-36 py-3 px-3">Assigned By</th>
        <th className="w-32 py-3 px-3">Department</th>
        <th className="w-24 py-3 px-3">Priority</th>
        <th className="w-28 py-3 px-3">Due</th>
        <th className="w-36 py-3 px-3">Status</th>
        <th className="w-36 py-3 px-3 text-right">Actions</th>
      </tr>
    </thead>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
      
      {/* 1. Loading Skeleton */}
      {loading ? (
        <div className="divide-y divide-slate-100 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-16 px-4 flex items-center gap-4">
              <div className="w-5 h-5 rounded-md bg-slate-200" />
              <div className="w-48 h-4 rounded bg-slate-200" />
              <div className="flex-1" />
              <div className="w-24 h-4 rounded bg-slate-100" />
              <div className="w-20 h-6 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        
        /* 2. Empty State */
        <div className="p-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <ClipboardCheck className="w-8 h-8" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-900">
              No tasks for this period
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              There are no tasks matching your filters. You can log your daily work or create new tasks anytime.
            </p>
          </div>
          {isTodayLogWindowOpen() ? (
            <button
              type="button"
              onClick={onOpenAddWork}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#05331F] hover:bg-[#0a4a2f] text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-emerald-300" />
              <span>Add today's work</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-500 text-xs font-medium border border-slate-200">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Daily logging locked at 11:59 PM</span>
            </div>
          )}
        </div>

      ) : (
        
        /* 3. Task Content (Desktop Table + Mobile Cards) */
        <div>
          {groupByStatus && groupedSections ? (
            
            /* Grouped View */
            <div className="divide-y divide-slate-200">
              {groupedSections.map(section => {
                const isCollapsed = collapsedGroups.has(section.id);

                return (
                  <div key={section.id}>
                    {/* Collapsible Section Header */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(section.id)}
                      className="w-full px-4 py-2.5 bg-slate-50/80 hover:bg-slate-100/80 flex items-center justify-between transition-colors cursor-pointer border-b border-slate-100"
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                        <span className="font-semibold text-xs text-slate-900">
                          {section.label}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${section.color}`}>
                          {section.count}
                        </span>
                      </div>
                    </button>

                    {/* Section Items */}
                    {!isCollapsed && (
                      <>
                        {/* Desktop */}
                        <div className="hidden lg:block overflow-x-auto">
                          <table className="w-full text-left border-collapse table-fixed">
                            {renderTableHeader()}
                            <tbody>
                              {section.items.map((task, itemIdx) => (
                                <TaskRow
                                  key={task.id ? `${task.id}-${itemIdx}` : `task-${section.key}-${itemIdx}`}
                                  task={task}
                                  currentUserId={currentUserId}
                                  onToggleComplete={onToggleComplete}
                                  onStatusChange={onStatusChange}
                                  onOpenDetails={onOpenDetails}
                                  onSplitTask={onSplitTask}
                                  onDeleteTask={onDeleteTask}
                                  onDuplicateTask={onDuplicateTask}
                                  onReassignTask={onReassignTask}
                                />
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="lg:hidden divide-y divide-slate-100">
                          {section.items.map((task, itemIdx) => (
                            <TaskCard
                              key={task.id ? `${task.id}-${itemIdx}` : `task-card-${section.key}-${itemIdx}`}
                              task={task}
                              currentUserId={currentUserId}
                              onToggleComplete={onToggleComplete}
                              onStatusChange={onStatusChange}
                              onOpenDetails={onOpenDetails}
                              onSplitTask={onSplitTask}
                              onDeleteTask={onDeleteTask}
                              onDuplicateTask={onDuplicateTask}
                              onReassignTask={onReassignTask}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

          ) : (
            
            /* Flat Paginated View */
            <>
              {/* Desktop View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed">
                  {renderTableHeader()}
                  <tbody>
                    {displayedTasks.map((task, idx) => (
                      <TaskRow
                        key={task.id ? `${task.id}-${idx}` : `task-flat-${idx}`}
                        task={task}
                        currentUserId={currentUserId}
                        onToggleComplete={onToggleComplete}
                        onStatusChange={onStatusChange}
                        onOpenDetails={onOpenDetails}
                        onSplitTask={onSplitTask}
                        onDeleteTask={onDeleteTask}
                        onDuplicateTask={onDuplicateTask}
                        onReassignTask={onReassignTask}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="lg:hidden divide-y divide-slate-100">
                {displayedTasks.map((task, idx) => (
                  <TaskCard
                    key={task.id ? `${task.id}-${idx}` : `task-card-flat-${idx}`}
                    task={task}
                    currentUserId={currentUserId}
                    onToggleComplete={onToggleComplete}
                    onStatusChange={onStatusChange}
                    onOpenDetails={onOpenDetails}
                    onSplitTask={onSplitTask}
                    onDeleteTask={onDeleteTask}
                    onDuplicateTask={onDuplicateTask}
                    onReassignTask={onReassignTask}
                  />
                ))}
              </div>

              {/* Load More Pagination */}
              {tasks.length > visibleCount && (
                <div className="p-4 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={onLoadMore}
                    className="h-10 px-5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors shadow-2xs"
                  >
                    Load more ({tasks.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
}

