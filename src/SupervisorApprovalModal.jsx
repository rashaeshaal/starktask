import React, { useState, useMemo } from 'react';
import { 
  Building2, Phone, Calendar, Clock, Lock, Unlock, CheckCircle2, 
  AlertCircle, Upload, Paperclip, Send, X, AlertTriangle, FileText,
  ShieldCheck, CheckSquare, Layers, MapPin, Eye, ExternalLink, MessageSquare,
  Camera
} from 'lucide-react';
import { TASK_STATUSES } from './rbac';
import { getTodayDateString } from './dateUtils';

export default function SupervisorApprovalModal({ 
  isOpen, 
  onClose, 
  task, 
  currentUser, 
  onDecision 
}) {
  if (!isOpen || !task) return null;

  const todayStr = getTodayDateString();
  const [decision, setDecision] = useState('approve'); // 'approve' | 'reject'
  const [approvalComment, setApprovalComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePhotoViewer, setActivePhotoViewer] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (decision === 'reject' && !approvalComment.trim()) {
      alert('Please provide concrete feedback and reason for requesting changes.');
      return;
    }

    setIsSubmitting(true);
    const timestamp = `${todayStr} ${new Date().toLocaleTimeString()}`;

    const currentRev = task.revision || 1;
    const newRev = decision === 'reject' ? currentRev + 1 : currentRev;

    const nextStatus = decision === 'approve' ? TASK_STATUSES.COMPLETED : 'Correction Requested';

    const updatedTask = {
      ...task,
      status: nextStatus,
      progressPercentage: decision === 'approve' ? 100 : 50,
      revision: newRev,
      lastChangeRequestedComment: decision === 'reject' ? approvalComment.trim() : null,
      lastUpdated: new Date().toISOString(),
      approvedAt: decision === 'approve' ? new Date().toISOString() : null,
      approvedById: decision === 'approve' ? (currentUser.id || currentUser.uid) : null,
      approvedByName: decision === 'approve' ? (currentUser.fullName || currentUser.name) : null,
      auditLogs: [
        ...(task.auditLogs || []),
        {
          id: `log-${Date.now()}`,
          action: decision === 'approve' ? 'TASK_APPROVED' : 'CHANGES_REQUESTED',
          performedById: currentUser.id || currentUser.uid,
          performedByName: `${currentUser.fullName || currentUser.name} (${currentUser.role})`,
          timestamp,
          details: decision === 'approve' 
            ? `Sign-off approved: ${approvalComment || 'Deliverable accepted.'}`
            : `Changes requested (Revision ${newRev}): ${approvalComment}`
        }
      ]
    };

    try {
      if (onDecision) {
        await onDecision(updatedTask);
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
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Review & Sign-Off</h2>
                <p className="text-xs text-slate-500">
                  Supervisor sign-off for <span className="font-semibold text-slate-800">{task.assignedToName}</span>
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
            
            {/* Task Info Summary */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Task Assignment</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                  Waiting for Sign-Off
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">{task.title}</h3>
              {task.description && (
                <p className="text-xs text-slate-600 whitespace-pre-wrap">{task.description}</p>
              )}
              {task.reference && (
                <p className="text-xs text-[#05331F] font-bold">
                  Reference: {task.reference}
                </p>
              )}
              {task.location && (
                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
                  <span>{task.location}</span>
                </p>
              )}
            </div>

            {/* Finance & General Attachments (Payment slips, Invoices, Statements) */}
            {task.attachments && task.attachments.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Submitted Attachments ({task.attachments.length})</span>
                </label>
                <div className="space-y-1.5">
                  {task.attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span className="truncate text-xs font-medium text-slate-800">{att.name || 'Attachment'}</span>
                      </div>
                      {att.url && (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-[#05331F] font-bold text-[11px] hover:bg-emerald-100 flex items-center gap-1"
                        >
                          <span>View Proof</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Operational Photos Proof View */}
            {task.photos && task.photos.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Submitted Photo Proof ({task.photos.length})</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {task.photos.map((p, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setActivePhotoViewer(p.url)}
                      className="rounded-xl overflow-hidden border border-slate-200 cursor-pointer hover:opacity-90 transition relative group"
                    >
                      <img src={p.url} alt={p.name} className="w-full h-20 object-cover" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition">
                        View
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Marketing Deliverables Preview */}
            {task.deliverableUrl && (
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-900 truncate">Deliverable Link Provided</span>
                <a 
                  href={task.deliverableUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <span>Open Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Decision Radio Pills */}
            <div className="space-y-1.5 pt-1">
              <label className="block font-semibold text-slate-700">Supervisor Decision *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDecision('approve')}
                  className={`p-3 rounded-2xl border text-center font-bold text-xs transition min-h-[48px] flex items-center justify-center gap-1.5 ${
                    decision === 'approve'
                      ? 'border-[#05331F] bg-emerald-50 text-[#05331F] shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Approve & Complete</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDecision('reject')}
                  className={`p-3 rounded-2xl border text-center font-bold text-xs transition min-h-[48px] flex items-center justify-center gap-1.5 ${
                    decision === 'reject'
                      ? 'border-amber-600 bg-amber-50 text-amber-900 shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>Request Changes</span>
                </button>
              </div>
            </div>

            {/* Supervisor Comments */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {decision === 'reject' ? 'Reason / Changes Required *' : 'Sign-Off Notes (Optional)'}
              </label>
              <textarea
                required={decision === 'reject'}
                rows="3"
                placeholder={decision === 'reject' ? "Detail the required corrections (e.g. Missing unloading POD signature, retake photo)..." : "Add any commendations or sign-off remarks..."}
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 text-xs focus:outline-none focus:border-[#05331F]"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-5 py-2.5 rounded-xl text-white font-semibold shadow-xs transition min-h-[44px] ${
                  decision === 'approve' ? 'bg-[#05331F] hover:bg-[#07472B]' : 'bg-amber-700 hover:bg-amber-800'
                }`}
              >
                {isSubmitting ? 'Saving...' : decision === 'approve' ? 'Confirm Sign-Off' : 'Return to Assignee'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Lightbox for Photos */}
      {activePhotoViewer && (
        <div 
          onClick={() => setActivePhotoViewer(null)}
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <button
              onClick={() => setActivePhotoViewer(null)}
              className="absolute -top-10 right-0 text-white font-bold text-sm bg-black/40 px-3 py-1 rounded-full"
            >
              Close ✕
            </button>
            <img 
              src={activePhotoViewer} 
              alt="Operational Proof Full Preview" 
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl" 
            />
          </div>
        </div>
      )}
    </>
  );
}
