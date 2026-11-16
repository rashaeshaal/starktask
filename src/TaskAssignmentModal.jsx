import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Building2, PlusCircle, Calendar, Clock, AlertTriangle, 
  Users, CheckCircle2, X, FileText, Send, User,
  AlertCircle, ChevronDown, Search, CheckSquare, Sparkles, Link2,
  Layers, Upload, Paperclip, Loader2, Megaphone, Truck, Wrench, Package, Camera, MapPin
} from 'lucide-react';
import { TASK_PRIORITIES, TASK_STATUSES } from './rbac';
import { getTodayDateString } from './dateUtils';
import { canManageTeam, isGlobalTeamManager, getAssignableEmployees, canViewAll } from './permissions';
import { COMPANY_DEPARTMENTS, getRoleLevel, normalizeRole } from './orgTree';
import { canAccessSales, canSalesAssignTo } from './salesPermissions';
import { STARK_DOOR_CATALOG } from './doorCatalog';
import { uploadTaskAttachment } from './firestoreService';

const SALES_DELEGATION_TEMPLATES = [
  {
    title: 'Punch Door Booking into System',
    description: 'Verify dimensions, finish, and lock specifications from dealer order slip, then punch into ERP booking module.',
    priority: TASK_PRIORITIES.HIGH
  },
  {
    title: 'Dealer KYC & Showroom Documentation',
    description: 'Collect GST certificate, showroom exterior/interior photos, and owner PAN card for dealer directory record.',
    priority: TASK_PRIORITIES.MEDIUM
  },
  {
    title: 'Advance Payment Token Clearance Follow-Up',
    description: 'Contact dealer finance desk to collect advance payment slip / UTR transaction reference before loading.',
    priority: TASK_PRIORITIES.HIGH
  },
  {
    title: 'Customer Delivery Handover Follow-Up',
    description: 'Follow up with logistics driver and dealer warehouse receiving team to verify damage-free unloading and sign POD.',
    priority: TASK_PRIORITIES.MEDIUM
  }
];

const MARKETING_DELEGATION_TEMPLATES = [
  {
    title: 'Design a creative',
    taskType: 'Design',
    description: 'Create social media banner & flyer graphics for new door models according to Stark brand green identity guidelines.',
    priority: TASK_PRIORITIES.HIGH
  },
  {
    title: 'Shoot product photos',
    taskType: 'Photo/Video shoot',
    description: 'Capture high-res studio and installed photos of newly released steel door series highlighting lock and finish details.',
    priority: TASK_PRIORITIES.MEDIUM
  },
  {
    title: 'Edit video',
    taskType: 'Photo/Video shoot',
    description: 'Edit factory manufacturing & fire-resistance testing reel for Instagram and YouTube Shorts.',
    priority: TASK_PRIORITIES.MEDIUM
  },
  {
    title: 'Schedule social post',
    taskType: 'Social post',
    description: 'Draft copy, tag dealer network, and schedule Facebook & Instagram showcase post for the weekend campaign.',
    priority: TASK_PRIORITIES.LOW
  },
  {
    title: 'Follow up on leads',
    taskType: 'Lead follow-up',
    description: 'Qualify and follow up on incoming architectural and builder leads from the website campaign inquiry forms.',
    priority: TASK_PRIORITIES.HIGH
  }
];

const FINANCE_DELEGATION_TEMPLATES = [
  {
    title: 'Verify payment token',
    taskType: 'Payment verification',
    description: 'Verify advance payment token/credit clearance against bank statement or payment slip.',
    priority: TASK_PRIORITIES.HIGH
  },
  {
    title: 'Reconcile bank statement',
    taskType: 'Reconciliation',
    description: 'Reconcile daily bank ledger receipts with pending sales orders and bank credits.',
    priority: TASK_PRIORITIES.HIGH
  },
  {
    title: 'Follow up dealer payment',
    taskType: 'Collection follow-up',
    description: 'Contact dealer accounts desk for outstanding payment collection on completed door dispatches.',
    priority: TASK_PRIORITIES.MEDIUM
  },
  {
    title: 'Prepare invoice',
    taskType: 'Invoice',
    description: 'Generate and verify tax invoice for dispatched door consignments.',
    priority: TASK_PRIORITIES.MEDIUM
  },
  {
    title: 'Month-end report',
    taskType: 'Reporting',
    description: 'Consolidate month-end finance reconciliation and clearance summary for management review.',
    priority: TASK_PRIORITIES.MEDIUM
  }
];

