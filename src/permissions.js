/**
 * Central Permission Layer for STARK STEEL DOORS (SalesDoor Enterprise)
 * Single source of truth for Role-Based Access Control (RBAC).
 * 
 * Scopes:
 * - "company": Universal company-wide oversight (Director Operations, Executive Director)
 * - "department": Department-wide oversight (Department Heads like CSO, Operations Head, Accounts Manager, Brand Manager, Service Manager, etc.)
 * - "downline": Downline tree hierarchy oversight (SSM, ASM, team leaders / supervisors)
 * - "self": Frontline personnel (Sales Coordinator, Accountant, Driver, Loading Staff, Technician, etc.)
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
 * HR/Admin and General Manager do NOT get company-wide performance by default.
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

  // General Manager & HR/Admin: Company operational scope, but their Team Performance is Department/Team
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

  // Department Heads: Department Scope
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
  'Operations Head': {
    scope: SCOPES.DEPARTMENT,
    performanceScope: SCOPES.DEPARTMENT,
    menu: [
      PAGES.DASHBOARD, PAGES.TEAM_PERFORMANCE, PAGES.ALL_TASKS, PAGES.MY_TASKS,
      PAGES.APPROVALS, PAGES.ESCALATIONS, PAGES.TODOS, PAGES.TEAMS,
      PAGES.REPORTS
    ],
    canAssign: true,
    canApprove: true,
    canManageTeams: true,
    canManageEmployees: false
  },
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
  'Service Manager': {
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
  'Transport Manager': {
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
  'Warehouse In-charge': {
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

  // Downline Leadership: Downline Scope (sees self + people under them)
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
  'Asst Sales Manager': {
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

  // Frontline / Self Scope (NO downline): Team Performance is HIDDEN
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
  if (role.toLowerCase().includes('head') || role.toLowerCase().includes('manager')) {
    return ROLE_PERMISSIONS_CONFIG['Operations Head'];
  }
  if (role.toLowerCase().includes('coordinator') || role.toLowerCase().includes('supervisor') || role.toLowerCase().includes('lead')) {
    return ROLE_PERMISSIONS_CONFIG['Warehouse Supervisor'];
  }

  // Default frontline
  return ROLE_PERMISSIONS_CONFIG['Sales Coordinator'];
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
 * Get visible user IDs for general queries and metrics computation
 */
