/**
 * Central Permission Layer for STARK STEEL DOORS (SalesDoor Enterprise)
 * Single source of truth for Role-Based Access Control (RBAC).
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

export const PAGES = {
  DASHBOARD: 'dashboard',
  TEAM_PERFORMANCE: 'team_performance',
  MY_TASKS: 'my_tasks',
  ALL_TASKS: 'all_tasks',
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
 * 1. Single Array of All-Access Performance Roles:
 * Only roles listed here see ALL 10 departments and the department filter in Team Performance.
 */
export const ALL_ACCESS_PERFORMANCE_ROLES = [
  'Executive Director',
  'Director Operations'
];

export function isAllAccessPerformanceRole(user) {
  if (!user) return false;
  const role = user.role || '';
  return ALL_ACCESS_PERFORMANCE_ROLES.includes(role);
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
      PAGES.DASHBOARD, PAGES.TEAM_PERFORMANCE, PAGES.APPROVALS, PAGES.MY_TASKS,
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
      PAGES.DASHBOARD, PAGES.TEAM_PERFORMANCE, PAGES.APPROVALS, PAGES.MY_TASKS,
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
      PAGES.DASHBOARD, PAGES.TEAM_PERFORMANCE, PAGES.APPROVALS, PAGES.MY_TASKS,
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
      PAGES.DASHBOARD, PAGES.TEAM_PERFORMANCE, PAGES.APPROVALS, PAGES.MY_TASKS,
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
      PAGES.DASHBOARD, PAGES.TEAM_PERFORMANCE, PAGES.APPROVALS, PAGES.MY_TASKS,
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
      PAGES.DASHBOARD, PAGES.MY_TASKS, PAGES.TODOS, PAGES.TEAMS
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
    canManageTeams: false,
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
    canManageTeams: false,
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
      PAGES.REPORTS
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
      PAGES.DASHBOARD, PAGES.MY_TASKS, PAGES.TODOS, PAGES.TEAMS
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
      PAGES.DASHBOARD, PAGES.MY_TASKS, PAGES.TODOS, PAGES.TEAMS
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
    return ['Warehouse Supervisor', 'Loading Staff'];
  }
  if (norm === 'Warehouse Supervisor') {
    return ['Loading Staff'];
  }
  if (norm === 'Transport Manager') {
    return ['Transport Coordinator', 'Driver'];
  }
  if (norm === 'Transport Coordinator') {
    return ['Driver'];
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
    // CSO sees all employees across all Sales hierarchy
    if (userRole === 'CSO') {
      const salesEmployees = allEmployees.filter(e => {
        const d = (e.department || e.departmentId || '').toLowerCase();
        const r = normalizeRoleName(e.role || '');
        return d === 'sales' || ['SSM', 'ASM', 'Sales Coordinator'].includes(r);
      });
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
      return allEmployees.filter(e => {
        const d = (e.department || e.departmentId || '').toLowerCase();
        const r = normalizeRoleName(e.role || '');
        return d === 'sales' || ['SSM', 'ASM', 'Sales Coordinator'].includes(r);
      });
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
  return role === 'Executive Director' || role === 'Director Operations' || role === 'General Manager' || role === 'HR Manager';
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

export function canManageEmployees(user) {
  const config = getRoleConfig(user);
  return config ? config.canManageEmployees : false;
}

export function canManageOrgStructure(user) {
  if (!user) return false;
  const config = getRoleConfig(user);
  return config ? Boolean(config.canManageOrgStructure) : false;
}

export function canManageTeam(user, team = null) {
  if (!user) return false;
  const config = getRoleConfig(user);
  if (!config) return false;

  if (config.canManageTeams) {
    if (user.role === 'Operations Head' && team) {
      const teamDept = (team.departmentId || team.department || '').toLowerCase();
      const allowed = ['operations', 'warehouse', 'transportation', 'service', 'inventory', 'qc'];
      return allowed.includes(teamDept);
    }
    return true;
  }

  return false;
}

export function canUserAssignTo(assigner, assignee, allEmployees = []) {
  if (!assigner || !assignee) return false;
  const config = getRoleConfig(assigner);
  if (!config || !config.canAssign) return false;

  const roleNorm = normalizeRoleName(assigner.role || '');

  // 1. Universal roles & CSO can assign to ANYONE who they want
  if (roleNorm === 'CSO' || roleNorm === 'Director Operations' || roleNorm === 'Executive Director') {
    return true;
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
  const assigneeId = String(assignee.id || assignee.uid || assignee.employeeId);
  return visibleIds.includes(assigneeId);
}

export function getAssignableEmployees(user, allEmployees = [], deptFilter = null) {
  if (!user || !allEmployees) return [];
  const config = getRoleConfig(user);
  if (!config || !config.canAssign) return [];

  const myId = String(user.id || user.uid || user.employeeId);
  const roleNorm = normalizeRoleName(user.role || '');

  // Top Universal Leadership & CSO
  if (roleNorm === 'CSO' || roleNorm === 'Director Operations' || roleNorm === 'Executive Director') {
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
      const r = normalizeRoleName(e.role || e.designation || '');
      return opsBranchRoles.includes(r);
    });
  }

  // Accounts Manager can assign only to Accountants
  if (roleNorm === 'Accounts Manager') {
    return allEmployees.filter(e => {
      const id = String(e.id || e.uid || e.employeeId);
      if (id === myId) return false;
      const r = normalizeRoleName(e.role || e.designation || '');
      return r === 'Accountant';
    });
  }

  // HR Manager, Admin Manager & Downline supervisors
  const visibleIds = getVisibleUserIds(user, allEmployees);
  return allEmployees.filter(e => {
    const id = String(e.id || e.uid || e.employeeId);
    return id !== myId && visibleIds.includes(id);
  });
}
