/**
 * Utility functions for date calculations
 * Configured business timezone: Asia/Kolkata (IST, UTC+5:30)
 */

export const BUSINESS_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns current business date and time broken down in Asia/Kolkata
 */
export function getBusinessNow(dateObj = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(dateObj);

  const m = {};
  parts.forEach(p => {
    m[p.type] = p.value;
  });

  return {
    year: m.year,
    month: m.month,
    day: m.day,
    dateString: `${m.year}-${m.month}-${m.day}`,
    hours: parseInt(m.hour, 10),
    minutes: parseInt(m.minute, 10),
    seconds: parseInt(m.second, 10)
  };
}

export function getTodayDateString(dateObj = new Date()) {
  return getBusinessNow(dateObj).dateString;
}

export function getDateOffset(days, fromDateObj = new Date()) {
  const d = new Date(fromDateObj);
  d.setDate(d.getDate() + days);
  return getTodayDateString(d);
}

/**
 * Checks if a specific task or target date is locked according to daily 11:59 PM rules.
 * Deadline: 11:59 PM (23:59) on the entry date in Asia/Kolkata.
 * 
 * Rules:
 * - Past dates (< today): permanently locked
 * - Today: unlocked before 23:59, locked at 23:59:00+
 * - Future dates (> today): not allowed for daily work log (locked/invalid)
 */
export function isDailyWorkLogLocked(targetDate, checkTime = new Date()) {
  if (!targetDate) return true;
  const dateStr = String(targetDate).split('T')[0];
  const bNow = getBusinessNow(checkTime);

  // 1. Any past date is strictly and permanently locked
  if (dateStr < bNow.dateString) {
    return true;
  }

  // 2. Future dates are blocked/locked for daily work logging
  if (dateStr > bNow.dateString) {
    return true;
  }

  // 3. For today's date: locked once 11:59 PM (23:59) cutoff is reached
  if (bNow.hours === 23 && bNow.minutes >= 59) {
    return true;
  }

  return false;
}

/**
 * Checks whether the current daily work logging window is open for today.
 * True until 23:58:59, False from 23:59:00 onwards.
 */
export function isTodayLogWindowOpen(checkTime = new Date()) {
  const bNow = getBusinessNow(checkTime);
  return !(bNow.hours === 23 && bNow.minutes >= 59);
}