export function getVisibleUserIds(user, allEmployees = []) {
  if (!user) return [];
  const scope = getScope(user);
  const myId = String(user.id || user.uid || user.employeeId || '');

  // 1. Company Scope: Sees all employees
  // EXCEPTION: HR Manager & Admin Manager manage full company directory, but their own
  // operational tasks and squad assignments are strictly limited to their own HR downline.
  if (scope === SCOPES.COMPANY) {
    const roleNorm = normalizeRoleName(user.role || '');
    if (roleNorm === 'HR Manager' || roleNorm === 'Admin Manager' || roleNorm === 'HR & Admin Manager') {
      const hrBranchRoles = ['Admin Manager', 'HR Executive', 'Admin Executive', 'IT Head', 'Housekeeping', 'Housekeeper'];
      const myAllowedRoles = roleNorm === 'Admin Manager' 
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

  // 2. Department Scope: All employees in their department (CSO sees entire Sales team)
  if (scope === SCOPES.DEPARTMENT) {
    const userRole = normalizeRoleName(user.role || '');
    const userDept = (user.department || user.departmentId || '').toLowerCase();
    
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

    // Brand Manager sees all Marketing roles: Leads Coordinator, Graphic Designer, Photographer
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

    const deptEmployees = allEmployees.filter(e => {
      const eDept = (e.department || e.departmentId || '').toLowerCase();
      return eDept === userDept;
    });
    const ids = deptEmployees.map(e => String(e.id || e.uid || e.employeeId));
    if (myId && !ids.includes(myId)) ids.push(myId);
    return ids;
  }

  // 3. Downline Scope: Recursive tree downline based on reportsTo / reportingManagerId
  if (scope === SCOPES.DOWNLINE) {
    const userRole = normalizeRoleName(user.role || '');

    // Leads Coordinator sees self + Graphic Designer and Photographer
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
 * Includes the leader's own row ("You") + downline / department / company
 */
export function getPerformanceVisibleEmployees(user, allEmployees = []) {
  if (!user || !allEmployees) return [];
  const perfScope = getPerformanceScope(user);
  if (!perfScope) return [];

  const myId = String(user.id || user.uid || user.employeeId || '');

  // 1. Company Scope (Director Operations, Executive Director) -> ALL employees
  if (perfScope === SCOPES.COMPANY) {
    return allEmployees;
  }

  // 2. Department Scope -> Department employees including self (CSO sees entire Sales team)
  if (perfScope === SCOPES.DEPARTMENT) {
    const userRole = normalizeRoleName(user.role || '');
    const userDept = (user.department || user.departmentId || '').toLowerCase();

    if (userRole === 'CSO') {
      return allEmployees.filter(e => {
        const d = (e.department || e.departmentId || '').toLowerCase();
        const r = normalizeRoleName(e.role || '');
        return d === 'sales' || ['SSM', 'ASM', 'Sales Coordinator'].includes(r);
      });
    }

    // Brand Manager sees all Marketing roles in Team Performance
    if (userRole === 'Brand Manager') {
      const mktRoles = ['Brand Manager', 'Leads Coordinator', 'Graphic Designer', 'Photographer'];
      return allEmployees.filter(e => {
        const d = (e.department || e.departmentId || '').toLowerCase();
        const r = normalizeRoleName(e.role || e.designation || '');
        return d === 'marketing' || mktRoles.includes(r);
      });
    }

    // HR Manager / Admin Manager sees their HR branch downline
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

    return allEmployees.filter(e => {
      const eId = String(e.id || e.uid || e.employeeId);
      const eDept = (e.department || e.departmentId || '').toLowerCase();
      return eId === myId || eDept === userDept;
    });
  }

  // 3. Downline Scope -> Self + recursive downline tree
  if (perfScope === SCOPES.DOWNLINE) {
    const userRole = normalizeRoleName(user.role || '');

    // Leads Coordinator sees self + Graphic Designer and Photographer
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
      const eId = String(e.id || e.uid || e.employeeId);
      return downlineIds.has(eId);
    });
  }

  return [];
}

/**
 * Universal Authority checks
 */
export function canViewAll(user) {
  return isAllAccessPerformanceRole(user);
}

export function isGlobalManager(user) {
  return getScope(user) === SCOPES.COMPANY;
}

export function isGlobalTeamManager(user) {
  return getScope(user) === SCOPES.COMPANY;
}

/**
 * Returns list of department objects or ids the user is authorized to manage
 */
export function getAllowedManagementDepartments(user, allDepartments = []) {
  if (!user) return [];
  const config = getRoleConfig(user);
  if (!config || !config.canManageTeams) return [];

  // Global / Company managers can manage teams across all departments
  if (config.scope === SCOPES.COMPANY) {
    return allDepartments;
  }

  // Operations Head manages operational squads
  if (user.role === 'Operations Head') {
    const allowed = ['operations', 'warehouse', 'transportation', 'service', 'inventory', 'qc'];
    return allDepartments.filter(d => allowed.includes((d.id || d.name || '').toLowerCase()));
  }

  // Department heads manage their own department
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

  // 2. Downline check: assigner can assign to anyone in their downline tree
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

  // Top Universal Leadership (Director Operations, Executive Director) & CSO: assign company-wide / sales-wide
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

  // HR Manager, Admin Manager & Downline supervisors: strictly their downline tree
  const visibleIds = getVisibleUserIds(user, allEmployees);
  return allEmployees.filter(e => {
    const id = String(e.id || e.uid || e.employeeId);
    return id !== myId && visibleIds.includes(id);
  });
}
