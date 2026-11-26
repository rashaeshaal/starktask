/**
 * Central Permission Layer for STARK STEEL DOORS (SalesDoor Enterprise)
 * Single source of truth for Role-Based Access Control (RBAC).
 * 
 * =========================================================================================
 * PERMISSIONS MATRIX (Role x Permission)
 * =========================================================================================
 * | Role | employee.view | employee.create | employee.edit | employee.import | employee.resetPassword | employee.activate | employee.deactivate | department.create | department.edit | department.archive | designation.create | designation.edit | hierarchy.view | team.create | team.edit | team.delete | team.transferMembers | task.assignAnyone | day.unlock |
 * | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
 * | Executive Director | Yes | Yes | Yes* | Yes | Yes* | Yes* | Yes* | Yes | Yes | Yes* | Yes | Yes | Yes | Yes | Yes | Yes* | Yes | Yes | Yes |
 * | Director Operations | Yes | Yes | Yes* | Yes | Yes* | Yes* | Yes* | Yes | Yes | Yes* | Yes | Yes | Yes | Yes | Yes | Yes* | Yes | Yes | Yes |
 * | General Manager | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No | No | No | No | No | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
 * | HR Manager / Admin | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No | No |
 * | Operations Head | No | No | No | No | No | No | No | No | No | No | No | No | Yes | Ops Only | Ops Only | Ops Only | Ops Only | No | No |
 * | CSO (Sales Officer) | No | No | No | No | No | No | No | No | No | No | No | No | Yes | No | No | No | No | No | No |
 * | Accounts / Brand | No | No | No | No | No | No | No | No | No | No | No | No | Yes | No | No | No | No | No | No |
 * | Supervisors (L4) | No | No | No | No | No | No | No | No | No | No | No | No | No | No | No | No | No | No | No |
 * | Frontline (L5/L6) | No | No | No | No | No | No | No | No | No | No | No | No | No | No | No | No | No | No | No |
 * 
 * * Universal Safety Rules for Everyone (including Company Heads):
 * 1. Cannot change their own role, level or designation.
 * 2. Cannot deactivate their own account.
 * 3. Cannot archive a department that still has active employees.
 * 4. Cannot delete a team that still has active tasks.
 * 5. The system must always keep at least one active company head (cannot deactivate the last one).
 * 6. Editing or deactivating another company head requires confirmation and an audit log with reason.
 * 
 * Scopes:
 * - "company": Universal company-wide oversight (Director Operations, Executive Director)
 * - "department": Department-wide oversight (Operations Head, CSO, Accounts Manager, Brand Manager, etc.)
 * - "downline": Downline tree hierarchy oversight (Warehouse In-charge, Transport Manager, Service Manager, Inventory Supervisor, SSM, ASM, Supervisors)
 * - "self": Frontline personnel (Loading Staff, Driver, Technician, Storekeeper, Operations Assistant, Sales Coordinator, Accountant)
 */

export const SCOPES = {
  COMPANY: 'company',
  DEPARTMENT: 'department',
  DOWNLINE: 'downline',
  SELF: 'self'
};

export const APPROVER_FALLBACK = 'next-manager-up';

/**
 * Universal Reporting Manager Approver Resolution Helper
 * Resolves the direct reporting manager of the task assignee (employee.reportingManagerId of assignedToId at completion)
 * Fallback routing rules:
 * - If reporting manager is the assignee or completer, routes to that manager's reporting manager.
 * - If assignee has no reportingManagerId, or manager is inactive/on leave with stand-in, stand-in becomes approver;
 *   otherwise routes to next manager up.
 * - Top of chain (Company Heads): the other active company head approves; with no other head, marked auto-approved.
 */
export function resolveTaskApproverId(task, allEmployees = [], leaveCovers = []) {
  if (!task) return null;
  const assigneeId = String(task.assignedToId || task.assignedTo || '');
  const completerId = String(task.completedById || '');

  // 1. Find assignee record
  const assignee = allEmployees.find(e => String(e.id || e.uid || e.employeeId) === assigneeId);
  const assigneeRole = normalizeRoleName(assignee?.role || task.assignedToRole || '');

  // 2. Top of Chain Check: Company Heads
  if (COMPANY_HEAD_ROLES.includes(assigneeRole)) {
    const otherHead = allEmployees.find(e => {
      const eId = String(e.id || e.uid || e.employeeId);
      const isHead = COMPANY_HEAD_ROLES.includes(normalizeRoleName(e.role));
      const isActive = (e.status || e.employmentStatus) !== 'inactive';
      return isHead && eId !== assigneeId && isActive;
    });
    return otherHead ? String(otherHead.id || otherHead.uid || otherHead.employeeId) : null;
  }

  // 3. Normal Reporting Manager Resolution
  let currentMgrId = String(assignee?.reportingManagerId || assignee?.reportsTo || '');
  const visited = new Set();

  while (currentMgrId) {
    if (visited.has(currentMgrId)) break;
    visited.add(currentMgrId);

    const mgr = allEmployees.find(e => String(e.id || e.uid || e.employeeId) === currentMgrId);
    if (!mgr) break;

    // Check if manager is on leave with active stand-in
    const todayStr = new Intl.DateTimeFormat('en-CA').format(new Date());
    const activeCover = leaveCovers.find(c => 
      String(c.originalManagerId || c.originalEmployeeId) === currentMgrId &&
      c.status === 'active' &&
      todayStr >= c.startDate && todayStr <= c.endDate
    );
    const effectiveMgrId = activeCover ? String(activeCover.standInEmployeeId || activeCover.standInId) : currentMgrId;

    // Self-approval exclusion: effective manager cannot be assignee or completer
    if (effectiveMgrId !== assigneeId && effectiveMgrId !== completerId) {
      return effectiveMgrId;
    }

    // Ascend to next manager up
    currentMgrId = String(mgr.reportingManagerId || mgr.reportsTo || '');
  }

  // Fallback to top leadership if unrouted
  const fallbackHead = allEmployees.find(e => COMPANY_HEAD_ROLES.includes(normalizeRoleName(e.role)));
  return fallbackHead ? String(fallbackHead.id || fallbackHead.uid || fallbackHead.employeeId) : null;
}

/**
 * Universal Approval Enforcement:
 * - The only approver of a task is the direct reporting manager (approverId).
 * - Nobody can approve a task they did the work on: actor cannot be assignedToId or completedById.
 * - No role has an override (including Company Heads).
 */
export function canApproveTask(user, task, allEmployees = [], leaveCovers = []) {
  if (!user || !task) return false;

  const actorId = String(user.id || user.uid || user.employeeId || '');
  const assigneeId = String(task.assignedToId || task.assignedTo || '');
  const completerId = String(task.completedById || '');

  // 1. Strict Self-Approval Ban: cannot approve if actor was assignee or completer
  if (actorId === assigneeId || (completerId && actorId === completerId)) {
    return false;
  }

  // 2. Direct Approver Match
  const expectedApproverId = task.approverId || resolveTaskApproverId(task, allEmployees, leaveCovers);
  if (!expectedApproverId) {
    return false;
  }

  return actorId === String(expectedApproverId);
}

export const PAGES = {
  DASHBOARD: 'dashboard',
  TEAM_PERFORMANCE: 'team_performance',
  MY_TASKS: 'my_tasks',
  ALL_TASKS: 'all_tasks',
  ASSIGNED_TASKS: 'assigned_tasks',
  APPROVALS: 'approvals',
  ESCALATIONS: 'escalations',
  TODOS: 'todos',
  TEAMS: 'teams',
  ORGANIZATION: 'organization',
  DEALERS: 'dealers',
  BOOKINGS: 'bookings',
  REPORTS: 'reports',
  SETTINGS: 'settings'
};

/**
 * Shared Company Head Roles (identical top authority)
 */
export const COMPANY_HEAD_ROLES = [
  'Executive Director',
  'Director Operations'
];

