// src/TaskCard.jsx
// Stacked card view for mobile / tablet screens below lg
// Portal positioning for 3-dots actions menu & automatic checkbox ticking on Completed status

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Check, MoreHorizontal, Edit3, Trash2, Copy, 
  GitFork, UserPlus 
} from 'lucide-react';
import StatusPill from './StatusPill';
import PriorityPill from './PriorityPill';
import { formatName, formatDue, formatTime } from './taskHelpers';
import { TASK_STATUSES } from './rbac';

export default function TaskCard({
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

  const assigneeName = formatName(task?.assignedToName || task?.assigneeName || 'Unassigned');
  const assignerName = formatName(task?.assignedByName || task?.createdByName);
  const isSelf = task?.selfLogged || (!task?.assignedByName && task?.createdById === currentUserId);

  const updateMenuPosition = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < 200 && rect.top > 200;

    setMenuCoords({
      top: openUpward ? rect.top - 4 : rect.bottom + 4,
      left: Math.max(8, rect.right - 175),
      openUpward
    });
  };

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
    <div
      onClick={() => onOpenDetails && onOpenDetails(task)}
      className={`p-4 bg-white border-b border-slate-100 space-y-3 transition-colors cursor-pointer active:bg-slate-50 ${
        isCompleted ? 'bg-slate-50/40 opacity-75' : ''
      }`}
    >
      {/* Line 1: Checkbox + Title + Status Pill */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Custom Checkbox (touch target >= 40px) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete && onToggleComplete(task, e);
            }}
            aria-label={isCompleted ? "Mark task as incomplete" : "Mark task as completed"}
            className="w-10 h-10 -ml-2 -mt-1 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-700 transition-colors flex-shrink-0 cursor-pointer"
          >
            {isCompleted ? (
              <div className="w-5 h-5 rounded-md bg-emerald-600 flex items-center justify-center text-white shadow-2xs">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-md border-2 border-slate-300" />
            )}
          </button>

          <div className="min-w-0 flex-1 pt-0.5">
            <h4 className={`text-sm font-semibold leading-snug ${
              isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
            }`}>
              {task?.title || 'Untitled Task'}
            </h4>
            {task?.description && (
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                {task.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
              {formatTime(task?.createdAt) && (
                <span>Added {formatTime(task.createdAt)}</span>
              )}
              {assignerName && !isSelf && (
                <>
                  {formatTime(task?.createdAt) && <span>•</span>}
                  <span>By {assignerName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status Pill */}
        <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
          <StatusPill 
            task={task} 
            onStatusChange={onStatusChange} 
          />
        </div>
      </div>

      {/* Line 2: Meta (Assignee, Due, Priority, Actions) */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          {/* Assignee avatar + name */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-md bg-[#05331F] text-emerald-200 text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
              {assigneeName.charAt(0)}
            </div>
            <span className="font-medium text-slate-700 truncate max-w-[100px]">
              {assigneeName}
            </span>
          </div>

          <span className="text-slate-300">·</span>

          {/* Due date */}
          <span className={`font-medium ${
            isOverdue ? 'text-red-600 font-semibold' : 'text-slate-500'
          }`}>
            Due {dueInfo.label}
          </span>

          <span className="text-slate-300">·</span>

          {/* Priority */}
          <PriorityPill priority={task?.priority} />
        </div>

        {/* Actions Button */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            ref={btnRef}
            type="button"
            onClick={toggleMenu}
            aria-label="More actions"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 active:bg-slate-100 transition-colors cursor-pointer"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {isMenuOpen && typeof document !== 'undefined' && createPortal(
            <div 
              ref={menuRef}
              style={{
                position: 'fixed',
                top: menuCoords.openUpward ? undefined : `${menuCoords.top}px`,
                bottom: menuCoords.openUpward ? `${window.innerHeight - menuCoords.top}px` : undefined,
                left: `${menuCoords.left}px`,
                width: '175px',
                zIndex: 9999
              }}
              className="bg-white border border-slate-200 rounded-xl shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setIsMenuOpen(false); 
                  onOpenDetails && onOpenDetails(task); 
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                <span>View & Edit</span>
              </button>
              <button
                type="button"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setIsMenuOpen(false); 
                  onSplitTask && onSplitTask(task); 
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <GitFork className="w-3.5 h-3.5 text-slate-400" />
                <span>Split into Subtask</span>
              </button>
              <button
                type="button"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setIsMenuOpen(false); 
                  onReassignTask && onReassignTask(task); 
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
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
                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
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
                className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Task</span>
              </button>
            </div>,
            document.body
          )}
        </div>
      </div>
    </div>
  );
}
