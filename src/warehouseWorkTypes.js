/**
 * STARK STEEL - Warehouse Department Task Definitions & Constants
 * Task Management Module (Scope: Task Execution, Evidence, Reporting, Approvals & Monitoring ONLY)
 */

export const WAREHOUSE_TASK_IDS = {
  STOCK_ALLOCATION: 'tpl_wh_stock_allocation',
  PICKING: 'tpl_wh_picking',
  STAGING: 'tpl_wh_staging',
  QC_HANDOVER: 'tpl_wh_qc_handover',
  LOADING: 'tpl_wh_loading'
};

export const WAREHOUSE_ROLES = {
  IN_CHARGE: 'Warehouse In-charge',
  SUPERVISOR: 'Warehouse Supervisor',
  EXECUTIVE: 'Warehouse Executive',
  LOADING_STAFF: 'Loading Staff'
};

export const WAREHOUSE_BLOCKER_CATEGORIES = [
  'Product Damage',
  'Missing Assigned Materials',
  'Warehouse Congestion',
  'Forklift Breakdown',
  'Loading Delay',
  'Team Shortage',
  'Work Instruction Clarification',
  'Other Operational Issue'
];

export const WAREHOUSE_BLOCKER_SEVERITIES = [
  'Critical',
  'High',
  'Medium'
];

export const LOADING_MILESTONES = [20, 40, 60, 70];

/**
 * Calculates current loading milestone achieved
 * @param {number} completedCount 
 * @returns {{ currentMilestone: number, nextMilestone: number, percent: number }}
 */
export function getLoadingMilestoneProgress(completedCount = 0) {
  const count = Number(completedCount) || 0;
  const maxTarget = 70;
  let currentMilestone = 0;

  for (const m of LOADING_MILESTONES) {
    if (count >= m) {
      currentMilestone = m;
    } else {
      break;
    }
  }

  const nextMilestone = LOADING_MILESTONES.find(m => m > count) || maxTarget;
  const percent = Math.min(100, Math.round((count / maxTarget) * 100));

  return {
    currentMilestone,
    nextMilestone,
    percent,
    completedCount: count,
    targetCount: maxTarget
  };
}

/**
 * Checks if a task is a warehouse department task
 * @param {object} task 
 * @returns {boolean}
 */
export function isWarehouseTask(task) {
  if (!task) return false;
  const dept = (task.departmentId || task.department || '').toLowerCase();
  if (dept === 'warehouse') return true;
  const tId = task.templateId || task.id || '';
  return Object.values(WAREHOUSE_TASK_IDS).includes(tId) || tId.startsWith('tpl_wh_');
}

