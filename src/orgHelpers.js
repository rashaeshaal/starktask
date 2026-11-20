// src/orgHelpers.js
// Centralized organization helpers for STARK STEEL SalesDoor Enterprise

import { getRoleLevel } from './orgTree';

/**
 * Format names to Title Case cleanly
 * e.g. "ABDUL MAJEED" -> "Abdul Majeed", "ihjas k" -> "Ihjas K"
 */
export function formatName(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => {
      if (!word) return '';
      // preserve hyphenated names like Mary-Jane
      if (word.includes('-')) {
        return word.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('-');
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Get 1-2 character initials for avatars
 * e.g. "Abdul Majeed" -> "AM", "Shamna" -> "SH"
 */
export function getInitials(name) {
  if (!name) return 'EM';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return String(name).trim().slice(0, 2).toUpperCase();
}

/**
 * Humanize department codes to display names
 * e.g. "HR_ADMIN" -> "HR & Admin", "MANAGEMENT" -> "Management"
 */
export function formatDepartment(dept) {
  if (!dept) return 'Operations';
  const d = String(dept).toLowerCase().trim().replace(/[\s-]+/g, '_');
  
  if (d === 'hr_admin' || d === 'hr') return 'HR & Admin';
  if (d === 'management' || d === 'exec' || d === 'executive') return 'Management';
  if (d === 'finance' || d === 'fin') return 'Finance & Accounts';
  if (d === 'operations' || d === 'ops') return 'Operations';
  if (d === 'warehouse' || d === 'wh') return 'Warehouse';
  if (d === 'transportation' || d === 'trans') return 'Transportation';
  if (d === 'service' || d === 'serv') return 'Service';
  if (d === 'inventory' || d === 'inv') return 'Inventory';
  if (d === 'marketing' || d === 'mkt') return 'Marketing';
  if (d === 'qc' || d === 'quality_control') return 'Quality Control';
  if (d === 'sales') return 'Sales';

  // Fallback for custom or unmapped dept names
  return formatName(dept.replace(/_/g, ' '));
}

/**
 * Pluralize counter labels safely
 * e.g. pluralize(1, 'employee') -> "1 employee", pluralize(0, 'employee') -> "0 employees"
 */
export function pluralize(count, singular, plural = `${singular}s`) {
  const n = Number(count) || 0;
  return `${n} ${n === 1 ? singular : plural}`;
}

/**
 * Standardize Employee ID representation
 * e.g. "100" -> "EMP-100", "emp-100" -> "EMP-100", "EMP-100" -> "EMP-100"
 */
export function formatEmpId(raw) {
  if (!raw) return 'EMP-000';
  const s = String(raw).trim();
  if (s.toUpperCase().startsWith('EMP-')) return s.toUpperCase();
  if (s.toLowerCase().startsWith('emp_')) return `EMP-${s.slice(4).toUpperCase()}`;
  return `EMP-${s.toUpperCase()}`;
}

/**
 * Color dot token per department
 */
export const DEPT_DOT_COLORS = {
  management: 'bg-indigo-500',
  exec: 'bg-indigo-500',
  sales: 'bg-emerald-500',
  operations: 'bg-blue-500',
  ops: 'bg-blue-500',
  warehouse: 'bg-amber-500',
  wh: 'bg-amber-500',
  transportation: 'bg-cyan-500',
  trans: 'bg-cyan-500',
  service: 'bg-purple-500',
  serv: 'bg-purple-500',
  inventory: 'bg-teal-500',
  inv: 'bg-teal-500',
  finance: 'bg-emerald-600',
  fin: 'bg-emerald-600',
  hr_admin: 'bg-rose-500',
  hr: 'bg-rose-500',
  marketing: 'bg-pink-500',
  mkt: 'bg-pink-500',
  quality_control: 'bg-orange-500',
  qc: 'bg-orange-500'
};

/**
 * Level styling tokens (L1 to L6)
 */
export const LEVEL_STYLES = {
  1: { bg: 'bg-[#05331F]', text: 'text-emerald-300', border: 'border-[#05331F]', label: 'L1 · Executive Leadership' },
  2: { bg: 'bg-[#07472B]', text: 'text-emerald-200', border: 'border-[#07472B]', label: 'L2 · Senior Operations & GM' },
  3: { bg: 'bg-emerald-800', text: 'text-white', border: 'border-emerald-800', label: 'L3 · Department Heads & CSO' },
  4: { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-600', label: 'L4 · Branch & State Managers' },
  5: { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-300', label: 'L5 · Assistant Managers & Leads' },
  6: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', label: 'L6 · Frontline Specialists' }
};

/**
 * Robust hierarchy tree builder
 * Matches reportingManagerId / reportsTo against both e.id ('emp_100') and e.employeeId ('100').
 * Falls back to department level / nearest higher-level person if missing.
 * Prevents loops and self-references.
 * Configurable tree root: if `rootEmployeeId` is provided (e.g. from `org.rootEmployeeId` in Firestore settings),
 * that employee becomes the primary apex node.
 */
export function buildHierarchy(employees = [], rootEmployeeId = null) {
  if (!employees || employees.length === 0) {
    return { rootNodes: [], orphanNodes: [] };
  }

  // 1. Create wrapper node for every employee
  const nodeMap = new Map();
  const allNodes = [];

  employees.forEach(emp => {
    const rawId = String(emp.id || emp.uid || emp.employeeId || Math.random());
    const empNum = emp.employeeId ? String(emp.employeeId).trim() : '';
    const node = {
      ...emp,
      _id: rawId,
      _empNum: empNum,
      level: getRoleLevel(emp.designation || emp.role),
      children: []
    };

    allNodes.push(node);
    nodeMap.set(rawId, node);
    if (empNum) {
      nodeMap.set(empNum, node);
      nodeMap.set(`emp_${empNum}`, node);
      nodeMap.set(`EMP-${empNum}`, node);
    }
    if (emp.id) {
      nodeMap.set(String(emp.id), node);
    }
  });

  const roots = [];
  const assigned = new Set();

  // Helper to resolve parent from reportsTo / reportingManagerId
  const findParent = (emp) => {
    const mgrRef = String(emp.reportingManagerId || emp.reportsTo || '').trim();
    if (!mgrRef || mgrRef === 'null' || mgrRef === 'undefined') return null;
    
    // Check direct match in map
    if (nodeMap.has(mgrRef)) {
      const parent = nodeMap.get(mgrRef);
      // Guard against self-reference
      if (parent._id !== emp._id && parent._empNum !== emp._empNum) {
        return parent;
      }
    }

    // Try stripping or adding 'emp_' prefix
    const cleanNum = mgrRef.replace(/^emp[-_]?/i, '');
    if (cleanNum && nodeMap.has(cleanNum)) {
      const parent = nodeMap.get(cleanNum);
      if (parent._id !== emp._id && parent._empNum !== emp._empNum) {
        return parent;
      }
    }
    return null;
  };

  // Helper to detect cycle
  const wouldCauseCycle = (childNode, targetParent) => {
    let curr = targetParent;
    const visited = new Set();
    while (curr) {
      if (curr._id === childNode._id) return true;
      visited.add(curr._id);
      curr = curr._parent;
    }
    return false;
  };

  // Pass 1: Attach employees with explicit manager links
  allNodes.forEach(node => {
    const parent = findParent(node);
    if (parent && !wouldCauseCycle(node, parent)) {
      if (!parent.children.some(c => c._id === node._id)) {
        parent.children.push(node);
        node._parent = parent;
        assigned.add(node._id);
      }
    }
  });

  // Pass 2: Employees not yet assigned
  const unattached = allNodes.filter(n => !assigned.has(n._id));

  // Determine primary root (configurable via rootEmployeeId or fallback to lowest level)
  let primaryRoot = null;
  if (rootEmployeeId) {
    const rootKey = String(rootEmployeeId).trim().toLowerCase();
    primaryRoot = allNodes.find(n => 
      String(n._id).toLowerCase() === rootKey || 
      String(n._empNum).toLowerCase() === rootKey || 
      String(n.id || '').toLowerCase() === rootKey || 
      String(n.employeeId || '').toLowerCase() === rootKey ||
      (n.role && n.role.toLowerCase() === rootKey) ||
      (n.designation && n.designation.toLowerCase() === rootKey) ||
      (n.fullName && n.fullName.toLowerCase() === rootKey)
    );
  }

  // Fallback root determination if not specified by config
  if (!primaryRoot) {
    const l1Nodes = unattached.filter(n => {
      const role = (n.designation || n.role || '').toLowerCase();
      return n.level === 1 || role.includes('director') || role.includes('general manager');
    });

    primaryRoot = l1Nodes.find(n => {
      const r = (n.designation || n.role || '').toLowerCase();
      return r.includes('managing') || r.includes('executive');
    }) || l1Nodes[0];

    if (!primaryRoot && allNodes.length > 0) {
      primaryRoot = [...allNodes].sort((a, b) => a.level - b.level)[0];
    }
  }

  if (primaryRoot && !assigned.has(primaryRoot._id)) {
    roots.push(primaryRoot);
    assigned.add(primaryRoot._id);
  }

  // Pass 3: Attach remaining unattached L1/L2 company heads directly to primary root or as additional roots
  const unattachedHeads = allNodes.filter(n => !assigned.has(n._id) && (n.level <= 2 || (n.role && n.role.toLowerCase().includes('director'))));
  unattachedHeads.forEach(n => {
    if (!assigned.has(n._id)) {
      if (primaryRoot && primaryRoot._id !== n._id) {
        primaryRoot.children.push(n);
        n._parent = primaryRoot;
        assigned.add(n._id);
      } else if (!roots.some(r => r._id === n._id)) {
        roots.push(n);
        assigned.add(n._id);
      }
    }
  });

  // Pass 4: Fallback for unattached staff -> attach to nearest higher level in same department or dept head
  const remaining = allNodes.filter(n => !assigned.has(n._id));

  remaining.forEach(node => {
    const nodeDept = (node.department || node.departmentId || '').toLowerCase().trim();
    
    // Find highest ranking supervisor in same department whose level < node.level
    const deptSupervisors = allNodes
      .filter(candidate => {
        if (candidate._id === node._id) return false;
        const candDept = (candidate.department || candidate.departmentId || '').toLowerCase().trim();
        return (candDept === nodeDept || candDept.includes(nodeDept)) && candidate.level < node.level;
      })
      .sort((a, b) => b.level - a.level); // nearest level first

    let attached = false;
    for (const sup of deptSupervisors) {
      if (!wouldCauseCycle(node, sup)) {
        sup.children.push(node);
        node._parent = sup;
        assigned.add(node._id);
        attached = true;
        break;
      }
    }

    // If no dept supervisor found, attach to nearest level in whole org or primary root
    if (!attached) {
      if (primaryRoot && primaryRoot._id !== node._id && !wouldCauseCycle(node, primaryRoot)) {
        primaryRoot.children.push(node);
        node._parent = primaryRoot;
        assigned.add(node._id);
      }
    }
  });

  // Sort all children recursively by level (L1 at top, L6 at bottom), then by name
  const sortHierarchy = (nodes) => {
    nodes.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return (a.fullName || a.name || '').localeCompare(b.fullName || b.name || '');
    });
    nodes.forEach(n => {
      if (n.children && n.children.length > 0) {
        sortHierarchy(n.children);
      }
    });
  };

  sortHierarchy(roots);

  // Any remaining unresolvable nodes go into orphanNodes
  const orphanNodes = allNodes.filter(n => !assigned.has(n._id) && !roots.some(r => r._id === n._id));

  return { rootNodes: roots, orphanNodes };
}

