import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusCircle, X, Loader2, Calendar, Clock, AlertCircle, 
  Building2, CheckCircle2 
} from 'lucide-react';
import { TASK_STATUSES, TASK_PRIORITIES } from './rbac';
import { getTodayDateString } from './dateUtils';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * AddTodayWorkModal
 * Allows employees to log what they worked on directly into the Daily Task Sheet.
 * 
 * Updated Requirements:
 * 1. Project / Department field removed from form (defaults automatically to user's department).
 * 2. Date is fixed to today's date (defaults to today, read-only / cannot choose past or yesterday).
 * 3. Self-logged tag/badge removed.
 * 4. Status defaults to "Pending" (TASK_STATUSES.ASSIGNED), with ability to change to "In Progress" or "Completed".
 */
export default function AddTodayWorkModal({
  isOpen,
  onClose,
  currentUser,
  departments = [],
  onTaskCreated
}) {
  const todayStr = getTodayDateString();
  const titleInputRef = useRef(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(TASK_STATUSES.ASSIGNED); // Default: Pending
  const [priority, setPriority] = useState(TASK_PRIORITIES.MEDIUM);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Autofocus title and handle Esc key
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setTitle('');
      setDescription('');
      setStatus(TASK_STATUSES.ASSIGNED); // Default: Pending
      setPriority(TASK_PRIORITIES.MEDIUM);

      const timer = setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.focus();
        }
      }, 100);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Task title is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const currentUserId = currentUser?.id || currentUser?.authUid || currentUser?.employeeId || 'unknown_user';
      const currentUserName = currentUser?.fullName || currentUser?.name || currentUser?.email || 'Employee';
      const userDept = currentUser?.department || currentUser?.departmentId || 'operations';

      const progressMap = {
        [TASK_STATUSES.COMPLETED]: 100,
        [TASK_STATUSES.IN_PROGRESS]: 50,
        [TASK_STATUSES.ASSIGNED]: 0,
        [TASK_STATUSES.PENDING_REVIEW]: 90
      };

      const newTaskData = {
        title: title.trim(),
        description: description.trim(),
        date: todayStr,
        taskDate: todayStr,
        deadlineDate: todayStr,
        time: timeNow,
        
        // Assignee mappings
        assignedTo: currentUserId,
        assignedToId: currentUserId,
        assigneeIds: [currentUserId],
        assignedEmployee: currentUserName,
        assignedToName: currentUserName,

        // Creator mappings
        createdById: currentUserId,
        createdByName: currentUserName,

        // Project / Department (auto-resolved from employee)
        projectDept: userDept,
        departmentId: userDept,
        department: userDept,

        // Status & Priority
        status: status,
        priority: priority,
        progressPercentage: progressMap[status] !== undefined ? progressMap[status] : 0,

        // Audit Trail
        auditLogs: [
          {
            id: `log-${Date.now()}`,
            action: 'CREATED_TASK',
            performedById: currentUserId,
            performedByName: currentUserName,
            timestamp: `${todayStr} ${timeNow}`,
            details: `Task recorded with status '${status}' (${priority} Priority)`
          }
        ],

        createdAt: `${todayStr} ${timeNow}`,
        serverTimestamp: serverTimestamp()
      };

      // Save directly to Firestore 'tasks' collection
      const docRef = await addDoc(collection(db, 'tasks'), newTaskData);
      const savedTask = { id: docRef.id, ...newTaskData };

      // Update parent component immediately so row displays right away
      if (onTaskCreated) {
        onTaskCreated(savedTask);
      }

      onClose();
    } catch (err) {
      console.error('Error saving task to Firestore:', err);
      setErrorMessage(err.message || 'Failed to save task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto safe-pb safe-pt">
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#05331F] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <PlusCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 id="modal-title" className="text-sm sm:text-base font-bold text-[#0F172A] tracking-tight">
                Add Task
              </h2>
              <p className="text-[11px] text-[#64748B]">
                Log work for today's task sheet
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inline Error Message */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Work Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          
          {/* Task Title */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              ref={titleInputRef}
              type="text"
              required
              placeholder="e.g. Cleared 15 dealer dispatches & audited batch #402"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] placeholder-[#64748B]/60 outline-none transition focus:bg-white focus:border-[#05331F] focus:ring-1 focus:ring-[#05331F]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">
              Description / Output Details
            </label>
            <textarea
              rows="3"
              placeholder="Provide brief notes, outcomes, quantities, or reference numbers..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-xs text-[#0F172A] placeholder-[#64748B]/60 outline-none transition focus:bg-white focus:border-[#05331F] focus:ring-1 focus:ring-[#05331F]"
            />
          </div>

          {/* Date Indicator (Fixed to Today - Read Only) */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">
              Date
            </label>
            <div className="w-full bg-slate-100/80 border border-[#E2E8F0] rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-700 flex items-center justify-between">
              <span>{todayStr} (Today)</span>
              <span className="text-[10px] bg-slate-200/80 text-slate-600 px-2 py-0.5 rounded font-sans font-medium">Locked to Today</span>
            </div>
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-xs font-semibold text-[#0F172A] outline-none transition focus:bg-white focus:border-[#05331F] focus:ring-1 focus:ring-[#05331F]"
              >
                <option value={TASK_STATUSES.ASSIGNED}>Pending (Default)</option>
                <option value={TASK_STATUSES.IN_PROGRESS}>In Progress</option>
                <option value={TASK_STATUSES.COMPLETED}>Completed</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-xs font-semibold text-[#0F172A] outline-none transition focus:bg-white focus:border-[#05331F] focus:ring-1 focus:ring-[#05331F]"
              >
                <option value={TASK_PRIORITIES.LOW}>Low</option>
                <option value={TASK_PRIORITIES.MEDIUM}>Medium</option>
                <option value={TASK_PRIORITIES.HIGH}>High</option>
                <option value={TASK_PRIORITIES.URGENT}>Critical / Urgent</option>
              </select>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#05331F] hover:bg-[#07472b] active:bg-[#032214] text-white text-xs font-bold shadow-md transition disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Save to Task Sheet</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
