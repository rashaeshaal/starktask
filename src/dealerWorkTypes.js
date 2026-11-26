// src/dealerWorkTypes.js
// Single source of truth for daily dealer-work task types and order target metrics

export const TASK_TYPE_DEALER_VISIT = 'DEALER VISIT';
export const TASK_TYPE_ORDER_TAKEN = 'ORDER TAKEN';
export const TASK_TYPE_DEALER_REPLY = 'DEALER REPLY';
export const TASK_TYPE_QUOTATION = 'QUOTATION';
export const LEGACY_ORDER_CONFIRMATION = 'Order confirmation';

export const DEALER_VISIT_PURPOSES = [
  'Order discussion',
  'Payment follow-up',
  'Display or stock check',
  'New dealer',
  'Other'
];

export const DEALER_REPLY_STATUSES = ['Yes', 'No', 'Pending'];

export const DEALER_REPLY_OUTCOMES = [
  'Order promised',
  'Needs follow-up',
  'Not interested',
  'Payment promised',
  'Issue raised'
];

export const QUOTATION_STATUSES = ['Sent', 'Negotiating', 'Won', 'Lost'];

export const ESCALATION_DEPARTMENTS = [
  { id: 'operations', name: 'Operations', headRole: 'Operations Head', types: ['vehicle', 'dispatch', 'loading'] },
  { id: 'finance', name: 'Finance', headRole: 'Accounts Executive', types: ['credit', 'payment', 'refund'] },
  { id: 'admin', name: 'HR & Admin', headRole: 'HR Manager', types: ['address or PIN', 'dealer registration'] }
];

/**
 * Checks if a task is an order-counted task
 */
export function isOrderCountedTask(task) {
  if (!task) return false;
  const t = (task.taskType || task.type || task.title || '').trim();
  return t === TASK_TYPE_ORDER_TAKEN || t === LEGACY_ORDER_CONFIRMATION;
}

/**
 * Computes monthly orders sum for an employee in Asia/Kolkata timezone
 */
export function computeMonthlyOrders(tasks = [], employeeId, yearMonthStr = null) {
  const targetMonth = yearMonthStr || new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit'
  }).format(new Date()); // YYYY-MM

  return tasks.reduce((sum, task) => {
    if (!isOrderCountedTask(task)) return sum;
    const isDone = task.status === 'Completed' || task.status === 'completed';
    if (!isDone) return sum;

    const assignee = String(task.assignedToId || task.assignedTo || task.ownerId || '');
    if (employeeId && assignee !== String(employeeId)) return sum;

    const compDate = task.completedAt?.toDate ? task.completedAt.toDate() : (task.completedAt ? new Date(task.completedAt) : null);
    if (!compDate) return sum;

    const taskMonth = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit'
    }).format(compDate);

    if (taskMonth === targetMonth) {
      const count = Number(task.orderCount) || 1;
      return sum + Math.max(1, Math.min(50, count));
    }
    return sum;
  }, 0);
}

