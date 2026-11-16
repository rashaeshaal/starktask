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
  PENDING_REVIEW: 'Pending Review', // Submitted for completion approval
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

  // 1. Executive Director & GM have 100% company-wide visibility
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

  // 4. Reporting manager of any assignee (Visibility for employee's manager in cross-dept tasks)
  const reportees = getReportees(user.id, allUsers);
  const reporteeIds = reportees.map(r => r.id);
  if (reporteeIds.includes(task.assignedToId)) {
    return true;
  }
  if (task.assigneeIds && task.assigneeIds.some(id => reporteeIds.includes(id))) {
    return true;
  }

  // 5. Department Manager viewing departmental tasks
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

  if (user.role === 'Executive Director' || user.role === 'Director Operations' || user.role === 'General Manager') {
    return true;
  }

  if (task.approvalManagerId === user.id || task.createdById === user.id) {
    return true;
  }

  return false;
}

/**
 * Strict Day-Locking Rule for SOP & Company Tasks:
 * Tasks belonging to today (or past days) cannot be edited or modified by employees tomorrow.
 * After 11:59:59 PM of the task date, it is permanently locked and read-only.
 * Only Executive Director, Director Operations, or General Manager can unlock or review past tasks.
 */
export function isTaskLockedForUser(user, task) {
  if (!task) return false;

  // Executive Director, Director Operations, or General Manager can override/unlock
  if (user?.role === 'Executive Director' || user?.role === 'Director Operations' || user?.role === 'General Manager') {
    return false;
  }

  const today = new Date().toISOString().split('T')[0];
  const taskDate = task.taskDate || task.dueDate || task.deadlineDate;

  // Any task created for previous dates (before today) is strictly locked!
  if (taskDate && taskDate < today) {
    return true; // Permanently locked for employees past midnight
  }

  // Completed or Cancelled tasks are locked for regular editing (require manager reopen)
  if (task.status === TASK_STATUSES.COMPLETED) {
    return true;
  }

  return false;
}