export function isCompanyHead(userOrRole) {
  if (!userOrRole) return false;
  const role = typeof userOrRole === 'string' ? userOrRole : (userOrRole.role || userOrRole.designation || '');
  return COMPANY_HEAD_ROLES.includes(role) || COMPANY_HEAD_ROLES.includes(normalizeRoleName(role));
}

/**
 * Shared Sales Head Roles
 */
export const SALES_HEAD_ROLES = [
  'Chief Sales Officer',
  'CSO'
];

export function isSalesHead(userOrRole) {
  if (!userOrRole) return false;
  const role = typeof userOrRole === 'string' ? userOrRole : (userOrRole.role || userOrRole.designation || '');
  return SALES_HEAD_ROLES.includes(role) || SALES_HEAD_ROLES.includes(normalizeRoleName(role));
}

/**
 * Shared helper to check if an employee belongs to the Sales Department
 * Normalizes via canonical code 'sales' or 'SALES'
 */
export function isInSalesDepartment(employee) {
  if (!employee) return false;
  const dept = (employee.department || employee.departmentId || '').toLowerCase().trim();
  const role = normalizeRoleName(employee.role || employee.designation || '');
  return dept === 'sales' || ['CSO', 'SSM', 'ASM', 'Sales Coordinator'].includes(role);
}
export const PERMISSIONS = {
  EMPLOYEE_VIEW: 'employee.view',
  EMPLOYEE_CREATE: 'employee.create',
  EMPLOYEE_EDIT: 'employee.edit',
  EMPLOYEE_IMPORT: 'employee.import',
  EMPLOYEE_RESET_PASSWORD: 'employee.resetPassword',
  EMPLOYEE_ACTIVATE: 'employee.activate',
  EMPLOYEE_DEACTIVATE: 'employee.deactivate',
  DEPARTMENT_CREATE: 'department.create',
  DEPARTMENT_EDIT: 'department.edit',
  DEPARTMENT_ARCHIVE: 'department.archive',
  DESIGNATION_CREATE: 'designation.create',
  DESIGNATION_EDIT: 'designation.edit',
  HIERARCHY_VIEW: 'hierarchy.view',
  TEAM_CREATE: 'team.create',
  TEAM_EDIT: 'team.edit',
  TEAM_DELETE: 'team.delete',
  TEAM_ADD_MEMBER: 'team.addMember',
  TEAM_TRANSFER_MEMBERS: 'team.transferMembers',
  TASK_ASSIGN_ANYONE: 'task.assignAnyone',
  TASK_VIEW: 'task.view',
  TASK_ASSIGN: 'task.assign',
  TASK_REASSIGN: 'task.reassign',
  TASK_NUDGE: 'task.nudge',
  APPROVAL_REVIEW: 'approval.review',
  PERFORMANCE_VIEW: 'performance.view',
  DEALER_VIEW: 'dealer.view',
  DEALER_REASSIGN: 'dealer.reassign',
  ESCALATION_RAISE: 'escalation.raise',
  DAY_UNLOCK: 'day.unlock'
};

const ALL_COMPANY_HEAD_PERMISSIONS = [
  'employee.view', 'employee.create', 'employee.edit', 'employee.import',
  'employee.resetPassword', 'employee.activate', 'employee.deactivate',
  'department.create', 'department.edit', 'department.archive',
  'designation.create', 'designation.edit', 'hierarchy.view',
  'team.create', 'team.edit', 'team.delete', 'team.transferMembers',
  'task.assignAnyone', 'day.unlock'
];

/**
 * Explicit role permissions map
 */
export const EXPLICIT_PERMISSIONS_MAP = {
  'Executive Director': ALL_COMPANY_HEAD_PERMISSIONS,
  'Director Operations': ALL_COMPANY_HEAD_PERMISSIONS,
  'General Manager': [
    'employee.view', 'employee.create', 'employee.edit', 'employee.import',
    'employee.resetPassword', 'employee.activate', 'employee.deactivate',
    'hierarchy.view',
    'team.create', 'team.edit', 'team.delete', 'team.transferMembers',
    'task.assignAnyone', 'day.unlock'
  ],
  'HR Manager': [
    'employee.view', 'employee.create', 'employee.edit', 'employee.import',
    'employee.resetPassword', 'employee.activate', 'employee.deactivate',
    'department.create', 'department.edit', 'department.archive',
    'designation.create', 'designation.edit', 'hierarchy.view',
    'team.create', 'team.edit', 'team.delete', 'team.transferMembers'
  ],
  'Admin Manager': [
    'employee.view', 'employee.create', 'employee.edit', 'employee.import',
    'employee.resetPassword', 'employee.activate', 'employee.deactivate',
    'department.create', 'department.edit', 'department.archive',
    'designation.create', 'designation.edit', 'hierarchy.view',
    'team.create', 'team.edit', 'team.delete', 'team.transferMembers'
  ],
  'HR & Admin Manager': [
    'employee.view', 'employee.create', 'employee.edit', 'employee.import',
    'employee.resetPassword', 'employee.activate', 'employee.deactivate',
    'department.create', 'department.edit', 'department.archive',
    'designation.create', 'designation.edit', 'hierarchy.view',
    'team.create', 'team.edit', 'team.delete', 'team.transferMembers'
  ],
  'Operations Head': [
    'hierarchy.view',
    'team.create', 'team.edit', 'team.delete', 'team.transferMembers'
  ],
  'Chief Sales Officer': [
    'employee.view', 'hierarchy.view',
    'task.view', 'task.assign', 'task.reassign', 'task.nudge',
    'approval.review', 'performance.view',
    'team.create', 'team.edit', 'team.delete', 'team.addMember', 'team.transferMembers',
    'dealer.view', 'dealer.reassign', 'escalation.raise'
  ],
  'CSO': [
    'employee.view', 'hierarchy.view',
    'task.view', 'task.assign', 'task.reassign', 'task.nudge',
    'approval.review', 'performance.view',
    'team.create', 'team.edit', 'team.delete', 'team.addMember', 'team.transferMembers',
    'dealer.view', 'dealer.reassign', 'escalation.raise'
  ],
  'Accounts Manager': ['hierarchy.view'],
  'Brand Manager': ['hierarchy.view']
};

/**
 * Single Array of All-Access Performance Roles:
 * Only roles listed here see ALL 10 departments and the department filter in Team Performance.
 */
export const ALL_ACCESS_PERFORMANCE_ROLES = COMPANY_HEAD_ROLES;

export function isAllAccessPerformanceRole(user) {
  return isCompanyHead(user);
}

/**
 * Role permissions configuration
 */
