import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, MessageSquare, X, ShieldCheck } from 'lucide-react';
import { TASK_STATUSES } from './rbac';
import { getTodayDateString } from './dateUtils';

export default function SupervisorApprovalModal({ isOpen, onClose, task, currentUser, onApprovalDecided }) {
  if (!isOpen || !task) return null;

  const [decision, setDecision] = useState('approve'); // 'approve' or 'reject'
  const [remarks, setRemarks] = useState('');
  const todayStr = getTodayDateString();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (decision === 'reject' && !remarks.trim()) {
      alert('Mandatory Correction Reason is required when returning work for corrections.');
      return;
    }

    const timestamp = `${todayStr} ${new Date().toLocaleTimeString()}`;
    const newStatus = decision === 'approve' ? TASK_STATUSES.COMPLETED : TASK_STATUSES.CORRECTION_REQUESTED;

    const currentRev = Number(task.revision || 1);
    const newRev = decision === 'reject' ? currentRev + 1 : currentRev;

    const auditLog = {
      id: `log-${Date.now()}`,
      action: decision === 'approve' ? 'APPROVED' : 'CHANGES_REQUESTED',
      performedById: currentUser.id || currentUser.uid,
      performedByName: `${currentUser.fullName || currentUser.name} (${currentUser.role})`,
      timestamp,
      details: decision === 'approve' 
        ? `Task approved by supervisor. Remarks: ${remarks || 'Approved without additional notes.'}`
        : `Changes requested (Revision ${newRev}). Reason: ${remarks}`
    };

    const updatedTask = {
      ...task,
      status: newStatus,
      progressPercentage: decision === 'approve' ? 100 : (task.progressPercentage || 50),
      approvalRemarks: remarks,
      rejectionReason: decision === 'reject' ? remarks : '',
      revision: newRev,
      lastChangeRequestedComment: decision === 'reject' ? remarks : (task.lastChangeRequestedComment || null),
      lastUpdated: timestamp,
      auditLogs: [auditLog, ...(task.auditLogs || [])]
    };

    onApprovalDecided(updatedTask);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto safe-pb safe-pt">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 sm:pb-4 border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5 truncate mr-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">Supervisor Task Review</h3>
              <p className="text-[11px] text-slate-500 truncate">{task.title}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-1 space-y-4 pt-2">
          {/* Task Evidence & Summary */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span className="font-semibold">Assignee:</span>
            <span>{task.assignedToName}</span>
          </div>
          {task.revision && Number(task.revision) > 1 && (
            <div className="flex justify-between text-slate-600">
              <span className="font-semibold">Current Revision:</span>
              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Revision {task.revision}
              </span>
            </div>
          )}
          {task.deliverableUrl && (
            <div className="flex justify-between items-center text-slate-600 pt-1">
              <span className="font-semibold">Deliverable Link:</span>
              <a 
                href={task.deliverableUrl} 
                target="_blank" 
                rel="noreferrer"
                className="text-[#05331F] font-bold underline truncate max-w-[200px]"
              >
                {task.deliverableUrl}
              </a>
            </div>
          )}
          {Array.isArray(task.attachments) && task.attachments.length > 0 && (
            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              <span className="font-semibold text-slate-900">Attached Deliverables ({task.attachments.length}):</span>
              <div className="grid grid-cols-2 gap-2">
                {task.attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 transition"
                  >
                    {att.type?.startsWith('image/') ? (
                      <img src={att.url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-600 shrink-0">
                        {att.name?.split('.').pop()?.toUpperCase() || 'FILE'}
                      </div>
                    )}
                    <span className="truncate text-[11px] font-medium text-slate-800">{att.name || 'Attachment'}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span className="font-semibold">Expected Deliverable:</span>
            <span className="text-right max-w-xs text-slate-800">{task.expectedResult || 'Deliverables as per instructions'}</span>
          </div>
          {task.submissionNotes && (
            <div className="pt-2 border-t border-slate-200 text-slate-700">
              <span className="font-semibold text-slate-900">Employee Submission Remarks:</span>
              <p className="mt-0.5 italic bg-white p-2 rounded-xl border border-slate-200 text-slate-800">
                "{task.submissionNotes}"
              </p>
            </div>
          )}
          {task.evidenceFiles && task.evidenceFiles.length > 0 && (
            <div className="pt-1 text-[11px] text-slate-500">
              <span className="font-semibold">Attached Evidence: </span>
              {task.evidenceFiles.join(', ')}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Decision Selector */}
          <div>
            <label className="block font-semibold text-slate-700 mb-2">Review Decision</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDecision('approve')}
                className={`py-3 px-4 rounded-2xl border flex items-center justify-center gap-2 font-bold transition-all ${
                  decision === 'approve'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Approve & Close</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('reject')}
                className={`py-3 px-4 rounded-2xl border flex items-center justify-center gap-2 font-bold transition-all ${
                  decision === 'reject'
                    ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Request Corrections</span>
              </button>
            </div>
          </div>

          {/* Remarks / Rejection Reason */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {decision === 'reject' ? 'Mandatory Correction Reason *' : 'Approval Remarks (Optional)'}
            </label>
            <textarea
              required={decision === 'reject'}
              rows="3"
              placeholder={decision === 'reject' 
                ? "State exactly what needs to be fixed or supplemented before this task can be approved..." 
                : "Good work, deliverables verified."}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2 rounded-xl text-white font-semibold shadow-md transition-all active:scale-98 ${
                decision === 'approve' 
                  ? 'bg-emerald-700 hover:bg-emerald-800' 
                  : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              {decision === 'approve' ? 'Confirm Approval' : 'Return for Correction'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

