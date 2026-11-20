// src/taskHelpers.js
// Shared helpers for Tasks module in STARK STEEL SalesDoor Enterprise

import { getTodayDateString, getDateOffset } from './dateUtils';
import { TASK_STATUSES, TASK_PRIORITIES } from './rbac';

/**
 * Format names to Title Case cleanly
 * e.g. "BINSHA E S" -> "Binsha E S", "SHAMNA" -> "Shamna"
 */
export function formatName(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => {
      if (!word) return '';
      if (word.includes('-')) {
        return word.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('-');
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Humanize department names
 */
export function formatDepartment(dept) {
  if (!dept) return 'Operations';
  const d = String(dept).toLowerCase().trim().replace(/[\s-]+/g, '_');
  
  if (d === 'hr_admin' || d === 'hr') return 'HR & Admin';
  if (d === 'management' || d === 'exec' || d === 'executive') return 'Management';
  if (d === 'finance' || d === 'fin' || d === 'accounts') return 'Finance & Accounts';
  if (d === 'operations' || d === 'ops') return 'Operations';
  if (d === 'warehouse' || d === 'wh') return 'Warehouse';
  if (d === 'transportation' || d === 'trans') return 'Transportation';
  if (d === 'service' || d === 'serv') return 'Service';
  if (d === 'inventory' || d === 'inv') return 'Inventory';
  if (d === 'marketing' || d === 'mkt') return 'Marketing';
  if (d === 'qc' || d === 'quality_control') return 'Quality Control';
  if (d === 'sales') return 'Sales';

  return formatName(dept.replace(/_/g, ' '));
}

/**
 * Due date label helper: "Today", "Tomorrow", "Yesterday", or formatted date
 */
export function formatDue(dateStr) {
  if (!dateStr) return { label: '—', isOverdue: false, isToday: false };
  const todayStr = getTodayDateString();
  const yesterdayStr = getDateOffset(-1);
  const tomorrowStr = getDateOffset(1);

  const clean = String(dateStr).split('T')[0].split(' ')[0];
  const isOverdue = clean < todayStr;
  const isToday = clean === todayStr;

  if (clean === todayStr) return { label: 'Today', isOverdue: false, isToday: true };
  if (clean === tomorrowStr) return { label: 'Tomorrow', isOverdue: false, isToday: false };
  if (clean === yesterdayStr) return { label: 'Yesterday', isOverdue: true, isToday: false };

  try {
    const parts = clean.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return {
          label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          isOverdue,
          isToday: false
        };
      }
    }
  } catch {}

  return { label: clean, isOverdue, isToday: false };
}

/**
 * Status style mapping
 * Pending = amber-50/amber-700
 * In Progress = blue-50/blue-700
 * Completed = emerald-50/emerald-700
 * Overdue = red-50/red-700
 */
export const STATUS_CONFIG = {
  [TASK_STATUSES.ASSIGNED]: {
    label: 'Pending',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500'
  },
  'Pending': {
    label: 'Pending',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500'
  },
  [TASK_STATUSES.IN_PROGRESS]: {
    label: 'In Progress',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500'
  },
  'In Progress': {
    label: 'In Progress',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500'
  },
  [TASK_STATUSES.PENDING_REVIEW]: {
    label: 'In Review',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500'
  },
  'In Review': {
    label: 'In Review',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500'
  },
  [TASK_STATUSES.COMPLETED]: {
    label: 'Completed',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-600'
  },
  'Completed': {
    label: 'Completed',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-600'
  },
  [TASK_STATUSES.BLOCKED]: {
    label: 'Blocked',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500'
  },
  'Blocked': {
    label: 'Blocked',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500'
  },
  'overdue': {
    label: 'Overdue',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-600'
  }
};

/**
 * Priority style mapping
 * Low = slate, Medium = amber, High = orange, Urgent = red
 */
export const PRIORITY_CONFIG = {
  low: {
    label: 'Low',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200'
  },
  medium: {
    label: 'Medium',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200'
  },
  high: {
    label: 'High',
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200'
  },
  urgent: {
    label: 'Urgent',
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200'
  },
  critical: {
    label: 'Urgent',
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200'
  }
};

/**
 * Safe pluralize
 */
export function pluralize(count, singular, plural = `${singular}s`) {
  const n = Number(count) || 0;
  return `${n} ${n === 1 ? singular : plural}`;
}