export const ROLE_PERMISSIONS_CONFIG = {
  // Top Leadership: Company Scope
  'Executive Director': {
    scope: SCOPES.COMPANY,
    performanceScope: SCOPES.COMPANY,
    menu: [
      PAGES.DASHBOARD, PAGES.TEAM_PERFORMANCE, PAGES.ALL_TASKS, PAGES.MY_TASKS,
      PAGES.APPROVALS, PAGES.ESCALATIONS, PAGES.TODOS, PAGES.TEAMS,
      PAGES.ORGANIZATION, PAGES.DEALERS, PAGES.BOOKINGS, PAGES.REPORTS, PAGES.SETTINGS
    ],
    canAssign: true,
    canApprove: true,
    canManageTeams: true,
    canManageEmployees: true,
    canManageOrgStructure: true
  },
  'Director Operations': {
    scope: SCOPES.COMPANY,
    performanceScope: SCOPES.COMPANY,
    menu: [
      PAGES.DASHBOARD, PAGES.TEAM_PERFORMANCE, PAGES.ALL_TASKS, PAGES.MY_TASKS,
      PAGES.APPROVALS, PAGES.ESCALATIONS, PAGES.TODOS, PAGES.TEAMS,
      PAGES.ORGANIZATION, PAGES.DEALERS, PAGES.BOOKINGS, PAGES.REPORTS, PAGES.SETTINGS
    ],
    canAssign: true,
    canApprove: true,
    canManageTeams: true,
    canManageEmployees: true,
    canManageOrgStructure: true
  },

  'General Manager': {
    scope: SCOPES.COMPANY,
    performanceScope: SCOPES.DEPARTMENT,
    menu: [
      PAGES.DASHBOARD, PAGES.TEAM_PERFORMANCE, PAGES.ALL_TASKS, PAGES.MY_TASKS,
      PAGES.APPROVALS, PAGES.ESCALATIONS, PAGES.TODOS, PAGES.TEAMS,
      PAGES.ORGANIZATION, PAGES.DEALERS, PAGES.BOOKINGS, PAGES.REPORTS, PAGES.SETTINGS
    ],
    canAssign: true,
    canApprove: true,
    canManageTeams: true,
    canManageEmployees: true,
    canManageOrgStructure: true
  },

  // --- HR & Administration Branch ---
  'HR Manager': {
    scope: SCOPES.COMPANY,
    performanceScope: SCOPES.DEPARTMENT,
    menu: [
      PAGES.DASHBOARD, PAGES.TEAM_PERFORMANCE, PAGES.ALL_TASKS, PAGES.MY_TASKS,
      PAGES.APPROVALS, PAGES.ESCALATIONS, PAGES.TODOS, PAGES.TEAMS,
      PAGES.ORGANIZATION, PAGES.REPORTS, PAGES.SETTINGS
    ],
    canAssign: true,
    canApprove: true,
    canManageTeams: true,
    canManageEmployees: true,
    canManageOrgStructure: true
  },
  'Admin Manager': {
    scope: SCOPES.COMPANY,
    performanceScope: SCOPES.DEPARTMENT,
    menu: [
      PAGES.DASHBOARD, PAGES.TEAM_PERFORMANCE, PAGES.ALL_TASKS, PAGES.MY_TASKS,
      PAGES.APPROVALS, PAGES.ESCALATIONS, PAGES.TODOS, PAGES.TEAMS,
      PAGES.ORGANIZATION, PAGES.REPORTS, PAGES.SETTINGS
    ],
    canAssign: true,
    canApprove: true,
    canManageTeams: true,
    canManageEmployees: true,
    canManageOrgStructure: true
  },
  'HR & Admin Manager': {
    scope: SCOPES.COMPANY,
    performanceScope: SCOPES.DEPARTMENT,
    menu: [
      PAGES.DASHBOARD, PAGES.TEAM_PERFORMANCE, PAGES.ALL_TASKS, PAGES.MY_TASKS,
      PAGES.APPROVALS, PAGES.ESCALATIONS, PAGES.TODOS, PAGES.TEAMS,
      PAGES.ORGANIZATION, PAGES.REPORTS, PAGES.SETTINGS
    ],
    canAssign: true,
    canApprove: true,
    canManageTeams: true,
    canManageEmployees: true,
    canManageOrgStructure: true
  },
  'HR Executive': {
    scope: SCOPES.SELF,
    performanceScope: null,
    menu: [
      PAGES.DASHBOARD, PAGES.MY_TASKS, PAGES.TODOS, PAGES.TEAMS
    ],
    canAssign: false,
    canApprove: false,
    canManageTeams: false,
    canManageEmployees: false,
    canManageOrgStructure: false
  },
  'Admin Executive': {
    scope: SCOPES.SELF,
    performanceScope: null,
    menu: [
      PAGES.DASHBOARD, PAGES.MY_TASKS, PAGES.TODOS, PAGES.TEAMS
    ],
    canAssign: false,
    canApprove: false,
    canManageTeams: false,
    canManageEmployees: false,
    canManageOrgStructure: false
  },
  'IT Head': {
    scope: SCOPES.SELF,
    performanceScope: null,
    menu: [
      PAGES.DASHBOARD, PAGES.MY_TASKS, PAGES.TODOS, PAGES.TEAMS
    ],
    canAssign: false,
    canApprove: false,
    canManageTeams: false,
    canManageEmployees: false,
    canManageOrgStructure: false
  },
  'Housekeeping': {
    scope: SCOPES.SELF,
    performanceScope: null,
    menu: [
      PAGES.DASHBOARD, PAGES.MY_TASKS, PAGES.TODOS, PAGES.TEAMS
    ],
    canAssign: false,
    canApprove: false,
    canManageTeams: false,
    canManageEmployees: false,
    canManageOrgStructure: false
  },
  'Housekeeper': {
    scope: SCOPES.SELF,
    performanceScope: null,
    menu: [
      PAGES.DASHBOARD, PAGES.MY_TASKS, PAGES.TODOS, PAGES.TEAMS
    ],
    canAssign: false,
    canApprove: false,
    canManageTeams: false,
    canManageEmployees: false,
    canManageOrgStructure: false
  },

  // --- OPERATIONS DEPARTMENT (Task Management Only) ---
  // Operations Head: Universal oversight of entire Operations & 4 branches
  'Operations Head': {
    scope: SCOPES.DEPARTMENT,
    performanceScope: SCOPES.DEPARTMENT,
    menu: [
      PAGES.DASHBOARD, PAGES.TEAM_PERFORMANCE, PAGES.ALL_TASKS, PAGES.APPROVALS,
      PAGES.ESCALATIONS, PAGES.MY_TASKS, PAGES.TODOS, PAGES.TEAMS, PAGES.REPORTS
    ],
    canAssign: true,
    canApprove: true,
    canManageTeams: true,
    canManageEmployees: false
  },

  // Operations Branch Managers (Branch scope: downline only, no cross-branch)
  'Warehouse In-charge': {
    scope: SCOPES.DOWNLINE,
    performanceScope: SCOPES.DOWNLINE,
    menu: [
      PAGES.DASHBOARD, PAGES.BOOKINGS, PAGES.TEAM_PERFORMANCE, PAGES.APPROVALS, PAGES.MY_TASKS,
      PAGES.TODOS, PAGES.TEAMS
    ],
    canAssign: true,
    canApprove: true,
    canManageTeams: false,
    canManageEmployees: false
  },
  'Transport Manager': {
    scope: SCOPES.DOWNLINE,
    performanceScope: SCOPES.DOWNLINE,
    menu: [
      PAGES.DASHBOARD, PAGES.BOOKINGS, PAGES.TEAM_PERFORMANCE, PAGES.APPROVALS, PAGES.MY_TASKS,
      PAGES.TODOS, PAGES.TEAMS
    ],
    canAssign: true,
    canApprove: true,
    canManageTeams: false,
    canManageEmployees: false
  },
  'Service Manager': {
    scope: SCOPES.DOWNLINE,
    performanceScope: SCOPES.DOWNLINE,
    menu: [
      PAGES.DASHBOARD, PAGES.TEAM_PERFORMANCE, PAGES.APPROVALS, PAGES.MY_TASKS,
      PAGES.TODOS, PAGES.TEAMS
    ],
    canAssign: true,
    canApprove: true,
    canManageTeams: false,
    canManageEmployees: false
  },
  'Inventory Supervisor': {
    scope: SCOPES.DOWNLINE,
    performanceScope: SCOPES.DOWNLINE,
    menu: [
      PAGES.DASHBOARD, PAGES.BOOKINGS, PAGES.TEAM_PERFORMANCE, PAGES.APPROVALS, PAGES.MY_TASKS,
      PAGES.TODOS, PAGES.TEAMS
    ],
    canAssign: true,
    canApprove: true,
    canManageTeams: false,
    canManageEmployees: false
  },

  // Operations Supervisors & Coordinators (Downline scope)
  'Warehouse Supervisor': {
    scope: SCOPES.DOWNLINE,
    performanceScope: SCOPES.DOWNLINE,
    menu: [
      PAGES.DASHBOARD, PAGES.BOOKINGS, PAGES.TEAM_PERFORMANCE, PAGES.APPROVALS, PAGES.MY_TASKS,
      PAGES.TODOS, PAGES.TEAMS
    ],
    canAssign: true,
    canApprove: true,
    canManageTeams: false,
    canManageEmployees: false
  },
  'Transport Coordinator': {
    scope: SCOPES.DOWNLINE,
    performanceScope: SCOPES.DOWNLINE,
    menu: [
      PAGES.DASHBOARD, PAGES.BOOKINGS, PAGES.TEAM_PERFORMANCE, PAGES.APPROVALS, PAGES.MY_TASKS,
      PAGES.TODOS, PAGES.TEAMS
    ],
    canAssign: true,
    canApprove: true,
    canManageTeams: false,
    canManageEmployees: false
  },
  'Service Coordinator': {
    scope: SCOPES.DOWNLINE,
    performanceScope: SCOPES.DOWNLINE,
    menu: [
      PAGES.DASHBOARD, PAGES.TEAM_PERFORMANCE, PAGES.APPROVALS, PAGES.MY_TASKS,
      PAGES.TODOS, PAGES.TEAMS
    ],
    canAssign: true,
    canApprove: true,
    canManageTeams: false,
    canManageEmployees: false
  },

  // Operations Frontline Roles & Assistant: Self Scope (Team Performance and Assign are HIDDEN)
  'Operations Assistant': {
    scope: SCOPES.SELF,
    performanceScope: null,
    menu: [
      PAGES.DASHBOARD, PAGES.MY_TASKS, PAGES.TODOS, PAGES.TEAMS
    ],
    canAssign: false,
    canApprove: false,
    canManageTeams: false,
    canManageEmployees: false
  },
  'Loading Staff': {
    scope: SCOPES.SELF,
    performanceScope: null,
    menu: [
      PAGES.DASHBOARD, PAGES.MY_TASKS, PAGES.TODOS, PAGES.TEAMS
    ],
    canAssign: false,
    canApprove: false,
    canManageTeams: false,
    canManageEmployees: false
  },
  'Driver': {
    scope: SCOPES.SELF,
    performanceScope: null,
    menu: [
      PAGES.DASHBOARD, PAGES.MY_TASKS, PAGES.TODOS, PAGES.TEAMS, PAGES.BOOKINGS
    ],
    canAssign: false,
    canApprove: false,
    canManageTeams: false,
    canManageEmployees: false
  },
  'Technician': {
    scope: SCOPES.SELF,
    performanceScope: null,
    menu: [
      PAGES.DASHBOARD, PAGES.MY_TASKS, PAGES.TODOS, PAGES.TEAMS
    ],
    canAssign: false,
    canApprove: false,
    canManageTeams: false,
    canManageEmployees: false
  },
  'Storekeeper': {
    scope: SCOPES.SELF,
    performanceScope: null,
    menu: [
      PAGES.DASHBOARD, PAGES.MY_TASKS, PAGES.TODOS, PAGES.TEAMS
    ],
    canAssign: false,
    canApprove: false,
    canManageTeams: false,
    canManageEmployees: false
  },

  // --- SALES DEPARTMENT ---
  'Chief Sales Officer': {
    scope: SCOPES.DEPARTMENT,
    performanceScope: SCOPES.DEPARTMENT,
    menu: [
      PAGES.DASHBOARD, PAGES.TEAM_PERFORMANCE, PAGES.ALL_TASKS, PAGES.MY_TASKS,
      PAGES.APPROVALS, PAGES.ESCALATIONS, PAGES.TODOS, PAGES.TEAMS,
      PAGES.DEALERS, PAGES.BOOKINGS, PAGES.REPORTS
    ],
    canAssign: true,
    canApprove: true,
    canManageTeams: true,
    canManageEmployees: false
  },
  'CSO': {
    scope: SCOPES.DEPARTMENT,
    performanceScope: SCOPES.DEPARTMENT,
    menu: [
      PAGES.DASHBOARD, PAGES.TEAM_PERFORMANCE, PAGES.ALL_TASKS, PAGES.MY_TASKS,
      PAGES.APPROVALS, PAGES.ESCALATIONS, PAGES.TODOS, PAGES.TEAMS,
      PAGES.DEALERS, PAGES.BOOKINGS, PAGES.REPORTS
    ],
    canAssign: true,
    canApprove: true,
    canManageTeams: true,
    canManageEmployees: false
  },
  'State Sales Manager': {
    scope: SCOPES.DOWNLINE,
    performanceScope: SCOPES.DOWNLINE,
    menu: [
      PAGES.DASHBOARD, PAGES.TEAM_PERFORMANCE, PAGES.APPROVALS, PAGES.MY_TASKS,
      PAGES.TODOS, PAGES.TEAMS, PAGES.DEALERS, PAGES.BOOKINGS
    ],
    canAssign: true,
    canApprove: true,
    canManageTeams: false,
    canManageEmployees: false
  },
  'SSM': {
    scope: SCOPES.DOWNLINE,
    performanceScope: SCOPES.DOWNLINE,
    menu: [
      PAGES.DASHBOARD, PAGES.TEAM_PERFORMANCE, PAGES.APPROVALS, PAGES.MY_TASKS,
      PAGES.TODOS, PAGES.TEAMS, PAGES.DEALERS, PAGES.BOOKINGS
    ],
    canAssign: true,
    canApprove: true,
    canManageTeams: false,
    canManageEmployees: false
  },
  'Area Sales Manager': {
    scope: SCOPES.DOWNLINE,
    performanceScope: SCOPES.DOWNLINE,
    menu: [
      PAGES.DASHBOARD, PAGES.TEAM_PERFORMANCE, PAGES.APPROVALS, PAGES.MY_TASKS,
      PAGES.TODOS, PAGES.TEAMS, PAGES.DEALERS, PAGES.BOOKINGS
    ],
    canAssign: true,
    canApprove: true,
    canManageTeams: false,
    canManageEmployees: false
  },
  'ASM': {
    scope: SCOPES.DOWNLINE,
    performanceScope: SCOPES.DOWNLINE,
    menu: [
      PAGES.DASHBOARD, PAGES.TEAM_PERFORMANCE, PAGES.APPROVALS, PAGES.MY_TASKS,
      PAGES.TODOS, PAGES.TEAMS, PAGES.DEALERS, PAGES.BOOKINGS
    ],
    canAssign: true,
    canApprove: true,
    canManageTeams: false,
    canManageEmployees: false
  },
  'Sales Coordinator': {
    scope: SCOPES.SELF,
    performanceScope: null,
    menu: [
      PAGES.DASHBOARD, PAGES.MY_TASKS, PAGES.TODOS, PAGES.TEAMS,
      PAGES.DEALERS, PAGES.BOOKINGS
    ],
    canAssign: false,
    canApprove: false,
    canManageTeams: false,
    canManageEmployees: false
  },

  // --- MARKETING DEPARTMENT ---
  'Brand Manager': {
    scope: SCOPES.DEPARTMENT,
    performanceScope: SCOPES.DEPARTMENT,
    menu: [
      PAGES.DASHBOARD, PAGES.TEAM_PERFORMANCE, PAGES.ALL_TASKS, PAGES.MY_TASKS,
      PAGES.APPROVALS, PAGES.TODOS, PAGES.TEAMS, PAGES.REPORTS
    ],
    canAssign: true,
    canApprove: true,
    canManageTeams: false,
    canManageEmployees: false
  },
  'Leads Coordinator': {
    scope: SCOPES.DOWNLINE,
    performanceScope: SCOPES.DOWNLINE,
    menu: [
      PAGES.DASHBOARD, PAGES.TEAM_PERFORMANCE, PAGES.APPROVALS, PAGES.MY_TASKS,
      PAGES.TODOS, PAGES.TEAMS
    ],
    canAssign: true,
    canApprove: true,
    canManageTeams: false,
    canManageEmployees: false
  },
  'Graphic Designer': {
    scope: SCOPES.SELF,
    performanceScope: null,
    menu: [
      PAGES.DASHBOARD, PAGES.MY_TASKS, PAGES.TODOS, PAGES.TEAMS
    ],
    canAssign: false,
    canApprove: false,
    canManageTeams: false,
    canManageEmployees: false
  },
  'Photographer': {
    scope: SCOPES.SELF,
    performanceScope: null,
    menu: [
      PAGES.DASHBOARD, PAGES.MY_TASKS, PAGES.TODOS, PAGES.TEAMS
    ],
    canAssign: false,
    canApprove: false,
    canManageTeams: false,
    canManageEmployees: false
  },

  // --- FINANCE & ACCOUNTS ---
  'Accounts Manager': {
    scope: SCOPES.DEPARTMENT,
    performanceScope: SCOPES.DEPARTMENT,
    menu: [
      PAGES.DASHBOARD, PAGES.TEAM_PERFORMANCE, PAGES.ALL_TASKS, PAGES.MY_TASKS,
      PAGES.APPROVALS, PAGES.ESCALATIONS, PAGES.TODOS, PAGES.TEAMS,
      PAGES.BOOKINGS, PAGES.REPORTS
    ],
    canAssign: true,
    canApprove: true,
    canManageTeams: false,
    canManageEmployees: false
  },
  'Accountant': {
    scope: SCOPES.SELF,
    performanceScope: null,
    menu: [
      PAGES.DASHBOARD, PAGES.MY_TASKS, PAGES.TODOS, PAGES.TEAMS, PAGES.BOOKINGS
    ],
    canAssign: false,
    canApprove: false,
    canManageTeams: false,
    canManageEmployees: false
  },
  'Junior Accountant': {
    scope: SCOPES.SELF,
    performanceScope: null,
    menu: [
      PAGES.DASHBOARD, PAGES.MY_TASKS, PAGES.TODOS, PAGES.TEAMS, PAGES.BOOKINGS
    ],
    canAssign: false,
    canApprove: false,
    canManageTeams: false,
    canManageEmployees: false
  }
};

