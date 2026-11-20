// src/TaskRow.jsx
// Desktop table row (height 64px, vertically centered, no zebra)

import React, { useState, useRef, useEffect } from 'react';
import { 
  Check, GitFork, Eye, Edit3, MoreHorizontal, Trash2, 
  Copy, UserPlus, CheckSquare, Square
} from 'lucide-react';
import StatusPill from './StatusPill';
import PriorityPill from './PriorityPill';
import { formatName, formatDepartment, formatDue, formatTime } from './taskHelpers';
import { TASK_STATUSES } from './rbac';

export default function TaskRow({
  task,
  currentUserId,
  onToggleComplete,
  onStatusChange,
  onOpenDetails,
  onSplitTask,
  onDeleteTask,
  onDuplicateTask,
  onReassignTask
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  const isCompleted = task.status === TASK_STATUSES.COMPLETED || task.status === 'Completed';
  const dueInfo = formatDue(task.requiredBy || task.deadlineDate || task.date || task.taskDate);
  const isOverdue = dueInfo.isOverdue && !isCompleted;

  // Format names in Title Case
  const assigneeName = formatName(task.assignedToName || task.assigneeName || 'Unassigned');
  const assigneeRole = task.assignedToRole || task.assigneeRole || '';
  const assignerName = formatName(task.assignedByName || task.createdByName);
  const isSelf = task.selfLogged || (!task.assignedByName && task.createdById === currentUserId);

  // Time stamps for Created time and Done time (matches Daily Sheet style)
  const createdTime = formatTime(task.createdAt);
  const completedTime = formatTime(task.completedAt || task.lastUpdated);

  // Close 3-dots menu on outside click or ESC
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isMenuOpen]);

  const toggleMenu = (e) => {
    e.stopPropagation();
    if (!isMenuOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 180);
    }
    setIsMenuOpen(prev => !prev);
  };

  return (
    <tr
      onClick={() => onOpenDetails && onOpenDetails(task)}
      className={`h-16 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group ${
        isCompleted ? 'bg-slate-50/40 opacity-75' : ''
      }`}
    >
      {/* 1. Checkbox (20px rounded) */}
      <td 
        className="w-12 px-3 text-center align-middle"
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete && onToggleComplete(task, e);
        }}
      >
        <button
          type="button"
          aria-label={isCompleted ? "Mark task as incomplete" : "Mark task as completed"}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-700 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500/40"
        >
          {isCompleted ? (
            <div className="w-5 h-5 rounded-md bg-emerald-600 flex items-center justify-center text-white transition-all scale-100">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-md border-2 border-slate-300 group-hover:border-emerald-600 transition-colors" />
          )}
        </button>
      </td>

      {/* 2. Task (Title + subtle Added time + subtle assigned by line if delegated) */}
      <td className="px-3 align-middle max-w-xs">
        <div className="min-w-0 pr-2">
          <p className={`font-semibold text-xs leading-snug truncate ${
            isCompleted ? 'line-through text-slate-400' : 'text-slate-900 group-hover:text-emerald-950'
          }`}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 truncate">
            {createdTime && (
              <span>Added {createdTime}</span>
            )}
            {assignerName && !isSelf && (
              <>
                {createdTime && <span>•</span>}
                <span className="text-slate-500 truncate">By {assignerName}</span>
              </>
            )}
          </div>
        </div>
      </td>

      {/* 3. Assignee (Avatar + Name + Designation) */}
      <td className="w-40 px-3 align-middle">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#05331F] text-emerald-200 text-xs font-semibold flex items-center justify-center flex-shrink-0">
            {assigneeName.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-xs text-slate-900 truncate" title={assigneeName}>
              {assigneeName}
            </p>
            {assigneeRole && (
              <p className="text-[11px] text-slate-400 truncate">
                {assigneeRole}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* 4. Assigned by (Avatar + Name, or Self) */}
      <td className="w-36 px-3 align-middle">
        {isSelf ? (
          <span className="text-xs font-medium text-slate-500">
            Self
          </span>
        ) : assignerName ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center justify-center flex-shrink-0 border border-emerald-200">
              {assignerName.charAt(0)}
            </div>
            <span className="font-medium text-xs text-slate-800 truncate" title={assignerName}>
              {assignerName}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>

      {/* 5. Department */}
      <td className="w-32 px-3 align-middle text-xs text-slate-600 truncate">
        {formatDepartment(task.departmentId || task.department)}
      </td>

      {/* 6. Priority */}
      <td className="w-24 px-3 align-middle whitespace-nowrap">
        <PriorityPill priority={task.priority} />
      </td>

      {/* 7. Due */}
      <td className="w-28 px-3 align-middle whitespace-nowrap">
        <span className={`text-xs font-medium ${
          isOverdue ? 'text-red-600 font-semibold' : 'text-slate-700'
        }`}>
          {dueInfo.label}
        </span>
      </td>

      {/* 8. Status */}
      <td className="w-36 px-3 align-middle whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <StatusPill 
          task={task} 
          onStatusChange={onStatusChange} 
        />
      </td>

      {/* 9. Actions Column (w-9 h-9 buttons) */}
      <td className="w-36 px-3 align-middle text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1 relative">
          
          {/* Subtask / Delegate icon */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSplitTask && onSplitTask(task);
            }}
            title="Split into Subtask / Delegate"
            aria-label="Split task into subtask"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <GitFork className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </button>

          {/* View / Edit icon */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails && onOpenDetails(task);
            }}
            title="View & Edit Task Details"
            aria-label="View task details"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Eye className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </button>

          {/* 3-dots menu button */}
          <div className="relative">
            <button
              ref={btnRef}
              type="button"
              onClick={toggleMenu}
              aria-label="More task actions"
              aria-expanded={isMenuOpen}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <MoreHorizontal className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </button>

            {isMenuOpen && (
              <div
                ref={menuRef}
                className={`absolute right-0 w-40 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100 ${
                  openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => { setIsMenuOpen(false); onOpenDetails && onOpenDetails(task); }}
                  className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Edit Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setIsMenuOpen(false); onReassignTask && onReassignTask(task); }}
                  className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <UserPlus className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reassign</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setIsMenuOpen(false); onDuplicateTask && onDuplicateTask(task); }}
                  className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Duplicate</span>
                </button>
                <div className="h-px bg-slate-100 my-1" />
                <button
                  type="button"
                  onClick={() => { setIsMenuOpen(false); onDeleteTask && onDeleteTask(task); }}
                  className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Task</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </td>
    </tr>
  );
}

