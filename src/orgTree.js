/**
 * Normalizes any department id, code, or title string into a canonical ID.
 */
function normalizeDept(value) {
  if (!value) return '';
  const str = String(value).trim().toLowerCase();
  if (str === 'hr' || str === 'hr_admin' || str === 'hr & admin' || str === 'hr & administration') return 'hr_admin';
  if (str === 'qc' || str === 'quality_control' || str === 'quality control') return 'qc';
  if (str === 'exec' || str === 'management') return 'management';
  if (str === 'fin' || str === 'finance') return 'finance';
  if (str === 'ops' || str === 'operations') return 'operations';
  if (str === 'wh' || str === 'warehouse') return 'warehouse';
  if (str === 'trans' || str === 'transportation') return 'transportation';
  if (str === 'serv' || str === 'service') return 'service';
  if (str === 'inv' || str === 'inventory') return 'inventory';
  if (str === 'mkt' || str === 'marketing') return 'marketing';
  return str;
}

/**
 * Single Unified Organization Hierarchy Tree for STARK STEEL DOORS (SalesDoor Enterprise)
 * Covers all 10 departments:
 * - Executive Director → General Manager → Department Heads
 * - HR: HR Manager → Admin Manager, HR Executive; Admin Manager → Admin Executive, IT Head, Housekeeping
 * - Finance: Accounts Manager → Accountant
 * - Operations: Operations Head → Warehouse In-charge, Transport Manager, Service Manager, Inventory Supervisor, Operations Assistant
 *   - Warehouse In-charge → Warehouse Supervisor → Loading Staff
 *   - Transport Manager → Transport Coordinator → Drivers
 *   - Service Manager → Service Coordinator → Technicians
 *   - Inventory Supervisor → Storekeeper
 * - Sales: CSO → SSM → ASM → Sales Coordinator
 * - Marketing: Brand Manager → Leads Coordinator → Graphic Designer, Photographer
 */

export const ORG_TREE = {
  'Executive Director': {
    department: 'management',
    level: 1,
    children: ['Director Operations', 'General Manager']
  },
  'Director Operations': {
    department: 'management',
    level: 2,
    children: [
      'HR Manager',
      'Accounts Manager',
      'Operations Head',
      'CSO',
      'Brand Manager'
    ]
  },
  'General Manager': {
    department: 'management',
    level: 2,
    children: [
      'HR Manager',
      'Accounts Manager',
      'Operations Head',
      'Brand Manager'
    ]
  },

  // --- HR & Administration ---
  'HR Manager': {
    department: 'hr_admin',
    level: 3,
    children: ['Admin Manager', 'HR Executive']
  },
  'HR Executive': {
    department: 'hr_admin',
    level: 4,
    children: []
  },
  'Admin Manager': {
    department: 'hr_admin',
    level: 4,
    children: ['Admin Executive', 'IT Head', 'Housekeeping']
  },
  'Admin Executive': {
    department: 'hr_admin',
    level: 5,
    children: []
  },
  'IT Head': {
    department: 'hr_admin',
    level: 5,
    children: []
  },
  'Housekeeping': {
    department: 'hr_admin',
    level: 5,
    children: []
  },

  // --- Finance & Accounts ---
  'Accounts Manager': {
    department: 'finance',
    level: 3,
    children: ['Accountant']
  },
  'Accountant': {
    department: 'finance',
    level: 4,
    children: []
  },

  // --- Operations Department Hub ---
  'Operations Head': {
    department: 'operations',
    level: 3,
    children: [
      'Warehouse In-charge',
      'Transport Manager',
      'Service Manager',
      'Inventory Supervisor',
      'Operations Assistant'
    ]
  },
  'Operations Assistant': {
    department: 'operations',
    level: 4,
    children: []
  },

  // Warehouse Branch
  'Warehouse In-charge': {
    department: 'warehouse',
    level: 4,
    children: ['Warehouse Supervisor']
  },
  'Warehouse Supervisor': {
    department: 'warehouse',
    level: 5,
    children: ['Loading Staff']
  },
  'Loading Staff': {
    department: 'warehouse',
    level: 6,
    children: []
  },

  // Transportation Branch
  'Transport Manager': {
    department: 'transportation',
    level: 4,
    children: ['Transport Coordinator']
  },
  'Transport Coordinator': {
    department: 'transportation',
    level: 5,
    children: ['Driver', 'Delivery Partner']
  },
  'Driver': {
    department: 'transportation',
    level: 6,
    children: []
  },
  'Delivery Partner': {
    department: 'transportation',
    level: 6,
    children: []
  },

  // Service Branch
  'Service Manager': {
    department: 'service',
    level: 4,
    children: ['Service Coordinator']
  },
  'Service Coordinator': {
    department: 'service',
    level: 5,
    children: ['Technician']
  },
  'Technician': {
    department: 'service',
    level: 6,
    children: []
  },

  // Inventory Branch
  'Inventory Supervisor': {
    department: 'inventory',
    level: 4,
    children: ['Storekeeper']
  },
  'Storekeeper': {
    department: 'inventory',
    level: 5,
    children: []
  },

  // --- Sales Department ---
  'CSO': {
    department: 'sales',
    level: 3,
    children: ['SSM']
  },
  'SSM': {
    department: 'sales',
    level: 4,
    children: ['ASM']
  },
  'ASM': {
    department: 'sales',
    level: 5,
    children: ['Sales Coordinator', 'Asst Sales Manager']
  },
  'Asst Sales Manager': {
    department: 'sales',
    level: 5,
    children: ['Sales Coordinator']
  },
  'Sales Coordinator': {
    department: 'sales',
    level: 6,
    children: []
  },

  // --- Marketing Department ---
  'Brand Manager': {
    department: 'marketing',
    level: 3,
    children: ['Leads Coordinator']
  },
  'Leads Coordinator': {
    department: 'marketing',
    level: 4,
    children: ['Graphic Designer', 'Photographer']
  },
  'Graphic Designer': {
    department: 'marketing',
    level: 5,
    children: []
  },
  'Photographer': {
    department: 'marketing',
    level: 5,
    children: []
  }
};