const OPERATIONS_BRANCH_TEMPLATES = {
  warehouse: [
    { title: 'Pick doors for order', taskType: 'Picking', description: 'Retrieve required door models, sizes, and lock pre-sets from racks and inspect packaging.', priority: TASK_PRIORITIES.HIGH },
    { title: 'Stage for loading', taskType: 'Loading', description: 'Move checked doors to staging lane at Dispatch Bay. Verify count against dispatch sheet.', priority: TASK_PRIORITIES.HIGH },
    { title: 'Load vehicle', taskType: 'Loading', description: 'Safely stack doors onto transport vehicle with protective foams and strapping.', priority: TASK_PRIORITIES.URGENT }
  ],
  transport: [
    { title: 'Dispatch vehicle', taskType: 'Dispatch', description: 'Hand over gate pass, bill of lading and vehicle trip sheet for immediate departure.', priority: TASK_PRIORITIES.HIGH },
    { title: 'Deliver to dealer', taskType: 'Delivery', description: 'Unload doors at destination showroom/godown, verify damage-free arrival and collect signed POD.', priority: TASK_PRIORITIES.HIGH },
    { title: 'Return empty vehicle', taskType: 'Other', description: 'Vehicle transit return to factory yard after delivery completion with signed documents.', priority: TASK_PRIORITIES.LOW }
  ],
  service: [
    { title: 'Site visit', taskType: 'Service call', description: 'Visit customer residence or site to inspect frame dimensions and lock fitting feasibility.', priority: TASK_PRIORITIES.MEDIUM },
    { title: 'Repair door', taskType: 'Service call', description: 'Inspect reported hinge misalignment, lock cylinder issue or surface scuff. Perform on-site fix.', priority: TASK_PRIORITIES.HIGH },
    { title: 'Installation check', taskType: 'Service call', description: 'Verify proper plumb, level, anchor bolt torque and smooth latch engagement post-installation.', priority: TASK_PRIORITIES.MEDIUM }
  ],
  inventory: [
    { title: 'Stock count', taskType: 'Stock check', description: 'Cycle count physical steel door inventory in warehouse and reconcile against master sheet.', priority: TASK_PRIORITIES.MEDIUM },
    { title: 'Receive material', taskType: 'Other', description: 'Unload raw sheet metal or hardware accessory consignments, inspect against packing list.', priority: TASK_PRIORITIES.HIGH },
    { title: 'Reorder check', taskType: 'Stock check', description: 'Review minimum threshold levels for high-runner finishes (Walnut, Teak) and trigger PO.', priority: TASK_PRIORITIES.MEDIUM }
  ]
};

const OPERATIONS_BRANCHES = [
  { id: 'warehouse', name: 'Warehouse', headRole: 'Warehouse In-charge', managerEmail: 'suhaib@starkdoors.com' },
  { id: 'transportation', name: 'Transportation', headRole: 'Transport Manager', managerEmail: 'nayan.ram@starkdoors.com' },
  { id: 'service', name: 'Service', headRole: 'Service Manager', managerEmail: 'amal.kumar@starkdoors.com' },
  { id: 'inventory', name: 'Inventory', headRole: 'Inventory Supervisor', managerEmail: 'tobin@starkdoors.com' }
];

