import React, { useState } from 'react';
import { 
  Building2, Phone, Calendar, Clock, Lock, Unlock, CheckCircle2, 
  AlertCircle, Upload, Paperclip, Send, X, AlertTriangle, FileText,
  ShieldCheck, CheckSquare, Layers, MapPin
} from 'lucide-react';
import { TASK_STATUSES, isTaskLockedForUser } from './rbac';
import { getTodayDateString } from './dateUtils';
import { MANDATORY_QC_CHECKLIST } from './sopRules';

export default function TaskExecutionModal({ isOpen, onClose, task, currentUser, onTaskUpdated }) {
  if (!isOpen || !task) return null;

  const todayStr = getTodayDateString();
  const locked = isTaskLockedForUser(currentUser, task);

  // States
  const [status, setStatus] = useState(task.status || TASK_STATUSES.IN_PROGRESS);
  const [progress, setProgress] = useState(task.progressPercentage || 0);
  const [progressRemarks, setProgressRemarks] = useState('');
  const [blockerReason, setBlockerReason] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState(task.evidenceFiles || []);

  // Stark SOP 2.0 Execution Fields
  const [doorsLoadedCount, setDoorsLoadedCount] = useState(task.doorsLoadedCount || 0);
  const [qcItems, setQcItems] = useState(task.qcChecklistState || {});
  const [qcRemarks, setQcRemarks] = useState(task.qcRemarks || '');
  const [accountsClearance, setAccountsClearance] = useState(task.paymentStatus || 'Payment Pending Verification');
  const [sopStage, setSopStage] = useState(task.sopStage || 'SALES_VERIFICATION');

  const handleToggleQcItem = (itemId) => {
    setQcItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const allQcChecked = MANDATORY_QC_CHECKLIST.every(item => Boolean(qcItems[item.id]));

  const handleSubmit = (e) => {
    e.preventDefault();

    if (locked && !['Executive Director', 'Director Operations', 'General Manager'].includes(currentUser?.role)) {
      alert("This task is locked! Yesterday's and past tasks cannot be edited. Contact Director Operations for unlock requests.");
      return;
    }

    const timestamp = `${todayStr} ${new Date().toLocaleTimeString()}`;
    let auditAction = 'PROGRESS_UPDATE';
    let auditDetails = `Progress updated to ${progress}%. SOP Stage: ${sopStage}. Remarks: ${progressRemarks || 'None'}`;

    if (status === TASK_STATUSES.ACCEPTED && task.status === TASK_STATUSES.ASSIGNED) {
      auditAction = 'ACCEPTED';
      auditDetails = `Task formally accepted by ${currentUser.fullName || currentUser.name}`;
    } else if (allQcChecked && !task.qcCleared) {
      auditAction = 'QC_CLEARED';
      auditDetails = `Mandatory 9-point QC Inspection completed & cleared by ${currentUser.fullName || currentUser.name}`;
    } else if (Number(doorsLoadedCount) > 0 && doorsLoadedCount !== task.doorsLoadedCount) {
      auditAction = 'LOADING_UPDATE';
      auditDetails = `Loading count updated to ${doorsLoadedCount} doors towards 70-door daily target.`;
    }

    const newAuditLog = {
      id: `log-${Date.now()}`,
      action: auditAction,
      performedById: currentUser.id,
      performedByName: `${currentUser.fullName || currentUser.name} (${currentUser.role})`,
      timestamp,
      details: auditDetails
    };

    const updatedTask = {
      ...task,
      status,
      progressPercentage: Number(progress),
      submissionNotes: progressRemarks || task.submissionNotes,
      blockerReason: status === TASK_STATUSES.BLOCKED ? blockerReason : task.blockerReason,
      lastUpdated: timestamp,
      auditLogs: [newAuditLog, ...(task.auditLogs || [])],

      // Stark SOP 2.0 State
      sopStage,
      paymentStatus: accountsClearance,
      qcCleared: allQcChecked,
      qcChecklistState: qcItems,
      qcRemarks,
      doorsLoadedCount: Number(doorsLoadedCount),
      isLoaded: Number(doorsLoadedCount) >= Number(task.quantity || task.doorsConfirmed || 1)
    };

    onTaskUpdated(updatedTask);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto safe-pb safe-pt">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto">
        
        {/* Header - Fixed Top */}
        <div className="flex items-center justify-between border-b pb-3 sm:pb-4 border-slate-100 shrink-0">
          <div className="truncate mr-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                {task.id}
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                Order Execution
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1 truncate">{task.title}</h3>
            <p className="text-[11px] text-slate-500 truncate">
              Dealer: <span className="font-semibold text-slate-800">{task.dealerName || 'General Order'}</span> | PIN: {task.pinCode || 'N/A'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lock warning */}
        {locked && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 my-2 flex items-start gap-2 text-xs text-rose-800 shrink-0">
            <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Record is Locked: </span>
              Orders and dealer records lock at 11:59:59 PM to protect corporate audit records.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1 pt-2">
          
          {/* Order Details Brief (SOP 12-point confirmation) */}
          {task.taskType === 'stark_door_order' && (
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Customer & Contact:</span>
                <span className="font-semibold text-slate-800">{task.customerName} ({task.primaryPhone})</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery Destination:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[240px]">{task.deliveryAddress} (PIN: {task.pinCode})</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Model & Spec:</span>
                <span className="font-semibold text-[#05331F]">{task.doorModel} - {task.doorSize} ({task.quantity || task.doorsConfirmed} Doors)</span>
              </div>
            </div>
          )}

          {/* Workflow Stage Handover Progression */}
          <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-200 space-y-2">
            <label className="block font-bold text-emerald-950">
              Operational Handover Stage
            </label>
            <select
              disabled={locked}
              value={sopStage}
              onChange={(e) => setSopStage(e.target.value)}
              className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#05331F]"
            >
              <option value="SALES_VERIFICATION">1. Sales Verification (11:00 – 11:30 AM)</option>
              <option value="ACCOUNTS_CLEARANCE">2. Accounts Payment Clearance (11:30 AM – 12:00 PM)</option>
              <option value="OPERATIONS_HANDOVER">3. Final Operations Handover (12:00 – 12:15 PM)</option>
              <option value="WAREHOUSE_PICKING">4. Warehouse Picking & Staging (1:00 – 3:30 PM)</option>
              <option value="QC_INSPECTION">5. Final QC Inspection & Clearance (3:30 – 4:30 PM)</option>
              <option value="LOADING">6. Loading QC-Approved Products (4:30 – 5:45 PM)</option>
              <option value="DISPATCHED">7. Final Quantity & Dispatch Clearance (by 6:00 PM)</option>
            </select>
          </div>

          {/* Accounts Clearance Checkpoint (SOP Section 4) */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <label className="block font-semibold text-slate-800">
              Accounts Payment Clearance (Section 4 Mandate)
            </label>
            <select
              disabled={locked}
              value={accountsClearance}
              onChange={(e) => setAccountsClearance(e.target.value)}
              className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-bold outline-none ${
                accountsClearance === 'Payment Cleared' ? 'border-emerald-500 text-emerald-800' : 'border-amber-400 text-amber-900'
              }`}
            >
              <option value="Payment Cleared">✓ Payment Cleared (Released to Warehouse)</option>
              <option value="Payment Pending Verification">Payment Pending Verification</option>
              <option value="Payment Hold">⚠ PAYMENT HOLD (Do Not Release to Warehouse)</option>
            </select>
          </div>

          {/* MANDATORY QC CHECKLIST (SOP Section 9) */}
          <div className="bg-blue-50/50 p-3.5 rounded-2xl border border-blue-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-950 flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                Section 9: Mandatory QC Checklist (Before Loading)
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                allQcChecked ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800'
              }`}>
                {allQcChecked ? 'QC PASS' : 'QC PENDING'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
              {MANDATORY_QC_CHECKLIST.map(qc => (
                <label key={qc.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-white border border-blue-100 text-[11px] text-slate-700 cursor-pointer hover:bg-blue-50/50">
                  <input
                    disabled={locked}
                    type="checkbox"
                    checked={Boolean(qcItems[qc.id])}
                    onChange={() => handleToggleQcItem(qc.id)}
                    className="rounded text-[#05331F] focus:ring-[#05331F]"
                  />
                  <span>{qc.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 70-Door Loading Counter Input */}
          <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-amber-950">
                Doors Loaded Count (Toward 70-Door Daily Target)
              </label>
              <span className="text-[11px] font-bold text-amber-900">Target: 70 Doors</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                disabled={locked}
                type="number"
                min="0"
                value={doorsLoadedCount}
                onChange={(e) => setDoorsLoadedCount(e.target.value)}
                className="w-32 bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm font-bold text-[#05331F] outline-none"
              />
              <span className="text-xs text-slate-500">
                Units loaded into dispatch vehicle before 6:00 PM.
              </span>
            </div>
          </div>

          {/* Progress & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Workflow Status</label>
              <select
                disabled={locked}
                value={status}
                onChange={(e) => {
                  const s = e.target.value;
                  setStatus(s);
                  if (s === TASK_STATUSES.COMPLETED) setProgress(100);
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
              >
                <option value={TASK_STATUSES.ACCEPTED}>Accept Order</option>
                <option value={TASK_STATUSES.IN_PROGRESS}>In Progress</option>
                <option value={TASK_STATUSES.BLOCKED}>Report Operational Blocker</option>
                <option value={TASK_STATUSES.PENDING_REVIEW}>Submit for Review</option>
                <option value={TASK_STATUSES.COMPLETED}>Completed & Dispatched</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Progress: {progress}%</label>
              <input
                disabled={locked}
                type="range"
                min="0"
                max="100"
                step="5"
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
                className="w-full accent-[#05331F] mt-2 cursor-pointer"
              />
            </div>
          </div>

          {/* Work Remarks */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Activity Notes / Remarks</label>
            <textarea
              disabled={locked}
              rows="2"
              placeholder="Record batch QC inspection details, loading vehicle number, or delay reasons..."
              value={progressRemarks}
              onChange={(e) => setProgressRemarks(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Close
            </button>
            {!locked && (
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472c] text-white font-semibold shadow-md transition-all active:scale-98"
              >
                <Send className="w-4 h-4" />
                <span>Save Execution Updates</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