/**
 * Normalizes role text
 */
export function normalizeRoleName(role) {
  if (!role) return '';
  const r = String(role).trim();
  if (r === 'CSO' || r === 'Chief Sales Officer') return 'CSO';
  if (r === 'SSM' || r === 'State Sales Manager' || r === 'Senior Sales Manager') return 'SSM';
  if (r === 'ASM' || r === 'Asst Sales Manager' || r === 'Assistant Sales Manager' || r === 'Area Sales Manager') return 'ASM';
  if (r === 'Delivery Partner') return 'Driver';
  if (r === 'Service Technician') return 'Technician';
  if (r === 'Warehouse Executive' || r === 'QC Supervisor' || r === 'Dispatch Supervisor') return 'Warehouse Supervisor';
  if (r === 'Accounts Executive') return 'Accounts Manager';
  if (r === 'Junior Accountant') return 'Accountant';
  return r;
}

/**
 * Get permission config for a user
 */
export function getRoleConfig(user) {
  if (!user) return null;
  const role = user.role || '';
  
  if (ROLE_PERMISSIONS_CONFIG[role]) {
    return ROLE_PERMISSIONS_CONFIG[role];
  }

  const norm = normalizeRoleName(role);
  if (ROLE_PERMISSIONS_CONFIG[norm]) {
    return ROLE_PERMISSIONS_CONFIG[norm];
  }

  // Fallback by role heuristics
  if (role.toLowerCase().includes('director') || role.toLowerCase().includes('general manager')) {
    return ROLE_PERMISSIONS_CONFIG['Director Operations'];
  }
  if (role.toLowerCase().includes('operations head')) {
    return ROLE_PERMISSIONS_CONFIG['Operations Head'];
  }
  if (role.toLowerCase().includes('head') || role.toLowerCase().includes('manager')) {
    return ROLE_PERMISSIONS_CONFIG['Warehouse In-charge'];
  }
  if (role.toLowerCase().includes('coordinator') || role.toLowerCase().includes('supervisor') || role.toLowerCase().includes('lead')) {
    return ROLE_PERMISSIONS_CONFIG['Warehouse Supervisor'];
  }

  // Default frontline
  return ROLE_PERMISSIONS_CONFIG['Loading Staff'];
}

