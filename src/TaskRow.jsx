// src/TaskRow.jsx
// Desktop table row (height 64px, vertically centered, no zebra)
// Fixed 3-dots actions menu with portal positioning to eliminate table clipping and stacking context bugs.
// Synchronized checkbox tick with status === 'Completed'.

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Check, GitFork, Eye, Edit3, MoreHorizontal, Trash2, 
  Copy, UserPlus, Lock 
} from 'lucide-react';
import StatusPill from './StatusPill';
import PriorityPill from './PriorityPill';
import { formatName, formatDepartment, formatDue, formatTime } from './taskHelpers';
import { TASK_STATUSES } from './rbac';
import { isDailyWorkLogLocked } from './dateUtils';

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
  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0, openUpward: false });
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  // Automatic tick if status is Completed, 100% progress, or completed flag
  const isCompleted = (String(task?.status || '').toLowerCase() === 'completed') || 
                      task?.status === TASK_STATUSES.COMPLETED || 
                      task?.progressPercentage === 100 || 
                      Boolean(task?.completed);

  const dueInfo = formatDue(task?.requiredBy || task?.deadlineDate || task?.date || task?.taskDate);
  const isOverdue = dueInfo.isOverdue && !isCompleted;

  // Format names in Title Case
  const assigneeName = formatName(task?.assignedToName || task?.assigneeName || 'Unassigned');
  const assigneeRole = task?.assignedToRole || task?.assigneeRole || '';
  const assignerName = formatName(task?.assignedByName || task?.createdByName);
  const isSelf = task?.selfLogged || (!task?.assignedByName && task?.createdById === currentUserId);

  // Time stamps for Created time and Done time
  const createdTime = formatTime(task?.createdAt);
  const taskDateVal = task?.taskDate || task?.date || task?.deadlineDate;
  const isLocked = isDailyWorkLogLocked(taskDateVal);

  const updateMenuPosition = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < 200 && rect.top > 200;

    setMenuCoords({
      top: openUpward ? rect.top - 4 : rect.bottom + 4,
      left: Math.max(8, rect.right - 170), // Align right edge to button
      openUpward
    });
  };

  // Close 3-dots menu on outside click, ESC, or reposition on scroll/resize
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleDown = (e) => {
      if (
        btnRef.current && btnRef.current.contains(e.target) ||
        menuRef.current && menuRef.current.contains(e.target)
      ) {
        return;
      }
      setIsMenuOpen(false);
    };

    const handleKey = (e) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };

    const handleReposition = () => {
      updateMenuPosition();
    };

    document.addEventListener('mousedown', handleDown);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isMenuOpen]);

  const toggleMenu = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isMenuOpen) {
      updateMenuPosition();
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
      {/* 1. Checkbox: Automatically ticks green checkmark when task is Completed */}
      <td 
        className="w-12 px-3 text-center align-middle"
        onClick={(e) => {
          e.stopPropagation();
          if (isLocked) return;
          onToggleComplete && onToggleComplete(task, e);
        }}
      >
        <button
          type="button"
          disabled={isLocked}
          aria-label={isLocked ? "Task is locked (past 11:59 PM)" : isCompleted ? "Mark task as incomplete" : "Mark task as completed"}
          title={isLocked ? "Today's work log is locked. Entries can no longer be modified." : undefined}
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
            isLocked ? 'cursor-not-allowed opacity-60' : 'hover:text-emerald-700 cursor-pointer'
          }`}
        >
          {isCompleted ? (
            <div className="w-5 h-5 rounded-md bg-emerald-600 flex items-center justify-center text-white transition-all scale-100 shadow-2xs">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-md border-2 border-slate-300 group-hover:border-emerald-600 transition-colors" />
          )}
        </button>
      </td>

      {/* 2. Task (Title + subtle Added time + subtle assigned by line if delegated + subtle Locked badge) */}
      <td className="px-3 align-middle max-w-xs">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className={`font-semibold text-xs leading-snug truncate ${
              isCompleted ? 'line-through text-slate-400' : 'text-slate-900 group-hover:text-emerald-950'
            }`}>
              {task?.title || 'Untitled Task'}
            </p>
            {isLocked && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0" title="Today's work log is locked. Entries can no longer be modified.">
                <Lock className="w-2.5 h-2.5 text-slate-500" />
                Locked
              </span>
            )}
          </div>
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
        {formatDepartment(task?.departmentId || task?.department)}
      </td>

      {/* 6. Priority */}
      <td className="w-24 px-3 align-middle whitespace-nowrap">
        <PriorityPill priority={task?.priority} />
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

          {/* 3-dots dropdown via Portal to avoid any clipping by table container */}
          {isMenuOpen && typeof document !== 'undefined' && createPortal(
            <div
              ref={menuRef}
              style={{
                position: 'fixed',
                top: menuCoords.openUpward ? undefined : `${menuCoords.top}px`,
                bottom: menuCoords.openUpward ? `${window.innerHeight - menuCoords.top}px` : undefined,
                left: `${menuCoords.left}px`,
                width: '160px',
                zIndex: 9999
              }}
              className="bg-white border border-slate-200 rounded-xl shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              {isLocked ? (
                <>
                  <button
                    type="button"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setIsMenuOpen(false); 
                      onOpenDetails && onOpenDetails(task); 
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>View Details (Read-only)</span>
                  </button>
                  <div className="px-3 py-1.5 text-[11px] text-slate-400 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Locked at 11:59 PM</span>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setIsMenuOpen(false); 
                      onOpenDetails && onOpenDetails(task); 
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Edit Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setIsMenuOpen(false); 
                      onReassignTask && onReassignTask(task); 
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reassign</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setIsMenuOpen(false); 
                      onDuplicateTask && onDuplicateTask(task); 
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Duplicate</span>
                  </button>

                  <div className="h-px bg-slate-100 my-1" />

                  <button
                    type="button"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setIsMenuOpen(false); 
                      onDeleteTask && onDeleteTask(task); 
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Task</span>
                  </button>
                </>
              )}
            </div>,
            document.body
          )}
        </div>
      </td>
    </tr>
  );
}
