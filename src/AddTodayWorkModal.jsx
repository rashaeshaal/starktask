import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusCircle, X, Loader2, Calendar, Clock, AlertCircle, 
  Building2, CheckCircle2, ShieldAlert, Sparkles, Layers 
} from 'lucide-react';
import { TASK_STATUSES, TASK_PRIORITIES } from './rbac';
import { getTodayDateString } from './dateUtils';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * AddTodayWorkModal
 * Allows employees to log what they accomplished today or add work directly to the Daily Task Sheet.
 * 
 * Fields:
 * - Task Title (required)
 * - Description
 * - Project / Department (defaults to user's department)
 * - Date (defaults to today)
 * - Status (Completed / In Progress / Pending, default: Completed)
 * - Priority (Low / Medium / High, default: Medium)
 * 
 * Rules:
 * - Enforces day-locking: past dates cannot be added or edited by employees.
 * - Keyboard accessible: Esc to close, autofocus on title.
 * - Loading indicator during Firestore write.
 * - Saves with consistent field names (title, description, date, taskDate, deadlineDate, 
 *   assignedTo, assignedToId, assigneeIds, assignedEmployee, assignedToName, 
 *   selfLogged: true, status, priority, departmentId, createdAt).
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
  const [projectDept, setProjectDept] = useState(
    currentUser?.department || currentUser?.departmentId || 'operations'
  );
  const [date, setDate] = useState(todayStr);
  const [status, setStatus] = useState(TASK_STATUSES.COMPLETED);
  const [priority, setPriority] = useState(TASK_PRIORITIES.MEDIUM);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Autofocus title and handle Esc key
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setTitle('');
      setDescription('');
      setDate(todayStr);
      setStatus(TASK_STATUSES.COMPLETED);
      setPriority(TASK_PRIORITIES.MEDIUM);
      setProjectDept(currentUser?.department || currentUser?.departmentId || 'operations');

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
  }, [isOpen, todayStr, currentUser, onClose]);

  if (!isOpen) return null;

  const isExecutiveLeadership = ['Executive Director', 'Director Operations', 'General Manager'].includes(currentUser?.role);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Task title is required.');
      return;
    }

    // Day-Locking Rule: Block adding work for past days unless executive
    if (date < todayStr && !isExecutiveLeadership) {
      setErrorMessage("Action Locked: Tasks cannot be logged or edited for past dates. You can only record work for today or upcoming dates.");
      return;
    }

    setIsSubmitting(true);

    try {
      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const currentUserId = currentUser?.id || currentUser?.authUid || currentUser?.employeeId || 'unknown_user';
      const currentUserName = currentUser?.fullName || currentUser?.name || currentUser?.email || 'Employee';

      const resolvedDeptObj = departments.find(d => d.id === projectDept || d.name === projectDept);
      const deptCode = resolvedDeptObj?.id || projectDept;

      const progressMap = {
        [TASK_STATUSES.COMPLETED]: 100,
        [TASK_STATUSES.IN_PROGRESS]: 60,
        [TASK_STATUSES.ASSIGNED]: 0,
        [TASK_STATUSES.PENDING_REVIEW]: 90
      };

      const newTaskData = {
        title: title.trim(),
        description: description.trim(),
        date: date,
        taskDate: date,
        deadlineDate: date,
        time: timeNow,
        
        // Assignee mappings for universal compatibility
        assignedTo: currentUserId,
        assignedToId: currentUserId,
        assigneeIds: [currentUserId],
        assignedEmployee: currentUserName,
        assignedToName: currentUserName,

        // Creator mappings
        createdById: currentUserId,
        createdByName: currentUserName,

        // Project / Department
        projectDept: deptCode,
        departmentId: deptCode,
        department: deptCode,

        // Status & Priority
        status: status,
        priority: priority,
        progressPercentage: progressMap[status] !== undefined ? progressMap[status] : 100,

        // Special metadata
        selfLogged: true,
        isWorkLog: true,

        // Audit Trail
        auditLogs: [
          {
            id: `log-${Date.now()}`,
            action: 'SELF_LOGGED_WORK',
            performedById: currentUserId,
            performedByName: currentUserName,
            timestamp: `${date} ${timeNow}`,
            details: `Task recorded as '${status}' (${priority} Priority)`
          }
        ],

        createdAt: `${date} ${timeNow}`,
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
      console.error('Error saving today work task to Firestore:', err);
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
                Add Today's Work
              </h2>
              <p className="text-[11px] text-[#64748B]">
                Log an activity or task accomplished for the Daily Task Sheet
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

          {/* Project / Dept & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">
                Project / Dept
              </label>
              <select
                value={projectDept}
                onChange={(e) => setProjectDept(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-xs text-[#0F172A] outline-none transition focus:bg-white focus:border-[#05331F] focus:ring-1 focus:ring-[#05331F]"
              >
                {departments && departments.length > 0 ? (
                  departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))
                ) : (
                  <>
                    <option value="operations">Operations</option>
                    <option value="sales">Sales</option>
                    <option value="finance">Finance & Accounts</option>
                    <option value="warehouse">Warehouse</option>
                    <option value="qc">Quality Control</option>
                    <option value="hr_admin">HR & Admin</option>
                    <option value="transportation">Transportation</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-[#05331F] outline-none transition focus:bg-white focus:border-[#05331F] focus:ring-1 focus:ring-[#05331F]"
              />
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
                <option value={TASK_STATUSES.COMPLETED}>Completed</option>
                <option value={TASK_STATUSES.IN_PROGRESS}>In Progress</option>
                <option value={TASK_STATUSES.ASSIGNED}>Pending</option>
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

          {/* Submitter Context Badge */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between text-[11px] text-[#64748B]">
            <span>Logging as: <strong className="text-[#0F172A]">{currentUser?.fullName || currentUser?.name || currentUser?.email || 'Logged-in Staff'}</strong></span>
            <span className="font-mono text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-bold">
              Self-Logged
            </span>
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