/**
 * Official Company Departments
 */
export const COMPANY_DEPARTMENTS = [
  { id: 'management', name: 'Executive Management', headRole: 'Executive Director' },
  { id: 'hr_admin', name: 'HR & Administration', headRole: 'HR Manager' },
  { id: 'finance', name: 'Finance & Accounts', headRole: 'Accounts Manager' },
  { id: 'sales', name: 'Sales', headRole: 'Chief Sales Officer' },
  { id: 'operations', name: 'Operations', headRole: 'Operations Head' },
  { id: 'warehouse', name: 'Warehouse', headRole: 'Warehouse In-charge' },
  { id: 'qc', name: 'Quality Control (QC)', headRole: 'QC Inspector' },
  { id: 'transportation', name: 'Transportation', headRole: 'Transport Manager' },
  { id: 'service', name: 'Service', headRole: 'Service Manager' },
  { id: 'inventory', name: 'Inventory', headRole: 'Inventory Supervisor' },
  { id: 'marketing', name: 'Marketing', headRole: 'Brand Manager' }
];

export function normalizeRole(role) {
  if (!role) return '';
  const r = String(role).trim();
  if (r === 'Chief Sales Officer' || r === 'CSO') return 'CSO';
  if (r === 'State Sales Manager' || r === 'SSM' || r === 'Senior Sales Manager') return 'SSM';
  if (r === 'Asst Sales Manager' || r === 'Assistant Sales Manager' || r === 'ASM' || r === 'Area Sales Manager') return 'ASM';
  if (r === 'Delivery Partner') return 'Driver';
  if (r === 'Service Technician') return 'Technician';
  if (r === 'Warehouse Executive' || r === 'QC Supervisor' || r === 'Dispatch Supervisor') return 'Warehouse Supervisor';
  if (r === 'Accounts Executive') return 'Accounts Manager';
  if (r === 'Junior Accountant') return 'Accountant';
  if (r === 'HR & Admin Manager') return 'HR Manager';
  if (r === 'Housekeeper') return 'Housekeeping';
  return r;
}

export function getRoleLevel(role) {
  const norm = normalizeRole(role);
  return ORG_TREE[norm]?.level || 99;
}

export function isDirectSubordinate(managerRole, memberRole) {
  const normMgr = normalizeRole(managerRole);
  const normMember = normalizeRole(memberRole);
  const node = ORG_TREE[normMgr];
  if (!node) return false;
  return node.children.includes(normMember);
}

export function isDescendantRole(ancestorRole, descendantRole) {
  const normAncestor = normalizeRole(ancestorRole);
  const normDescendant = normalizeRole(descendantRole);
  if (normAncestor === normDescendant) return true;

  const visited = new Set();
  const queue = [...(ORG_TREE[normAncestor]?.children || [])];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === normDescendant) return true;
    if (!visited.has(current)) {
      visited.add(current);
      const nextChildren = ORG_TREE[current]?.children || [];
      queue.push(...nextChildren);
    }
  }

  return false;
}

export function getDownlineRoles(role) {
  const norm = normalizeRole(role);
  const downline = new Set();
  const queue = [...(ORG_TREE[norm]?.children || [])];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!downline.has(current)) {
      downline.add(current);
      const nextChildren = ORG_TREE[current]?.children || [];
      queue.push(...nextChildren);
    }
  }

  return Array.from(downline);
}

/**
 * Strict check: Is `targetRole` in the downline of `parentRole`?
 */
export function isDownlineRole(parentRole, targetRole) {
  if (!parentRole || !targetRole) return false;
  const pNorm = normalizeRole(parentRole);
  const tNorm = normalizeRole(targetRole);

  if (pNorm === tNorm) return false;

  // Executive leadership has universal downline
  if (pNorm === 'Executive Director' || pNorm === 'Director Operations' || pNorm === 'General Manager') {
    return true;
  }

  const downline = getDownlineRoles(pNorm);
  return downline.includes(tNorm);
}

/**
 * Validates whether a member role can be placed under a leader role in a team
 * Returns { valid: boolean, reason?: string }
 */
