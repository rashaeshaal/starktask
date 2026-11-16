import { ROLE_HIERARCHY_LEVELS, getReportees } from './orgStructure';

/**
 * Access Control Evaluator based on:
 * - User Role
 * - Department
 * - Reporting Manager chain
 * - Task Ownership & Assignment
 * - Approval Authority
 */

export const TASK_STATUSES = {
  ASSIGNED: 'Assigned',
  ACCEPTED: 'Accepted',
  IN_PROGRESS: 'In Progress',
  PENDING_REVIEW: 'Pending Review', // Submitted for completion approval / Waiting for sign-off
  CORRECTION_REQUESTED: 'Correction Requested',
  COMPLETED: 'Completed',
  BLOCKED: 'Blocked',
  CANCELLED: 'Cancelled'
};

export const TASK_PRIORITIES = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent'
};

export const RECURRING_TYPES = {
  NONE: 'None',
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly'
};

/**
 * Checks if a user has visibility to view a given task
 */
export function canViewTask(user, task, allUsers = []) {
  if (!user || !task) return false;

  // 1. Executive Director, Director Operations & GM have 100% company-wide visibility
  if (user.role === 'Executive Director' || user.role === 'Director Operations' || user.role === 'General Manager') {
    return true;
  }

  // 2. Creator or Approval Manager
  if (task.createdById === user.id || task.approvalManagerId === user.id) {
    return true;
  }

  // 3. Directly assigned employee or in assignees list
  if (task.assignedToId === user.id || (task.assigneeIds && task.assigneeIds.includes(user.id))) {
    return true;
  }

  // 4. Reporting manager of any assignee
  const reportees = getReportees(user.id, allUsers);
  const reporteeIds = reportees.map(r => r.id);
  if (reporteeIds.includes(task.assignedToId)) {
    return true;
  }
  if (task.assigneeIds && task.assigneeIds.some(id => reporteeIds.includes(id))) {
    return true;
  }

  // 5. Operations Head viewing all operations tasks
  if (user.role === 'Operations Head') {
    const tDept = (task.departmentId || task.department || '').toLowerCase();
    const opsDepts = ['operations', 'warehouse', 'transportation', 'service', 'inventory', 'qc'];
    if (opsDepts.includes(tDept)) return true;
  }

  // 6. Department Manager viewing departmental tasks
  const userLevel = ROLE_HIERARCHY_LEVELS[user.role] || 99;
  if (userLevel <= 3 && task.departmentId === user.department) {
    return true;
  }

  return false;
}

/**
 * Checks if a user can review / approve a task
 */
export function canApproveTask(user, task) {
  if (!user || !task) return false;

  const role = user.role || '';
  if (role === 'Executive Director' || role === 'Director Operations' || role === 'General Manager') {
    return true;
  }

  const userId = String(user.id || user.uid || user.employeeId || '');
  const approvalMgr = String(task.approvalManagerId || '');
  const creator = String(task.createdById || task.createdBy || '');
  const assigned = String(task.assignedToId || task.assignedTo || '');

  // Direct creator or explicitly designated approval manager
  if (approvalMgr === userId || creator === userId) {
    return true;
  }

  // Operations Head can approve any task across Operations and its 4 branches
  if (role === 'Operations Head') {
    const tDept = (task.departmentId || task.department || '').toLowerCase();
    const opsDepts = ['operations', 'warehouse', 'transportation', 'service', 'inventory', 'qc'];
    if (opsDepts.includes(tDept)) return true;
  }

  // Warehouse In-charge can approve tasks in warehouse branch
  if (role === 'Warehouse In-charge') {
    const tDept = (task.departmentId || task.department || '').toLowerCase();
    if (tDept === 'warehouse' || tDept === 'operations') {
      const isHighPriority = task.priority === 'High' || task.priority === 'Urgent';
      if (creator === userId || isHighPriority) return true;
    }
  }

  // Warehouse Supervisor can approve Loading Staff tasks
  if (role === 'Warehouse Supervisor') {
    const tRole = task.assignedToRole || '';
    if (tRole === 'Loading Staff' || creator === userId) return true;
  }

  // Transport Manager can approve tasks in transport branch
  if (role === 'Transport Manager') {
    const tDept = (task.departmentId || task.department || '').toLowerCase();
    if (tDept === 'transportation' || tDept === 'operations') {
      const isHighPriority = task.priority === 'High' || task.priority === 'Urgent';
      if (creator === userId || isHighPriority) return true;
    }
  }

  // Transport Coordinator can approve Driver tasks
  if (role === 'Transport Coordinator') {
    const tRole = task.assignedToRole || '';
    if (tRole === 'Driver' || tRole === 'Delivery Partner' || creator === userId) return true;
  }

  // Service Manager can approve tasks in service branch
  if (role === 'Service Manager') {
    const tDept = (task.departmentId || task.department || '').toLowerCase();
    if (tDept === 'service' || tDept === 'operations') {
      const isHighPriority = task.priority === 'High' || task.priority === 'Urgent';
      if (creator === userId || isHighPriority) return true;
    }
  }

  // Service Coordinator can approve Technician tasks
  if (role === 'Service Coordinator') {
    const tRole = task.assignedToRole || '';
    if (tRole === 'Technician' || tRole === 'Service Technician' || creator === userId) return true;
  }

  // Inventory Supervisor can approve Storekeeper tasks
  if (role === 'Inventory Supervisor') {
    const tRole = task.assignedToRole || '';
    if (tRole === 'Storekeeper' || creator === userId) return true;
  }

  // Marketing roles
  if (role === 'Brand Manager') {
    const tDept = (task.departmentId || task.department || '').toLowerCase();
    if (tDept === 'marketing') return true;
  }

  if (role === 'Leads Coordinator') {
    const tDept = (task.departmentId || task.department || '').toLowerCase();
    const tRole = task.assignedToRole || '';
    if (tDept === 'marketing' && (tRole === 'Graphic Designer' || tRole === 'Photographer' || creator === userId)) {
      return true;
    }
  }

  // Finance & Accounts roles
  if (role === 'Accounts Manager' || role === 'Accounts Executive') {
    const tDept = (task.departmentId || task.department || '').toLowerCase();
    if (tDept === 'finance' || tDept === 'accounts') {
      return true;
    }
  }

  return false;
}

/**
 * Strict Day-Locking Rule for SOP & Company Tasks:
 */
export function isTaskLockedForUser(user, task) {
  if (!task) return false;

  // Executive Director, Director Operations, or General Manager can override/unlock
  if (user?.role === 'Executive Director' || user?.role === 'Director Operations' || user?.role === 'General Manager') {
    return false;
  }

  const today = new Date().toISOString().split('T')[0];
  const taskDate = task.taskDate || task.dueDate || task.deadlineDate;

  // Any task created for previous dates (before today) is strictly locked
  if (taskDate && taskDate < today) {
    return true;
  }

  // Completed or Cancelled tasks are locked for regular editing
  if (task.status === TASK_STATUSES.COMPLETED) {
    return true;
  }

  return false;
}
