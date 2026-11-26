/**
 * STARK STEEL - Transportation Department Task Definitions & Constants
 * Task Management Module (Scope: Task Execution, Evidence, Reporting, Approvals & Monitoring ONLY)
 */

export const TRANSPORTATION_TASK_IDS = {
  READINESS: 'tpl_trans_readiness',
  DISPATCH_CLEARANCE: 'tpl_trans_dispatch_clearance',
  DELIVERY: 'tpl_trans_delivery'
};

export const TRANSPORTATION_ROLES = {
  MANAGER: 'Transport Manager',
  COORDINATOR: 'Transport Coordinator',
  DRIVER: 'Driver',
  DELIVERY_PARTNER: 'Delivery Partner'
};

export const TRANSPORTATION_BLOCKER_CATEGORIES = [
  'Vehicle breakdown',
  'Route blockage',
  'Traffic delay',
  'Dealer godown closed',
  'Transit damage',
  'Loading delay',
  'Missing documents',
  'Driver unavailable',
  'Vehicle unavailable',
  'Safety concern',
  'Other operational issue'
];

export const TRANSPORTATION_BLOCKER_SEVERITIES = [
  'Critical',
  'High',
  'Medium',
  'Low'
];

/**
 * Checks if a role is a Transportation department role
 * @param {string} role 
 * @returns {boolean}
 */
export function isTransportationRole(role = '') {
  const r = (role || '').toLowerCase();
  return r.includes('transport') || r === 'driver' || r === 'delivery partner';
}

/**
 * Checks if a task is a transportation department task
 * @param {object} task 
 * @returns {boolean}
 */
export function isTransportationTask(task) {
  if (!task) return false;
  const dept = (task.departmentId || task.department || '').toLowerCase();
  if (dept === 'transportation' || dept === 'trans') return true;
  const tId = task.templateId || task.id || '';
  return Object.values(TRANSPORTATION_TASK_IDS).includes(tId) || tId.startsWith('tpl_trans_');
}