export function validateTeamPlacement(leaderRole, memberRole, teamDepartment = null) {
  if (!leaderRole || !memberRole) {
    return { valid: false, reason: 'Both leader and member roles are required.' };
  }

  const lNorm = normalizeRole(leaderRole);
  const mNorm = normalizeRole(memberRole);

  if (lNorm === mNorm) {
    return { valid: false, reason: `A ${memberRole} cannot report to themselves or another ${leaderRole}.` };
  }

  const lNode = ORG_TREE[lNorm];
  const mNode = ORG_TREE[mNorm];

  if (!lNode) {
    return { valid: false, reason: `Unknown leader role "${leaderRole}".` };
  }
  if (!mNode) {
    return { valid: false, reason: `Unknown member role "${memberRole}".` };
  }

  // Member must be at a lower level (higher number)
  if (mNode.level <= lNode.level) {
    return { 
      valid: false, 
      reason: `A ${memberRole} (Level ${mNode.level}) cannot report to or be placed under a ${leaderRole} (Level ${lNode.level}).` 
    };
  }

  // Must be in downline
  const downline = getDownlineRoles(lNorm);
  if (!downline.includes(mNorm)) {
    return { 
      valid: false, 
      reason: `Invalid hierarchy placement: A ${memberRole} does not report under a ${leaderRole} in the company structure.` 
    };
  }

  return { valid: true };
}

export const MIN_LEADER_LEVEL = 1;
export const MAX_LEADER_LEVEL = 4;

/**
 * Roles allowed to act as Leader for a given department
 * Rule:
 * - Minimum level: MIN_LEADER_LEVEL (1)
 * - Maximum level: MAX_LEADER_LEVEL (4)
 * - Director Operations and Executive Director: may pick leaders from L1 to L4 in ANY department, including themselves.
 * - HR & Admin managers: may pick L1 to L4 in ANY department.
 * - Operations Head: may pick L1 to L4 only for operational departments (Operations, Warehouse, Transportation, Service, QC, Inventory).
 * - Department Heads: may pick leaders only inside their own department and downline.
 */
export function getAllowedLeadersForDepartment(deptId, creatorUser = null) {
  if (!deptId) return [];
  const normalizedDept = normalizeDept(deptId);

  const creatorRole = creatorUser ? normalizeRole(creatorUser.role) : '';
  const creatorDept = creatorUser ? normalizeDept(creatorUser.department || creatorUser.departmentId) : '';

  const isExecutiveLeadership = creatorRole === 'Executive Director' || creatorRole === 'Director Operations' || creatorRole === 'General Manager';
  const isHRLeadership = creatorRole === 'HR Manager' || creatorRole === 'Admin Manager' || creatorRole === 'HR & Admin Manager' || creatorDept === 'hr_admin';
  const isOpsHead = creatorRole === 'Operations Head';

  const operationalDepts = ['operations', 'warehouse', 'transportation', 'service', 'inventory', 'qc'];

  const matching = Object.entries(ORG_TREE)
    .filter(([role, config]) => {
      // 1. Level constraint: Must be between MIN_LEADER_LEVEL (1) and MAX_LEADER_LEVEL (4)
      const lvl = config.level;
      if (lvl === undefined || lvl < MIN_LEADER_LEVEL || lvl > MAX_LEADER_LEVEL) {
        return false;
      }

      // If no creatorUser provided (backward compatibility), return roles matching standard hierarchy
      if (!creatorUser) {
        if (config.department === 'management') return true;
        if (role === 'Operations Head' && operationalDepts.includes(normalizedDept)) return true;
        const isDept = config.department === normalizedDept || 
                       (normalizedDept === 'hr_admin' && (config.department === 'hr_admin' || config.department === 'hr')) ||
                       (normalizedDept === 'operations' && operationalDepts.includes(config.department));
        return isDept;
      }

      // 2. Creator Permission Scopes:
      // A) Executive Director, Director Operations, GM: Can pick leaders from L1 to L4 in ANY department
      if (isExecutiveLeadership) {
        return true;
      }

      // B) HR & Admin managers: Can pick L1 to L4 in ANY department
      if (isHRLeadership) {
        return true;
      }

      // C) Operations Head: May pick L1 to L4 only for operational departments
      if (isOpsHead) {
        if (!operationalDepts.includes(normalizedDept)) {
          return false;
        }
        return config.department === 'management' || 
               operationalDepts.includes(config.department) || 
               operationalDepts.includes(normalizedDept);
      }

      // D) Department Heads: May pick leaders only inside their own department and downline
      const isSameDept = config.department === creatorDept || config.department === normalizedDept;
      const isDownline = isDownlineRole(creatorRole, role);
      return isSameDept && (isDownline || role === creatorRole);
    })
    .map(([role]) => role);

  return matching;
}

/**
 * Get parent role for a given role (reportsTo role)
 */
export function getParentRole(role) {
  const norm = normalizeRole(role);
  for (const [pRole, config] of Object.entries(ORG_TREE)) {
    if (config.children && config.children.includes(norm)) {
      return pRole;
    }
  }
  return null;
}