/**
 * Get scope for a user
 */
export function getScope(user) {
  const config = getRoleConfig(user);
  return config ? config.scope : SCOPES.SELF;
}

/**
 * Get specific Team Performance scope for a user
 */
export function getPerformanceScope(user) {
  if (!user) return null;
  if (isAllAccessPerformanceRole(user)) {
    return SCOPES.COMPANY;
  }
  const config = getRoleConfig(user);
  return config ? config.performanceScope : null;
}

/**
 * Check if a user can access a page
 */
export function canAccess(user, page) {
  if (!user) return false;
  const config = getRoleConfig(user);
  if (!config) return false;

  // Specific check for Team Performance
  if (page === 'team_performance' || page === PAGES.TEAM_PERFORMANCE) {
    return !!getPerformanceScope(user);
  }

  // Map tab variations
  let target = page;
  if (page === 'assigned_tasks' || page === PAGES.ASSIGNED_TASKS) {
    if (user.canAssignTask === false) return false;
    return user.canAssignTask === true || Boolean(config.canAssign);
  }
  if (page === 'my_tasks' || page === 'all_tasks') {
    if (page === 'all_tasks') return config.menu.includes(PAGES.ALL_TASKS);
    return config.menu.includes(PAGES.MY_TASKS);
  }
  if (page === 'dealers') target = PAGES.DEALERS;
  if (page === 'bookings') target = PAGES.BOOKINGS;
  if (page === 'organization') target = PAGES.ORGANIZATION;
  if (page === 'reports') target = PAGES.REPORTS;
  if (page === 'settings') target = PAGES.SETTINGS;
  if (page === 'escalations') target = PAGES.ESCALATIONS;
  if (page === 'approvals') target = PAGES.APPROVALS;
  if (page === 'teams') target = PAGES.TEAMS;
  if (page === 'todos') target = PAGES.TODOS;
  if (page === 'dashboard') target = PAGES.DASHBOARD;

  return config.menu.includes(target);
}

/**
 * Operations Branch Hierarchy Helper
 * Returns the exact branch roles that belong to a specific branch manager or supervisor.
 */
export function getOperationsBranchRoles(role) {
  const norm = normalizeRoleName(role);
  if (norm === 'Warehouse In-charge') {
    return ['Warehouse Supervisor', 'Warehouse Executive', 'Loading Staff'];
  }
  if (norm === 'Warehouse Supervisor') {
    return ['Loading Staff'];
  }
  if (norm === 'Transport Manager') {
    return ['Transport Coordinator', 'Driver', 'Delivery Partner'];
  }
  if (norm === 'Transport Coordinator') {
    return ['Driver', 'Delivery Partner'];
  }
  if (norm === 'Service Manager') {
    return ['Service Coordinator', 'Technician'];
  }
  if (norm === 'Service Coordinator') {
    return ['Technician'];
  }
  if (norm === 'Inventory Supervisor') {
    return ['Storekeeper'];
  }
  return [];
}

/**
 * Get visible user IDs for general queries and metrics computation
 */
