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
 * 10 Official Company Departments
 */
export const COMPANY_DEPARTMENTS = [
  { id: 'management', name: 'Executive Management', headRole: 'Executive Director' },
  { id: 'hr_admin', name: 'HR & Administration', headRole: 'HR Manager' },
  { id: 'finance', name: 'Finance & Accounts', headRole: 'Accounts Manager' },
  { id: 'sales', name: 'Sales', headRole: 'Chief Sales Officer' },
  { id: 'operations', name: 'Operations', headRole: 'Operations Head' },
  { id: 'warehouse', name: 'Warehouse', headRole: 'Warehouse In-charge' },
  { id: 'quality_control', name: 'Quality Control (QC)', headRole: 'QC Inspector' },
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