export default function TaskAssignmentModal({ 
  isOpen, 
  onClose, 
  currentUser, 
  departments = [], 
  employees = [], 
  teams = [],
  teamMembers = [],
  initialPreset = null,
  onTaskCreated 
}) {
  const isUniversal = canViewAll(currentUser);
  const isGlobalManager = isUniversal || ['Executive Director', 'Director Operations', 'General Manager'].includes(currentUser?.role);
  const isSales = canAccessSales(currentUser);

  const userRole = currentUser?.role || '';
  const userDept = (currentUser?.department || '').toLowerCase();

  // Operations checks
  const isOperationsHead = userRole === 'Operations Head';
  const isWarehouseInCharge = userRole === 'Warehouse In-charge';
  const isWarehouseSupervisor = userRole === 'Warehouse Supervisor';
  const isTransportManager = userRole === 'Transport Manager';
  const isTransportCoordinator = userRole === 'Transport Coordinator';
  const isServiceManager = userRole === 'Service Manager';
  const isServiceCoordinator = userRole === 'Service Coordinator';
  const isInventorySupervisor = userRole === 'Inventory Supervisor';

  const isOperationsRole = isOperationsHead || isWarehouseInCharge || isWarehouseSupervisor || 
                           isTransportManager || isTransportCoordinator || isServiceManager || 
                           isServiceCoordinator || isInventorySupervisor;

  const isOperationsBranchManager = isWarehouseInCharge || isTransportManager || isServiceManager || isInventorySupervisor;

  // Frontline roles & Operations Assistant & Accountants have NO assignment authority
  const normRole = normalizeRole(userRole);
  const isFrontlineOrAssistant = ['Loading Staff', 'Driver', 'Delivery Partner', 'Technician', 
                                  'Service Technician', 'Storekeeper', 'Operations Assistant',
                                  'Graphic Designer', 'Photographer', 'Sales Coordinator',
                                  'Accountant', 'Junior Accountant'].includes(userRole) ||
                                 normRole === 'Accountant';

  // Finance checks
  const isFinanceRole = userDept === 'finance' || userDept === 'accounts' ||
                        ['Accounts Manager', 'Accounts Executive', 'Accountant', 'Junior Accountant'].includes(userRole);
  const isAccountsManager = normRole === 'Accounts Manager';

  // Marketing checks
  const isMarketingRole = userDept === 'marketing' || ['Brand Manager', 'Leads Coordinator', 'Graphic Designer', 'Photographer'].includes(userRole);
  const isBrandManager = userRole === 'Brand Manager';

  // Assignment Modes:
  // - "assign" (standard downline assignment)
  // - "request_branch" (cross-branch request to another Operations branch)
  // - "request_marketing" (cross-department request to Marketing)
  const [assignmentMode, setAssignmentMode] = useState('assign');

  // Fields
  const [selectedDept, setSelectedDept] = useState(
    initialPreset?.department || (isSales ? 'sales' : isFinanceRole ? 'finance' : isMarketingRole ? 'marketing' : 'operations')
  );
  const [assignedToIds, setAssignedToIds] = useState(
    initialPreset?.assignedToId ? [initialPreset.assignedToId] : []
  );
  const [title, setTitle] = useState(initialPreset?.title || '');
  const [description, setDescription] = useState(initialPreset?.description || '');
  const [priority, setPriority] = useState(initialPreset?.priority || TASK_PRIORITIES.MEDIUM);
  const [deadlineDate, setDeadlineDate] = useState(initialPreset?.deadlineDate || getTodayDateString());
  const [deadlineTime, setDeadlineTime] = useState(initialPreset?.deadlineTime || '18:00');
  const [taskCategory, setTaskCategory] = useState(initialPreset?.category || 'General Operational Task');
  
  // Operations Specific Fields
  const [opTaskType, setOpTaskType] = useState('Picking');
  const [reference, setReference] = useState(initialPreset?.reference || '');
  const [location, setLocation] = useState(initialPreset?.location || '');
  const [photos, setPhotos] = useState([]);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const photoInputRef = useRef(null);

  // Cross-Branch Request Target
  const [targetBranchId, setTargetBranchId] = useState('warehouse');

  // Marketing Specific Fields
  const [marketingTaskType, setMarketingTaskType] = useState('Design');
  const [campaignName, setCampaignName] = useState('');
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [revisionLimit, setRevisionLimit] = useState('');
  const [attachments, setAttachments] = useState([]);

  // Cross-dept Marketing Request
  const [marketingRequestType, setMarketingRequestType] = useState('Design');

  // Sales links
  const [dealerName, setDealerName] = useState('');
  const [dealerCode, setDealerCode] = useState('');
  const [linkedBookingId, setLinkedBookingId] = useState('');

  // UI state
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [assignEntireTeam, setAssignEntireTeam] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Find Brand Manager for marketing requests
  const brandManagerEmp = useMemo(() => {
    return employees.find(e => (e.role || '').toLowerCase().includes('brand manager'));
  }, [employees]);

  // Sync initial preset
  useEffect(() => {
    if (initialPreset) {
      if (initialPreset.title) setTitle(initialPreset.title);
      if (initialPreset.description) setDescription(initialPreset.description);
      if (initialPreset.assignedToId) setAssignedToIds([initialPreset.assignedToId]);
      if (initialPreset.priority) setPriority(initialPreset.priority);
      if (initialPreset.department) setSelectedDept(initialPreset.department);
      if (initialPreset.reference) setReference(initialPreset.reference);
      if (initialPreset.location) setLocation(initialPreset.location);
    }
  }, [initialPreset]);

  // Assignable employees based strictly on downline rules:
  // - Operations Head: can assign to anyone in Operations
  // - Warehouse In-charge: Warehouse Supervisor, Loading Staff
  // - Warehouse Supervisor: Loading Staff
  // - Transport Manager: Transport Coordinator, Drivers
  // - Transport Coordinator: Drivers
  // - Service Manager: Service Coordinator, Technicians
  // - Service Coordinator: Technicians
  // - Inventory Supervisor: Storekeeper
  const assignableEmployees = useMemo(() => {
    if (!currentUser || isFrontlineOrAssistant) return [];

    // Operations downline enforcement
    if (isOperationsRole) {
      return getAssignableEmployees(currentUser, employees, selectedDept);
    }

    if (isMarketingRole) {
      return getAssignableEmployees(currentUser, employees, 'marketing');
    }

    if (isGlobalManager) {
      if (selectedDept === 'all') return employees;
      return employees.filter(e => {
        const dept = (e.department || '').toLowerCase();
        return dept.includes(selectedDept.toLowerCase());
      });
    }

    if (isSales) {
      return employees.filter(emp => canSalesAssignTo(currentUser, emp, employees));
    }

    return getAssignableEmployees(currentUser, employees, selectedDept);
  }, [currentUser, isFrontlineOrAssistant, isOperationsRole, isMarketingRole, isGlobalManager, isSales, employees, selectedDept]);

  // Filter assignees by search query and group by role
  const filteredEmployees = useMemo(() => {
    if (!assigneeSearch.trim()) return assignableEmployees;
    const q = assigneeSearch.toLowerCase();
    return assignableEmployees.filter(emp => 
      (emp.fullName || emp.name || '').toLowerCase().includes(q) ||
      (emp.designation || emp.role || '').toLowerCase().includes(q) ||
      (emp.department || '').toLowerCase().includes(q)
    );
  }, [assignableEmployees, assigneeSearch]);

  const groupedEmployees = useMemo(() => {
    const groups = {};
    for (const emp of filteredEmployees) {
      const r = emp.role || emp.designation || 'Staff';
      if (!groups[r]) groups[r] = [];
      groups[r].push(emp);
    }
    return groups;
  }, [filteredEmployees]);

  const toggleAssignee = (empId) => {
    setAssignEntireTeam(false);
    setAssignedToIds(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const toggleSelectAll = () => {
    if (assignEntireTeam) {
      setAssignEntireTeam(false);
      setAssignedToIds([]);
    } else {
      setAssignEntireTeam(true);
      setAssignedToIds(filteredEmployees.map(e => e.id || e.uid));
    }
  };

  const applyQuickTemplate = (template) => {
    setTitle(template.title);
    setDescription(template.description);
    setPriority(template.priority);
    if (template.taskType) {
      setOpTaskType(template.taskType);
    }
  };

  // Operations photo proof upload
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
          throw new Error(`Photo ${file.name} exceeds the 10 MB limit.`);
        }
        const uploaded = await uploadTaskAttachment(file, 'operations_photos');
        uploadedPhotos.push(uploaded);
      }
      setPhotos(prev => [...prev, ...uploadedPhotos]);
    } catch (err) {
      console.error('Photo upload error:', err);
      setPhotoError(err.message || 'Failed to upload photo. Max 10 MB.');
    } finally {
      setIsPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!title.trim()) {
      setValidationError('Task Title is required.');
      return;
    }

    // MODE 1: Request from another Operations Branch
    if (assignmentMode === 'request_branch') {
      const branchMeta = OPERATIONS_BRANCHES.find(b => b.id === targetBranchId);
      const branchManager = employees.find(e => (e.role || '').toLowerCase().includes(branchMeta?.headRole?.toLowerCase()));

      if (!branchManager) {
        setValidationError(`Branch manager for ${branchMeta?.name} not found.`);
        return;
      }

      setIsSubmitting(true);
      const todayStr = getTodayDateString();
      const timestamp = new Date().toISOString();

      try {
        const mgrId = branchManager.id || branchManager.uid;
        const mgrName = branchManager.fullName || branchManager.name;

        const branchTask = {
          title: `[Branch Request from ${currentUser.role}] ${title.trim()}`,
          description: description.trim(),
          priority,
          status: TASK_STATUSES.ASSIGNED,
          progressPercentage: 0,
          deadlineDate,
          deadlineTime,
          taskDate: deadlineDate || todayStr,
          createdAt: timestamp,
          lastUpdated: timestamp,

          assignedToId: mgrId,
          assignedTo: mgrId,
          assignedToName: mgrName,
          department: targetBranchId,
          departmentId: targetBranchId,

          isBranchRequest: true,
          requestedByBranch: currentUser.department || 'Operations',
          requestedBy: {
            id: currentUser.id || currentUser.uid,
            name: currentUser.fullName || currentUser.name,
            role: currentUser.role,
            department: currentUser.department || 'Operations'
          },

          taskType: opTaskType,
          reference: reference.trim() || null,
          location: location.trim() || null,
          photos: photos || [],

          assignedById: currentUser.id || currentUser.uid,
          assignedByName: currentUser.fullName || currentUser.name,
          assignedByRole: currentUser.role,

          auditLogs: [
            {
              id: `log-${Date.now()}`,
              action: 'BRANCH_REQUEST_CREATED',
              performedById: currentUser.id || currentUser.uid,
              performedByName: `${currentUser.fullName || currentUser.name} (${currentUser.role})`,
              timestamp,
              details: `Cross-branch task requested for ${branchMeta?.name} manager`
            }
          ]
        };

        if (onTaskCreated) await onTaskCreated(branchTask);
        onClose();
      } catch (err) {
        console.error('Failed to create branch request:', err);
        setValidationError('Failed to submit request to branch.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // MODE 2: Request from Marketing
    if (assignmentMode === 'request_marketing') {
      if (!brandManagerEmp) {
        setValidationError('Brand Manager not found in directory.');
        return;
      }

      setIsSubmitting(true);
      const todayStr = getTodayDateString();
      const timestamp = new Date().toISOString();

      try {
        const bmId = brandManagerEmp.id || brandManagerEmp.uid;
        const bmName = brandManagerEmp.fullName || brandManagerEmp.name;

        const reqTask = {
          title: `[Marketing Request] ${title.trim()}`,
          description: description.trim(),
          priority,
          status: TASK_STATUSES.ASSIGNED,
          progressPercentage: 0,
          deadlineDate,
          deadlineTime,
          taskDate: deadlineDate || todayStr,
          createdAt: timestamp,
          lastUpdated: timestamp,

          assignedToId: bmId,
          assignedTo: bmId,
          assignedToName: bmName,
          department: 'marketing',
          departmentId: 'marketing',

          isMarketingRequest: true,
          requestedBy: {
            id: currentUser.id || currentUser.uid,
            name: currentUser.fullName || currentUser.name,
            role: currentUser.role,
            department: currentUser.department || 'Operations'
          },
          requestType: marketingRequestType,
          taskType: marketingRequestType,
          photos: photos || [],

          assignedById: currentUser.id || currentUser.uid,
          assignedByName: currentUser.fullName || currentUser.name,
          assignedByRole: currentUser.role,

          auditLogs: [
            {
              id: `log-${Date.now()}`,
              action: 'MARKETING_REQUEST_SUBMITTED',
              performedById: currentUser.id || currentUser.uid,
              performedByName: `${currentUser.fullName || currentUser.name} (${currentUser.role})`,
              timestamp,
              details: `Cross-department Marketing request created`
            }
          ]
        };

        if (onTaskCreated) await onTaskCreated(reqTask);
        onClose();
      } catch (err) {
        console.error('Failed to submit marketing request:', err);
        setValidationError('Failed to submit marketing request.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // MODE 3: Standard Downline Assignment
    if (assignedToIds.length === 0) {
      setValidationError('Please select at least one downline assignee.');
      return;
    }

    setIsSubmitting(true);
    const todayStr = getTodayDateString();
    const timestamp = new Date().toISOString();

    try {
      for (const empId of assignedToIds) {
        const targetEmp = employees.find(e => (e.id || e.uid) === empId);
        const empName = targetEmp?.fullName || targetEmp?.name || 'Staff Member';
        const empDept = targetEmp?.department || selectedDept || 'operations';

        const newTask = {
          title: title.trim(),
          description: description.trim(),
          priority,
          status: TASK_STATUSES.ASSIGNED,
          progressPercentage: 0,
          deadlineDate,
          deadlineTime,
          taskDate: deadlineDate || todayStr,
          createdAt: timestamp,
          lastUpdated: timestamp,
          
          assignedToId: empId,
          assignedTo: empId,
          assignedToName: empName,
          assignedToRole: targetEmp?.role || targetEmp?.designation || 'Staff',
          department: empDept,
          departmentId: empDept,

          assignedById: currentUser.id || currentUser.uid,
          assignedByName: currentUser.fullName || currentUser.name,
          assignedByRole: currentUser.role,

          // Task fields
          taskType: isOperationsRole ? opTaskType : isFinanceRole ? (initialPreset?.taskType || 'Payment verification') : null,
          reference: reference.trim() || null,
          partyName: initialPreset?.partyName || null,
          location: location.trim() || null,
          photos: photos || [],

          // Subtask / Chain support
          parentTaskId: initialPreset?.parentTaskId || null,

          auditLogs: [
            {
              id: `log-${Date.now()}-${empId}`,
              action: 'TASK_CREATED',
              performedById: currentUser.id || currentUser.uid,
              performedByName: `${currentUser.fullName || currentUser.name} (${currentUser.role})`,
              timestamp,
              details: `Task assigned to ${empName}`
            }
          ]
        };

        if (onTaskCreated) await onTaskCreated(newTask);
      }

      onClose();
    } catch (err) {
      console.error('Failed to create tasks:', err);
      setValidationError('Failed to assign tasks.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#05331F] flex items-center justify-center font-bold">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {assignmentMode === 'request_branch' 
                  ? 'Request from Branch' 
                  : assignmentMode === 'request_marketing' 
                  ? 'Request from Marketing' 
                  : 'Assign Downline Task'}
              </h2>
              <p className="text-xs text-slate-500">
                Authorized for: <span className="font-semibold text-slate-800">{currentUser?.fullName || currentUser?.name}</span> ({currentUser?.role})
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

        {/* Mode Selector Pill Toggle */}
        <div className="px-5 pt-3 pb-1 border-b border-slate-100 bg-slate-50/50 flex gap-2 overflow-x-auto">
          {!isFrontlineOrAssistant && (
            <button
              type="button"
              onClick={() => setAssignmentMode('assign')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                assignmentMode === 'assign'
                  ? 'bg-[#05331F] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Assign to Downline</span>
            </button>
          )}

          {isOperationsBranchManager && (
            <button
              type="button"
              onClick={() => setAssignmentMode('request_branch')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                assignmentMode === 'request_branch'
                  ? 'bg-[#05331F] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Request from Branch</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setAssignmentMode('request_marketing')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              assignmentMode === 'request_marketing'
                ? 'bg-[#05331F] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Request from Marketing</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* MODE: REQUEST FROM BRANCH */}
          {assignmentMode === 'request_branch' && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Truck className="w-4 h-4 text-emerald-700" />
                <span>Select Target Operations Branch</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Direct cross-branch assignment is restricted. Sending a request creates a prioritized task for the selected branch manager.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {OPERATIONS_BRANCHES.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setTargetBranchId(b.id)}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      targetBranchId === b.id
                        ? 'border-[#05331F] bg-emerald-50 text-[#05331F] font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs">{b.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{b.headRole}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* MODE: STANDARD DOWNLINE ASSIGNMENT */}
          {assignmentMode === 'assign' && (
            <>
              {/* Finance Quick Templates */}
              {isFinanceRole && isAccountsManager && (
                <div>
                  <label className="font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Quick Finance Templates</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {FINANCE_DELEGATION_TEMPLATES.map((tpl, i) => (
                      <button
                        key={`fin-${i}`}
                        type="button"
                        onClick={() => applyQuickTemplate(tpl)}
                        className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 text-left transition"
                      >
                        <p className="font-semibold text-slate-800 text-[11px] truncate">{tpl.title}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{tpl.taskType}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Branch Quick Templates */}
              {isOperationsRole && (
                <div>
                  <label className="font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Quick Operations Templates</span>
                  </label>
                  
                  {/* Select templates according to branch */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {(isWarehouseInCharge || isWarehouseSupervisor || isOperationsHead) && OPERATIONS_BRANCH_TEMPLATES.warehouse.map((tpl, i) => (
                      <button
                        key={`wh-${i}`}
                        type="button"
                        onClick={() => applyQuickTemplate(tpl)}
                        className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 text-left transition"
                      >
                        <p className="font-semibold text-slate-800 text-[11px] truncate">{tpl.title}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">Warehouse</p>
                      </button>
                    ))}

                    {(isTransportManager || isTransportCoordinator || isOperationsHead) && OPERATIONS_BRANCH_TEMPLATES.transport.map((tpl, i) => (
                      <button
                        key={`tr-${i}`}
                        type="button"
                        onClick={() => applyQuickTemplate(tpl)}
                        className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 text-left transition"
                      >
                        <p className="font-semibold text-slate-800 text-[11px] truncate">{tpl.title}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">Transport</p>
                      </button>
                    ))}

                    {(isServiceManager || isServiceCoordinator || isOperationsHead) && OPERATIONS_BRANCH_TEMPLATES.service.map((tpl, i) => (
                      <button
                        key={`srv-${i}`}
                        type="button"
                        onClick={() => applyQuickTemplate(tpl)}
                        className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 text-left transition"
                      >
                        <p className="font-semibold text-slate-800 text-[11px] truncate">{tpl.title}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">Service</p>
                      </button>
                    ))}

                    {(isInventorySupervisor || isOperationsHead) && OPERATIONS_BRANCH_TEMPLATES.inventory.map((tpl, i) => (
                      <button
                        key={`inv-${i}`}
                        type="button"
                        onClick={() => applyQuickTemplate(tpl)}
                        className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 text-left transition"
                      >
                        <p className="font-semibold text-slate-800 text-[11px] truncate">{tpl.title}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">Inventory</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Downline Assignee Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    Downline Assignee(s) ({assignedToIds.length} selected)
                  </label>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-[11px] font-semibold text-[#05331F] hover:underline"
                  >
                    {assignEntireTeam ? 'Deselect All' : 'Select All Downline'}
                  </button>
                </div>

                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search personnel in your authorized downline..."
                    value={assigneeSearch}
                    onChange={(e) => setAssigneeSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:border-[#05331F]"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-2 bg-white">
                  {Object.keys(groupedEmployees).length === 0 ? (
                    <p className="text-center text-slate-400 py-3 text-[11px]">No downline staff members available</p>
                  ) : (
                    Object.entries(groupedEmployees).map(([roleGroup, emps]) => (
                      <div key={roleGroup} className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-1">
                          {roleGroup}
                        </div>
                        {emps.map(emp => {
                          const empId = emp.id || emp.uid;
                          const isSelected = assignedToIds.includes(empId);

                          return (
                            <div
                              key={empId}
                              onClick={() => toggleAssignee(empId)}
                              className={`pt-1.5 pb-1 px-2 rounded-lg cursor-pointer flex items-center justify-between transition ${
                                isSelected ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div>
                                <p className="text-xs">{emp.fullName || emp.name}</p>
                                <p className="text-[10px] text-slate-400">{emp.designation || emp.role} {' \u00B7 '} {emp.department}</p>
                              </div>
                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                isSelected ? 'bg-[#05331F] border-[#05331F] text-white' : 'border-slate-300'
                              }`}>
                                {isSelected && <CheckSquare className="w-3 h-3" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {/* Operations Fields */}
          {(isOperationsRole || assignmentMode === 'request_branch') && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Task Type</label>
                  <select
                    value={opTaskType}
                    onChange={(e) => setOpTaskType(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 bg-white text-xs font-medium"
                  >
                    <option value="Picking">Picking</option>
                    <option value="Loading">Loading</option>
                    <option value="Dispatch">Dispatch</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Service call">Service call</option>
                    <option value="Stock check">Stock check</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Order / Booking Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. BK-2026-902"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2 bg-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g. Loading Bay 2, Calicut Showroom, Kannur warehouse"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2 bg-white text-xs"
                />
              </div>

              {/* Photo Proof attachments */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reference Photos / Proof (Max 10 MB images)
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
                    className="px-3.5 py-2 rounded-xl border border-dashed border-emerald-600 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[44px]"
                  >
                    {isPhotoUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                    <span>{isPhotoUploading ? 'Uploading...' : 'Attach Photos'}</span>
                  </button>
                  <span className="text-[10px] text-slate-400">Loading / repair proof</span>
                </div>

                {photoError && <p className="text-rose-600 text-[11px] mt-1 font-medium">{photoError}</p>}

                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {photos.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-xs">
                        <FileText className="w-3 h-3 text-emerald-700" />
                        <span className="truncate max-w-[120px] font-medium">{p.name}</span>
                        <button type="button" onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-rose-600 ml-1">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Task Title */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Task Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Stage 15 luxury doors for Ernakulam transport"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:outline-none focus:border-[#05331F] min-h-[44px]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Instructions / Specific Guidelines</label>
            <textarea
              rows="2"
              placeholder="Specify door models, safety packing, loading sequence or recipient contact..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:outline-none focus:border-[#05331F]"
            />
          </div>

          {/* Priority & Deadline */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-medium"
              >
                <option value={TASK_PRIORITIES.LOW}>Low</option>
                <option value={TASK_PRIORITIES.MEDIUM}>Medium</option>
                <option value={TASK_PRIORITIES.HIGH}>High</option>
                <option value={TASK_PRIORITIES.URGENT}>Urgent</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Deadline Date</label>
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50"
              />
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
              disabled={isSubmitting || isPhotoUploading}
              className="px-5 py-2.5 rounded-xl bg-[#05331F] hover:bg-[#07472B] text-white font-semibold shadow-xs transition disabled:opacity-50 min-h-[44px]"
            >
              {isSubmitting 
                ? 'Assigning...' 
                : assignmentMode === 'request_branch' 
                ? 'Send Request to Branch' 
                : assignmentMode === 'request_marketing' 
                ? 'Send Request to Brand Manager' 
                : `Confirm Assignment (${assignedToIds.length})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
