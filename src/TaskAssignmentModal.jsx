import React, { useState } from 'react';
import { 
  Building2, PlusCircle, Calendar, Clock, AlertTriangle, 
  Users, CheckCircle2, X, FileText, Paperclip, RefreshCw, Send,
  ShieldCheck, AlertCircle, MapPin, Hash, Phone, User, GitFork, UserCheck
} from 'lucide-react';
import { canAssignTask } from './orgStructure';
import { TASK_PRIORITIES, RECURRING_TYPES, TASK_STATUSES } from './rbac';
import { getTodayDateString } from './dateUtils';
import { MANDATORY_ORDER_FIELDS } from './sopRules';
import { STARK_DEALER_DIRECTORY, SALES_STAFF_ASSIGNMENTS } from './dealerDirectory';

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
  const [assignmentScope, setAssignmentScope] = useState(initialPreset ? 'team_member' : 'individual'); // 'individual' | 'team' | 'team_member'
  const [selectedTeamId, setSelectedTeamId] = useState(initialPreset?.teamId || '');
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState(initialPreset?.memberId || '');

  // Synchronize when initialPreset changes
  React.useEffect(() => {
    if (initialPreset) {
      if (initialPreset.teamId || initialPreset.memberId) {
        setAssignmentScope('team_member');
        if (initialPreset.teamId) setSelectedTeamId(initialPreset.teamId);
        if (initialPreset.memberId) setSelectedTeamMemberId(initialPreset.memberId);
      }
      if (initialPreset.title) setTitle(initialPreset.title);
      if (initialPreset.description) setDescription(initialPreset.description);
      if (initialPreset.priority) setPriority(initialPreset.priority);
      if (initialPreset.deadlineDate) setDeadlineDate(initialPreset.deadlineDate);
      if (initialPreset.dealerName) {
        setDealerName(initialPreset.dealerName);
        if (initialPreset.dealerCode) setDealerCode(initialPreset.dealerCode);
        const sel = STARK_DEALER_DIRECTORY.find(d => d.name === initialPreset.dealerName);
        if (sel) {
          const matchedStaff = employees.find(emp => 
            (emp.fullName || emp.name)?.toUpperCase() === sel.assignedStaff.toUpperCase() ||
            emp.email?.toLowerCase() === sel.staffEmail.toLowerCase()
          );
          if (matchedStaff) setAssignedToId(matchedStaff.id);
        }
      }
      if (initialPreset.doorModel) setDoorModel(initialPreset.doorModel);
      if (initialPreset.quantity) setQuantity(initialPreset.quantity);
      if (initialPreset.requiredDate) setRequiredDate(initialPreset.requiredDate);
    }
  }, [initialPreset]);
  // Door Order is STRICTLY for the Sales Team. All other users/roles are normal company tasks.
  const isSalesUser = currentUser?.department === 'sales' || currentUser?.departmentId === 'sales' || ['CSO', 'SSM', 'ASM', 'Sales Coordinator'].includes(currentUser?.role);

  const [taskCategory, setTaskCategory] = useState(
    isSalesUser ? 'stark_door_order' : 'standard'
  );

  // Standard fields
  const [title, setTitle] = useState('');
  const [targetDept, setTargetDept] = useState(currentUser?.department === 'sales' ? 'sales' : (departments[0]?.id || 'sales'));
  const [assignedToId, setAssignedToId] = useState('');
  const [approvalManagerId, setApprovalManagerId] = useState(currentUser?.id || '');
  const [priority, setPriority] = useState(TASK_PRIORITIES.HIGH);
  const [deadlineDate, setDeadlineDate] = useState(getTodayDateString());
  const [description, setDescription] = useState('');

  // 12 Mandatory SOP 2.0 Order Information Fields (Section 3.2)
  const [dealerName, setDealerName] = useState('');
  const [dealerCode, setDealerCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [doorModel, setDoorModel] = useState('');
  const [doorSize, setDoorSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [requiredDate, setRequiredDate] = useState(getTodayDateString());
  const [paymentStatus, setPaymentStatus] = useState('Payment Pending Verification'); // 'Cleared' | 'Pending Verification' | 'Hold'
  const [deliveryRequirements, setDeliveryRequirements] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [validationError, setValidationError] = useState('');

  if (!isOpen) return null;

  // Real Eligible Assignees (Includes team peers & delegation)
  const eligibleAssignees = employees.filter(u => {
    if (u.id === currentUser?.id || u.employeeId === currentUser?.employeeId) return false;
    return canAssignTask(currentUser, u, teams, teamMembers);
  });

  const filteredAssignees = targetDept === 'all' 
    ? eligibleAssignees 
    : eligibleAssignees.filter(u => u.department === targetDept || u.departmentId === targetDept);

  // Reviewers list (Accounts Manager, Operations Head, CSO, GM, etc.)
  const availableApprovalManagers = employees.filter(u => {
    return ['Executive Director', 'General Manager', 'Operations Head', 'CSO', 'SSM', 'ASM', 'Accounts Manager', 
            'Warehouse In-charge', 'Transport Manager', 'Service Manager', 'Brand Manager', 'HR Manager']
            .includes(u.role);
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    // Enforce SOP Section 3.2: 100% Complete Order Validation
    if (taskCategory === 'stark_door_order') {
      if (!dealerName.trim()) { setValidationError('Dealer name is mandatory.'); return; }
      if (!customerName.trim()) { setValidationError('Customer name is mandatory.'); return; }
      if (!deliveryAddress.trim() || deliveryAddress.length < 8) {
        setValidationError('Complete delivery address is required. Incomplete addresses cannot be forwarded to Warehouse.');
        return;
      }
      if (!pinCode.trim() || !/^\d{6}$/.test(pinCode.trim())) {
        setValidationError('Correct 6-digit PIN code is mandatory.');
        return;
      }
      if (!primaryPhone.trim() || primaryPhone.length < 10) {
        setValidationError('Valid 10-digit primary contact number is mandatory.');
        return;
      }
      if (!doorModel.trim()) { setValidationError('Door model number is required.'); return; }
      if (!doorSize.trim()) { setValidationError('Door size & specification is required.'); return; }
      if (Number(quantity) <= 0) { setValidationError('Quantity must be at least 1.'); return; }
    }

    let finalAssignees = [];
    let primaryAssigneeId = '';
    let primaryAssigneeName = '';

    if (assignmentScope === 'team') {
      const teamObj = teams.find(t => t.id === selectedTeamId);
      if (!teamObj) {
        setValidationError('Please select an operational team.');
        return;
      }
      const membersOfTeam = teamMembers.filter(m => m.teamId === selectedTeamId && m.status === 'active');
      if (membersOfTeam.length === 0) {
        setValidationError('The selected team has no active members. Add members first or assign individually.');
        return;
      }
      finalAssignees = membersOfTeam.map(m => m.userId);
      primaryAssigneeId = membersOfTeam[0].userId;
      primaryAssigneeName = `${teamObj.name} (${membersOfTeam.length} Members)`;
    } else if (assignmentScope === 'team_member') {
      const teamObj = teams.find(t => t.id === selectedTeamId);
      if (!teamObj) {
        setValidationError('Please select a team from the tree.');
        return;
      }
      const memberEntry = teamMembers.find(m => m.teamId === selectedTeamId && (m.userId === selectedTeamMemberId || m.id === selectedTeamMemberId));
      const emp = employees.find(u => (u.id || u.employeeId) === (selectedTeamMemberId || memberEntry?.userId));
      
      if (!emp && !memberEntry) {
        setValidationError('Please select a member under this team to assign.');
        return;
      }
      const resolvedId = emp?.id || memberEntry?.userId || selectedTeamMemberId;
      finalAssignees = [resolvedId];
      primaryAssigneeId = resolvedId;
      primaryAssigneeName = `${emp?.fullName || memberEntry?.fullName || 'Team Member'} (${emp?.role || memberEntry?.role || 'Staff'}) [${teamObj.name}]`;
    } else {
      const emp = employees.find(u => u.id === assignedToId || u.employeeId === assignedToId);
      if (!emp) {
        setValidationError('Please select an employee to assign this order/task.');
        return;
      }
      finalAssignees = [emp.id || emp.employeeId];
      primaryAssigneeId = emp.id || emp.employeeId;
      primaryAssigneeName = `${emp.fullName || emp.name} (${emp.role})`;
    }

    const todayStr = getTodayDateString();
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isPast11AM = new Date().getHours() >= 11;

    const newTask = {
      taskType: taskCategory,
      title: taskCategory === 'stark_door_order' 
        ? `[Order] ${doorModel} (${quantity} Doors) - ${dealerName}` 
        : (title || 'Standard Corporate Task'),
      departmentId: targetDept,
      assignedToId: primaryAssigneeId,
      assigneeIds: finalAssignees,
      assignedToName: primaryAssigneeName,
      isTeamTask: assignmentScope === 'team',
      teamId: (assignmentScope === 'team' || assignmentScope === 'team_member') ? selectedTeamId : null,
      createdById: currentUser.id,
      createdByName: `${currentUser.fullName || currentUser.name} (${currentUser.role})`,
      approvalManagerId: approvalManagerId || currentUser.id,
      priority,
      taskDate: todayStr,
      deadlineDate: deadlineDate || todayStr,
      status: TASK_STATUSES.ASSIGNED,
      progressPercentage: 0,
      description: description || `Door dispatch order for ${dealerName}.`,

      // Stark SOP 2.0 Order Specifications
      dealerName: dealerName.trim(),
      dealerCode: dealerCode.trim(),
      customerName: customerName.trim(),
      deliveryAddress: deliveryAddress.trim(),
      pinCode: pinCode.trim(),
      primaryPhone: primaryPhone.trim(),
      altPhone: altPhone.trim(),
      doorModel: doorModel.trim(),
      doorSize: doorSize.trim(),
      doorsConfirmed: Number(quantity),
      quantity: Number(quantity),
      requiredDate: requiredDate || deadlineDate || todayStr,
      paymentStatus: paymentStatus, // 'Cleared' | 'Pending Verification' | 'Hold'
      deliveryRequirements: deliveryRequirements.trim(),
      specialInstructions: specialInstructions.trim(),

      // SOP Operational Checkpoints
      orderSubmissionTime: currentTime,
      isSubmittedPast11AM: isPast11AM, // Flag for GM exception if past 11:00 AM
      sopStage: 'SALES_VERIFICATION', // SALES_VERIFICATION -> ACCOUNTS_CLEARANCE -> OPERATIONS_HANDOVER -> WAREHOUSE_PICKING -> QC_INSPECTION -> LOADING -> DISPATCH
      qcCleared: false,
      isLoaded: false,
      isLocked: false
    };

    onTaskCreated(newTask);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto safe-pb safe-pt">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto">
        
        {/* Header - Fixed Top */}
        <div className="flex items-center justify-between border-b pb-3 sm:pb-4 border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 truncate mr-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#05331F] text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">STARK STEEL DOORS</h3>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                Assigner: <span className="font-semibold text-slate-800">{currentUser?.fullName || currentUser?.name}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Validation Alert */}
        {validationError && (
          <div className="p-2.5 my-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-medium shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1 pt-3">
          
          {/* Header indicator based on department: Sales Team -> Door Order Form, Everyone else -> Normal Task */}
          {isSalesUser ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-[#05331F]">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <span className="font-bold">Sales Order Dispatch Form (12-Point Mandate)</span>
              <span className="text-[10px] text-emerald-800 bg-emerald-100 font-bold px-2 py-0.5 rounded-full border border-emerald-300 ml-auto">
                Cutoff: 11:00 AM
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
              <FileText className="w-4 h-4 text-[#05331F]" />
              <span className="font-bold">Operational Task Assignment</span>
              <span className="text-[10px] text-slate-400 font-mono ml-auto">General Company Task</span>
            </div>
          )}

          {/* 12-POINT ORDER INFORMATION FORM (FOR SALES ONLY) */}
          {isSalesUser ? (
            <div className="space-y-3 bg-emerald-50/40 p-4 rounded-3xl border border-emerald-200">
              <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Mandatory Order Information (Prevents Incomplete Orders to Warehouse)
                </span>
                <span className="text-[10px] text-amber-800 bg-amber-100 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                  Cutoff: 11:00 AM
                </span>
              </div>

              {/* 1. Regional Dealer Selector with Auto Sales Staff Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-800">1. Select Dealer *</label>
                    <span className="text-[10px] text-slate-500 font-mono">By Region & Staff</span>
                  </div>
                  <select
                    required
                    value={dealerName}
                    onChange={(e) => {
                      const sel = STARK_DEALER_DIRECTORY.find(d => d.name === e.target.value);
                      setDealerName(e.target.value);
                      if (sel) {
                        setDealerCode(sel.code);
                        // Auto-assign to the responsible staff member
                        const matchedStaff = employees.find(emp => 
                          (emp.fullName || emp.name)?.toUpperCase() === sel.assignedStaff.toUpperCase() ||
                          emp.email?.toLowerCase() === sel.staffEmail.toLowerCase()
                        );
                        if (matchedStaff) {
                          setAssignedToId(matchedStaff.id);
                        }
                      }
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#05331F]"
                  >
                    <option value="">-- Choose Registered Dealer --</option>
                    <optgroup label="📍 KERALA SOUTH — Staff: BINSHA E S">
                      {STARK_DEALER_DIRECTORY.filter(d => d.region === 'Kerala South').map(d => (
                        <option key={d.id} value={d.name}>{d.name} ({d.code})</option>
                      ))}
                    </optgroup>
                    <optgroup label="📍 KERALA NORTH — Staff: SHAMNA">
                      {STARK_DEALER_DIRECTORY.filter(d => d.region === 'Kerala North').map(d => (
                        <option key={d.id} value={d.name}>{d.name} ({d.code})</option>
                      ))}
                    </optgroup>
                    <optgroup label="📍 TAMIL NADU — Staff: SARIKA S">
                      {STARK_DEALER_DIRECTORY.filter(d => d.region === 'Tamil Nadu').map(d => (
                        <option key={d.id} value={d.name}>{d.name} ({d.code})</option>
                      ))}
                    </optgroup>
                    <optgroup label="📍 KARNATAKA — Staff: SHAIFIL K K">
                      {STARK_DEALER_DIRECTORY.filter(d => d.region === 'Karnataka').map(d => (
                        <option key={d.id} value={d.name}>{d.name} ({d.code})</option>
                      ))}
                    </optgroup>
                    <optgroup label="📍 OTHER REGIONS — General Sales Desk">
                      {STARK_DEALER_DIRECTORY.filter(d => !['Kerala South', 'Kerala North', 'Tamil Nadu', 'Karnataka'].includes(d.region)).map(d => (
                        <option key={d.id} value={d.name}>{d.name} ({d.code})</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Dealer Code & Assigned Representative</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. DLR-KS-01"
                      value={dealerCode}
                      onChange={(e) => setDealerCode(e.target.value)}
                      className="w-1/2 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold outline-none focus:ring-2 focus:ring-[#05331F]"
                    />
                    <div className="w-1/2 bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-2 text-[11px] font-bold text-[#05331F] truncate flex items-center justify-center">
                      {STARK_DEALER_DIRECTORY.find(d => d.name === dealerName)?.assignedStaff || 'Staff Assigned'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Customer Name & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">2. Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anand Murthy"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">3. Primary Phone (10-Digit) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={primaryPhone}
                    onChange={(e) => setPrimaryPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">4. Alternative Phone</label>
                  <input
                    type="tel"
                    placeholder="Optional backup phone"
                    value={altPhone}
                    onChange={(e) => setAltPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                  />
                </div>
              </div>

              {/* 3. Delivery Address & PIN Code (Mandatory) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-800 mb-1">5. Complete Delivery Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="Shop/Plot #, Street, Landmark, Area, City"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">6. Correct PIN Code (6 Digits) *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. 500081"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-[#05331F]"
                  />
                </div>
              </div>

              {/* 4. Door Specifications, Count & Date Needed */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">7. Door Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SSD-Teak-35mm"
                    value={doorModel}
                    onChange={(e) => setDoorModel(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">8. Door Size & Spec *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 84 x 36 x 35mm"
                    value={doorSize}
                    onChange={(e) => setDoorSize(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">9. Quantity (Count) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-[#05331F] outline-none focus:ring-2 focus:ring-[#05331F]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Needed Delivery Date *</label>
                  <input
                    type="date"
                    required
                    value={requiredDate}
                    onChange={(e) => setRequiredDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-[#05331F] outline-none focus:ring-2 focus:ring-[#05331F]"
                  />
                </div>
              </div>

              {/* 5. Payment Clearance & Delivery Requirements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">10. Payment Status (Accounts Clearance) *</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#05331F]"
                  >
                    <option value="Payment Cleared">Payment Cleared (Advance 100% Verified)</option>
                    <option value="Payment Pending Verification">Payment Pending Verification (Accounts Clearance by 12 PM)</option>
                    <option value="Payment Hold">PAYMENT HOLD (Disallow Warehouse Picking)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">11. Delivery Requirements & Handling</label>
                  <input
                    type="text"
                    placeholder="e.g. Bubble wrap, Ground floor delivery"
                    value={deliveryRequirements}
                    onChange={(e) => setDeliveryRequirements(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                  />
                </div>
              </div>

              {/* 6. Special Instructions */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">12. Special Instructions / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Fragile glass panel inserts, Dealer will collect from depot"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 bg-slate-50 p-4 rounded-3xl border border-slate-200">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete Monthly Warehouse Stock Audit"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Detailed Description & Instructions</label>
                <textarea
                  rows="3"
                  placeholder="Provide complete step-by-step instructions, dependencies, and requirements..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#05331F]"
                >
                  <option value="Critical">Critical (Immediate SLA)</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
          )}

          {/* Assignment Mode Selector: Individual vs Team Tree (Link Tree) vs Entire Operational Team */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <span className="text-slate-500 font-semibold px-2 text-xs">Assign Mode:</span>
            <button
              type="button"
              onClick={() => {
                setAssignmentScope('individual');
                setSelectedTeamMemberId('');
              }}
              className={`flex-1 py-1.5 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                assignmentScope === 'individual' ? 'bg-[#05331F] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Direct Staff</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAssignmentScope('team_member');
                if (!selectedTeamId && teams.length > 0) setSelectedTeamId(teams[0].id);
              }}
              className={`flex-1 py-1.5 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                assignmentScope === 'team_member' ? 'bg-[#05331F] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <GitFork className="w-3.5 h-3.5 text-emerald-300" />
              <span>Team Link Tree</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAssignmentScope('team');
                setSelectedTeamMemberId('');
              }}
              className={`flex-1 py-1.5 px-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                assignmentScope === 'team' ? 'bg-[#05331F] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Entire Team Pool</span>
            </button>
          </div>

          {/* TEAM LINK TREE ASSIGNMENT BROWSER */}
          {assignmentScope === 'team_member' && (
            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#05331F] flex items-center gap-1.5">
                  <GitFork className="w-4 h-4 text-emerald-700" />
                  <span>Interactive Team Link Tree — Select Member</span>
                </span>
                <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-mono font-semibold">
                  Hierarchy Navigation
                </span>
              </div>

              {/* Step 1: Choose Team branch */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {teams.filter(t => t.status === 'active').map(t => {
                  const isCurTeam = selectedTeamId === t.id;
                  const tMembers = teamMembers.filter(m => m.teamId === t.id && m.status === 'active');
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedTeamId(t.id);
                        setSelectedTeamMemberId('');
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                        isCurTeam 
                          ? 'bg-[#05331F] text-white border-[#05331F] shadow-xs' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>{t.name}</span>
                      <span className={`text-[10px] font-mono px-1 rounded ${
                        isCurTeam ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {tMembers.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Step 2: Choose Member branch under the selected team */}
              {selectedTeamId ? (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                    <span>
                      Active Staff in <strong className="text-slate-900">{teams.find(t => t.id === selectedTeamId)?.name}</strong>:
                    </span>
                    <span className="text-[10px] text-slate-400">Click to select assignee</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {teamMembers
                      .filter(m => m.teamId === selectedTeamId && m.status === 'active')
                      .map(m => {
                        const isMemberSelected = selectedTeamMemberId === m.userId || selectedTeamMemberId === m.id;
                        return (
                          <div
                            key={m.id}
                            onClick={() => setSelectedTeamMemberId(m.userId || m.id)}
                            className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                              isMemberSelected
                                ? 'bg-[#05331F] text-white border-[#05331F] shadow-xs'
                                : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-800'
                            }`}
                          >
                            <div className="truncate mr-2">
                              <div className="font-bold text-xs truncate flex items-center gap-1.5">
                                <UserCheck className={`w-3.5 h-3.5 ${isMemberSelected ? 'text-emerald-300' : 'text-slate-400'}`} />
                                <span>{m.fullName}</span>
                              </div>
                              <div className={`text-[10px] truncate ${isMemberSelected ? 'text-emerald-200' : 'text-slate-500'}`}>
                                {m.role} • ID: {m.employeeId || m.userId?.slice?.(0, 6)}
                              </div>
                            </div>
                            <span className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                              isMemberSelected ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {m.department || 'OPS'}
                            </span>
                          </div>
                        );
                      })}
                    {teamMembers.filter(m => m.teamId === selectedTeamId && m.status === 'active').length === 0 && (
                      <div className="col-span-2 p-3 bg-white rounded-xl border border-dashed border-slate-300 text-center text-slate-400 text-xs">
                        No members in this team yet. Go to "My Team" to add members or switch team branch above.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Select a team above to view members.</p>
              )}
            </div>
          )}

          {/* Department, Assignee / Team, Priority & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Department</label>
              <select
                value={targetDept}
                onChange={(e) => setTargetDept(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              {assignmentScope === 'team' ? (
                <>
                  <label className="block font-semibold text-slate-700 mb-1">Select Operational Team *</label>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                  >
                    <option value="">-- Choose Active Team --</option>
                    {teams.filter(t => t.status === 'active').map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.departmentId?.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </>
              ) : assignmentScope === 'team_member' ? (
                <>
                  <label className="block font-semibold text-slate-700 mb-1">Selected Tree Assignee *</label>
                  <div className="w-full border border-emerald-300 bg-emerald-50/50 rounded-xl px-3 py-2 text-xs font-bold text-[#05331F] flex items-center justify-between">
                    <span className="truncate">
                      {selectedTeamMemberId 
                        ? (teamMembers.find(m => m.userId === selectedTeamMemberId || m.id === selectedTeamMemberId)?.fullName || 'Member Selected')
                        : 'Pick from link tree above'}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-800">
                      {selectedTeamMemberId ? 'READY' : 'PENDING'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <label className="block font-semibold text-slate-700 mb-1">Assign Responsible Employee *</label>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                  >
                    <option value="">-- Choose Employee --</option>
                    {filteredAssignees.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.fullName || u.name} — {u.role} ({(u.department || '').toUpperCase()})
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Deadline Date</label>
              <input
                type="date"
                required
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
              />
            </div>
          </div>

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
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472c] text-white font-semibold shadow-md transition-all active:scale-98"
            >
              <Send className="w-4 h-4" />
              <span>{isSalesUser ? 'Dispatch Order' : 'Assign Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
