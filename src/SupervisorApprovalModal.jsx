import React, { useState } from 'react';
import { 
  Building2, Phone, Calendar, Clock, Lock, Unlock, CheckCircle2, 
  AlertCircle, Upload, Paperclip, Send, X, AlertTriangle, FileText,
  ShieldCheck, CheckSquare, Layers, MapPin, Eye, ExternalLink, MessageSquare,
  Camera, Check, RotateCcw
} from 'lucide-react';
import { TASK_STATUSES } from './rbac';
import { getTodayDateString } from './dateUtils';
import { canApproveTask } from './permissions';
import { writeAuditLog } from './firestoreService';

/**
 * Modern Linear/Stripe-inspired Approval & Review Modal for STARK STEEL
 * Clean layout, structured sections, hairline borders, robust validation, strict self-approval ban.
 */
export default function SupervisorApprovalModal({ 
  isOpen, 
  onClose, 
  task, 
  currentUser, 
  allEmployees = [], 
  leaveCovers = [], 
  onDecision, 
  onApprovalDecided 
}) {
  if (!isOpen || !task) return null;

  const todayStr = getTodayDateString();
  const [decision, setDecision] = useState('approve'); // 'approve' | 'reject'
  const [approvalComment, setApprovalComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePhotoViewer, setActivePhotoViewer] = useState(null);

  const actorId = String(currentUser?.id || currentUser?.uid || currentUser?.employeeId || '');
  const canDecide = canApproveTask(currentUser, task, allEmployees, leaveCovers);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canDecide) {
      alert('You are not authorized to approve or reject this task. Only the assigned reporting manager can approve, and self-approval is strictly forbidden.');
      await writeAuditLog({
        actorId,
        action: 'APPROVAL_ATTEMPT_BLOCKED',
        targetId: task.id,
        reason: 'Attempted self-approval or non-approver decision blocked by company-wide policy.'
      });
      return;
    }

    if (decision === 'reject' && !approvalComment.trim()) {
      alert('Please provide concrete feedback and reason for requesting changes.');
      return;
    }

    setIsSubmitting(true);
    const timestamp = `${todayStr} ${new Date().toLocaleTimeString()}`;

    const currentRev = task.revision || 1;
    const newRev = decision === 'reject' ? currentRev + 1 : currentRev;

    const nextStatus = decision === 'approve' ? TASK_STATUSES.COMPLETED : 'Correction Requested';
    const approvalStatus = decision === 'approve' ? 'approved' : 'changes_requested';

    const updatedTask = {
      ...task,
      status: nextStatus,
      approvalStatus,
      progressPercentage: decision === 'approve' ? 100 : 50,
      revision: newRev,
      lastChangeRequestedComment: decision === 'reject' ? approvalComment.trim() : null,
      lastUpdated: new Date().toISOString(),
      approvedAt: decision === 'approve' ? new Date().toISOString() : null,
      approvedById: decision === 'approve' ? actorId : null,
      approvedByName: decision === 'approve' ? (currentUser.fullName || currentUser.name) : null,
      reviewNote: approvalComment.trim() || null,
      auditLogs: [
        ...(task.auditLogs || []),
        {
          id: `log-${Date.now()}`,
          action: decision === 'approve' ? 'TASK_APPROVED' : 'CHANGES_REQUESTED',
          performedById: actorId,
          performedByName: `${currentUser.fullName || currentUser.name} (${currentUser.role})`,
          timestamp,
          details: decision === 'approve' 
            ? `Sign-off approved: ${approvalComment || 'Deliverable accepted.'}`
            : `Changes requested (Revision ${newRev}): ${approvalComment}`
        }
      ]
    };

    try {
      await writeAuditLog({
        actorId,
        action: decision === 'approve' ? 'TASK_APPROVED' : 'TASK_CHANGES_REQUESTED',
        targetId: task.id,
        before: { status: task.status, approvalStatus: task.approvalStatus || null },
        after: { status: nextStatus, approvalStatus },
        reason: approvalComment.trim() || (decision === 'approve' ? 'Approved by direct reporting manager' : 'Requested corrections')
      });

      const callback = onApprovalDecided || onDecision;
      if (callback) {
        await callback(updatedTask);
      }
      onClose();
    } catch (err) {
      console.error('Failed to submit approval decision:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-xl border border-slate-200 overflow-hidden">
          
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900">Review Deliverable</h2>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  Waiting Sign-Off
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Submitted by <span className="font-medium text-slate-800">{task.completedByName || task.assignedToName}</span>
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            
            {/* Task Info Summary */}
            <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/80 space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-slate-400">Assignment Details</span>
              <h3 className="text-xs font-semibold text-slate-900">{task.title}</h3>
              {task.description && (
                <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{task.description}</p>
              )}
              {task.reference && (
                <p className="text-xs text-[#05331F] font-medium pt-0.5">
                  Reference: {task.reference}
                </p>
              )}
              {task.location && (
                <p className="text-[11px] text-slate-500 flex items-center gap-1 pt-0.5">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{task.location}</span>
                </p>
              )}
              {task.completedQuantity && (
                <div className="text-[11px] font-medium text-emerald-800 pt-0.5">
                  Quantity Completed: {task.completedQuantity} Doors
                </div>
              )}
            </div>

            {/* Submitted Attachments */}
            {task.attachments && task.attachments.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                  <span>Submitted Documents ({task.attachments.length})</span>
                </label>
                <div className="space-y-1">
                  {task.attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate text-xs font-medium text-slate-800">{att.name || 'Document'}</span>
                      </div>
                      {att.url && (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-medium text-[10px] hover:bg-slate-50 flex items-center gap-1"
                        >
                          <span>View</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submitted Photos Proof */}
            {task.photos && task.photos.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-slate-400" />
                  <span>Photo Proof & POD ({task.photos.length})</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {task.photos.map((p, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setActivePhotoViewer(p.url)}
                      className="rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:opacity-90 transition relative group h-20 bg-slate-100"
                    >
                      <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-medium transition">
                        Preview
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Decision Radio Selector */}
            {canDecide ? (
              <div className="space-y-2 pt-1">
                <label className="block text-[11px] font-semibold text-slate-700">Review Decision *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDecision('approve')}
                    className={`p-2.5 rounded-lg border text-left font-medium text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                      decision === 'approve'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 font-semibold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Approve Deliverable</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision('reject')}
                    className={`p-2.5 rounded-lg border text-left font-medium text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                      decision === 'reject'
                        ? 'border-rose-600 bg-rose-50/50 text-rose-900 font-semibold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                    <span>Request Changes</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                You are viewing this submission in read-only mode. Approval is reserved for the direct reporting manager.
              </div>
            )}

            {/* Feedback / Review Notes */}
            {canDecide && (
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  {decision === 'reject' ? 'Reason for Requesting Changes *' : 'Approval Note (Optional)'}
                </label>
                <textarea
                  rows="2"
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder={decision === 'reject' ? 'Explain what corrections are required...' : 'Optional confirmation remarks...'}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 outline-none focus:border-slate-400 bg-white"
                />
              </div>
            )}

            {/* Sticky Action Footer */}
            {canDecide && (
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-lg text-slate-600 text-xs font-medium hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-lg text-white text-xs font-semibold transition cursor-pointer shadow-xs ${
                    decision === 'approve'
                      ? 'bg-[#05331F] hover:bg-[#07472B]'
                      : 'bg-rose-700 hover:bg-rose-800'
                  }`}
                >
                  {isSubmitting ? 'Recording...' : decision === 'approve' ? 'Confirm Approval' : 'Submit Corrections'}
                </button>
              </div>
            )}

          </form>
        </div>
      </div>

      {/* Photo Viewer Lightbox */}
      {activePhotoViewer && (
        <div 
          onClick={() => setActivePhotoViewer(null)}
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <img 
            src={activePhotoViewer} 
            alt="Enlarged Proof" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" 
          />
        </div>
      )}
    </>
  );
}
