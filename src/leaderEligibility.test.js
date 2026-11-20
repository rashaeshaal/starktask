/**
 * Unit Tests for Leader Eligibility and Company Head Permissions
 * Verifies Override: DIRECTOR OPERATIONS IS THE COMPANY HEAD
 * 1. Director Operations edits Executive Director (allowed, logged)
 * 2. Director Operations deactivates self (blocked)
 * 3. Deactivating the last active company head (blocked)
 * 4. Deactivating another company head when multiple exist (allowed with confirmation & audit log)
 * 5. Archive department with active employees (blocked for everyone including company heads)
 * 6. Delete team with active tasks (blocked for everyone including company heads)
 * 7. Change own role/level/designation (blocked for everyone including company heads)
 * 8. Leader eligibility: Both company heads pick L1-L4 in any department, including themselves
 */

import { getAllowedLeadersForDepartment, MIN_LEADER_LEVEL, MAX_LEADER_LEVEL, normalizeRole, getRoleLevel, validateTeamPlacement } from './orgTree.js';
import { can, PERMISSIONS, isCompanyHead, COMPANY_HEAD_ROLES } from './permissions.js';

function runTests() {
  console.log('--- STARTING UNIT TESTS FOR COMPANY HEAD AUTHORITY & RBAC ---');
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

  // 1. Company Head Roles Verification
  assert(COMPANY_HEAD_ROLES.includes('Executive Director'), 'Executive Director is a company head');
  assert(COMPANY_HEAD_ROLES.includes('Director Operations'), 'Director Operations is a company head');
  assert(isCompanyHead('Executive Director') === true, 'isCompanyHead resolves true for Executive Director');
  assert(isCompanyHead('Director Operations') === true, 'isCompanyHead resolves true for Director Operations');
  assert(isCompanyHead('Operations Head') === false, 'isCompanyHead resolves false for Operations Head');

  // Personas
  const execDir = { id: 'u_exec', role: 'Executive Director', department: 'management', level: 1 };
  const dirOps = { id: 'u_dirops', role: 'Director Operations', department: 'management', level: 2 };
  const hrMgr = { id: 'u_hrmgr', role: 'HR Manager', department: 'hr_admin', level: 3 };
  const opsHead = { id: 'u_opshead', role: 'Operations Head', department: 'operations', level: 3 };
  const frontline = { id: 'u_front', role: 'Loading Staff', department: 'warehouse', level: 6 };

  // 2. Director Operations can manage Executive Director (L1)
  assert(can(dirOps, PERMISSIONS.EMPLOYEE_EDIT, execDir) === true, 'Director Operations CAN edit Executive Director');
  assert(can(dirOps, PERMISSIONS.EMPLOYEE_RESET_PASSWORD, execDir) === true, 'Director Operations CAN reset password of Executive Director');
  assert(can(dirOps, PERMISSIONS.EMPLOYEE_DEACTIVATE, { ...execDir, activeCompanyHeadsCount: 2 }) === true, 'Director Operations CAN deactivate Executive Director if multiple heads exist');

  // 3. Safety Rule 1b: Director Operations CANNOT deactivate self
  assert(can(dirOps, PERMISSIONS.EMPLOYEE_DEACTIVATE, dirOps) === false, 'Safety Rule: Director Operations CANNOT deactivate self');
  assert(can(execDir, PERMISSIONS.EMPLOYEE_DEACTIVATE, execDir) === false, 'Safety Rule: Executive Director CANNOT deactivate self');

  // 4. Safety Rule 1e: The system must always keep at least one active company head
  assert(can(dirOps, PERMISSIONS.EMPLOYEE_DEACTIVATE, { ...execDir, activeCompanyHeadsCount: 1 }) === false, 'Safety Rule: Deactivating the last active company head is BLOCKED');

  // 5. Safety Rule 1a: Cannot change their own role, level or designation
  assert(can(dirOps, PERMISSIONS.EMPLOYEE_EDIT, { ...dirOps, isRoleChange: true }) === false, 'Safety Rule: Director Operations CANNOT change own role/level');
  assert(can(execDir, PERMISSIONS.EMPLOYEE_EDIT, { ...execDir, isRoleChange: true }) === false, 'Safety Rule: Executive Director CANNOT change own role/level');
  assert(can(dirOps, PERMISSIONS.EMPLOYEE_EDIT, { id: 'u_other', role: 'Staff', isRoleChange: true }) === true, 'Director Operations CAN change other employees role');

  // 6. Safety Rule 1c: Cannot archive a department that still has active employees
  assert(can(dirOps, PERMISSIONS.DEPARTMENT_ARCHIVE, { activeEmployeesCount: 3 }) === false, 'Safety Rule: Company Head CANNOT archive department with active employees');
  assert(can(execDir, PERMISSIONS.DEPARTMENT_ARCHIVE, { activeEmployeesCount: 1 }) === false, 'Safety Rule: Executive Director CANNOT archive department with active employees');
  assert(can(dirOps, PERMISSIONS.DEPARTMENT_ARCHIVE, { activeEmployeesCount: 0 }) === true, 'Company Head CAN archive department with 0 active employees');

  // 7. Safety Rule 1d: Cannot delete a team that still has active tasks
  assert(can(dirOps, PERMISSIONS.TEAM_DELETE, { activeTasksCount: 2 }) === false, 'Safety Rule: Company Head CANNOT delete team with active tasks');
  assert(can(execDir, PERMISSIONS.TEAM_DELETE, { activeTasksCount: 5 }) === false, 'Safety Rule: Executive Director CANNOT delete team with active tasks');
  assert(can(dirOps, PERMISSIONS.TEAM_DELETE, { activeTasksCount: 0 }) === true, 'Company Head CAN delete team with 0 active tasks');

  // 8. Leader Eligibility: Both Company Heads pick L1 to L4 in any department including themselves
  const dirOpsLeaders = getAllowedLeadersForDepartment('sales', dirOps);
  assert(dirOpsLeaders.includes('Executive Director'), 'Director Operations can pick L1 Executive Director');
  assert(dirOpsLeaders.includes('Director Operations'), 'Director Operations can pick themselves (L2)');
  assert(dirOpsLeaders.includes('CSO'), 'Director Operations can pick L3 CSO in sales');
  assert(dirOpsLeaders.includes('SSM'), 'Director Operations can pick L4 SSM in sales');
  assert(!dirOpsLeaders.includes('Loading Staff'), 'Director Operations cannot pick L6 frontline');

  const execDirLeaders = getAllowedLeadersForDepartment('warehouse', execDir);
  assert(execDirLeaders.includes('Director Operations'), 'Executive Director can pick Director Operations');
  assert(execDirLeaders.includes('Executive Director'), 'Executive Director can pick themselves');

  // 9. Day Unlock & Override: Both Company Heads can unlock closed days
  assert(can(dirOps, PERMISSIONS.DAY_UNLOCK) === true, 'Director Operations CAN unlock closed days');
  assert(can(execDir, PERMISSIONS.DAY_UNLOCK) === true, 'Executive Director CAN unlock closed days');
  assert(can(hrMgr, PERMISSIONS.DAY_UNLOCK) === false, 'HR Manager CANNOT unlock closed days');

  console.log(`--- TEST RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) process.exit(1);
}

runTests();
