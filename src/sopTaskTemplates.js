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
    instructions: 'Collect all morning dealer orders. Complete preliminary checks with dealers.',
    active: true
  },
  {
    id: 'tpl_sales_final_submission',
    title: 'Final Order Submission',
    departmentId: 'sales',
    departmentName: 'Sales',
    targetDesignation: 'Sales Coordinator',
    category: 'SOP Scheduled Task',
    priority: 'Critical',
    scheduleType: 'daily',
    startTime: '10:30 AM',
    deadlineTime: '06:00 PM',
    requiresApproval: true,
    requiresEvidence: true,
    checklist: [
      { id: 'c1', text: 'Verify 12-point mandatory fields (dealer, customer, address, PIN, phones, specs)' },
      { id: 'c2', text: 'Ensure 6-digit PIN code and full delivery address are complete' },
      { id: 'c3', text: 'Submit final confirmed orders into ERP system' }
    ],
    instructions: 'Submit confirmed dealer orders. Incomplete orders automatically set to PAYMENT/OPERATIONAL HOLD.',
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
    startTime: '09:00 AM',
    deadlineTime: '06:00 PM',
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
    startTime: '01:00 PM',
    deadlineTime: '02:00 PM',
    requiresApproval: true,
    requiresEvidence: false,
    checklist: [
      { id: 'c1', text: 'Verify approved orders from Accounts against today 70-door loading target' },
      { id: 'c2', text: 'Confirm warehouse picking allocation and staging bays' },
      { id: 'c3', text: 'Align with Transportation for required vehicle fleet & route matrix' },
      { id: 'c4', text: 'Formally hand over execution order sheet to Warehouse In-charge' }
    ],
    instructions: 'Operations Handover and Allocation. Sets up daily factory loading quota.',
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
    startTime: '01:00 PM',
    deadlineTime: '02:30 PM',
    requiresApproval: true,
    requiresEvidence: false,
    checklist: [
      { id: 'c1', text: 'Review daily warehouse work requirements & approved orders' },
      { id: 'c2', text: 'Prepare daily allocation work instructions for supervisors' },
      { id: 'c3', text: 'Distribute work among Warehouse Supervisors with priorities & deadlines' },
      { id: 'c4', text: 'Monitor staging area readiness and submit daily allocation summary' }
    ],
    instructions: 'Task assignment and monitoring activity. Set up daily factory loading quota and supervise allocation.',
    active: true
  },
  {
    id: 'tpl_wh_picking',
    title: 'Warehouse Picking, Product Protection & Verification',
    departmentId: 'warehouse',
    departmentName: 'Warehouse',
    targetDesignation: 'Warehouse Supervisor',
    category: 'SOP Scheduled Task',
    priority: 'High',
    scheduleType: 'daily',
    startTime: '01:00 PM',
    deadlineTime: '03:30 PM',
    requiresApproval: true,
    requiresEvidence: true,
    checklist: [
      { id: 'c1', text: 'Pick assigned steel door models and verify product details' },
      { id: 'c2', text: 'Inspect physical product condition for dents or surface blemishes' },
      { id: 'c3', text: 'Check protective corners, edge wrapping, and stretch-film protection' },
      { id: 'c4', text: 'Record completed picked quantity and upload work photographs' },
      { id: 'c5', text: 'Report missing or damaged items as operational task blockers' }
    ],
    instructions: 'Physical door picking execution. Continuous progress updates and photo evidence required.',
    active: true
  },
  {
    id: 'tpl_wh_staging',
    title: 'Warehouse Staging & Dispatch Lane Organization',
    departmentId: 'warehouse',
    departmentName: 'Warehouse',
    targetDesignation: 'Warehouse Supervisor',
    category: 'SOP Scheduled Task',
    priority: 'High',
    scheduleType: 'daily',
    startTime: '02:30 PM',
    deadlineTime: '04:15 PM',
    requiresApproval: true,
    requiresEvidence: true,
    checklist: [
      { id: 'c1', text: 'Arrange assigned picked products in designated staging bays' },
      { id: 'c2', text: 'Organize doors by route sequence and transport vehicle allocation' },
      { id: 'c3', text: 'Coordinate team members and monitor lane clearance' },
      { id: 'c4', text: 'Upload completion photographs of organized staging bays' },
      { id: 'c5', text: 'Report any lane congestion or staging delays as operational blockers' }
    ],
    instructions: 'Dispatch staging lane management. Maintain clean flow from picking racks to loading bays.',
    active: true
  },
  {
    id: 'tpl_wh_qc_handover',
    title: 'QC Handover Coordination & Staging Bay Release',
    departmentId: 'warehouse',
    departmentName: 'Warehouse',
    targetDesignation: 'Warehouse Supervisor',
    category: 'SOP Scheduled Task',
    priority: 'Critical',
    scheduleType: 'daily',
    startTime: '03:30 PM',
    deadlineTime: '04:30 PM',
    requiresApproval: true,
    requiresEvidence: true,
    checklist: [
      { id: 'c1', text: 'Coordinate physical batch handover to the QC inspection team' },
      { id: 'c2', text: 'Record handover quantity and batch identifier in task notes' },
      { id: 'c3', text: 'Track handover completion and ensure doors remain in protected bays' },
      { id: 'c4', text: 'Upload supporting handover photographs' },
      { id: 'c5', text: 'Record pending handovers and report coordination delays immediately' }
    ],
    instructions: 'Coordinate handover to QC team. Note: QC inspection itself is executed by QC; this tracks the warehouse coordination task.',
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
      { id: 'c1', text: 'Assign vehicle loading responsibilities to Loading Staff crew' },
      { id: 'c2', text: 'Monitor physical loading activities and verify upright stacking' },
      { id: 'c3', text: 'Check rubber cushioning and verify tie-down ratchet arrangements' },
      { id: 'c4', text: 'Track daily milestones: 20 doors -> 40 doors -> 60 doors -> 70 doors' },
      { id: 'c5', text: 'Upload loading photographs (cargo bay, straps, vehicle registration)' },
      { id: 'c6', text: 'Record completed loading quantities and submit for supervisor approval' }
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
    id: 'tpl_trans_dispatch_clearance',
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
      { id: 'c1', text: 'Coordinate with Warehouse regarding completion of loading tasks' },
      { id: 'c2', text: 'Verify reported loaded quantities against supplied delivery documents' },
      { id: 'c3', text: 'Cross-check relevant delivery challan, invoice & e-way bill references' },
      { id: 'c4', text: 'Confirm required QC PASS evidence is available' },
      { id: 'c5', text: 'Obtain Driver acknowledgement or signature on gate-pass documents' },
      { id: 'c6', text: 'Record relevant trip-manifest details & actual departure timestamp' }
    ],
    instructions: 'Coordinate document verification and record actual departure separately from loading completion. Target departure by 6:00 PM.',
    active: true
  },
  {
    id: 'tpl_trans_delivery',
    title: 'Transit Delivery, Unloading & Dealer Signed POD Handover',
    departmentId: 'transportation',
    departmentName: 'Transportation',
    targetDesignation: 'Driver',
    category: 'SOP Scheduled Task',
    priority: 'High',
    scheduleType: 'daily',
    startTime: '06:00 PM',
    deadlineTime: '09:00 PM',
    requiresApproval: true,
    requiresEvidence: true,
    checklist: [
      { id: 'c1', text: 'Review assigned destination and delivery route instructions' },
      { id: 'c2', text: 'Start trip and record transit progress / delays' },
      { id: 'c3', text: 'Reach assigned destination safely and complete unloading' },
      { id: 'c4', text: 'Inspect for visible transit damage and report if identified' },
      { id: 'c5', text: 'Obtain dealer acknowledgment on physical delivery challan' },
      { id: 'c6', text: 'Capture and upload signed Proof of Delivery (POD) photograph' }
    ],
    instructions: 'Follow safe unloading protocols. Mandatory signed POD photo proof required before submitting task for Coordinator sign-off.',
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

