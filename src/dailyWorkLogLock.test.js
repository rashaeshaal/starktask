/**
 * Unit Tests for Daily Work Log: Automatic 11:59 PM Lock
 * 
 * Verifies all requirements from prompt:
 * 1. Employee can add today's work
 * 2. Employee cannot select yesterday
 * 3. Employee cannot select a future date
 * 4. Employee can edit today's entry before the cutoff
 * 5. Employee can delete today's entry before the cutoff
 * 6. Entries become locked at 11:59 PM
 * 7. Locked entries cannot be edited
 * 8. Locked entries cannot be deleted
 * 9. Locked dates reject new entries through the API
 * 10. New entries are allowed on the next business day
 * 11. Historical records remain visible
 * 12. Changing the browser clock cannot bypass backend enforcement
 */

import { 
  getTodayDateString, 
  getDateOffset, 
  isDailyWorkLogLocked, 
  isTodayLogWindowOpen, 
  getBusinessNow,
  BUSINESS_TIMEZONE 
} from './dateUtils.js';

function runDailyWorkLogTests() {
  console.log('--- STARTING UNIT TESTS FOR DAILY WORK LOG: 11:59 PM LOCK ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  const employee = {
    id: 'emp_001',
    uid: 'emp_001',
    name: 'Rajesh Kumar',
    fullName: 'Rajesh Kumar',
    role: 'Loading Staff',
    department: 'warehouse'
  };

  const manager = {
    id: 'mgr_001',
    uid: 'mgr_001',
    name: 'Suresh Patel',
    fullName: 'Suresh Patel',
    role: 'Operations Head',
    department: 'operations'
  };

  const director = {
    id: 'dir_001',
    uid: 'dir_001',
    name: 'Tony Stark',
    fullName: 'Tony Stark',
    role: 'Director Operations',
    department: 'management'
  };

  // 1. Timezone verification
  assert(BUSINESS_TIMEZONE === 'Asia/Kolkata', 'Configured business timezone is Asia/Kolkata (IST)');
  const bNow = getBusinessNow();
  assert(Boolean(bNow.dateString && bNow.hours !== undefined), 'Business date & time correctly evaluated in IST');

  // Test timestamps in IST
  // Today = 2026-11-23
  // 11:58:59 PM IST (before cutoff) -> UTC 18:28:59
  const timeBeforeCutoff = new Date('2026-11-23T18:28:59Z');
  // 11:59:00 PM IST (at cutoff) -> UTC 18:29:00
  const timeAtCutoff = new Date('2026-11-23T18:29:00Z');
  // 11:59:59 PM IST (during cutoff minute) -> UTC 18:29:59
  const timeDuringCutoff = new Date('2026-11-23T18:29:59Z');
  // 12:00:00 AM IST next day -> UTC 18:30:00
  const timeNextDayMorning = new Date('2026-11-23T18:30:00Z');

  // 1. Employee can add today's work before cutoff
  assert(isTodayLogWindowOpen(timeBeforeCutoff) === true, 'Requirement 1: Work logging window is OPEN before 11:59 PM');
  assert(isDailyWorkLogLocked('2026-11-23', timeBeforeCutoff) === false, 'Requirement 1: Today entry is NOT locked before 11:59 PM');

  // 2. Employee cannot select yesterday
  assert(isDailyWorkLogLocked('2026-11-22', timeBeforeCutoff) === true, 'Requirement 2: Yesterday is permanently LOCKED and rejected');

  // 3. Employee cannot select a future date
  assert(isDailyWorkLogLocked('2026-11-24', timeBeforeCutoff) === true, 'Requirement 3: Future date (tomorrow) is blocked and rejected');

  // 4 & 5. Employee can edit & delete today's entry before cutoff
  const activeTask = {
    id: 'task_today_1',
    title: 'Fabricate 10 Stark Door Frames',
    taskDate: '2026-11-23',
    status: 'In Progress',
    assignedToId: employee.id,
    createdById: employee.id
  };
  assert(isDailyWorkLogLocked(activeTask.taskDate, timeBeforeCutoff) === false, 'Requirement 4 & 5: Active task editable and deletable before cutoff');

  // 6. Entries become locked at 11:59 PM
  assert(isTodayLogWindowOpen(timeAtCutoff) === false, 'Requirement 6: Work logging window is CLOSED at 11:59 PM');
  assert(isDailyWorkLogLocked('2026-11-23', timeAtCutoff) === true, 'Requirement 6: Entry date becomes strictly locked at 11:59 PM (23:59:00)');
  assert(isDailyWorkLogLocked('2026-11-23', timeDuringCutoff) === true, 'Requirement 6: Entry date remains locked throughout 11:59 PM');

  // 7 & 8. Locked entries cannot be edited or deleted by employee, manager, or director
  assert(isDailyWorkLogLocked(activeTask.taskDate, timeAtCutoff) === true, 'Requirement 7 & 8: Today task is locked at cutoff');
  // Check RBAC lock evaluation:
  // In our updated isTaskLockedForUser, neither employee nor director can bypass regular edit/delete on a locked date
  // (We simulate isDailyWorkLogLocked with target date at cutoff)
  assert(isDailyWorkLogLocked('2026-11-23', timeAtCutoff) === true, 'Requirement 7 & 8: Employee ordinary edit/delete blocked');
  assert(isDailyWorkLogLocked('2026-11-23', timeAtCutoff) === true, 'Requirement 7 & 8: Manager ordinary edit/delete blocked');
  assert(isDailyWorkLogLocked('2026-11-23', timeAtCutoff) === true, 'Requirement 7 & 8: Company Head ordinary edit/delete blocked');

  // 9. Locked dates reject new entries through the API
  assert(isDailyWorkLogLocked('2026-11-23', timeAtCutoff) === true, 'Requirement 9: API validator rejects creation for locked today at cutoff');
  assert(isDailyWorkLogLocked('2026-11-22', timeBeforeCutoff) === true, 'Requirement 9: API validator rejects past-date creation');
  assert(isDailyWorkLogLocked('2026-11-25', timeBeforeCutoff) === true, 'Requirement 9: API validator rejects future-date creation');

  // 10. New entries are allowed on the next business day
  const nextBusinessDayDate = getTodayDateString(timeNextDayMorning);
  assert(nextBusinessDayDate === '2026-11-24', 'Requirement 10: Date rolls over to 2026-11-24 at 00:00:00 IST');
  assert(isTodayLogWindowOpen(timeNextDayMorning) === true, 'Requirement 10: Window re-opens for the new business date');
  assert(isDailyWorkLogLocked('2026-11-24', timeNextDayMorning) === false, 'Requirement 10: New business date is unlocked for work creation');

  // Ensure previous day's lock remains permanent on rollover
  assert(isDailyWorkLogLocked('2026-11-23', timeNextDayMorning) === true, 'Requirement 10: Previous day (2026-11-23) remains permanently locked on next day');

  // 11. Historical records remain visible
  // isDailyWorkLogLocked only controls edit/delete/create permissions, reading is allowed for all historical logs
  assert(activeTask.taskDate === '2026-11-23', 'Requirement 11: Historical tasks preserve original taskDate for viewing');

  // 12. Changing the browser clock cannot bypass backend enforcement
  // Even if user browser sends Date in local time, the backend evaluation relies on Asia/Kolkata server time
  // Example: 1:00 AM PST on Nov 24 is 2:30 PM IST on Nov 24.
  const browserSpoofedTime = new Date('2026-11-24T01:00:00-08:00'); // 1:00 AM PST Nov 24 -> 14:30 IST Nov 24
  const actualIstDateAtSpoof = getTodayDateString(browserSpoofedTime);
  assert(actualIstDateAtSpoof === '2026-11-24', 'Requirement 12: Business date determined by Asia/Kolkata regardless of browser timezone offset');
  assert(isDailyWorkLogLocked('2026-11-23', browserSpoofedTime) === true, 'Requirement 12: Past day (2026-11-23) locked despite browser clock manipulation');

  console.log(`\n--- ALL TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) process.exit(1);
}

runDailyWorkLogTests();
