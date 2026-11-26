// src/StatusPill.jsx
// Status pill with 6px dot & dropdown to change status (optimistic update)
// Uses createPortal and fixed positioning so menus are never clipped by table overflow/stacking contexts

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { TASK_STATUSES } from './rbac';
import { STATUS_CONFIG, formatTime } from './taskHelpers';
import { isDailyWorkLogLocked } from './dateUtils';

export default function StatusPill({
  task,
  onStatusChange,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0, width: 144, openUpward: false });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const taskDateVal = task?.taskDate || task?.date || task?.deadlineDate;
  const isLocked = isDailyWorkLogLocked(taskDateVal);
  const isDisabled = disabled || isLocked;
  const rawStatus = task?.status || TASK_STATUSES.ASSIGNED;
  const isCompleted = (String(rawStatus).toLowerCase() === 'completed') || 
                      rawStatus === TASK_STATUSES.COMPLETED || 
                      task?.progressPercentage === 100 || 
                      Boolean(task?.completed);

  const currentStatus = isCompleted ? TASK_STATUSES.COMPLETED : rawStatus;
  const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG[TASK_STATUSES.ASSIGNED];

  // Update position on open
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < 180 && rect.top > 180;
    
    setMenuCoords({
      top: openUpward ? rect.top - 4 : rect.bottom + 4,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 160)),
      openUpward
    });
  };

  // Close dropdown on outside click or ESC, or reposition on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    const handleDown = (e) => {
      if (
        triggerRef.current && triggerRef.current.contains(e.target) ||
        menuRef.current && menuRef.current.contains(e.target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    const handleReposition = () => {
      updatePosition();
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
  }, [isOpen]);

  const toggleDropdown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (isDisabled) return;
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(prev => !prev);
  };

  const handleSelect = (newStatus, e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(false);
    if (onStatusChange) {
      onStatusChange(task, newStatus);
    }
  };

  const completedTime = isCompleted ? formatTime(task?.completedAt || task?.lastUpdated) : null;
  const statusDisplay = isCompleted && completedTime ? `Done ${completedTime}` : (config?.label || currentStatus);

  if (isDisabled) {
    return (
      <span 
        title={isLocked ? "Today's work log is locked. Entries can no longer be modified." : undefined}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${config?.bg || 'bg-slate-50'} ${config?.text || 'text-slate-700'} ${config?.border || 'border-slate-200'}`}
      >
        {isCompleted ? (
          <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
        ) : (
          <span className={`w-1.5 h-1.5 rounded-full ${config?.dot || 'bg-slate-400'}`} />
        )}
        <span>{statusDisplay}</span>
      </span>
    );
  }

  return (
    <div className="relative inline-flex items-center" onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Status: ${statusDisplay}. Click to change.`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${config?.bg || 'bg-slate-50'} ${config?.text || 'text-slate-700'} ${config?.border || 'border-slate-200'} hover:opacity-90`}
      >
        {isCompleted ? (
          <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
        ) : (
          <span className={`w-1.5 h-1.5 rounded-full ${config?.dot || 'bg-slate-400'}`} />
        )}
        <span>{statusDisplay}</span>
        <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={menuRef}
          role="listbox"
          style={{
            position: 'fixed',
            top: menuCoords.openUpward ? undefined : `${menuCoords.top}px`,
            bottom: menuCoords.openUpward ? `${window.innerHeight - menuCoords.top}px` : undefined,
            left: `${menuCoords.left}px`,
            width: '150px',
            zIndex: 9999
          }}
          className="bg-white border border-slate-200 rounded-xl shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {[
            { id: TASK_STATUSES.ASSIGNED, label: 'Pending', dot: 'bg-amber-500' },
            { id: TASK_STATUSES.IN_PROGRESS, label: 'In Progress', dot: 'bg-blue-500' },
            { id: TASK_STATUSES.PENDING_REVIEW, label: 'In Review', dot: 'bg-indigo-500' },
            { id: TASK_STATUSES.COMPLETED, label: 'Completed', dot: 'bg-emerald-600' },
            { id: TASK_STATUSES.BLOCKED, label: 'Blocked', dot: 'bg-red-500' }
          ].map(opt => {
            const isSelected = currentStatus === opt.id || (opt.id === TASK_STATUSES.COMPLETED && isCompleted);
            return (
              <button
                key={opt.id}
                role="option"
                aria-selected={isSelected}
                type="button"
                onClick={(e) => handleSelect(opt.id, e)}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                  isSelected ? 'font-semibold text-slate-900 bg-slate-50' : 'text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
