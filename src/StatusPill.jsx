// src/StatusPill.jsx
// Status pill with 6px dot & dropdown to change status (optimistic update)

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { TASK_STATUSES } from './rbac';
import { STATUS_CONFIG, formatTime } from './taskHelpers';

export default function StatusPill({
  task,
  onStatusChange,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const currentStatus = task?.status || TASK_STATUSES.ASSIGNED;
  const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG[TASK_STATUSES.ASSIGNED];

  // Close dropdown on outside click or ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const handleSelect = (newStatus, e) => {
    e.stopPropagation();
    setIsOpen(false);
    if (newStatus !== currentStatus && onStatusChange) {
      onStatusChange(task, newStatus);
    }
  };

  const isCompleted = currentStatus === TASK_STATUSES.COMPLETED || currentStatus === 'Completed';
  const completedTime = isCompleted ? formatTime(task?.completedAt || task?.lastUpdated) : null;
  const statusDisplay = isCompleted && completedTime ? `Done ${completedTime}` : config.label;

  if (disabled) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${config.bg} ${config.text} ${config.border}`}>
        {isCompleted ? (
          <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
        ) : (
          <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        )}
        <span>{statusDisplay}</span>
      </span>
    );
  }

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(prev => !prev);
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Status: ${statusDisplay}. Click to change.`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${config.bg} ${config.text} ${config.border} hover:opacity-90`}
      >
        {isCompleted ? (
          <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
        ) : (
          <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        )}
        <span>{statusDisplay}</span>
        <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
      </button>

      {isOpen && (
        <div 
          role="listbox"
          className="absolute left-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {[
            { id: TASK_STATUSES.ASSIGNED, label: 'Pending', dot: 'bg-amber-500' },
            { id: TASK_STATUSES.IN_PROGRESS, label: 'In Progress', dot: 'bg-blue-500' },
            { id: TASK_STATUSES.PENDING_REVIEW, label: 'In Review', dot: 'bg-indigo-500' },
            { id: TASK_STATUSES.COMPLETED, label: 'Completed', dot: 'bg-emerald-600' },
            { id: TASK_STATUSES.BLOCKED, label: 'Blocked', dot: 'bg-red-500' }
          ].map(opt => (
            <button
              key={opt.id}
              role="option"
              aria-selected={currentStatus === opt.id}
              type="button"
              onClick={(e) => handleSelect(opt.id, e)}
              className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-slate-50 transition-colors ${
                currentStatus === opt.id ? 'font-semibold text-slate-900 bg-slate-50' : 'text-slate-600'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

