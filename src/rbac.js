import { ROLE_HIERARCHY_LEVELS, getReportees } from './orgStructure';
import { can, PERMISSIONS, canApproveTask as canApproveTaskPerm } from './permissions';
import { isDailyWorkLogLocked } from './dateUtils';

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
 * Checks if a user can review / approve a task.
 * Delegated to the single centralized universal implementation in permissions.js.
 * Enforces:
 * 1. Only direct reporting manager (approverId) can approve.
 * 2. Self-approval is strictly forbidden (actor cannot be assignedToId or completedById).
 * 3. No role has an override (including Company Heads).
 */
export function canApproveTask(user, task, allEmployees = [], leaveCovers = []) {
  return canApproveTaskPerm(user, task, allEmployees, leaveCovers);
}

/**
 * Strict Day-Locking Rule for SOP, Company Tasks & Daily Work Logs:
 * - Daily Work Logs and today's tasks can be edited / deleted until 11:59 PM today.
 * - From tomorrow onwards (or if past 11:59 PM), tasks are strictly locked and cannot be edited, modified, or deleted.
 * - Completed tasks are locked for regular editing.
 * - Neither employees nor managers can bypass the 11:59 PM daily lock for regular edit/delete.
 */
export function isTaskLockedForUser(user, task) {
  if (!task) return false;

  // Payment verification tasks are active workflow gates and remain actionable until cleared
  const isPayTask = task.taskType === 'Payment verification' ||
                    (task.title && task.title.toLowerCase().includes('payment token'));
  if (isPayTask && task.status !== TASK_STATUSES.COMPLETED && task.status !== 'Completed') {
    return false;
  }

  // Prefer the explicit creation / entry date for daily work log locking
  const taskDateRaw = task.taskDate || task.date || task.dueDate || task.deadlineDate;
  const taskDate = taskDateRaw ? String(taskDateRaw).split('T')[0] : null;

  // For work logs / daily entries, check strict 11:59 PM cutoff in business timezone
  if (isDailyWorkLogLocked(taskDate)) {
    return true;
  }

  // Completed or Cancelled tasks are locked for regular editing
  if (task.status === TASK_STATUSES.COMPLETED || task.status === 'Completed' || task.status === TASK_STATUSES.CANCELLED) {
    return true;
  }

  return false;
}