export function getVisibleUserIds(user, allEmployees = []) {
  if (!user) return [];
  const scope = getScope(user);
  const myId = String(user.id || user.uid || user.employeeId || '');
  const userRole = normalizeRoleName(user.role || '');

  // 1. Company Scope: Sees all employees
  if (scope === SCOPES.COMPANY) {
    if (userRole === 'HR Manager' || userRole === 'Admin Manager' || userRole === 'HR & Admin Manager') {
      const hrBranchRoles = ['Admin Manager', 'HR Executive', 'Admin Executive', 'IT Head', 'Housekeeping', 'Housekeeper'];
      const myAllowedRoles = userRole === 'Admin Manager' 
        ? ['Admin Executive', 'IT Head', 'Housekeeping', 'Housekeeper']
        : hrBranchRoles;

      const downlineIds = new Set([myId]);
      allEmployees.forEach(emp => {
        const empId = String(emp.id || emp.uid || emp.employeeId);
        const empRole = normalizeRoleName(emp.role || emp.designation || '');
        const empDept = (emp.department || emp.departmentId || '').toLowerCase();
        if ((empDept === 'hr_admin' || empDept === 'hr & admin') && myAllowedRoles.includes(empRole)) {
          downlineIds.add(empId);
        }
      });
      return Array.from(downlineIds);
    }

    if (allEmployees && allEmployees.length > 0) {
      return allEmployees.map(e => String(e.id || e.uid || e.employeeId));
    }
    return ['all'];
  }

  // 2. Department Scope:
  // Operations Head sees all personnel across all 4 Operations branches
  if (userRole === 'Operations Head') {
    const opsDepts = ['operations', 'warehouse', 'transportation', 'service', 'inventory', 'qc'];
    const opsEmployees = allEmployees.filter(e => {
      const d = (e.department || e.departmentId || '').toLowerCase();
      return opsDepts.includes(d) || d.includes('operation');
    });
    const ids = opsEmployees.map(e => String(e.id || e.uid || e.employeeId));
    if (myId && !ids.includes(myId)) ids.push(myId);
    return ids;
  }

  if (scope === SCOPES.DEPARTMENT) {
    // CSO sees all employees in the Sales Department (entire department scope)
    if (userRole === 'CSO') {
      const salesEmployees = allEmployees.filter(e => isInSalesDepartment(e));
      const ids = salesEmployees.map(e => String(e.id || e.uid || e.employeeId));
      if (myId && !ids.includes(myId)) ids.push(myId);
      return ids;
    }

    // Brand Manager sees all Marketing roles
    if (userRole === 'Brand Manager') {
      const mktRoles = ['Brand Manager', 'Leads Coordinator', 'Graphic Designer', 'Photographer'];
      const mktEmployees = allEmployees.filter(e => {
        const d = (e.department || e.departmentId || '').toLowerCase();
        const r = normalizeRoleName(e.role || e.designation || '');
        return d === 'marketing' || mktRoles.includes(r);
      });
      const ids = mktEmployees.map(e => String(e.id || e.uid || e.employeeId));
      if (myId && !ids.includes(myId)) ids.push(myId);
      return ids;
    }

    // Accounts Manager sees only Finance & Accounts team
    if (userRole === 'Accounts Manager') {
      const finRoles = ['Accounts Manager', 'Accountant'];
      const finEmployees = allEmployees.filter(e => {
        const d = (e.department || e.departmentId || '').toLowerCase();
        const r = normalizeRoleName(e.role || e.designation || '');
        return d === 'finance' || d === 'accounts' || finRoles.includes(r);
      });
      const ids = finEmployees.map(e => String(e.id || e.uid || e.employeeId));
      if (myId && !ids.includes(myId)) ids.push(myId);
      return ids;
    }

    const userDept = (user.department || user.departmentId || '').toLowerCase();
    const deptEmployees = allEmployees.filter(e => {
      const eDept = (e.department || e.departmentId || '').toLowerCase();
      return eDept === userDept;
    });
    const ids = deptEmployees.map(e => String(e.id || e.uid || e.employeeId));
    if (myId && !ids.includes(myId)) ids.push(myId);
    return ids;
  }

  // 3. Downline Scope (Operations Branch Managers & Supervisors)
  if (scope === SCOPES.DOWNLINE) {
    // Operations Branch isolation
    const opsBranchRoles = getOperationsBranchRoles(userRole);
    if (opsBranchRoles.length > 0) {
      const ids = new Set([myId]);
      allEmployees.forEach(e => {
        const eId = String(e.id || e.uid || e.employeeId);
        const r = normalizeRoleName(e.role || e.designation || '');
        if (opsBranchRoles.includes(r)) {
          ids.add(eId);
        }
      });
      return Array.from(ids);
    }

    // Marketing Leads Coordinator
    if (userRole === 'Leads Coordinator') {
      const allowedRoles = ['Leads Coordinator', 'Graphic Designer', 'Photographer'];
      const ids = new Set([myId]);
      allEmployees.forEach(e => {
        const eId = String(e.id || e.uid || e.employeeId);
        const r = normalizeRoleName(e.role || e.designation || '');
        const d = (e.department || e.departmentId || '').toLowerCase();
        if ((d === 'marketing' || allowedRoles.includes(r)) && allowedRoles.includes(r)) {
          ids.add(eId);
        }
      });
      return Array.from(ids);
    }

    // Sales ASM / SSM: Can assign and supervise downline Sales Coordinators
    if (userRole === 'ASM' || userRole === 'SSM' || userRole === 'Asst Sales Manager' || userRole === 'State Sales Manager') {
      const allowedSalesDownline = userRole.includes('SSM') || userRole.includes('State')
        ? ['ASM', 'Asst Sales Manager', 'Sales Coordinator']
        : ['Sales Coordinator'];
      const ids = new Set([myId]);
      allEmployees.forEach(e => {
        const eId = String(e.id || e.uid || e.employeeId);
        const r = normalizeRoleName(e.role || e.designation || '');
        const d = (e.department || e.departmentId || '').toLowerCase();
        if (d === 'sales' && allowedSalesDownline.includes(r)) {
          ids.add(eId);
        }
      });
      return Array.from(ids);
    }

    const downlineIds = new Set([myId]);
    if (Array.isArray(user.downline)) {
      user.downline.forEach(id => downlineIds.add(String(id)));
    }

    if (allEmployees && allEmployees.length > 0) {
      let added = true;
      while (added) {
        added = false;
        allEmployees.forEach(emp => {
          const empId = String(emp.id || emp.uid || emp.employeeId);
          const mgrId = String(emp.reportsTo || emp.reportingManagerId || '');
          if (mgrId && downlineIds.has(mgrId) && !downlineIds.has(empId)) {
            downlineIds.add(empId);
            added = true;
          }
        });
      }
    }

    return Array.from(downlineIds);
  }

  // 4. Self Scope: Only the user's own ID
  return myId ? [myId] : [];
}

/**
 * Specifically calculates visible employees for the TEAM PERFORMANCE page
 */
