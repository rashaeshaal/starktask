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
import { can, PERMISSIONS, isCompanyHead, COMPANY_HEAD_ROLES, canUserAssignTo, resolveTaskApproverId, canApproveTask } from './permissions.js';
import { buildHierarchy } from './orgHelpers.js';
import { isOrderCountedTask, computeMonthlyOrders } from './dealerWorkTypes.js';
import { calculateDealerHealth } from './config/fieldSalesConfig.js';
import { getLoadingMilestoneProgress, isWarehouseTask, WAREHOUSE_TASK_IDS } from './warehouseWorkTypes.js';
import { isTransportationTask, TRANSPORTATION_TASK_IDS } from './transportationWorkTypes.js';

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

  // 10. CSO DECISIONS & SCOPE TESTS
  const csoUser = { id: 'emp_102', employeeId: '102', role: 'Chief Sales Officer', designation: 'CSO', department: 'sales', reportingManagerId: '101' };
  const ssmUser = { id: 'emp_103', employeeId: '103', role: 'State Sales Manager', designation: 'SSM', department: 'sales', reportingManagerId: '102' };
  const ssmOtherZone = { id: 'emp_105', employeeId: '105', role: 'State Sales Manager', designation: 'SSM', department: 'sales', reportingManagerId: '101' }; // Other zone
  const coordOutsideChain = { id: 'emp_109', employeeId: '109', role: 'Sales Coordinator', designation: 'Sales Coordinator', department: 'sales', reportingManagerId: '199' }; // Outside chain
  const warehouseEmp = { id: 'emp_166', employeeId: '166', role: 'Warehouse In-charge', department: 'warehouse' };
  const financeEmp = { id: 'emp_106', employeeId: '106', role: 'Accounts Manager', department: 'finance' };
  const opsHeadTarget = { id: 'emp_113', employeeId: '113', role: 'Operations Head', department: 'operations' };

  // A. Assignment scope: CSO assigns to SSM in another zone (allowed) & Sales Coordinator outside chain (allowed)
  assert(canUserAssignTo(csoUser, ssmOtherZone, [csoUser, ssmUser, ssmOtherZone, coordOutsideChain, warehouseEmp, financeEmp, opsHeadTarget]) === true, 'CSO CAN assign to an SSM in another zone (allowed)');
  assert(canUserAssignTo(csoUser, coordOutsideChain, [csoUser, ssmUser, ssmOtherZone, coordOutsideChain, warehouseEmp, financeEmp, opsHeadTarget]) === true, 'CSO CAN assign to a Sales Coordinator outside the chain (allowed)');

  // B. Assignment scope: CSO assigns to Warehouse employee (blocked), to Finance employee (blocked), to Operations Head (blocked)
  assert(canUserAssignTo(csoUser, warehouseEmp, [csoUser, ssmUser, ssmOtherZone, coordOutsideChain, warehouseEmp, financeEmp, opsHeadTarget]) === false, 'CSO CANNOT assign to a Warehouse employee (blocked)');
  assert(canUserAssignTo(csoUser, financeEmp, [csoUser, ssmUser, ssmOtherZone, coordOutsideChain, warehouseEmp, financeEmp, opsHeadTarget]) === false, 'CSO CANNOT assign to a Finance employee (blocked)');
  assert(canUserAssignTo(csoUser, opsHeadTarget, [csoUser, ssmUser, ssmOtherZone, coordOutsideChain, warehouseEmp, financeEmp, opsHeadTarget]) === false, 'CSO CANNOT assign to the Operations Head (blocked; use Escalation instead)');

  // C. Profile edit blocked for CSO (Request change works) & cannot view Finance employee
  assert(can(csoUser, PERMISSIONS.EMPLOYEE_EDIT, coordOutsideChain) === false, 'CSO CANNOT directly edit Sales employee profile (blocked; HR only)');
  assert(can(csoUser, PERMISSIONS.EMPLOYEE_VIEW, financeEmp) === false, 'CSO CANNOT view non-Sales Finance employee (blocked)');
  assert(can(csoUser, PERMISSIONS.EMPLOYEE_VIEW, coordOutsideChain) === true, 'CSO CAN view Sales Coordinator (allowed)');

  // D. Team creation: CSO creates a Sales team with a member outside the direct chain (allowed)
  const salesTeamWithOutsideMember = { departmentId: 'sales', department: 'sales', leaderRole: 'SSM' };
  assert(can(csoUser, PERMISSIONS.TEAM_CREATE, salesTeamWithOutsideMember) === true, 'CSO CAN create a Sales team with a Sales member outside chain (allowed)');
  assert(can(csoUser, PERMISSIONS.TEAM_CREATE, { departmentId: 'finance' }) === false, 'CSO CANNOT create a Finance team (blocked)');

  // E. Director Operations can assign to CSO
  assert(canUserAssignTo(dirOps, csoUser, [dirOps, csoUser]) === true, 'Director Operations CAN assign to the CSO');

  // F. Reporting line: CSO sits directly under Director Operations in hierarchy tree
  const treeDirOps = { id: 'emp_101', employeeId: '101', role: 'Director Operations', level: 2 };
  const treeResult = buildHierarchy([treeDirOps, csoUser, ssmUser]);
  const dirOpsNode = treeResult.rootNodes.find(n => n.id === 'emp_101' || n.employeeId === '101');
  assert(dirOpsNode && dirOpsNode.children.some(c => c.id === 'emp_102' || c.employeeId === '102'), 'Hierarchy tree shows CSO directly under Director Operations');

  // G. Field Sales & Daily Dealer Work Tests
  const orderTakenTask = { id: 't1', taskType: 'ORDER TAKEN', orderCount: 3, status: 'Completed', completedAt: new Date().toISOString(), assignedToId: '103' };
  const visitTask = { id: 't2', taskType: 'DEALER VISIT', orderCount: 1, status: 'Completed', completedAt: new Date().toISOString(), assignedToId: '103' };
  const replyTask = { id: 't3', taskType: 'DEALER REPLY', orderCount: 1, status: 'Completed', completedAt: new Date().toISOString(), assignedToId: '103' };
  const legacyOrderTask = { id: 't4', taskType: 'Order confirmation', orderCount: 2, status: 'Completed', completedAt: new Date().toISOString(), assignedToId: '103' };

  assert(isOrderCountedTask(orderTakenTask) === true, 'ORDER TAKEN task is recognized as order-counted');
  assert(isOrderCountedTask(legacyOrderTask) === true, 'Legacy Order confirmation task is recognized as order-counted');
  assert(isOrderCountedTask(visitTask) === false, 'DEALER VISIT task is NOT order-counted');
  assert(isOrderCountedTask(replyTask) === false, 'DEALER REPLY task is NOT order-counted');

  const monthlyOrders = computeMonthlyOrders([orderTakenTask, visitTask, replyTask, legacyOrderTask], '103');
  assert(monthlyOrders === 5, `ORDER TAKEN (3) + Legacy (2) totals 5 orders (actual: ${monthlyOrders})`);

  // Dealer Health calculation
  const mockDealer = { id: 'd1', name: 'Test Dealer' };
  const healthyStats = calculateDealerHealth(mockDealer, [visitTask], [orderTakenTask], []);
  assert(healthyStats.status === 'Healthy', 'Dealer with recent visit and orders is Healthy');

  const atRiskStats = calculateDealerHealth(mockDealer, [], [], [{ status: 'Open' }]);
  assert(atRiskStats.status === 'At risk', 'Dealer with no visits and open issues is At risk');

  // H. Universal Direct Reporting Manager Approval & Strict Self-Approval Rules
  const coordinatorEmp = { id: 'coord_1', role: 'Sales Coordinator', reportingManagerId: 'asm_1' };
  const asmEmp = { id: 'asm_1', role: 'Assistant Sales Manager', reportingManagerId: 'ssm_1' };
  const ssmEmp = { id: 'ssm_1', role: 'Senior Sales Manager', reportingManagerId: 'cso_1' };
  const csoEmp = { id: 'cso_1', role: 'Chief Sales Officer', reportingManagerId: 'head_ops' };
  const dirOpsEmp = { id: 'head_ops', role: 'Director Operations', reportingManagerId: 'head_ed', status: 'active' };
  const execDirEmp = { id: 'head_ed', role: 'Executive Director', reportingManagerId: null, status: 'active' };
  const orgEmployees = [coordinatorEmp, asmEmp, ssmEmp, csoEmp, dirOpsEmp, execDirEmp];

  // 1. Coordinator completes task: approver is direct manager ASM
  const coordTask = { id: 't_coord', assignedToId: 'coord_1', status: 'Pending Review' };
  const resolvedApprover1 = resolveTaskApproverId(coordTask, orgEmployees);
  assert(resolvedApprover1 === 'asm_1', 'Coordinator task routes to direct reporting manager ASM');
  assert(canApproveTask(asmEmp, coordTask, orgEmployees) === true, 'ASM can approve coordinator task');
  assert(canApproveTask(coordinatorEmp, coordTask, orgEmployees) === false, 'Coordinator CANNOT approve own task (self-approval ban)');
  assert(canApproveTask(ssmEmp, coordTask, orgEmployees) === false, 'SSM CANNOT bypass ASM to approve coordinator task directly');
  assert(canApproveTask(csoEmp, coordTask, orgEmployees) === false, 'CSO CANNOT bypass ASM to approve coordinator task directly');
  assert(canApproveTask(dirOpsEmp, coordTask, orgEmployees) === false, 'Company Head CANNOT bypass ASM without approval authority');

  // 2. Self-approval blocked for manager even if creator
  const asmTask = { id: 't_asm', assignedToId: 'asm_1', createdById: 'asm_1', status: 'Pending Review' };
  assert(canApproveTask(asmEmp, asmTask, orgEmployees) === false, 'ASM CANNOT approve task assigned to self');
  const resolvedAsmApprover = resolveTaskApproverId(asmTask, orgEmployees);
  assert(resolvedAsmApprover === 'ssm_1', 'ASM task routes to direct manager SSM');
  assert(canApproveTask(ssmEmp, asmTask, orgEmployees) === true, 'SSM can approve ASM task');

  // 3. Fallback when reporting manager completed the task on behalf of employee
  const coordTaskDoneByAsm = { id: 't_proxy', assignedToId: 'coord_1', completedById: 'asm_1', status: 'Pending Review' };
  const resolvedProxyApprover = resolveTaskApproverId(coordTaskDoneByAsm, orgEmployees);
  assert(resolvedProxyApprover === 'ssm_1', 'When direct manager is completer, approval ascends to next manager up (SSM)');
  assert(canApproveTask(asmEmp, coordTaskDoneByAsm, orgEmployees) === false, 'Completing manager CANNOT approve (self-approval ban on completedById)');
  assert(canApproveTask(ssmEmp, coordTaskDoneByAsm, orgEmployees) === true, 'Next manager up (SSM) can approve proxy-completed task');

  // 4. Stand-in cover for manager on leave
  const leaveCovers = [{
    originalManagerId: 'asm_1',
    standInEmployeeId: 'standin_1',
    status: 'active',
    startDate: '2020-01-01',
    endDate: '2030-12-31'
  }];
  const standInEmp = { id: 'standin_1', role: 'Assistant Sales Manager' };
  const resolvedCoverApprover = resolveTaskApproverId(coordTask, orgEmployees, leaveCovers);
  assert(resolvedCoverApprover === 'standin_1', 'When manager is on leave, active stand-in becomes approver');
  assert(canApproveTask(standInEmp, coordTask, orgEmployees, leaveCovers) === true, 'Stand-in can approve during leave cover');

  // 5. Stand-in completing work cannot approve own work
  const standInOwnTask = { id: 't_standin', assignedToId: 'coord_1', completedById: 'standin_1', status: 'Pending Review' };
  assert(canApproveTask(standInEmp, standInOwnTask, orgEmployees, leaveCovers) === false, 'Stand-in CANNOT approve task they completed');

  // 6. Top of Chain: Company Head approvals route to other Company Head
  const dirOpsTask = { id: 't_dirops', assignedToId: 'head_ops', status: 'Pending Review' };
  const resolvedHeadApprover = resolveTaskApproverId(dirOpsTask, orgEmployees);
  assert(resolvedHeadApprover === 'head_ed', 'Director Operations task routes to Executive Director for approval');
  assert(canApproveTask(execDirEmp, dirOpsTask, orgEmployees) === true, 'Executive Director can approve Director Operations task');
  assert(canApproveTask(dirOpsEmp, dirOpsTask, orgEmployees) === false, 'Director Operations CANNOT approve own task');

  // I. Warehouse Task Hierarchy & Milestone Execution Tests
  const whLoadingStaff = { id: 'load_1', role: 'Loading Staff', reportingManagerId: 'wh_sup_1' };
  const whSupervisor = { id: 'wh_sup_1', role: 'Warehouse Supervisor', reportingManagerId: 'wh_inc_1' };
  const whInCharge = { id: 'wh_inc_1', role: 'Warehouse In-charge', reportingManagerId: 'head_ops' };
  const whOrg = [whLoadingStaff, whSupervisor, whInCharge, dirOpsEmp];

  // 1. Loading Staff task approved by Warehouse Supervisor
  const loadStaffTask = { id: 't_load_staff', templateId: WAREHOUSE_TASK_IDS.LOADING, assignedToId: 'load_1', status: 'Pending Review' };
  assert(isWarehouseTask(loadStaffTask) === true, 'Warehouse task is correctly identified');
  const approverLoadStaff = resolveTaskApproverId(loadStaffTask, whOrg);
  assert(approverLoadStaff === 'wh_sup_1', 'Loading Staff task routes to Warehouse Supervisor for approval');
  assert(canApproveTask(whSupervisor, loadStaffTask, whOrg) === true, 'Warehouse Supervisor can approve Loading Staff task');
  assert(canApproveTask(whLoadingStaff, loadStaffTask, whOrg) === false, 'Loading Staff cannot self-approve own task');

  // 2. Warehouse Supervisor task approved by Warehouse In-charge
  const supTask = { id: 't_sup', templateId: WAREHOUSE_TASK_IDS.PICKING, assignedToId: 'wh_sup_1', status: 'Pending Review' };
  const approverSup = resolveTaskApproverId(supTask, whOrg);
  assert(approverSup === 'wh_inc_1', 'Warehouse Supervisor task routes to Warehouse In-charge for approval');
  assert(canApproveTask(whInCharge, supTask, whOrg) === true, 'Warehouse In-charge can approve Warehouse Supervisor task');
  assert(canApproveTask(whSupervisor, supTask, whOrg) === false, 'Warehouse Supervisor cannot self-approve own task');

  // 3. Loading Milestones: 20 -> 40 -> 60 -> 70
  const progress10 = getLoadingMilestoneProgress(10);
  assert(progress10.currentMilestone === 0 && progress10.nextMilestone === 20, '10 doors: milestone is 0, next is 20');
  const progress45 = getLoadingMilestoneProgress(45);
  assert(progress45.currentMilestone === 40 && progress45.nextMilestone === 60, '45 doors: current milestone is 40, next is 60');
  const progress70 = getLoadingMilestoneProgress(70);
  assert(progress70.currentMilestone === 70 && progress70.percent === 100, '70 doors: 100% milestone reached');

  // J. Transportation Hierarchy & Approval Routing Tests
  const transDriver = { id: 'driver_1', role: 'Driver', reportingManagerId: 'coord_trans_1', department: 'transportation' };
  const transCoordinator = { id: 'coord_trans_1', role: 'Transport Coordinator', reportingManagerId: 'mgr_trans_1', department: 'transportation' };
  const transManager = { id: 'mgr_trans_1', role: 'Transport Manager', reportingManagerId: 'ops_head_node', department: 'transportation' };
  const transOpsHead = { id: 'ops_head_node', role: 'Operations Head', reportingManagerId: 'head_ops_dir', department: 'operations' };
  const transOrg = [transDriver, transCoordinator, transManager, transOpsHead];

  // 1. Identification of Transportation Task
  const driverDeliveryTask = { id: 't_driver_deliv', templateId: TRANSPORTATION_TASK_IDS.DELIVERY, assignedToId: 'driver_1', status: 'Pending Review' };
  assert(isTransportationTask(driverDeliveryTask) === true, 'Transportation delivery task is correctly identified');

  // 2. Driver delivery task routes to Transport Coordinator
  const approverDriverTask = resolveTaskApproverId(driverDeliveryTask, transOrg);
  assert(approverDriverTask === 'coord_trans_1', 'Driver delivery task routes to Transport Coordinator for approval');
  assert(canApproveTask(transCoordinator, driverDeliveryTask, transOrg) === true, 'Transport Coordinator can approve Driver delivery task');
  assert(canApproveTask(transDriver, driverDeliveryTask, transOrg) === false, 'Driver cannot self-approve own delivery task');

  // 3. Transport Coordinator task routes to Transport Manager
  const coordDispatchTask = { id: 't_coord_disp', templateId: TRANSPORTATION_TASK_IDS.DISPATCH_CLEARANCE, assignedToId: 'coord_trans_1', status: 'Pending Review' };
  const approverCoordTask = resolveTaskApproverId(coordDispatchTask, transOrg);
  assert(approverCoordTask === 'mgr_trans_1', 'Transport Coordinator task routes to Transport Manager for approval');
  assert(canApproveTask(transManager, coordDispatchTask, transOrg) === true, 'Transport Manager can approve Transport Coordinator task');
  assert(canApproveTask(transCoordinator, coordDispatchTask, transOrg) === false, 'Transport Coordinator cannot self-approve own task');

  // 4. Transport Manager task routes to Operations Head
  const managerReadinessTask = { id: 't_mgr_ready', templateId: TRANSPORTATION_TASK_IDS.READINESS, assignedToId: 'mgr_trans_1', status: 'Pending Review' };
  const approverMgrTask = resolveTaskApproverId(managerReadinessTask, transOrg);
  assert(approverMgrTask === 'ops_head_node', 'Transport Manager task routes to Operations Head for approval');
  assert(canApproveTask(transOpsHead, managerReadinessTask, transOrg) === true, 'Operations Head can approve Transport Manager task');
  assert(canApproveTask(transManager, managerReadinessTask, transOrg) === false, 'Transport Manager cannot self-approve own task');

  console.log(`--- TEST RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) process.exit(1);
}

runTests();
