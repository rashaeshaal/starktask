/**
 * STARK STEEL DOORS - SOP 2.0 Task Templates
 * Master recurring schedule and templates for automatic and on-demand task generation.
 */

export const SOP_TASK_TEMPLATES = [
  // --- SALES DEPARTMENT ---
  {
    id: 'tpl_sales_order_collect',
    title: 'Dealer Order Collection & Preliminary Verification',
    departmentId: 'sales',
    departmentName: 'Sales',
    targetDesignation: 'Sales Coordinator',
    category: 'SOP Scheduled Task',
    priority: 'High',
    scheduleType: 'daily',
    startTime: '09:00 AM',
    deadlineTime: '10:30 AM',
    requiresApproval: true,
    requiresEvidence: false,
    checklist: [
      { id: 'c1', text: 'Contact active regional dealers for pending orders' },
      { id: 'c2', text: 'Verify basic order parameters: model, quantity, dealer code' },
      { id: 'c3', text: 'Confirm preliminary payment terms / advance token' }
    ],
    instructions: 'Collect all morning dealer orders. Complete preliminary checks before the 11:00 AM cutoff.',
    active: true
  },
  {
    id: 'tpl_sales_final_submission',
    title: 'Final Order Submission (Mandatory 11:00 AM Cutoff)',
    departmentId: 'sales',
    departmentName: 'Sales',
    targetDesignation: 'Sales Coordinator',
    category: 'SOP Scheduled Task',
    priority: 'Critical',
    scheduleType: 'daily',
    startTime: '10:30 AM',
    deadlineTime: '11:00 AM',
    requiresApproval: true,
    requiresEvidence: true,
    checklist: [
      { id: 'c1', text: 'Verify 12-point mandatory fields (dealer, customer, address, PIN, phones, specs)' },
      { id: 'c2', text: 'Ensure 6-digit PIN code and full delivery address are complete' },
      { id: 'c3', text: 'Submit final confirmed orders into ERP system before 11:00 AM' }
    ],
    instructions: 'Strict Cutoff: 11:00 AM. Incomplete orders automatically set to PAYMENT/OPERATIONAL HOLD.',
    active: true
  },
  {
    id: 'tpl_sales_verification',
    title: 'Sales Order Verification & Completeness Audit',
    departmentId: 'sales',
    departmentName: 'Sales',
    targetDesignation: 'CSO',
    category: 'SOP Scheduled Task',
    priority: 'Critical',
    scheduleType: 'daily',
    startTime: '11:00 AM',
    deadlineTime: '11:30 AM',
    requiresApproval: true,
    requiresEvidence: false,
    checklist: [
      { id: 'c1', text: 'Audit all submitted orders for complete 12-point information' },
      { id: 'c2', text: 'Flag and place hold on any order missing PIN code or delivery phone' },
      { id: 'c3', text: 'Hand over verified orders batch to Finance & Accounts' }
    ],
    instructions: 'Sales leadership verification. Reject incomplete orders back to Sales Coordinator for immediate correction.',
    active: true
  },

  // --- FINANCE & ACCOUNTS ---
  {
    id: 'tpl_finance_clearance',
    title: 'Payment Verification & Accounts Clearance (12:00 PM Deadline)',
    departmentId: 'finance',
    departmentName: 'Finance & Accounts',
    targetDesignation: 'Accounts Manager',
    category: 'SOP Scheduled Task',
    priority: 'Critical',
    scheduleType: 'daily',
    startTime: '11:30 AM',
    deadlineTime: '12:00 PM',
    requiresApproval: true,
    requiresEvidence: true,
    checklist: [
      { id: 'c1', text: 'Check dealer outstanding ledger & credit limits' },
      { id: 'c2', text: 'Verify payment receipts, bank credits, or NEFT/RTGS UTR numbers' },
      { id: 'c3', text: 'Mark order Payment Status: "Payment Cleared" or "Payment Hold"' },
      { id: 'c4', text: 'Formally release cleared orders batch to Operations Head' }
    ],
    instructions: 'Deadline: 12:00 PM. No order may proceed to Warehouse without recorded payment clearance or GM written exception.',
    active: true
  },

  // --- OPERATIONS HEAD ---
  {
    id: 'tpl_ops_handover',
    title: 'Operations Allocation & Daily Target Review (70 Doors Target)',
    departmentId: 'operations',
    departmentName: 'Operations',
    targetDesignation: 'Operations Head',
    category: 'SOP Scheduled Task',
    priority: 'Critical',
    scheduleType: 'daily',
    startTime: '12:00 PM',
    deadlineTime: '12:15 PM',
    requiresApproval: true,
    requiresEvidence: false,
    checklist: [
      { id: 'c1', text: 'Verify approved orders from Accounts against today 70-door loading target' },
      { id: 'c2', text: 'Confirm warehouse picking allocation and staging bays' },
      { id: 'c3', text: 'Align with Transportation for required vehicle fleet & route matrix' },
      { id: 'c4', text: 'Formally hand over execution order sheet to Warehouse In-charge' }
    ],
    instructions: 'Final Operations Handover by 12:15 PM. Sets up daily factory loading quota.',
    active: true
  },
  {
    id: 'tpl_ops_daily_report',
    title: 'Daily Operations Closure Report & Target Audit',
    departmentId: 'operations',
    departmentName: 'Operations',
    targetDesignation: 'Operations Head',
    category: 'SOP Scheduled Task',
    priority: 'High',
    scheduleType: 'daily',
    startTime: '05:45 PM',
    deadlineTime: '06:30 PM',
    requiresApproval: true,
    requiresEvidence: true,
    checklist: [
      { id: 'c1', text: 'Record final count of doors loaded (Target: 70 doors)' },
      { id: 'c2', text: 'Document any shortfall reason (Order volume, stock, manpower, transport)' },
      { id: 'c3', text: 'Confirm all dispatch gate passes and e-way bills' },
      { id: 'c4', text: 'Submit consolidated daily report to Director Operations & ED' }
    ],
    instructions: 'End of day operational accounting and management reporting.',
    active: true
  },

  // --- WAREHOUSE ---
  {
    id: 'tpl_wh_stock_allocation',
    title: 'Order Receipt, Stock Allocation & Loading Plan Preparation',
    departmentId: 'warehouse',
    departmentName: 'Warehouse',
    targetDesignation: 'Warehouse In-charge',
    category: 'SOP Scheduled Task',
    priority: 'High',
    scheduleType: 'daily',
    startTime: '12:15 PM',
    deadlineTime: '01:00 PM',
    requiresApproval: false,
    requiresEvidence: false,
    checklist: [
      { id: 'c1', text: 'Receive approved orders sheet by 12:15 PM' },
      { id: 'c2', text: 'Verify physical stock availability for each door model and size' },
      { id: 'c3', text: 'Flag any model shortages immediately to Operations Head' },
      { id: 'c4', text: 'Prepare dealer-wise and route-wise loading sequence' }
    ],
    instructions: 'Warehouse order intake and staging preparation.',
    active: true
  },
  {
    id: 'tpl_wh_picking',
    title: 'Warehouse Picking, Product Protection & Staging',
    departmentId: 'warehouse',
    departmentName: 'Warehouse',
    targetDesignation: 'Warehouse Supervisor',
    category: 'SOP Scheduled Task',
    priority: 'High',
    scheduleType: 'daily',
    startTime: '01:00 PM',
    deadlineTime: '03:30 PM',
    requiresApproval: false,
    requiresEvidence: true,
    checklist: [
      { id: 'c1', text: 'Pick doors according to loading plan sequence' },
      { id: 'c2', text: 'Ensure protective foam and corner guards are intact' },
      { id: 'c3', text: 'Stage products in QC inspection bay in readiness for rolling batch checks' },
      { id: 'c4', text: 'Notify QC Inspector as each 10-door batch is staged' }
    ],
    instructions: 'Physical door picking. Continuous rolling handovers to QC inspection bay.',
    active: true
  },
  {
    id: 'tpl_wh_loading',
    title: 'Vehicle Loading of QC-Cleared Products (Milestones: 20, 40, 60, 70)',
    departmentId: 'warehouse',
    departmentName: 'Warehouse',
    targetDesignation: 'Warehouse Supervisor',
    category: 'SOP Scheduled Task',
    priority: 'Critical',
    scheduleType: 'daily',
    startTime: '04:30 PM',
    deadlineTime: '05:45 PM',
    requiresApproval: true,
    requiresEvidence: true,
    checklist: [
      { id: 'c1', text: 'Verify 100% QC PASS stamp before loading any door' },
      { id: 'c2', text: 'Track loading milestones: 20 doors -> 40 doors -> 60 doors -> 70 doors' },
      { id: 'c3', text: 'Secure doors inside transport vehicles with ratchet straps & buffers' },
      { id: 'c4', text: 'Complete vehicle loading by 5:45 PM' }
    ],
    instructions: 'STRICT SOP RULE: Never load an unapproved or QC-rejected product. Loading must complete by 5:45 PM.',
    active: true
  },

  // --- QUALITY CONTROL (QC) ---
  {
    id: 'tpl_qc_inspection',
    title: 'Mandatory 9-Point QC Inspection & Clearance Window',
    departmentId: 'qc',
    departmentName: 'Quality Control (QC)',
    targetDesignation: 'QC Inspector',
    category: 'SOP Scheduled Task',
    priority: 'Critical',
    scheduleType: 'daily',
    startTime: '01:30 PM',
    deadlineTime: '04:30 PM',
    requiresApproval: true,
    requiresEvidence: true,
    checklist: [
      { id: 'c1', text: '1. Model Verification (Matches Gate Pass)' },
      { id: 'c2', text: '2. Size & Frame Tolerances' },
      { id: 'c3', text: '3. Physical Quantity Count' },
      { id: 'c4', text: '4. Surface Finish & Lamination' },
      { id: 'c5', text: '5. Scratches, Dents & Physical Damage Inspection' },
      { id: 'c6', text: '6. Frame & Shutter Integrity' },
      { id: 'c7', text: '7. Hardware Accessories (Locks, Hinges, Keys)' },
      { id: 'c8', text: '8. Packing & Protective Wrapping' },
      { id: 'c9', text: '9. Barcode Identification Tag' }
    ],
    instructions: 'Inspect rolling batches from 1:30 PM onwards. Final clearance window closes at 4:30 PM sharp.',
    active: true
  },

  // --- TRANSPORTATION ---
  {
    id: 'tpl_trans_readiness',
    title: 'Fleet & Driver Readiness & Route Sequence Verification',
    departmentId: 'transportation',
    departmentName: 'Transportation',
    targetDesignation: 'Transport Manager',
    category: 'SOP Scheduled Task',
    priority: 'High',
    scheduleType: 'daily',
    startTime: '02:00 PM',
    deadlineTime: '04:00 PM',
    requiresApproval: false,
    requiresEvidence: false,
    checklist: [
      { id: 'c1', text: 'Verify availability and fitness of required dispatch vehicles' },
      { id: 'c2', text: 'Confirm assigned drivers and contact availability' },
      { id: 'c3', text: 'Map out multi-drop delivery route and dealer drop sequence' },
      { id: 'c4', text: 'Coordinate bay positioning with Warehouse loading staff' }
    ],
    instructions: 'Ensure all logistics, transport permits, and vehicles are ready at loading bays by 4:00 PM.',
    active: true
  },
  {
    id: 'tpl_trans_dispatch',
    title: 'Dispatch Clearance, Documentation & Vehicle Departure (6:00 PM Deadline)',
    departmentId: 'transportation',
    departmentName: 'Transportation',
    targetDesignation: 'Transport Coordinator',
    category: 'SOP Scheduled Task',
    priority: 'Critical',
    scheduleType: 'daily',
    startTime: '05:45 PM',
    deadlineTime: '06:00 PM',
    requiresApproval: true,
    requiresEvidence: true,
    checklist: [
      { id: 'c1', text: 'Verify invoice, delivery challan & e-way bills match loaded count' },
      { id: 'c2', text: 'Obtain driver sign-off on gate pass' },
      { id: 'c3', text: 'Record actual departure timestamp in ERP' },
      { id: 'c4', text: 'Send dispatch notification to recipient dealers' }
    ],
    instructions: 'Record actual vehicle departure separately from loading completion. Target departure by 6:00 PM.',
    active: true
  },

  // --- INVENTORY ---
  {
    id: 'tpl_inv_daily_audit',
    title: 'Daily Stock Reconciliation & ERP Balance Accuracy Audit',
    departmentId: 'inventory',
    departmentName: 'Inventory',
    targetDesignation: 'Inventory Supervisor',
    category: 'SOP Scheduled Task',
    priority: 'Medium',
    scheduleType: 'daily',
    startTime: '05:00 PM',
    deadlineTime: '06:30 PM',
    requiresApproval: true,
    requiresEvidence: true,
    checklist: [
      { id: 'c1', text: 'Record today stock inward entries from production' },
      { id: 'c2', text: 'Reconcile today dispatches against outward ledger' },
      { id: 'c3', text: 'Perform cycle count of high-demand door models (99%+ accuracy)' },
      { id: 'c4', text: 'Document any damaged or quarantined doors' }
    ],
    instructions: 'Maintain 99%+ ERP stock accuracy. No stock movement allowed without documented gate passes.',
    active: true
  },

  // --- HR & ADMINISTRATION ---
  {
    id: 'tpl_hr_attendance',
    title: 'Morning Factory Attendance & Loading Manpower Allocation',
    departmentId: 'hr_admin',
    departmentName: 'HR & Administration',
    targetDesignation: 'HR Manager',
    category: 'SOP Scheduled Task',
    priority: 'High',
    scheduleType: 'daily',
    startTime: '08:30 AM',
    deadlineTime: '10:00 AM',
    requiresApproval: false,
    requiresEvidence: false,
    checklist: [
      { id: 'c1', text: 'Review daily staff attendance & biometric logs' },
      { id: 'c2', text: 'Ensure adequate loading crew allocated to Warehouse for 70-door target' },
      { id: 'c3', text: 'Address emergency leave requests or shift substitutions' },
      { id: 'c4', text: 'Report manpower readiness to Operations Head' }
    ],
    instructions: 'Ensures factory floor and warehouse have full manpower capacity for daily loading targets.',
    active: true
  },

  // --- SERVICE ---
  {
    id: 'tpl_service_sla_audit',
    title: 'Daily Service Complaints & SLA Compliance Review',
    departmentId: 'service',
    departmentName: 'Service',
    targetDesignation: 'Service Manager',
    category: 'SOP Scheduled Task',
    priority: 'Medium',
    scheduleType: 'daily',
    startTime: '04:00 PM',
    deadlineTime: '05:30 PM',
    requiresApproval: true,
    requiresEvidence: true,
    checklist: [
      { id: 'c1', text: 'Audit all complaint registrations (Target: <30 mins registration)' },
      { id: 'c2', text: 'Verify customer response SLA (<2 working hours)' },
      { id: 'c3', text: 'Check technician field assignments (<4 working hours)' },
      { id: 'c4', text: 'Review 1-day action plans for resolved/ongoing customer complaints' }
    ],
    instructions: 'Customer service SLA monitoring according to SOP Section 11.',
    active: true
  }
];