export function getPerformanceVisibleEmployees(user, allEmployees = []) {
  if (!user || !allEmployees) return [];
  const perfScope = getPerformanceScope(user);
  if (!perfScope) return [];

  const myId = String(user.id || user.uid || user.employeeId || '');
  const userRole = normalizeRoleName(user.role || '');

  // 1. Company Scope (Director Operations, Executive Director) -> ALL employees
  if (perfScope === SCOPES.COMPANY) {
    return allEmployees;
  }

  // 2. Department Scope
  if (perfScope === SCOPES.DEPARTMENT) {
    if (userRole === 'Operations Head') {
      const opsDepts = ['operations', 'warehouse', 'transportation', 'service', 'inventory', 'qc'];
      return allEmployees.filter(e => {
        const d = (e.department || e.departmentId || '').toLowerCase();
        return opsDepts.includes(d) || d.includes('operation');
      });
    }

    if (userRole === 'CSO') {
      return allEmployees.filter(e => isInSalesDepartment(e));
    }

    if (userRole === 'Brand Manager') {
      const mktRoles = ['Brand Manager', 'Leads Coordinator', 'Graphic Designer', 'Photographer'];
      return allEmployees.filter(e => {
        const d = (e.department || e.departmentId || '').toLowerCase();
        const r = normalizeRoleName(e.role || e.designation || '');
        return d === 'marketing' || mktRoles.includes(r);
      });
    }

    if (userRole === 'Accounts Manager') {
      const finRoles = ['Accounts Manager', 'Accountant'];
      return allEmployees.filter(e => {
        const d = (e.department || e.departmentId || '').toLowerCase();
        const r = normalizeRoleName(e.role || e.designation || '');
        return (d === 'finance' || d === 'accounts' || finRoles.includes(r)) && finRoles.includes(r);
      });
    }

    if (userRole === 'HR Manager' || userRole === 'Admin Manager' || userRole === 'HR & Admin Manager') {
      const hrBranchRoles = ['Admin Manager', 'HR Executive', 'Admin Executive', 'IT Head', 'Housekeeping', 'Housekeeper'];
      const myAllowedRoles = userRole === 'Admin Manager'
        ? ['Admin Executive', 'IT Head', 'Housekeeping', 'Housekeeper']
        : hrBranchRoles;

      return allEmployees.filter(e => {
        const eId = String(e.id || e.uid || e.employeeId);
        const eRole = normalizeRoleName(e.role || e.designation || '');
        const eDept = (e.department || e.departmentId || '').toLowerCase();
        return eId === myId || ((eDept === 'hr_admin' || eDept === 'hr & admin') && myAllowedRoles.includes(eRole));
      });
    }

    const userDept = (user.department || user.departmentId || '').toLowerCase();
    return allEmployees.filter(e => {
      const eId = String(e.id || e.uid || e.employeeId);
      const eDept = (e.department || e.departmentId || '').toLowerCase();
      return eId === myId || eDept === userDept;
    });
  }

  // 3. Downline Scope
  if (perfScope === SCOPES.DOWNLINE) {
    const opsBranchRoles = getOperationsBranchRoles(userRole);
    if (opsBranchRoles.length > 0) {
      return allEmployees.filter(e => {
        const eId = String(e.id || e.uid || e.employeeId);
        const r = normalizeRoleName(e.role || e.designation || '');
        return eId === myId || opsBranchRoles.includes(r);
      });
    }

    if (userRole === 'Leads Coordinator') {
      const allowedRoles = ['Leads Coordinator', 'Graphic Designer', 'Photographer'];
      return allEmployees.filter(e => {
        const eId = String(e.id || e.uid || e.employeeId);
        const r = normalizeRoleName(e.role || e.designation || '');
        const d = (e.department || e.departmentId || '').toLowerCase();
        return eId === myId || ((d === 'marketing' || allowedRoles.includes(r)) && allowedRoles.includes(r));
      });
    }

    const downlineIds = new Set([myId]);
    if (Array.isArray(user.downline)) {
      user.downline.forEach(id => downlineIds.add(String(id)));
    }

    let added = true;
    while (added) {
      added = false;
      allEmployees.forEach(emp => {
        const empId = String(emp.id || emp.uid || emp.employeeId);
        const mgrId = String(emp.reportsTo || emp.reportingManagerId || '');
        if (mgrId && downlineIds.has(mgrId) && !downlineIds.has(empId)) {
          downlineIds.add(empId);
          added = true;
        }
      });
    }

    return allEmployees.filter(e => {
      const empId = String(e.id || e.uid || e.employeeId);
      return downlineIds.has(empId);
    });
  }

  return [];
}

export function canViewAll(user) {
  return isAllAccessPerformanceRole(user);
}

export function isGlobalManager(user) {
  if (!user) return false;
  return getScope(user) === SCOPES.COMPANY;
}

export function isGlobalTeamManager(user) {
  if (!user) return false;
  const role = user.role || '';
  return role === 'Executive Director' || 
         role === 'Director Operations' || 
         role === 'General Manager' || 
         role === 'HR Manager' || 
         role === 'HR & Admin Manager' ||
         role === 'Admin Manager';
}

export function getAllowedManagementDepartments(user, allDepartments = []) {
  if (!user) return [];
  if (isGlobalTeamManager(user)) return allDepartments;

  const role = user.role || '';
  if (role === 'Operations Head') {
    const allowedOpsDepts = ['operations', 'warehouse', 'transportation', 'service', 'inventory', 'qc'];
    return allDepartments.filter(d => {
      const dId = (d.id || d.name || '').toLowerCase();
      return allowedOpsDepts.includes(dId);
    });
  }

  const userDept = (user.department || user.departmentId || '').toLowerCase();
  return allDepartments.filter(d => {
    const dId = (d.id || d.name || '').toLowerCase();
    return dId === userDept;
  });
}

/**
 * Main Central Permission Function: can(user, permission, target?)
 * Evaluates whether `user` can perform `permission` on optional `target`.
 * Treats COMPANY_HEAD_ROLES ("Executive Director" & "Director Operations") with identical top authority.
 * Enforces universal safety rules 1a to 1e.
 */
export function can(user, permission, target = null) {
  if (!user || !permission) return false;
  const role = user.role || '';
  const normRole = normalizeRoleName(role);
  const userIsCompanyHead = isCompanyHead(user);

  // Check allowed permissions for the role
  const allowedList = EXPLICIT_PERMISSIONS_MAP[role] || EXPLICIT_PERMISSIONS_MAP[normRole];
  if (!allowedList || !allowedList.includes(permission)) {
    return false;
  }

  // --- UNIVERSAL SAFETY RULES (Applicable to everyone, including Company Heads) ---
  const myId = String(user.id || user.uid || user.employeeId || '');
  const targetId = target ? String(target.id || target.uid || target.employeeId || '') : '';
  const isSelf = myId && targetId && myId === targetId;

  // --- CSO ENTIRE SALES DEPARTMENT RULES ---
  if (isSalesHead(user)) {
    // 1. Cannot unlock days
    if (permission === PERMISSIONS.DAY_UNLOCK) {
      return false;
    }

    // 2. Cannot add, edit, import, deactivate or reset passwords for employees
    if ([
      PERMISSIONS.EMPLOYEE_CREATE, PERMISSIONS.EMPLOYEE_EDIT, PERMISSIONS.EMPLOYEE_IMPORT,
      PERMISSIONS.EMPLOYEE_DEACTIVATE, PERMISSIONS.EMPLOYEE_ACTIVATE, PERMISSIONS.EMPLOYEE_RESET_PASSWORD
    ].includes(permission)) {
      return false;
    }

    // 3. Cannot approve own tasks
    if (permission === PERMISSIONS.APPROVAL_REVIEW && target) {
      const taskAssigneeId = String(target.assignedToId || target.assigneeId || '');
      const taskCreatorId = String(target.createdById || target.creatorId || '');
      if (taskAssigneeId === myId || taskCreatorId === myId) {
        return false;
      }
    }

    // 4. For any target employee or task, target MUST belong to Sales
    if (target) {
      // Team permission check
      if (permission.startsWith('team.')) {
        const teamDept = (target.departmentId || target.department || '').toLowerCase();
        if (teamDept && teamDept !== 'sales') {
          return false;
        }
      } else {
        // Employee or task target check
        const isSales = isInSalesDepartment(target);
        if (!isSales) {
          return false;
        }
      }
    }
  }

  // Rule 1a: Cannot change their own role, level or designation
  if (permission === PERMISSIONS.EMPLOYEE_EDIT && isSelf && target) {
    if (target.isRoleChange || target.roleChanged || target.newRole || target.newLevel || target.newDesignation) {
      return false;
    }
  }

  // Rule 1b: Cannot deactivate their own account
  if (permission === PERMISSIONS.EMPLOYEE_DEACTIVATE && isSelf) {
    return false;
  }

  // Rule 1c: Cannot archive a department that still has active employees
  if (permission === PERMISSIONS.DEPARTMENT_ARCHIVE && target) {
    const activeCount = Number(target.activeEmployeesCount ?? target.assignedCount ?? target.memberCount ?? 0);
    if (activeCount > 0) {
      return false;
    }
  }

  // Rule 1d: Cannot delete a team that still has active tasks
  if (permission === PERMISSIONS.TEAM_DELETE && target) {
    const activeTasksCount = Number(target.activeTasksCount ?? target.taskCount ?? 0);
    if (activeTasksCount > 0) {
      return false;
    }
  }

  // Rule 1e: The system must always keep at least one active company head (cannot deactivate the last one)
  if (permission === PERMISSIONS.EMPLOYEE_DEACTIVATE && target) {
    const targetIsCompanyHead = isCompanyHead(target);
    if (targetIsCompanyHead) {
      const activeHeadCount = Number(target.activeCompanyHeadsCount ?? target.companyHeadCount ?? 2);
      if (activeHeadCount <= 1) {
        return false;
      }
    }
  }

  // Operations Head restriction: Teams must be within operations division
  if (normRole === 'Operations Head' && target && permission.startsWith('team.')) {
    const tDept = (target.departmentId || target.department || '').toLowerCase();
    const opsDepts = ['operations', 'warehouse', 'transportation', 'service', 'inventory', 'qc'];
    if (tDept && !opsDepts.includes(tDept)) {
      return false;
    }
  }

  return true;
}

