/**
 * STARK STEEL DOORS - STANDARD OPERATING PROCEDURE (SOP 2.0)
 * Core Operational Constants, Milestones, Deadlines, Escalation Matrix, and QC Verification.
 */

export const SOP_CONSTANTS = {
  COMPANY_NAME: 'STARK STEEL DOORS',
  VERSION: '2.0 – Final Operational Revision',
  DAILY_LOADING_TARGET: 70, // 70 doors by 6:00 PM
  ORDER_RECEIVING_CUTOFF: '11:00 AM',
  FINAL_HANDOVER_DEADLINE: '12:15 PM',
  FINAL_QC_DEADLINE: '04:30 PM',
  FINAL_LOADING_DEADLINE: '06:00 PM'
};

// 70-Door Loading Milestones
export const LOADING_MILESTONES = [
  { id: 'm1', target: 20, label: 'First Milestone', color: 'bg-blue-500' },
  { id: 'm2', target: 40, label: 'Second Milestone', color: 'bg-indigo-500' },
  { id: 'm3', target: 60, label: 'Third Milestone', color: 'bg-amber-500' },
  { id: 'm4', target: 70, label: 'Final Mandatory Target (6:00 PM)', color: 'bg-emerald-600' }
];

// Daily Operational Handover Schedule
export const SOP_DAILY_SCHEDULE = [
  { time: 'Before 10:30 AM', activity: 'Dealer order collection & preliminary verification', owner: 'Sales Coordinators', dept: 'sales' },
  { time: '11:00 AM', activity: 'FINAL ORDER CUTOFF (After 11 AM requires GM exception)', owner: 'CSO / Sales Team', dept: 'sales', critical: true },
  { time: '11:00 – 11:30 AM', activity: 'Sales Verification & Completeness Check', owner: 'ASM / SSM / CSO', dept: 'sales' },
  { time: '11:30 AM – 12:00 PM', activity: 'Payment Verification & Accounts Clearance', owner: 'Accounts Manager / Accountants', dept: 'finance', critical: true },
  { time: '12:00 – 12:15 PM', activity: 'Final Operations Handover & Allocation', owner: 'CSO & Operations Head', dept: 'operations' },
  { time: '12:15 – 1:00 PM', activity: 'Stock verification & loading plan preparation', owner: 'Warehouse In-charge', dept: 'operations' },
  { time: '1:00 – 3:30 PM', activity: 'Picking and order staging / preparation', owner: 'Warehouse Supervisor', dept: 'operations' },
  { time: '3:30 – 4:30 PM', activity: 'FINAL MANDATORY QC INSPECTION & CLEARANCE', owner: 'QC Inspector / QC Executive', dept: 'operations', critical: true },
  { time: '4:30 – 5:45 PM', activity: 'Loading of QC-approved doors into vehicles', owner: 'Loading Staff / Warehouse Sup', dept: 'operations' },
  { time: '5:45 – 6:00 PM', activity: 'Final quantity audit & dispatch clearance (70 Doors Target)', owner: 'Warehouse / Transport Mgr', dept: 'operations', critical: true }
];

// Mandatory 12-Point Order Information Checklist
export const MANDATORY_ORDER_FIELDS = [
  { key: 'dealerName', label: 'Dealer Name and Dealer Code', required: true },
  { key: 'customerName', label: 'Customer Name', required: true },
  { key: 'deliveryAddress', label: 'Complete Delivery Address', required: true },
  { key: 'pinCode', label: 'Correct 6-digit PIN Code', required: true },
  { key: 'primaryPhone', label: 'Primary Contact Number', required: true },
  { key: 'doorModel', label: 'Door Model Number (e.g. SSD-Teak-35)', required: true },
  { key: 'doorSize', label: 'Door Size & Specification', required: true },
  { key: 'quantity', label: 'Total Door Quantity', required: true },
  { key: 'paymentStatus', label: 'Payment Status (Cleared / Hold)', required: true },
  { key: 'deliveryReq', label: 'Delivery Requirements', required: false },
  { key: 'altPhone', label: 'Alternative Contact Number', required: false },
  { key: 'specialInstructions', label: 'Special Instructions / Notes', required: false }
];

// Mandatory QC Checklist (Section 9 of SOP)
export const MANDATORY_QC_CHECKLIST = [
  { id: 'qc_model', label: 'Correct Model Matches ERP Gate Pass' },
  { id: 'qc_size', label: 'Correct Size & Frame Tolerances' },
  { id: 'qc_quantity', label: 'Correct Physical Quantity Count' },
  { id: 'qc_surface', label: 'Surface Finish & Lamination Quality' },
  { id: 'qc_damage', label: 'Free of Physical Scratches / Dents' },
  { id: 'qc_frame', label: 'Frame & Shutter Integrity Check' },
  { id: 'qc_accessories', label: 'Hardware & Accessories Included (Locks, Hinges)' },
  { id: 'qc_packing', label: 'Protective Bubble Wrap / Packing Condition' },
  { id: 'qc_id', label: 'Product Identification & Barcode Tags' }
];

// Escalation Matrix (Section 15 of SOP)
export const ESCALATION_MATRIX = [
  { issue: 'Incorrect address / Missing PIN code', owner: 'Sales Coordinator', escalation: 'ASM → CSO' },
  { issue: 'Late order submission (post 11:00 AM)', owner: 'CSO', escalation: 'General Manager' },
  { issue: 'Payment pending / Payment Hold', owner: 'Accounts Manager', escalation: 'General Manager' },
  { issue: 'Stock shortage detected', owner: 'Warehouse In-charge', escalation: 'Operations Head' },
  { issue: 'QC Rejection / Defect detected', owner: 'QC Inspector', escalation: 'Operations Head' },
  { issue: 'Picking delay (>15 mins)', owner: 'Warehouse Supervisor', escalation: 'Operations Head' },
  { issue: 'Loading delay (>30 mins / Risk to 6 PM)', owner: 'Warehouse Supervisor', escalation: 'Operations Head → GM' },
  { issue: 'Vehicle unavailable / Route mismatch', owner: 'Transport Manager', escalation: 'Operations Head' },
  { issue: 'Customer Service complaint registered', owner: 'Service Manager', escalation: 'General Manager' }
];

// Service Response SLA (Section 11)
export const SERVICE_SLA = [
  { step: 'Complaint Registration', time: 'Within 30 minutes' },
  { step: 'Initial Customer Response', time: 'Within 2 working hours' },
  { step: 'Technician Assignment', time: 'Within 4 working hours' },
  { step: 'Action Plan & Resolution', time: 'Within 1 working day' }
];

