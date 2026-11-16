import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, PlusCircle, Calendar, Clock, AlertTriangle, 
  Users, CheckCircle2, X, FileText, Send, User,
  AlertCircle, ChevronDown, Search, CheckSquare, Sparkles, Link2,
  Layers
} from 'lucide-react';
import { TASK_PRIORITIES, TASK_STATUSES } from './rbac';
import { getTodayDateString } from './dateUtils';
import { canManageTeam, isGlobalTeamManager, getAssignableEmployees, canViewAll } from './permissions';
import { COMPANY_DEPARTMENTS, getRoleLevel, normalizeRole } from './orgTree';
import { canAccessSales, canSalesAssignTo } from './salesPermissions';
import { STARK_DOOR_CATALOG } from './doorCatalog';

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
  // Executive Director and Director Operations have universal all-company assignment
  const isTopExecutive = isUniversal || ['Executive Director', 'Director Operations'].includes(currentUser?.role);
  const isGlobalManager = isTopExecutive;
  const isSales = canAccessSales(currentUser);

  // Department choice
  const [selectedDept, setSelectedDept] = useState(
    isGlobalManager ? 'all' : (currentUser?.department || 'sales')
  );

  const [assignedToIds, setAssignedToIds] = useState([]);
  const [assignEntireTeam, setAssignEntireTeam] = useState(false);

  const [title, setTitle] = useState(initialPreset?.title || '');
  const [description, setDescription] = useState(initialPreset?.description || '');
  const [priority, setPriority] = useState(initialPreset?.priority || TASK_PRIORITIES.MEDIUM);
  const [deadlineDate, setDeadlineDate] = useState(initialPreset?.deadlineDate || getTodayDateString());
  const [deadlineTime, setDeadlineTime] = useState('18:00');
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Door Order & Booking fields
  const [taskCategory, setTaskCategory] = useState(isSales ? 'stark_door_order' : 'standard');
  const [dealerName, setDealerName] = useState(initialPreset?.dealerName || '');
  const [dealerCode, setDealerCode] = useState(initialPreset?.dealerCode || '');
  const [linkedBookingId, setLinkedBookingId] = useState(initialPreset?.bookingId || '');

  // Synchronize when initialPreset changes
  useEffect(() => {
    if (initialPreset) {
      if (initialPreset.memberId) setAssignedToIds([initialPreset.memberId]);
      if (initialPreset.title) setTitle(initialPreset.title);
      if (initialPreset.description) setDescription(initialPreset.description);
      if (initialPreset.priority) setPriority(initialPreset.priority);
      if (initialPreset.deadlineDate) setDeadlineDate(initialPreset.deadlineDate);
      if (initialPreset.dealerName) setDealerName(initialPreset.dealerName);
      if (initialPreset.dealerCode) setDealerCode(initialPreset.dealerCode);
      if (initialPreset.bookingId) setLinkedBookingId(initialPreset.bookingId);
    }
  }, [initialPreset]);

  // Compute allowed assignees based on hierarchy rules
  const assignableEmployees = useMemo(() => {
    if (isGlobalManager) {
      return employees.filter(emp => {
        if (selectedDept === 'all') return true;
        const d = (emp.department || emp.departmentId || '').toLowerCase();
        return d.includes(selectedDept.toLowerCase());
      });
    }

    // Sales downline hierarchy: CSO -> SSM -> ASM -> Sales Coordinator
    if (isSales) {
      return employees.filter(emp => canSalesAssignTo(currentUser, emp, employees));
    }

    return getAssignableEmployees(currentUser, employees, selectedDept);
  }, [isGlobalManager, isSales, currentUser, employees, selectedDept]);

  // Filter assignees by search query
  const filteredEmployees = useMemo(() => {
    if (!assigneeSearch.trim()) return assignableEmployees;
    const q = assigneeSearch.toLowerCase();
    return assignableEmployees.filter(emp => 
      (emp.fullName || emp.name || '').toLowerCase().includes(q) ||
      (emp.designation || '').toLowerCase().includes(q) ||
      (emp.department || '').toLowerCase().includes(q)
    );
  }, [assignableEmployees, assigneeSearch]);

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
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!title.trim()) {
      setValidationError('Task Title is required.');
      return;
    }

    if (assignedToIds.length === 0) {
      setValidationError('Please select at least one assignee for this task.');
      return;
    }

    setIsSubmitting(true);
    const todayStr = getTodayDateString();
    const timestamp = new Date().toISOString();

    try {
      for (const empId of assignedToIds) {
        const targetEmp = employees.find(e => (e.id || e.uid) === empId);
        const empName = targetEmp?.fullName || targetEmp?.name || 'Staff Member';
        const empDept = targetEmp?.department || selectedDept || 'sales';

        const newTask = {
          title: title.trim(),
          description: description.trim(),
          priority,
          status: TASK_STATUSES.PENDING,
          progressPercentage: 0,
          deadlineDate,
          deadlineTime,
          taskDate: deadlineDate || todayStr,
          createdAt: timestamp,
          lastUpdated: timestamp,
          
          assignedToId: empId,
          assignedTo: empId,
          assignedToName: empName,
          department: empDept,
          departmentName: empDept,

          assignedById: currentUser.id || currentUser.uid,
          assignedByName: currentUser.fullName || currentUser.name,
          assignedByRole: currentUser.role,

          category: taskCategory,
          taskCategory,
          dealerName: dealerName || null,
          dealerCode: dealerCode || null,
          linkedBookingId: linkedBookingId || null,

          // Task chain support
          parentTaskId: initialPreset?.parentTaskId || null,
          chainPath: initialPreset?.chainPath || null,

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

        if (onTaskCreated) {
          await onTaskCreated(newTask);
        }
      }

      onClose();
    } catch (err) {
      console.error('Failed to create tasks:', err);
      setValidationError('Failed to assign tasks. Please try again.');
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
              <h2 className="text-base font-bold text-slate-900">Assign Downline Task</h2>
              <p className="text-xs text-slate-500">
                Authorized for: <span className="font-semibold text-slate-800">{currentUser?.role}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
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

          {/* Quick Sales Delegation Templates */}
          {isSales && (
            <div>
              <label className="font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Quick Sales Templates</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {SALES_DELEGATION_TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyQuickTemplate(tpl)}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 text-left transition"
                  >
                    <p className="font-semibold text-slate-800 text-[11px] truncate">{tpl.title}</p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{tpl.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Department Picker (For Universal / Leadership roles) */}
          {isGlobalManager && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Department</label>
              <select
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setAssignedToIds([]);
                }}
                className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-medium text-slate-800 focus:outline-none focus:border-[#05331F]"
              >
                <option value="all">All Departments</option>
                {COMPANY_DEPARTMENTS.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Assignee Selector (Grouped Downline Picker) */}
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
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:border-[#05331F]"
              />
            </div>

            <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 divide-y divide-slate-100 bg-white">
              {filteredEmployees.length === 0 ? (
                <p className="text-center text-slate-400 py-3 text-[11px]">No downline staff members available</p>
              ) : (
                filteredEmployees.map(emp => {
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
                })
              )}
            </div>
          </div>

          {/* Task Title */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Task Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Verify dealer KYC & credit balance for Kozhikode"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:outline-none focus:border-[#05331F]"
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Execution Instructions</label>
            <textarea
              rows="2"
              placeholder="Provide concrete SOP guidelines or dealer delivery requirements..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:outline-none focus:border-[#05331F]"
            />
          </div>

          {/* Priority & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <option value={TASK_PRIORITIES.CRITICAL}>Critical</option>
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

          {/* Optional Dealer & Booking Link */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Link to Dealer, Door Model or Booking (Optional)</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Dealer Name / Code"
                value={dealerName}
                onChange={(e) => setDealerName(e.target.value)}
                className="border border-slate-200 rounded-lg p-2 bg-white text-xs"
              />
              <select
                value={description.includes('Door Model:') ? '' : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setDescription(prev => prev ? `${prev}\nDoor Model: ${e.target.value}` : `Door Model: ${e.target.value}`);
                  }
                }}
                className="border border-slate-200 rounded-lg p-2 bg-white text-xs text-slate-700"
              >
                <option value="">-- Add Door Model --</option>
                <optgroup label="Standard Series">
                  {STARK_DOOR_CATALOG.filter(d => d.category === 'Standard Series').map(item => (
                    <option key={item.model} value={item.model}>{item.model}</option>
                  ))}
                </optgroup>
                <optgroup label="Luxury Series">
                  {STARK_DOOR_CATALOG.filter(d => d.category === 'Luxury Series').map(item => (
                    <option key={item.model} value={item.model}>{item.model}</option>
                  ))}
                </optgroup>
              </select>
              <input
                type="text"
                placeholder="Booking ID (e.g. bk-101)"
                value={linkedBookingId}
                onChange={(e) => setLinkedBookingId(e.target.value)}
                className="border border-slate-200 rounded-lg p-2 bg-white text-xs"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472B] text-white font-semibold shadow-xs transition"
            >
              {isSubmitting ? 'Assigning...' : `Confirm Assignment (${assignedToIds.length})`}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
