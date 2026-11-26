import React, { useState, useRef } from 'react';
import { 
  Building2, Phone, Calendar, Clock, Lock, Unlock, CheckCircle2, 
  AlertCircle, Upload, Paperclip, Send, X, AlertTriangle, FileText,
  ShieldCheck, CheckSquare, Layers, MapPin, Link2, ExternalLink, Loader2,
  RefreshCw, MessageSquare, Camera, Play, Check, ShieldAlert, CreditCard,
  Truck, UserCheck
} from 'lucide-react';
import { TASK_STATUSES, isTaskLockedForUser } from './rbac';
import { getTodayDateString } from './dateUtils';
import { uploadTaskAttachment } from './firestoreService';
import { normalizeRoleName, resolveTaskApproverId } from './permissions';
import { WAREHOUSE_BLOCKER_CATEGORIES, WAREHOUSE_BLOCKER_SEVERITIES, getLoadingMilestoneProgress, isWarehouseTask } from './warehouseWorkTypes';
import { TRANSPORTATION_BLOCKER_CATEGORIES, isTransportationTask } from './transportationWorkTypes';
import { checkOrderTaskDependency } from './orderChainWorkflow';

export default function TaskExecutionModal({ isOpen, onClose, task, currentUser, allEmployees = [], leaveCovers = [], onTaskUpdated, allTasks = [], bookings = [] }) {
  if (!isOpen || !task) return null;

  const todayStr = getTodayDateString();
  const locked = isTaskLockedForUser(currentUser, task);
  const userRole = normalizeRoleName(currentUser?.role || '');

  // Find linked booking if this is an order task
  const bookingId = task.sourceBookingId || task.bookingId;
  const parentBooking = bookings.find(b => b.id === bookingId);
  const depCheck = checkOrderTaskDependency(task, allTasks, parentBooking);
  const isWorkflowBlocked = depCheck.isLocked;

  // Operations checks
  const isDriverRole = ['Driver', 'Delivery Partner'].includes(userRole);
  const isFrontline = isDriverRole || ['Loading Staff', 'Technician', 'Service Technician', 'Storekeeper'].includes(userRole);
  const isOperationsTask = task.department === 'operations' || task.department === 'warehouse' || 
                           task.department === 'transportation' || task.department === 'service' || 
                           task.department === 'inventory' || Boolean(task.photos) || Boolean(task.location);

  // Finance checks
  const isFinanceParticipant = (currentUser?.department || '').toLowerCase() === 'finance' ||
                               ['Accounts Manager', 'Accountant'].includes(userRole);
  const isPaymentVerification = task.taskType === 'Payment verification' || 
                                (task.title && task.title.toLowerCase().includes('payment')) ||
                                (task.title && task.title.toLowerCase().includes('token'));

  // Transportation checks
  const isTransportLead = ['Transport Manager', 'Transport Coordinator', 'Executive Director', 'Director Operations'].includes(userRole);
  const isDispatchTask = !isDriverRole && (
                         task.taskType === 'Dispatch Route' ||
                         (task.title && task.title.toLowerCase().includes('dispatch')) ||
                         (task.templateId && task.templateId.startsWith('tpl_trans_'))
                         );

  // States
  const [status, setStatus] = useState(task.status || TASK_STATUSES.IN_PROGRESS);
  const [progress, setProgress] = useState(task.progressPercentage || 0);
  const [progressRemarks, setProgressRemarks] = useState('');

  // Transportation Vehicle & Driver Assignment State
  const initialDriverId = task.driverId || task.assignedDriverId || parentBooking?.assignedDriverId || parentBooking?.driverId || '';
  const initialVehicle = task.vehicleNumber || parentBooking?.vehicleNumber || 'KL-55-B-9021';
  const initialDeparture = task.departureWindow || parentBooking?.departureWindow || '6:00 PM Shift';
  const initialDispatchDate = task.customDispatchDate || task.pickupDate || parentBooking?.dispatchDate || todayStr;
  const initialRegion = task.region || task.deliveryRegion || parentBooking?.region || 'Kerala North';

  const [assignedDriverId, setAssignedDriverId] = useState(initialDriverId);
  const [vehicleNumber, setVehicleNumber] = useState(initialVehicle);
  const [departureWindow, setDepartureWindow] = useState(initialDeparture);
  const [customDispatchDate, setCustomDispatchDate] = useState(initialDispatchDate);
  const [deliveryRegion, setDeliveryRegion] = useState(initialRegion);
  const [isDispatchSubmitting, setIsDispatchSubmitting] = useState(false);

  // Sync state whenever task or parentBooking changes
  React.useEffect(() => {
    if (task) {
      const dId = task.driverId || task.assignedDriverId || parentBooking?.assignedDriverId || parentBooking?.driverId || '';
      if (dId) setAssignedDriverId(dId);
      if (task.vehicleNumber || parentBooking?.vehicleNumber) {
        setVehicleNumber(task.vehicleNumber || parentBooking?.vehicleNumber);
      }
      if (task.departureWindow || parentBooking?.departureWindow) {
        setDepartureWindow(task.departureWindow || parentBooking?.departureWindow);
      }
      if (task.customDispatchDate || task.pickupDate || parentBooking?.dispatchDate) {
        setCustomDispatchDate(task.customDispatchDate || task.pickupDate || parentBooking?.dispatchDate);
      }
      if (task.region || task.deliveryRegion || parentBooking?.region) {
        setDeliveryRegion(task.region || task.deliveryRegion || parentBooking?.region);
      }
    }
  }, [task, parentBooking]);

  // Payment Verification Decision (Cleared vs Payment Hold)
  const [holdReason, setHoldReason] = useState(task.holdReason || '');
  const [isHoldSubmitting, setIsHoldSubmitting] = useState(false);
  
  // Operations Photos & Details
  const [photos, setPhotos] = useState(task.photos || []);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const photoInputRef = useRef(null);
  const [activePhotoViewer, setActivePhotoViewer] = useState(null);

  // Finance & General Attachments
  const [attachments, setAttachments] = useState(task.attachments || []);
  const [isDocUploading, setIsDocUploading] = useState(false);
  const [docUploadError, setDocUploadError] = useState('');
  const docInputRef = useRef(null);

  // Quantity Tracking for Operations/Warehouse Tasks
  const [assignedQuantity, setAssignedQuantity] = useState(task.assignedQuantity || task.quantity || 70);
  const [completedQuantity, setCompletedQuantity] = useState(task.completedQuantity || 0);

  // Blocker Modal Form State
  const [isReportingBlocker, setIsReportingBlocker] = useState(false);
  const [blockerCategory, setBlockerCategory] = useState(WAREHOUSE_BLOCKER_CATEGORIES[0]);
  const [blockerSeverity, setBlockerSeverity] = useState('High');
  const [blockerDescription, setBlockerDescription] = useState('');
  const [pauseReason, setPauseReason] = useState('');
  const [isPausePromptOpen, setIsPausePromptOpen] = useState(false);

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setPhotoError('');
    setIsPhotoUploading(true);

    try {
      const uploadedPhotos = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          throw new Error(`File ${file.name} is not an image.`);
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`Photo ${file.name} exceeds 10 MB limit.`);
        }
        const item = await uploadTaskAttachment(file, task.id);
        uploadedPhotos.push(item);
      }
      setPhotos(prev => [...prev, ...uploadedPhotos]);
    } catch (err) {
      console.error('Photo upload error:', err);
      setPhotoError(err.message || 'Failed to upload photo (max 10 MB).');
    } finally {
      setIsPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Upload finance document / payment slip / proof (PDF or Image up to 10 MB)
  const handleDocUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setDocUploadError('');
    setIsDocUploading(true);

    try {
      const uploadedItems = [];
      for (const file of files) {
        const isImg = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';
        if (!isImg && !isPdf) {
          throw new Error(`File ${file.name} is not supported. Please upload PDF or image files.`);
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds 10 MB limit.`);
        }
        const item = await uploadTaskAttachment(file, task.id);
        uploadedItems.push(item);
      }
      setAttachments(prev => [...prev, ...uploadedItems]);
    } catch (err) {
      console.error('Document upload error:', err);
      setDocUploadError(err.message || 'Failed to upload document.');
    } finally {
      setIsDocUploading(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Quick Action for Frontline (Start Task)
  const handleQuickStart = () => {
    setStatus(TASK_STATUSES.IN_PROGRESS);
    setProgress(progress > 0 ? progress : 25);
    saveUpdates(TASK_STATUSES.IN_PROGRESS, progress > 0 ? progress : 25, 'Task execution started by frontline personnel');
  };

  // Quick Action for Frontline (Pause Task)
  const handleQuickPause = () => {
    if (!pauseReason.trim()) {
      alert('Please specify a brief reason for pausing the task.');
      return;
    }
    setStatus('Paused');
    saveUpdates('Paused', progress, `Task paused: ${pauseReason.trim()}`);
    setIsPausePromptOpen(false);
  };

  // Quick Action for Frontline (Resume Task)
  const handleQuickResume = () => {
    setStatus(TASK_STATUSES.IN_PROGRESS);
    saveUpdates(TASK_STATUSES.IN_PROGRESS, progress, 'Task execution resumed by frontline personnel');
  };

  // Quick Action for Frontline (Done -> Waiting for Sign-Off)
  const handleQuickDone = () => {
    if (isWorkflowBlocked) {
      alert(`Cannot complete this task yet: ${depCheck.reason}`);
      return;
    }

    const isDeliveryTask = isDriverRole || 
                           task.templateId === 'tpl_trans_delivery' || 
                           (task.taskType && task.taskType.toLowerCase().includes('delivery')) ||
                           (task.title && (task.title.toLowerCase().includes('delivery') || task.title.toLowerCase().includes('dispatch')));

    setStatus(TASK_STATUSES.PENDING_REVIEW);
    setProgress(100);
    saveUpdates(
      TASK_STATUSES.PENDING_REVIEW, 
      100, 
      isDeliveryTask 
        ? (photos && photos.length > 0 ? 'Delivery completed with signed POD. Submitted for coordinator sign-off.' : 'Delivery completed. Submitted for coordinator sign-off.')
        : 'Work completed. Submitted for supervisor sign-off.',
      {
        submissionNotes: photos && photos.length > 0 ? 'Delivery completed with signed POD attached.' : 'Delivery completed.',
        submittedAt: new Date().toISOString(),
        isDeliveryCompleted: true
      }
    );
  };

  // Quick Action for Reporting Operational Blocker
  const handleReportOperationalBlocker = () => {
    if (!blockerDescription.trim()) {
      alert('Please provide a description of the operational blocker.');
      return;
    }

    const blockerPayload = {
      isBlocked: true,
      blockerCategory,
      blockerSeverity,
      blockerReason: `${blockerCategory}: ${blockerDescription.trim()}`,
      reportedById: currentUser.id || currentUser.uid,
      reportedByName: `${currentUser.fullName || currentUser.name} (${currentUser.role})`,
      reportedAt: new Date().toISOString()
    };

    setStatus(TASK_STATUSES.BLOCKED);
    saveUpdates(
      TASK_STATUSES.BLOCKED, 
      progress, 
      `OPERATIONAL BLOCKER [${blockerSeverity} - ${blockerCategory}]: ${blockerDescription.trim()}`,
      blockerPayload
    );
    setIsReportingBlocker(false);
    setBlockerDescription('');
  };

  // Transportation Action: Assign Driver & Vehicle, Dispatch Order
  const handleAssignDriverAndDispatch = () => {
    if (!vehicleNumber.trim()) {
      alert('Please enter or verify the vehicle registration number.');
      return;
    }
    const chosenDriver = allEmployees.find(e => String(e.id || e.uid || e.employeeId) === String(assignedDriverId));
    const driverName = chosenDriver ? (chosenDriver.fullName || chosenDriver.name) : 'Fleet Driver';
    const driverTargetId = chosenDriver ? String(chosenDriver.id || chosenDriver.uid || chosenDriver.employeeId) : String(assignedDriverId);
    const driverEmpId = chosenDriver?.employeeId ? String(chosenDriver.employeeId) : '';
    const driverAliases = [
      driverTargetId,
      driverEmpId,
      driverEmpId ? `emp_${driverEmpId}` : null,
      chosenDriver?.id ? String(chosenDriver.id) : null,
      chosenDriver?.uid ? String(chosenDriver.uid) : null
    ].filter(Boolean);

    const timestamp = `${todayStr} ${new Date().toLocaleTimeString()}`;
    const targetDispatchDate = customDispatchDate || todayStr;

    setIsDispatchSubmitting(true);
    const updatedTask = {
      ...task,
      assignedTo: driverTargetId,
      assignedToId: driverTargetId,
      assigneeIds: Array.from(new Set([driverTargetId, ...driverAliases])),
      assignedToName: driverName,
      status: 'In Progress',
      progressPercentage: 50,
      assignedDriverId: driverTargetId,
      driverName,
      driverId: driverTargetId,
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      departureWindow,
      customDispatchDate: targetDispatchDate,
      pickupDate: targetDispatchDate,
      taskDate: targetDispatchDate,
      date: targetDispatchDate,
      deadlineDate: targetDispatchDate,
      region: deliveryRegion,
      deliveryRegion,
      isDispatched: true,
      departureTime: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      auditLogs: [
        ...(task.auditLogs || []),
        {
          id: `log-${Date.now()}`,
          action: 'DISPATCH_VEHICLE_ASSIGNED',
          performedById: currentUser.id || currentUser.uid,
          performedByName: `${currentUser.fullName || currentUser.name} (${currentUser.role})`,
          timestamp,
          details: `Vehicle ${vehicleNumber.trim().toUpperCase()} assigned to driver ${driverName} for pickup date ${targetDispatchDate} in region ${deliveryRegion}. Marked dispatched for dealer delivery.`
        }
      ]
    };

    if (onTaskUpdated) onTaskUpdated(updatedTask);
    setIsDispatchSubmitting(false);
    onClose();
  };

  // Finance Outcome 1: CLEARED (Completes task and lets next Operations task proceed)
  const handleFinanceClear = () => {
    const timestamp = `${todayStr} ${new Date().toLocaleTimeString()}`;
    const updatedTask = {
      ...task,
      status: TASK_STATUSES.COMPLETED,
      paymentStatus: 'Cleared',
      accountsClearance: 'Cleared',
      progressPercentage: 100,
      clearedAt: new Date().toISOString(),
      clearedById: currentUser.id || currentUser.uid,
      clearedByName: currentUser.fullName || currentUser.name,
      holdReason: null,
      attachments: attachments || [],
      lastUpdated: new Date().toISOString(),
      auditLogs: [
        ...(task.auditLogs || []),
        {
          id: `log-${Date.now()}`,
          action: 'PAYMENT_CLEARED',
          performedById: currentUser.id || currentUser.uid,
          performedByName: `${currentUser.fullName || currentUser.name} (${currentUser.role})`,
          timestamp,
          details: `Advance payment verified and CLEARED for order #${task.reference || task.bookingId || ''}. Operations picking allowed.`
        }
      ]
    };

    if (onTaskUpdated) onTaskUpdated(updatedTask);
    onClose();
  };

  // Finance Outcome 2: PAYMENT HOLD (Needs reason, marks red, appears in Escalations, notifies SSM & Operations Head)
  const handleFinanceHold = () => {
    if (!holdReason.trim()) {
      alert('Please provide a specific reason for placing this payment on hold.');
      return;
    }

    const timestamp = `${todayStr} ${new Date().toLocaleTimeString()}`;
    const updatedTask = {
      ...task,
      status: TASK_STATUSES.BLOCKED,
      paymentStatus: 'Payment Hold',
      accountsClearance: 'Payment Hold',
      progressPercentage: 20,
      holdReason: holdReason.trim(),
      heldAt: new Date().toISOString(),
      heldById: currentUser.id || currentUser.uid,
      heldByName: currentUser.fullName || currentUser.name,
      attachments: attachments || [],
      lastUpdated: new Date().toISOString(),
      auditLogs: [
        ...(task.auditLogs || []),
        {
          id: `log-${Date.now()}`,
          action: 'PAYMENT_HOLD',
          performedById: currentUser.id || currentUser.uid,
          performedByName: `${currentUser.fullName || currentUser.name} (${currentUser.role})`,
          timestamp,
          details: `PAYMENT HOLD triggered: ${holdReason.trim()}. Escalated to Sales SSM and Operations Head.`
        }
      ]
    };

    if (onTaskUpdated) onTaskUpdated(updatedTask);
    onClose();
  };

  const saveUpdates = (newStatus, newProgress, remarks, extraFields = {}) => {
    const timestamp = `${todayStr} ${new Date().toLocaleTimeString()}`;
    const actorId = currentUser.id || currentUser.uid;
    const actorName = currentUser.fullName || currentUser.name;

    // Check if task is transitioning to completed or submitted for sign-off
    const isFinishing = newStatus === TASK_STATUSES.PENDING_REVIEW || newStatus === TASK_STATUSES.COMPLETED;
    
    // Stamping completer and direct reporting manager approver
    const completedById = isFinishing ? (task.completedById || actorId) : (task.completedById || null);
    const completedByName = isFinishing ? (task.completedByName || actorName) : (task.completedByName || null);

    // Prepare draft task with completer to resolve immutable approverId
    const draftForApprover = {
      ...task,
      completedById
    };
    const approverId = isFinishing
      ? (task.approverId || resolveTaskApproverId(draftForApprover, allEmployees, leaveCovers))
      : (task.approverId || null);

    const updatedTask = {
      ...task,
      ...extraFields,
      status: newStatus,
      progressPercentage: parseInt(newProgress, 10),
      assignedQuantity: parseInt(assignedQuantity, 10) || 70,
      completedQuantity: parseInt(completedQuantity, 10) || 0,
      lastUpdated: new Date().toISOString(),
      photos: photos || [],
      attachments: attachments || [],
      ...(isFinishing ? { completedById, completedByName, approverId } : {}),
      auditLogs: [
        ...(task.auditLogs || []),
        {
          id: `log-${Date.now()}`,
          action: newStatus === TASK_STATUSES.PENDING_REVIEW ? 'WAITING_FOR_SIGN_OFF' : 
                  newStatus === TASK_STATUSES.BLOCKED ? 'BLOCKER_REPORTED' : 'PROGRESS_UPDATE',
          performedById: actorId,
          performedByName: `${actorName} (${currentUser.role})`,
          timestamp,
          details: remarks || progressRemarks || `Status updated to ${newStatus}`
        }
      ]
    };

    if (onTaskUpdated) onTaskUpdated(updatedTask);
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isWorkflowBlocked) {
      alert(`Cannot submit this task yet: ${depCheck.reason}`);
      return;
    }
    if (locked && !['Executive Director', 'Director Operations', 'General Manager'].includes(currentUser?.role)) {
      alert("This task is locked! Yesterday's records cannot be edited.");
      return;
    }
    saveUpdates(status, progress, progressRemarks);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-3 sm:pb-4 border-slate-100 p-4 sm:p-5 shrink-0">
            <div className="truncate mr-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                  {task.id}
                </span>
                {task.isLinkedSalesWork && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-[#05331F] border border-emerald-300">
                    From Sales
                  </span>
                )}
                {task.paymentStatus === 'Payment Hold' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                    Payment Hold
                  </span>
                )}
                {task.paymentStatus === 'Cleared' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Cleared
                  </span>
                )}
                {task.isBranchRequest && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                    Branch Request
                  </span>
                )}
                {task.taskType && (
                  <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                    {task.taskType}
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1 truncate">{task.title}</h3>
              {task.location && (
                <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
                  <span className="truncate">{task.location}</span>
                </p>
              )}
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Locked notice */}
          {locked && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 mx-4 sm:mx-5 my-2 flex items-start gap-2 text-xs text-rose-800 shrink-0">
              <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Record is Locked: </span>
                Tasks lock after 11:59 PM to safeguard operational records and audit integrity. Editing and deletion are disabled.
              </div>
            </div>
          )}

          {/* Workflow Dependency Blocker Banner */}
          {isWorkflowBlocked && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 mx-4 sm:mx-5 my-2 flex items-start gap-2.5 text-xs text-amber-900 shrink-0 shadow-2xs">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">Workflow Prerequisite Pending: </span>
                <p>{depCheck.reason}</p>
                {depCheck.prerequisiteDept && (
                  <p className="text-[11px] text-amber-700">
                    Waiting for: <strong className="font-semibold">{depCheck.prerequisiteDept}</strong> ({depCheck.prerequisiteName} • Status: <span className="underline">{depCheck.prerequisiteStatus}</span>)
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Supervisor rejection comments */}
          {task.lastChangeRequestedComment && (
            <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-3 mx-4 sm:mx-5 my-1 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <MessageSquare className="w-4 h-4 text-amber-700" />
                <span>Changes Requested by Supervisor:</span>
              </div>
              <p className="text-amber-800 font-medium pl-5">{task.lastChangeRequestedComment}</p>
            </div>
          )}

          {/* PAYMENT VERIFICATION DEDICATED PANEL FOR FINANCE */}
          {isFinanceParticipant && isPaymentVerification ? (
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 bg-slate-50/50">
              
              {/* Linked Sales Work Summary Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Payment Token Verification</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#05331F] border border-emerald-200">
                    From Sales
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Dealer Name</span>
                    <strong className="text-slate-900">{task.partyName || task.dealerName || 'Dealer Customer'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Booking #</span>
                    <strong className="text-slate-900">{task.reference || task.bookingId || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Salesperson</span>
                    <span className="text-slate-700 font-semibold">{task.salespersonName || task.createdByName || 'Sales Desk'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Required-By Date</span>
                    <strong className="text-rose-600">{task.requiredBy || task.deadlineDate || 'Immediate'}</strong>
                  </div>
                </div>

                {task.description && (
                  <p className="text-xs text-slate-600 pt-1 border-t border-slate-100">{task.description}</p>
                )}
              </div>

              {/* Payment Slip / Invoice Attachments Preview */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Paperclip className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Attached Payment Slip & Proof ({attachments.length})</span>
                  </span>
                  <span className="text-[10px] text-slate-400">PDF / Image up to 10 MB</span>
                </label>

                {attachments.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-white text-center text-xs text-slate-400">
                    No payment slip uploaded yet by salesperson.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span className="truncate text-xs font-semibold text-slate-800">{att.name || 'Payment Proof'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {att.url && (
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-[#05331F] font-bold text-[11px] hover:bg-emerald-100 flex items-center gap-1"
                            >
                              <span>View</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {!locked && (
                            <button
                              type="button"
                              onClick={() => removeAttachment(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload additional slip */}
                {!locked && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      ref={docInputRef}
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={handleDocUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isDocUploading}
                      onClick={() => docInputRef.current && docInputRef.current.click()}
                      className="px-3 py-1.5 rounded-xl border border-dashed border-[#05331F] text-[#05331F] hover:bg-emerald-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                    >
                      {isDocUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>{isDocUploading ? 'Uploading...' : 'Upload Additional Proof'}</span>
                    </button>
                  </div>
                )}
                {docUploadError && <p className="text-rose-600 text-[11px] mt-1 font-medium">{docUploadError}</p>}
              </div>

              {/* Payment Hold Reason Field */}
              <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200 space-y-2">
                <label className="block text-xs font-bold text-rose-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                  <span>Hold Reason *</span>
                </label>
                <textarea
                  rows="2"
                  placeholder="Reason for payment hold..."
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  className="w-full border border-rose-300 rounded-xl p-2.5 text-xs bg-white text-slate-800 outline-none focus:border-rose-600"
                />
              </div>

              {/* Finance Action Decisions */}
              {!locked && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleFinanceHold}
                    className="py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 min-h-[48px] cursor-pointer"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>Payment Hold</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFinanceClear}
                    className="py-3 px-4 rounded-2xl bg-[#05331F] hover:bg-[#07472B] active:bg-[#032214] text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 min-h-[48px] cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Cleared (Proceed)</span>
                  </button>
                </div>
              )}

            </div>
          ) : isDispatchTask && isTransportLead ? (
            /* DEDICATED TRANSPORTATION FLEET, DRIVER & VEHICLE DISPATCH PANEL */
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 bg-slate-50/50">
              {/* Order & Delivery Destination Brief */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-blue-700" />
                    <span>Fleet Vehicle & Driver Assignment</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                    Transportation Squad
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Dealer Showroom</span>
                    <strong className="text-slate-800 font-semibold">{task.dealerName || task.partyName || 'Showroom Order'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Booking Ref</span>
                    <strong className="text-slate-800 font-semibold">{task.reference || task.bookingId?.slice(-6).toUpperCase() || 'DLR-KN'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Target Delivery Date</span>
                    <strong className="text-slate-800 font-semibold">{task.requiredBy || task.deadlineDate || todayStr}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Warehouse Staging</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Doors Picked & Staged</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Driver Selection & Vehicle Registration */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#05331F]" />
                  <span>Assign Vehicle & Driver for Route</span>
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Select Driver / Delivery Partner *
                    </label>
                    <select
                      value={assignedDriverId}
                      onChange={(e) => setAssignedDriverId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-600"
                    >
                      <option value="">Select available driver from roster...</option>
                      {allEmployees.filter(e => {
                        const r = (e.role || '').toLowerCase();
                        return r === 'driver' || r === 'delivery partner' || (e.department || '').toLowerCase() === 'transportation';
                      }).map(driver => (
                        <option key={driver.id || driver.employeeId} value={driver.id || driver.employeeId}>
                          {driver.fullName || driver.name} ({driver.role}) {driver.phone ? `· ${driver.phone}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Driver Pickup / Dispatch Date *
                      </label>
                      <input
                        type="date"
                        value={customDispatchDate}
                        onChange={(e) => setCustomDispatchDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Delivery Region / Place *
                      </label>
                      <select
                        value={deliveryRegion}
                        onChange={(e) => setDeliveryRegion(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-600"
                      >
                        <option value="Kerala North">Kerala North (Kannur, Kasaragod, Kozhikode, Wayanad)</option>
                        <option value="Kerala South">Kerala South (Ernakulam, Thrissur, Kottayam, Kollam, TVM)</option>
                        <option value="Tamil Nadu">Tamil Nadu (Coimbatore, Chennai, Madurai, Salem)</option>
                        <option value="Karnataka">Karnataka (Bangalore, Mangalore, Mysore)</option>
                        <option value="Commercial">Commercial / Direct Project</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Vehicle Plate Number *
                      </label>
                      <input
                        type="text"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        placeholder="e.g. KL-55-B-9021"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 uppercase outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Departure Window *
                      </label>
                      <select
                        value={departureWindow}
                        onChange={(e) => setDepartureWindow(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-600"
                      >
                        <option value="6:00 PM Shift">6:00 PM Daily Shift</option>
                        <option value="Morning Dispatch">Morning Route</option>
                        <option value="Express Delivery">Express Door Delivery</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action: Confirm Vehicle Assignment & Dispatch */}
              {!locked && (
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isDispatchSubmitting}
                    onClick={handleAssignDriverAndDispatch}
                    className="w-full py-3.5 px-4 rounded-2xl bg-[#05331F] hover:bg-[#07472B] active:bg-[#032214] text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 min-h-[48px] cursor-pointer"
                  >
                    <Truck className="w-4 h-4 text-emerald-400" />
                    <span>{isDispatchSubmitting ? 'Dispatching...' : 'Confirm Driver & Mark Dispatched'}</span>
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-2">
                    Advances the order to Step 4 (Dispatched) and alerts driver for dealer showroom delivery and POD collection.
                  </p>
                </div>
              )}
            </div>
          ) : isFrontline ? (
            /* FRONTLINE MOBILE-FIRST SCREEN (Large Buttons: Start, Done, Add Photo) */
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              {/* Task Brief Card & Metadata */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Work Instructions</span>
                  <div className="flex items-center gap-1.5">
                    {task.priority && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        task.priority === 'Critical' || task.priority === 'Urgent'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {task.priority} Priority
                      </span>
                    )}
                    {task.deadlineDate && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        Due: {task.deadlineDate} {task.deadlineTime || ''}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-800 font-medium leading-relaxed">{task.description || 'Complete the operational assignment as per standard safety procedure.'}</p>
                <div className="pt-1 flex flex-wrap gap-2 text-xs">
                  {task.assignedByName && (
                    <span className="text-slate-600 bg-white px-2 py-1 rounded-lg border border-slate-200 text-[11px]">
                      Assigned by: <strong className="text-slate-900">{task.assignedByName}</strong>
                    </span>
                  )}
                  {task.reference && (
                    <span className="text-[#05331F] font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 text-[11px]">
                      Ref: {task.reference}
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity Tracking & Milestones for Warehouse/Operations */}
              {(isOperationsTask || isWarehouseTask(task)) && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-700" />
                      <span>Task Progress Quantity Tracking</span>
                    </span>
                    <span className="text-xs font-bold text-[#05331F]">
                      {completedQuantity} / {assignedQuantity} Doors
                    </span>
                  </div>

                  {/* Quantity input counters */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Assigned Target</label>
                      <input
                        type="number"
                        disabled={locked}
                        value={assignedQuantity}
                        onChange={(e) => setAssignedQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Completed So Far</label>
                      <input
                        type="number"
                        disabled={locked}
                        value={completedQuantity}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          setCompletedQuantity(val);
                          const pct = Math.min(100, Math.round((val / (assignedQuantity || 1)) * 100));
                          setProgress(pct);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800"
                      />
                    </div>
                  </div>

                  {/* Daily Loading Milestones Bar */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                      <span>Daily Milestones: 20 · 40 · 60 · 70 doors</span>
                      <span>{getLoadingMilestoneProgress(completedQuantity).percent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-emerald-600 h-full transition-all duration-300" 
                        style={{ width: `${getLoadingMilestoneProgress(completedQuantity).percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Photos Gallery / POD Proof */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    {userRole === 'Driver' || userRole === 'Delivery Partner' || task.taskType === 'Transit Delivery' || (task.title && task.title.toLowerCase().includes('dispatch')) 
                      ? `Signed Proof of Delivery (POD) (Optional) (${photos.length})` 
                      : `Photo Proof (Optional) (${photos.length})`}
                  </label>
                  {photos.length > 0 && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ Attached
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={photoInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isPhotoUploading || locked}
                    onClick={() => photoInputRef.current && photoInputRef.current.click()}
                    className="w-full py-3.5 bg-white border-2 border-dashed border-[#05331F] text-[#05331F] hover:bg-emerald-50 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 min-h-[50px] cursor-pointer transition"
                  >
                    {isPhotoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-emerald-700" />}
                    <span>
                      {isPhotoUploading 
                        ? 'Uploading Photo...' 
                        : (userRole === 'Driver' || userRole === 'Delivery Partner') 
                          ? '📷 Take Photo / Upload Signed POD (Optional)' 
                          : 'Add Photo (Optional)'}
                    </span>
                  </button>
                </div>

                {photoError && <p className="text-rose-600 text-xs font-medium">{photoError}</p>}

                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {photos.map((p, idx) => (
                      <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 bg-white">
                        <img 
                          src={p.url} 
                          alt={p.name} 
                          onClick={() => setActivePhotoViewer(p.url)}
                          className="w-full h-20 object-cover cursor-pointer hover:opacity-90 transition"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 bg-black/60 hover:bg-rose-600 text-white rounded-full p-1 min-h-[24px] min-w-[24px] flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Indicator */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between">
                <span className="text-xs text-slate-600">Current Status:</span>
                <span className="text-xs font-bold text-[#05331F]">{task.status}</span>
              </div>

              {/* Large Touch Targets for Frontline Actions (>= 48px) */}
              {!locked && (
                <div className="space-y-2.5 pt-2">
                  <div className="grid grid-cols-2 gap-2.5">
                    {task.status !== TASK_STATUSES.IN_PROGRESS ? (
                      <button
                        type="button"
                        onClick={handleQuickStart}
                        className="py-3 px-3 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 min-h-[48px] cursor-pointer"
                      >
                        <Play className="w-4 h-4" />
                        <span>Start Task</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsPausePromptOpen(true)}
                        className="py-3 px-3 rounded-2xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 min-h-[48px] cursor-pointer"
                      >
                        <span>Pause Task</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleQuickDone}
                      className="py-3.5 px-3 rounded-2xl bg-[#05331F] hover:bg-[#07472B] active:bg-[#032214] text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 min-h-[48px] cursor-pointer"
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>{(userRole === 'Driver' || userRole === 'Delivery Partner') ? 'Mark Delivered (Send POD)' : 'Done (Sign-Off)'}</span>
                    </button>
                  </div>

                  {/* Secondary Action: Report Operational Blocker */}
                  <button
                    type="button"
                    onClick={() => setIsReportingBlocker(true)}
                    className="w-full py-3 px-3 rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50/70 hover:bg-rose-100/70 text-rose-800 font-bold text-xs transition flex items-center justify-center gap-1.5 min-h-[48px] cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Report Blocker / Delay</span>
                  </button>
                </div>
              )}

              {/* Pause Prompt Sub-modal */}
              {isPausePromptOpen && (
                <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-800">Reason for Pausing *</label>
                  <input
                    type="text"
                    placeholder="e.g. Waiting for vehicle positioning, shift tea break..."
                    value={pauseReason}
                    onChange={(e) => setPauseReason(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPausePromptOpen(false)}
                      className="px-3 py-1.5 rounded-lg text-slate-600 text-xs font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleQuickPause}
                      className="px-4 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold"
                    >
                      Confirm Pause
                    </button>
                  </div>
                </div>
              )}

              {/* Report Operational Blocker Sub-modal */}
              {isReportingBlocker && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-900 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Log Operational Blocker</span>
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setIsReportingBlocker(false)}
                      className="text-xs text-slate-400 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Blocker Category *</label>
                    <select
                      value={blockerCategory}
                      onChange={(e) => setBlockerCategory(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium"
                    >
                      {(isTransportationTask(task) ? TRANSPORTATION_BLOCKER_CATEGORIES : WAREHOUSE_BLOCKER_CATEGORIES).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Severity *</label>
                    <select
                      value={blockerSeverity}
                      onChange={(e) => setBlockerSeverity(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium"
                    >
                      {WAREHOUSE_BLOCKER_SEVERITIES.map(sev => (
                        <option key={sev} value={sev}>{sev}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Description / Problem Details *</label>
                    <textarea
                      rows="2"
                      placeholder="Detail the issue (e.g. 3 walnut doors scratched in bay 4, forklift battery dead)..."
                      value={blockerDescription}
                      onChange={(e) => setBlockerDescription(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsReportingBlocker(false)}
                      className="px-3 py-1.5 rounded-lg text-slate-600 text-xs font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleReportOperationalBlocker}
                      className="px-4 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shadow-xs"
                    >
                      Submit Blocker & Notify Lead
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STANDARD DESKTOP/MANAGER EXECUTION VIEW */
            <form onSubmit={handleSubmit} className="space-y-4 text-xs overflow-y-auto flex-1 p-4 sm:p-5">
              
              {task.description && (
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700 block mb-1">Brief / Instructions:</span>
                  <p className="text-slate-600 whitespace-pre-wrap">{task.description}</p>
                  {task.reference && (
                    <p className="text-[#05331F] font-bold pt-1.5">
                      Reference: {task.reference}
                    </p>
                  )}
                  {task.partyName && (
                    <p className="text-slate-700 font-semibold pt-1">
                      Party: {task.partyName}
                    </p>
                  )}
                </div>
              )}

              {/* Attachments preview */}
              {attachments.length > 0 && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Paperclip className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Attached Documents ({attachments.length})</span>
                  </label>
                  <div className="space-y-1.5">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-xs font-medium text-slate-800 truncate flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>{att.name || 'Attachment'}</span>
                        </span>
                        {att.url && (
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-0.5 rounded bg-emerald-100 text-[#05331F] font-semibold text-[11px] hover:underline"
                          >
                            Open
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Photo proof for operations */}
              {isOperationsTask && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Operations Photo Proof ({photos.length})</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={photoInputRef}
                      disabled={locked}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={locked || isPhotoUploading}
                      onClick={() => photoInputRef.current && photoInputRef.current.click()}
                      className="px-3 py-1.5 rounded-xl border border-dashed border-emerald-600 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[44px]"
                    >
                      {isPhotoUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                      <span>{isPhotoUploading ? 'Uploading...' : 'Upload Photos'}</span>
                    </button>
                    <span className="text-[10px] text-slate-400">Max 10 MB per photo</span>
                  </div>

                  {photoError && <p className="text-rose-600 text-[11px] mt-1 font-medium">{photoError}</p>}

                  {photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {photos.map((p, idx) => (
                        <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 bg-white">
                          <img 
                            src={p.url} 
                            alt={p.name} 
                            onClick={() => setActivePhotoViewer(p.url)}
                            className="w-full h-16 object-cover cursor-pointer hover:opacity-90 transition"
                          />
                          {!locked && (
                            <button
                              type="button"
                              onClick={() => removePhoto(idx)}
                              className="absolute top-1 right-1 bg-black/60 hover:bg-rose-600 text-white rounded-full p-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Status and Progress */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    disabled={locked}
                    value={status}
                    onChange={(e) => {
                      const s = e.target.value;
                      setStatus(s);
                      if (s === TASK_STATUSES.COMPLETED) setProgress(100);
                      if (s === TASK_STATUSES.PENDING_REVIEW && progress < 80) setProgress(90);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <option value={TASK_STATUSES.ASSIGNED}>Pending</option>
                    <option value={TASK_STATUSES.IN_PROGRESS}>In Progress</option>
                    <option value={TASK_STATUSES.PENDING_REVIEW}>Waiting for Sign-Off</option>
                    <option value={TASK_STATUSES.BLOCKED}>Report Blocker / Hold</option>
                    <option value={TASK_STATUSES.COMPLETED}>Completed</option>
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

              {/* Remarks */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Execution Remarks / Notes</label>
                <textarea
                  disabled={locked}
                  rows="2"
                  placeholder="Record verification notes, transaction UTR, voucher number, or reason..."
                  value={progressRemarks}
                  onChange={(e) => setProgressRemarks(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:border-[#05331F]"
                />
              </div>

              {/* Submit footer */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold min-h-[44px]"
                >
                  Close
                </button>
                {!locked && (
                  <button
                    type="submit"
                    disabled={isPhotoUploading || isDocUploading}
                    className="px-5 py-2.5 rounded-xl bg-[#05331F] hover:bg-[#07472B] text-white font-semibold shadow-xs transition min-h-[44px]"
                  >
                    Save Updates
                  </button>
                )}
              </div>
            </form>
          )}

        </div>
      </div>

      {/* Full-Screen Image Lightbox Viewer */}
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
              alt="Proof Full Preview" 
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl" 
            />
          </div>
        </div>
      )}
    </>
  );
}
