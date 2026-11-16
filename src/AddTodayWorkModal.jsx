import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusCircle, X, Loader2, Calendar, Clock, AlertCircle, 
  Building2, CheckCircle2, Link2 
} from 'lucide-react';
import { TASK_STATUSES, TASK_PRIORITIES } from './rbac';
import { getTodayDateString } from './dateUtils';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { canAccessSales, filterDealersByScope } from './salesPermissions';

export default function AddTodayWorkModal({
  isOpen,
  onClose,
  currentUser,
  departments = [],
  dealers = [],
  onTaskCreated
}) {
  const todayStr = getTodayDateString();
  const titleInputRef = useRef(null);
  const isSales = canAccessSales(currentUser);

  // Scoped dealers for dealer picker
  const scopedDealers = isSales ? filterDealersByScope(dealers, currentUser) : [];

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(TASK_STATUSES.ASSIGNED); // Default: Pending
  const [priority, setPriority] = useState(TASK_PRIORITIES.MEDIUM);
  const [selectedDealerName, setSelectedDealerName] = useState('');
  const [linkedBookingId, setLinkedBookingId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setTitle('');
      setDescription('');
      setStatus(TASK_STATUSES.ASSIGNED);
      setPriority(TASK_PRIORITIES.MEDIUM);
      setSelectedDealerName('');
      setLinkedBookingId('');

      const timer = setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.focus();
        }
      }, 100);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
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
      setErrorMessage('Title is required.');
      return;
    }

    setIsSubmitting(true);
    const timestamp = new Date().toISOString();

    const progressMap = {
      [TASK_STATUSES.ASSIGNED]: 0,
      [TASK_STATUSES.IN_PROGRESS]: 50,
      [TASK_STATUSES.COMPLETED]: 100
    };

    const userDept = currentUser?.department || currentUser?.departmentId || 'operations';

    const newTask = {
      title: title.trim(),
      description: description.trim(),
      status: status,
      priority: priority,
      progressPercentage: progressMap[status] !== undefined ? progressMap[status] : 0,

      // Date is fixed to today's date
      taskDate: todayStr,
      deadlineDate: todayStr,
      deadlineTime: '18:00',
      createdAt: timestamp,
      lastUpdated: timestamp,

      // Logged by current user
      assignedToId: currentUser?.id || currentUser?.uid,
      assignedTo: currentUser?.id || currentUser?.uid,
      assignedToName: currentUser?.fullName || currentUser?.name || 'Self Logged',
      department: userDept,
      departmentId: userDept,

      createdById: currentUser?.id || currentUser?.uid,
      createdByName: currentUser?.fullName || currentUser?.name,
      createdByRole: currentUser?.role,
      selfLogged: true,

      // Optional Sales Dealer & Booking linking
      dealerName: selectedDealerName || null,
      linkedBookingId: linkedBookingId.trim() || null,

      auditLogs: [
        {
          id: `log-${Date.now()}`,
          action: 'TASK_CREATED',
          performedById: currentUser?.id || currentUser?.uid,
          performedByName: `${currentUser?.fullName || currentUser?.name} (${currentUser?.role})`,
          timestamp,
          details: `Logged work for today. Status: ${status}`
        }
      ]
    };

    try {
      if (onTaskCreated) {
        await onTaskCreated(newTask);
      } else {
        await addDoc(collection(db, 'tasks'), newTask);
      }
      onClose();
    } catch (err) {
      console.error('Failed to log work:', err);
      setErrorMessage(err.message || 'Failed to save task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-[#E2E8F0] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#05331F] flex items-center justify-center">
              <PlusCircle className="w-4 h-4 text-[#05331F]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">Add Today's Work</h2>
              <p className="text-[11px] text-[#64748B]">Log daily execution tasks directly to your sheet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">
              What did you work on today? *
            </label>
            <input
              ref={titleInputRef}
              type="text"
              required
              placeholder="e.g. Punched 12 door orders for Adorn Doors & followed up accounts token"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] placeholder-[#64748B]/60 outline-none transition focus:bg-white focus:border-[#05331F]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">
              Description / Action Items
            </label>
            <textarea
              rows="2"
              placeholder="Provide order notes, measurements or dealer follow-up outcomes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2 text-xs text-[#0F172A] placeholder-[#64748B]/60 outline-none transition focus:bg-white focus:border-[#05331F]"
            />
          </div>

          {/* Optional Sales: Dealer & Booking Linking */}
          {isSales && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-[11px] text-slate-700 flex items-center gap-1">
                <Link2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Link Dealer / Booking (Optional)</span>
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <select
                    value={selectedDealerName}
                    onChange={(e) => setSelectedDealerName(e.target.value)}
                    className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-xs text-slate-800"
                  >
                    <option value="">Select Dealer (Your Scope)</option>
                    {scopedDealers.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Booking ID (e.g. bk-101)"
                    value={linkedBookingId}
                    onChange={(e) => setLinkedBookingId(e.target.value)}
                    className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-xs text-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">
                Current Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A] font-medium outline-none focus:bg-white focus:border-[#05331F]"
              >
                <option value={TASK_STATUSES.ASSIGNED}>Pending</option>
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
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A] font-medium outline-none focus:bg-white focus:border-[#05331F]"
              >
                <option value={TASK_PRIORITIES.LOW}>Low</option>
                <option value={TASK_PRIORITIES.MEDIUM}>Medium</option>
                <option value={TASK_PRIORITIES.HIGH}>High</option>
              </select>
            </div>
          </div>

          {/* Read-Only Date Footer */}
          <div className="pt-2 flex items-center justify-between text-[11px] text-[#64748B] border-t border-[#E2E8F0]">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#05331F]" />
              <span>Logging date: <strong className="text-[#0F172A]">{todayStr}</strong> (Today)</span>
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#05331F] hover:bg-[#07472B] shadow-sm transition active:scale-95 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Work</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