export function canManageEmployees(user, target = null) {
  return can(user, PERMISSIONS.EMPLOYEE_VIEW, target) && can(user, PERMISSIONS.EMPLOYEE_EDIT, target);
}

export function canManageOrgStructure(user, target = null) {
  return can(user, PERMISSIONS.DEPARTMENT_EDIT, target) || can(user, PERMISSIONS.DESIGNATION_EDIT, target);
}

export function canManageTeam(user, team = null) {
  if (!user) return false;
  return can(user, PERMISSIONS.TEAM_EDIT, team);
}

export function canUserAssignTo(assigner, assignee, allEmployees = [], teamMembers = []) {
  if (!assigner || !assignee) return false;
  // If HR has explicitly toggled or assigned permission on the user profile, respect that override
  if (assigner.canAssignTask === false) return false;
  const config = getRoleConfig(assigner);
  const canAssign = assigner.canAssignTask === true || Boolean(config?.canAssign);
  if (!canAssign) return false;

  const assignerId = String(assigner.id || assigner.uid || assigner.employeeId || '');
  const assigneeId = String(assignee.id || assignee.uid || assignee.employeeId || '');
  if (assignerId === assigneeId) return false;

  // Dynamic team member reportingLead check:
  // If in any team, assignee reports directly to assigner (via reportingLeadId or direct leader), they can assign!
  if (Array.isArray(teamMembers) && teamMembers.length > 0) {
    const isDirectTeamLead = teamMembers.some(tm => 
      String(tm.userId || tm.employeeId) === assigneeId && 
      String(tm.reportingLeadId) === assignerId &&
      tm.status === 'active'
    );
    if (isDirectTeamLead) return true;
  }

  const roleNorm = normalizeRoleName(assigner.role || '');

  // 1. Universal roles (Executive Director & Director Operations) can assign to ANYONE
  if (roleNorm === 'Director Operations' || roleNorm === 'Executive Director') {
    return true;
  }

  // 1b. CSO (Chief Sales Officer): CAN ASSIGN TO ANY SALES EMPLOYEE (entire Sales department)
  if (roleNorm === 'CSO') {
    return isInSalesDepartment(assignee);
  }

  // 2. Operations Head can assign to anyone in Operations
  if (roleNorm === 'Operations Head') {
    const d = (assignee.department || assignee.departmentId || '').toLowerCase();
    const opsDepts = ['operations', 'warehouse', 'transportation', 'service', 'inventory', 'qc'];
    return opsDepts.includes(d) || d.includes('operation');
  }

  // 3. Operations Branch Managers & Supervisors: strictly their branch downline
  const opsBranchRoles = getOperationsBranchRoles(roleNorm);
  if (opsBranchRoles.length > 0) {
    const assigneeRole = normalizeRoleName(assignee.role || assignee.designation || '');
    return opsBranchRoles.includes(assigneeRole);
  }

  // 4. Downline check: assigner can assign to anyone in their downline tree
  const visibleIds = getVisibleUserIds(assigner, allEmployees);
  return visibleIds.includes(assigneeId);
}

export function getAssignableEmployees(user, allEmployees = [], deptFilter = null, teamMembers = []) {
  if (!user || !allEmployees) return [];
  // If HR has explicitly toggled canAssignTask off, disallow assigning
  if (user.canAssignTask === false) return [];
  const config = getRoleConfig(user);
  const canAssign = user.canAssignTask === true || Boolean(config?.canAssign);
  if (!canAssign) return [];

  const myId = String(user.id || user.uid || user.employeeId);
  const roleNorm = normalizeRoleName(user.role || '');

  // Dynamic squad reporting lead support:
  // If this user is configured as a squad leader or sub-lead for any members, add those members!
  const squadReportingMemberIds = new Set();
  if (Array.isArray(teamMembers) && teamMembers.length > 0) {
    teamMembers.forEach(tm => {
      if (String(tm.reportingLeadId) === myId && tm.status === 'active') {
        squadReportingMemberIds.add(String(tm.userId || tm.employeeId));
      }
    });
  }

  // Top Universal Leadership (Executive Director, Director Operations)
  if (roleNorm === 'Director Operations' || roleNorm === 'Executive Director') {
    return allEmployees.filter(e => {
      const id = String(e.id || e.uid || e.employeeId);
      if (id === myId) return false;
      if (deptFilter && deptFilter !== 'all') {
        const d = (e.department || e.departmentId || '').toLowerCase();
        return d.includes(deptFilter.toLowerCase());
      }
      return true;
    });
  }

  // CSO: ALL employees in the Sales Department (whether in direct chain or not)
  if (roleNorm === 'CSO') {
    return allEmployees.filter(e => {
      const id = String(e.id || e.uid || e.employeeId);
      if (id === myId) return false;
      return isInSalesDepartment(e);
    });
  }

  // Operations Head can assign to ANYONE in all 4 operations branches
  if (roleNorm === 'Operations Head') {
    const opsDepts = ['operations', 'warehouse', 'transportation', 'service', 'inventory', 'qc'];
    return allEmployees.filter(e => {
      const id = String(e.id || e.uid || e.employeeId);
      if (id === myId) return false;
      const d = (e.department || e.departmentId || '').toLowerCase();
      const inOps = opsDepts.includes(d) || d.includes('operation');
      if (!inOps) return false;
      if (deptFilter && deptFilter !== 'all') {
        return d.includes(deptFilter.toLowerCase());
      }
      return true;
    });
  }

  // Operations Branch Managers & Supervisors: strictly their branch downline
  const opsBranchRoles = getOperationsBranchRoles(roleNorm);
  if (opsBranchRoles.length > 0) {
    return allEmployees.filter(e => {
      const id = String(e.id || e.uid || e.employeeId);
      if (id === myId) return false;
      if (squadReportingMemberIds.has(id)) return true;
      const r = normalizeRoleName(e.role || e.designation || '');
      return opsBranchRoles.includes(r);
    });
  }

  // Accounts Manager can assign only to Accountants
  if (roleNorm === 'Accounts Manager') {
    return allEmployees.filter(e => {
      const id = String(e.id || e.uid || e.employeeId);
      if (id === myId) return false;
      if (squadReportingMemberIds.has(id)) return true;
      const r = normalizeRoleName(e.role || e.designation || '');
      return r === 'Accountant';
    });
  }

  // HR Manager, Admin Manager, Squad Sub-Leads & Downline supervisors
  const visibleIds = getVisibleUserIds(user, allEmployees);
  return allEmployees.filter(e => {
    const id = String(e.id || e.uid || e.employeeId);
    return id !== myId && (visibleIds.includes(id) || squadReportingMemberIds.has(id));
  });
}
