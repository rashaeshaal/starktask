import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusCircle, X, Loader2, Calendar, Clock, AlertCircle, 
  Building2, CheckCircle2, Link2, Paperclip, Upload, FileText, Image, Video,
  MapPin, Camera, CheckSquare, CreditCard, DollarSign
} from 'lucide-react';
import { TASK_STATUSES, TASK_PRIORITIES } from './rbac';
import { getTodayDateString, getDateOffset } from './dateUtils';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import { uploadTaskAttachment } from './firestoreService';
import { canAccessSales, filterDealersByScope } from './salesPermissions';
import { normalizeRoleName } from './permissions';

export const MARKETING_TASK_TYPES = [
  'Design',
  'Photo/Video shoot',
  'Social post',
  'Campaign',
  'Lead follow-up',
  'Other'
];

export const OPERATIONS_TASK_TYPES = [
  'Picking',
  'Loading',
  'Dispatch',
  'Delivery',
  'Service call',
  'Stock check',
  'Other'
];

export const FINANCE_TASK_TYPES = [
  'Payment verification',
  'Invoice',
  'Reconciliation',
  'Collection follow-up',
  'Vendor payment',
  'Reporting',
  'Other'
];

export default function AddTodayWorkModal({
  isOpen,
  onClose,
  currentUser,
  departments = [],
  dealers = [],
  onTaskCreated
}) {
  const todayStr = getTodayDateString();
  const yesterdayStr = getDateOffset(-1);
  const titleInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const financeDocInputRef = useRef(null);

  const isSales = canAccessSales(currentUser);
  const userDept = (currentUser?.department || currentUser?.departmentId || '').toLowerCase();
  const userRole = normalizeRoleName(currentUser?.role || '');

  const isMarketing = userDept === 'marketing' ||
                      ['Brand Manager', 'Leads Coordinator', 'Graphic Designer', 'Photographer'].includes(userRole);

  const isOperations = userDept === 'operations' || userDept === 'warehouse' || 
                       userDept === 'transportation' || userDept === 'service' || 
                       userDept === 'inventory' ||
                       ['Operations Head', 'Warehouse In-charge', 'Transport Manager', 'Service Manager', 
                        'Inventory Supervisor', 'Warehouse Supervisor', 'Transport Coordinator', 
                        'Service Coordinator', 'Loading Staff', 'Driver', 'Delivery Partner', 
                        'Technician', 'Service Technician', 'Storekeeper', 'Operations Assistant'].includes(userRole);

  const isFinance = userDept === 'finance' || userDept === 'accounts' ||
                    ['Accounts Manager', 'Accountant'].includes(userRole);

  const isFrontline = ['Loading Staff', 'Driver', 'Delivery Partner', 'Technician', 'Service Technician', 'Storekeeper'].includes(userRole);

  // Scoped dealers for dealer picker
  const scopedDealers = isSales ? filterDealersByScope(dealers, currentUser) : [];

  // Form states
  const [selectedTaskDate, setSelectedTaskDate] = useState(todayStr);
  const [yesterdayLateReason, setYesterdayLateReason] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(TASK_STATUSES.ASSIGNED);
  const [priority, setPriority] = useState(TASK_PRIORITIES.MEDIUM);
  const [selectedDealerName, setSelectedDealerName] = useState('');
  const [linkedBookingId, setLinkedBookingId] = useState('');

  // Finance-specific fields
  const [financeTaskType, setFinanceTaskType] = useState('Payment verification');
  const [reference, setReference] = useState('');
  const [partyName, setPartyName] = useState('');
  const [financeAttachments, setFinanceAttachments] = useState([]);
  const [financeUploadError, setFinanceUploadError] = useState('');
  const [isFinanceUploading, setIsFinanceUploading] = useState(false);

  // Operations-specific fields
  const [opTaskType, setOpTaskType] = useState('Picking');
  const [location, setLocation] = useState('');
  const [photos, setPhotos] = useState([]);
  const [photoError, setPhotoError] = useState('');
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [activePhotoViewer, setActivePhotoViewer] = useState(null);

  // Marketing-specific fields
  const [taskType, setTaskType] = useState('Design');
  const [campaign, setCampaign] = useState('');
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedTaskDate(todayStr);
      setYesterdayLateReason('');
      setTitle('');
      setDescription('');
      setStatus(TASK_STATUSES.ASSIGNED);
      setPriority(TASK_PRIORITIES.MEDIUM);
      setSelectedDealerName('');
      setLinkedBookingId('');
      setReference('');
      setPartyName('');
      setFinanceAttachments([]);
      setFinanceUploadError('');
      setLocation('');
      setPhotos([]);
      setPhotoError('');
      setCampaign('');
      setDeliverableUrl('');
      setAttachments([]);
      setUploadError('');
      setErrorMessage('');
      setFinanceTaskType('Payment verification');
      setOpTaskType('Picking');
      setTaskType('Design');
      setTimeout(() => titleInputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Operations Photos
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
        const item = await uploadTaskAttachment(file, 'operations_self_work');
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

  // Handle Finance attachments (PDFs & images up to 10 MB each)
  const handleFinanceFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setFinanceUploadError('');
    setIsFinanceUploading(true);

    try {
      const uploadedItems = [];
      for (const file of files) {
        const isImg = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';
        if (!isImg && !isPdf) {
          throw new Error(`File "${file.name}" is not supported. Please upload PDF or image files only.`);
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File "${file.name}" exceeds the 10 MB limit.`);
        }
        const item = await uploadTaskAttachment(file, 'finance_self_work');
        uploadedItems.push(item);
      }
      setFinanceAttachments(prev => [...prev, ...uploadedItems]);
    } catch (err) {
      console.error('Finance file upload error:', err);
      setFinanceUploadError(err.message || 'Failed to upload attachment (max 10 MB).');
    } finally {
      setIsFinanceUploading(false);
      if (financeDocInputRef.current) financeDocInputRef.current.value = '';
    }
  };

  const removeFinanceAttachment = (index) => {
    setFinanceAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Handle Marketing attachments
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadError('');
    setIsUploading(true);

    try {
      const uploadPromises = files.map(file => uploadTaskAttachment(file, 'self_work'));
      const uploaded = await Promise.all(uploadPromises);
      setAttachments(prev => [...prev, ...uploaded]);
    } catch (err) {
      console.error('File upload failed:', err);
      setUploadError(err.message || 'File upload failed. Max 25 MB.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Task Title is required.');
      return;
    }

    if (selectedTaskDate === yesterdayStr && !yesterdayLateReason.trim()) {
      setErrorMessage("Mandatory: Please provide a reason why yesterday's work was not logged yesterday.");
      return;
    }

    setIsSubmitting(true);
    const timestamp = new Date().toISOString();

    const progressMap = {
      [TASK_STATUSES.ASSIGNED]: 0,
      [TASK_STATUSES.IN_PROGRESS]: 50,
      [TASK_STATUSES.PENDING_REVIEW]: 90,
      [TASK_STATUSES.COMPLETED]: 100
    };

    const finalDept = userDept || (isFinance ? 'finance' : isMarketing ? 'marketing' : 'operations');
    const effectiveDate = selectedTaskDate || todayStr;

    const newTask = {
      title: title.trim(),
      description: description.trim(),
      status: status,
      priority: priority,
      progressPercentage: progressMap[status] !== undefined ? progressMap[status] : 0,

      taskDate: effectiveDate,
      date: effectiveDate,
      deadlineDate: effectiveDate,
      deadlineTime: '18:00',
      createdAt: timestamp,
      lastUpdated: timestamp,

      assignedToId: currentUser?.id || currentUser?.uid,
      assignedTo: currentUser?.id || currentUser?.uid,
      assignedToName: currentUser?.fullName || currentUser?.name || 'Self Logged',
      assignedToRole: currentUser?.role || 'Staff',
      department: finalDept,
      departmentId: finalDept,

      createdById: currentUser?.id || currentUser?.uid,
      createdByName: currentUser?.fullName || currentUser?.name || 'Self Logged',
      createdByRole: currentUser?.role || 'Staff',

      selfLogged: true,
      isYesterdayLateSubmission: effectiveDate === yesterdayStr,
      yesterdayLateReason: effectiveDate === yesterdayStr ? yesterdayLateReason.trim() : null,

      // Finance fields
      taskType: isFinance ? financeTaskType : isOperations ? opTaskType : isMarketing ? taskType : null,
      reference: reference.trim() || null,
      partyName: partyName.trim() || null,
      attachments: isFinance ? financeAttachments : attachments || [],

      // Operations fields
      location: location.trim() || null,
      photos: photos || [],

      // Marketing fields
      campaign: isMarketing ? (campaign.trim() || null) : null,
      deliverableUrl: isMarketing ? (deliverableUrl.trim() || null) : null,
      revision: isMarketing ? 1 : null,

      // Sales links
      dealerName: selectedDealerName || (isFinance && partyName ? partyName.trim() : null),
      linkedBookingId: linkedBookingId || null,

      auditLogs: [
        {
          id: `log-${Date.now()}`,
          action: 'SELF_WORK_LOGGED',
          performedById: currentUser?.id || currentUser?.uid,
          performedByName: `${currentUser?.fullName || currentUser?.name} (${currentUser?.role})`,
          timestamp,
          details: `Self-logged today's work (${status})`
        }
      ]
    };

    try {
      const docRef = await addDoc(collection(db, 'tasks'), newTask);
      onClose();
    } catch (err) {
      console.error('Error saving self-logged task:', err);
      setErrorMessage(err.message || 'Failed to save task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#05331F] flex items-center justify-center font-bold">
                <PlusCircle className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {selectedTaskDate === yesterdayStr ? "Add Yesterday's Work" : "Add Today's Work"}
                </h2>
                <p className="text-xs text-slate-500">
                  Logging work for: <span className="font-semibold text-slate-800">{currentUser?.fullName || currentUser?.name}</span>
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs flex-1">
            
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Date Selector: Today vs Yesterday */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Logging Work For Date</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  {selectedTaskDate === todayStr ? 'Today' : 'Yesterday'} ({selectedTaskDate})
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedTaskDate(todayStr)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition min-h-[40px] cursor-pointer ${
                    selectedTaskDate === todayStr
                      ? 'bg-[#05331F] text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 ${selectedTaskDate === todayStr ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>Today ({todayStr})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTaskDate(yesterdayStr)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition min-h-[40px] cursor-pointer ${
                    selectedTaskDate === yesterdayStr
                      ? 'bg-[#05331F] text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Clock className={`w-3.5 h-3.5 ${selectedTaskDate === yesterdayStr ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>Yesterday ({yesterdayStr})</span>
                </button>
              </div>
              {selectedTaskDate === yesterdayStr && (
                <div className="space-y-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Late Yesterday Submission Reason (Mandatory) *</span>
                    </div>
                    <p className="text-[10px] text-amber-700">
                      Standard operating rule requires daily tasks to be submitted before 11:59 PM. Please state why yesterday's work was not logged on time.
                    </p>
                    <textarea
                      rows="2"
                      required
                      placeholder="Specify reason for late submission (e.g., Power cut, field travel without network, emergency maintenance)..."
                      value={yesterdayLateReason}
                      onChange={(e) => setYesterdayLateReason(e.target.value)}
                      className="w-full mt-1.5 p-2 bg-white border border-amber-300 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* FINANCE & ACCOUNTS SPECIFIC FIELDS */}
            {isFinance && (
              <div className="p-3.5 bg-emerald-50/40 rounded-2xl border border-emerald-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Finance & Accounts Activity</span>
                  </span>
                  <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                    Finance
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Task Type *</label>
                    <select
                      value={financeTaskType}
                      onChange={(e) => setFinanceTaskType(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2 bg-white text-xs font-semibold focus:outline-none focus:border-[#05331F]"
                    >
                      {FINANCE_TASK_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Reference (Optional)</label>
                    <input
                      type="text"
                      placeholder="Order, booking or invoice #"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2 bg-white text-xs focus:outline-none focus:border-[#05331F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dealer / Vendor Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Steel Traders, Falcon Hardware"
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 bg-white text-xs focus:outline-none focus:border-[#05331F]"
                  />
                </div>

                {/* Finance Attachments (Payment slips, invoices, statements) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Paperclip className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Attachments (Payment Slips, Invoices, Statements)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={financeDocInputRef}
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={handleFinanceFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isFinanceUploading}
                      onClick={() => financeDocInputRef.current && financeDocInputRef.current.click()}
                      className="px-3.5 py-2 rounded-xl border border-dashed border-[#05331F] bg-white hover:bg-emerald-50 text-[#05331F] font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[44px]"
                    >
                      {isFinanceUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>{isFinanceUploading ? 'Uploading...' : 'Upload Slip / Invoice'}</span>
                    </button>
                    <span className="text-[10px] text-slate-400">PDF or Image up to 10 MB</span>
                  </div>

                  {financeUploadError && (
                    <p className="text-rose-600 text-[11px] mt-1 font-medium">{financeUploadError}</p>
                  )}

                  {financeAttachments.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      {financeAttachments.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200">
                          <span className="truncate max-w-[240px] text-slate-800 font-medium text-[11px] flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>{f.name}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFinanceAttachment(idx)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* OPERATIONS-SPECIFIC FIELDS */}
            {isOperations && (
              <div className="p-3.5 bg-emerald-50/40 rounded-2xl border border-emerald-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Operations Specifics</span>
                  </span>
                  <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                    Operations
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Task Type</label>
                    <select
                      value={opTaskType}
                      onChange={(e) => setOpTaskType(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2 bg-white text-xs font-semibold focus:outline-none focus:border-[#05331F]"
                    >
                      {OPERATIONS_TASK_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Reference (Optional)</label>
                    <input
                      type="text"
                      placeholder="Order or Booking #"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2 bg-white text-xs focus:outline-none focus:border-[#05331F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Location (Bay / Warehouse / Dealer site)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bay 3, Central Warehouse, Calicut site"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 bg-white text-xs focus:outline-none focus:border-[#05331F]"
                  />
                </div>

                {/* Operations Photo Proof Uploader (10 MB max) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Photo Proof (Loading, Delivery, Repair - max 10 MB)</span>
                  </label>
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
                      disabled={isPhotoUploading}
                      onClick={() => photoInputRef.current && photoInputRef.current.click()}
                      className="px-3.5 py-2 rounded-xl border border-dashed border-[#05331F] bg-white hover:bg-emerald-50 text-[#05331F] font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[44px]"
                    >
                      {isPhotoUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Camera className="w-3.5 h-3.5" />
                      )}
                      <span>{isPhotoUploading ? 'Uploading...' : 'Add Photo Proof'}</span>
                    </button>
                    <span className="text-[10px] text-slate-400">Opens camera / gallery</span>
                  </div>

                  {photoError && (
                    <p className="text-rose-600 text-[11px] mt-1 font-medium">{photoError}</p>
                  )}

                  {photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2.5">
                      {photos.map((p, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white">
                          <img 
                            src={p.url} 
                            alt={p.name} 
                            onClick={() => setActivePhotoViewer(p.url)}
                            className="w-full h-20 object-cover cursor-pointer hover:opacity-90 transition"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="absolute top-1 right-1 bg-black/60 hover:bg-rose-600 text-white rounded-full p-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MARKETING-SPECIFIC FIELDS */}
            {isMarketing && (
              <div className="p-3.5 bg-emerald-50/40 rounded-2xl border border-emerald-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Marketing Deliverables</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold">Marketing</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Task Type</label>
                    <select
                      value={taskType}
                      onChange={(e) => setTaskType(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2 bg-white text-xs"
                    >
                      {MARKETING_TASK_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Campaign Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Fest 2026, Luxury Launch"
                      value={campaign}
                      onChange={(e) => setCampaign(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2 bg-white text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Task Title */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">What did you work on today? *</label>
              <input
                ref={titleInputRef}
                type="text"
                required
                placeholder={
                  isFinance 
                    ? "e.g. Reconciled Federal Bank account statement for October" 
                    : isOperations 
                    ? "e.g. Picked and staged 15 standard doors for Ernakulam dispatch" 
                    : "e.g. Completed order punch for Calicut dealer"
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 text-xs focus:outline-none focus:border-[#05331F] min-h-[44px]"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Details & Remarks</label>
              <textarea
                rows="2"
                placeholder={
                  isFinance
                    ? "Notes, UTR / cheque numbers, counterparty particulars or remarks..."
                    : "Additional notes, gate pass numbers, vehicle numbers, or specs..."
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 text-xs focus:outline-none focus:border-[#05331F]"
              />
            </div>

            {/* Status & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Current Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 text-xs font-semibold"
                >
                  <option value={TASK_STATUSES.ASSIGNED}>Pending / Planned</option>
                  <option value={TASK_STATUSES.IN_PROGRESS}>In Progress</option>
                  <option value={TASK_STATUSES.PENDING_REVIEW}>Waiting for Sign-Off</option>
                  <option value={TASK_STATUSES.COMPLETED}>Completed Today</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 text-xs font-medium"
                >
                  <option value={TASK_PRIORITIES.LOW}>Low</option>
                  <option value={TASK_PRIORITIES.MEDIUM}>Medium</option>
                  <option value={TASK_PRIORITIES.HIGH}>High</option>
                  <option value={TASK_PRIORITIES.URGENT}>Urgent</option>
                </select>
              </div>
            </div>

            {/* Footer Submit */}
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
                disabled={isSubmitting || isPhotoUploading || isUploading || isFinanceUploading}
                className="px-5 py-2.5 rounded-xl bg-[#05331F] hover:bg-[#07472B] text-white font-semibold shadow-xs transition disabled:opacity-50 min-h-[44px]"
              >
                {isSubmitting 
                  ? 'Saving...' 
                  : selectedTaskDate === yesterdayStr 
                  ? "Add Yesterday's Work" 
                  : "Add Today's Work"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Full-Screen Image Lightbox Viewer */}
      {activePhotoViewer && (
        <div 
          onClick={() => setActivePhotoViewer(null)}
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-transparent">
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
