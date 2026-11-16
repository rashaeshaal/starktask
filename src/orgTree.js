/**
 * Single Unified Organization Hierarchy Tree for STARK STEEL DOORS (SalesDoor Enterprise)
 * Covers all 10 departments:
 * - Executive Director → General Manager → Department Heads
 * - HR: HR Manager → Admin Manager, HR Executive; Admin Manager → Admin Executive, IT Head, Housekeeping
 * - Finance: Accounts Manager → Accountant
 * - Operations: Operations Head → Warehouse In-charge, Transport Manager, Service Manager, Inventory Supervisor, Operations Assistant, QC Inspector
 *   - Warehouse In-charge → Warehouse Supervisor → Loading Staff
 *   - Transport Manager → Transport Coordinator → Driver
 *   - Service Manager → Service Coordinator → Technician
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
      'CSO',
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
      'Operations Assistant',
      'QC Inspector'
    ]
  },
  'Operations Assistant': {
    department: 'operations',
    level: 4,
    children: []
  },
  'QC Inspector': {
    department: 'qc',
    level: 4,
    children: ['QC Executive']
  },
  'QC Executive': {
    department: 'qc',
    level: 5,
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
    children: ['Driver']
  },
  'Driver': {
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
 * Standard list of all 10 departments
 */
export const COMPANY_DEPARTMENTS = [
  { id: 'management', name: 'Executive Management', code: 'EXEC' },
  { id: 'hr_admin', name: 'HR & Administration', code: 'HR' },
  { id: 'finance', name: 'Finance & Accounts', code: 'FIN' },
  { id: 'sales', name: 'Sales', code: 'SALES' },
  { id: 'operations', name: 'Operations', code: 'OPS' },
  { id: 'warehouse', name: 'Warehouse', code: 'WH' },
  { id: 'qc', name: 'Quality Control (QC)', code: 'QC' },
  { id: 'transportation', name: 'Transportation', code: 'TRANS' },
  { id: 'service', name: 'Service', code: 'SERV' },
  { id: 'inventory', name: 'Inventory', code: 'INV' },
  { id: 'marketing', name: 'Marketing', code: 'MKT' }
];

/**
 * Normalizes role string to match config key
 */
export function normalizeRole(role) {
  if (!role) return '';
  const r = role.trim();
  if (r === 'Director Operations' || r === 'General Manager') return 'Director Operations';
  if (r === 'Chief Sales Officer') return 'CSO';
  if (r === 'Senior Sales Manager') return 'SSM';
  if (r === 'Area Sales Manager') return 'ASM';
  return r;
}

/**
 * Returns role hierarchy level (1: Executive Director, 2: GM, 3: Dept Head, 4: Senior/Supervisor, 5: Staff, 6: Crew)
 */
export function getRoleLevel(role) {
  const norm = normalizeRole(role);
  return ORG_TREE[norm]?.level || 99;
}

/**
 * Recursively gets all roles that sit underneath `parentRole` in the tree
 */
export function getDownlineRoles(parentRole) {
  const norm = normalizeRole(parentRole);
  const node = ORG_TREE[norm];
  if (!node || !Array.isArray(node.children)) return [];

  const direct = node.children;
  let all = [...direct];
  for (const child of direct) {
    all = [...all, ...getDownlineRoles(child)];
  }
  return Array.from(new Set(all));
}

/**
 * Strict check: Is `targetRole` in the downline of `parentRole`?
 */
export function isDownlineRole(parentRole, targetRole, parentDept = null, targetDept = null) {
  if (!parentRole || !targetRole) return false;
  const pNorm = normalizeRole(parentRole);
  const tNorm = normalizeRole(targetRole);

  if (pNorm === tNorm) return false;

  // Executive leadership has universal downline
  if (pNorm === 'Executive Director' || pNorm === 'Director Operations' || pNorm === 'General Manager') {
    return true;
  }

  // Same branch downline check
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

/**
 * Roles allowed to act as Leader for a given department
 */
export function getAllowedLeadersForDepartment(deptId) {
  if (!deptId) return [];
  const normalizedDept = deptId.toLowerCase();

  const matching = Object.entries(ORG_TREE)
    .filter(([role, config]) => {
      // Management roles can lead any team
      if (config.department === 'management') return true;

      // Operations head can lead operations, warehouse, transportation, service, inventory, qc
      if (role === 'Operations Head' && ['operations', 'warehouse', 'transportation', 'service', 'inventory', 'qc'].includes(normalizedDept)) {
        return true;
      }

      // Department match and level <= 4 (must be a manager/supervisor role, not frontline staff)
      const isDept = config.department === normalizedDept || 
                     (normalizedDept === 'hr_admin' && (config.department === 'hr_admin' || config.department === 'hr')) ||
                     (normalizedDept === 'operations' && ['operations', 'warehouse', 'transportation', 'service', 'inventory', 'qc'].includes(config.department));
      
      return isDept && config.level <= 4 && config.children.length > 0;
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

