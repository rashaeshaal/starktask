import { canViewAll, isGlobalManager } from './permissions';
import { ORG_TREE, normalizeRole } from './orgTree';

/**
 * Checks if a user belongs to the Sales Department or possesses universal access
 */
export function canAccessSales(user) {
  if (!user) return false;
  if (canViewAll(user) || isGlobalManager(user)) return true;

  const dept = (user.department || user.departmentId || '').toLowerCase();
  const role = normalizeRole(user.role || '');

  return (
    dept === 'sales' ||
    role === 'CSO' ||
    role === 'SSM' ||
    role === 'ASM' ||
    role === 'Sales Coordinator'
  );
}

/**
 * Returns the scope level for a Sales user:
 * - 'ALL': Executive Director, Director Operations, General Manager, HR Manager, CSO
 * - 'ZONE': State Sales Manager (SSM)
 * - 'TERRITORY': Assistant Sales Manager (ASM)
 * - 'OWN': Sales Coordinator
 */
export function getSalesScope(user) {
  if (!user) return 'OWN';
  if (canViewAll(user) || isGlobalManager(user)) return 'ALL';

  const role = normalizeRole(user.role || '');
  if (role === 'CSO') return 'ALL';
  if (role === 'SSM') return 'ZONE';
  if (role === 'ASM') return 'TERRITORY';
  return 'OWN';
}

/**
 * Determines whether a user can assign tasks to a given assignee based on the Sales downline:
 * - CSO (Chief Sales Officer): Universal authority to assign tasks to ANYONE in the company or sales team.
 * - SSM (State Sales Manager): Can assign to personnel under them (their downline ASMs and Coordinators).
 * - ASM (Asst Sales Manager): Can assign to personnel under them (their downline Sales Coordinators).
 */
export function canSalesAssignTo(assigner, assignee, allEmployees = []) {
  if (!assigner || !assignee) return false;
  if (canViewAll(assigner) || isGlobalManager(assigner)) return true;

  const assignerRole = normalizeRole(assigner.role || '');
  const assigneeRole = normalizeRole(assignee.role || '');

  // 1. CSO can assign tasks to ANYONE who they want
  if (assignerRole === 'CSO') {
    return true;
  }

  const assignerId = String(assigner.id || assigner.uid || assigner.employeeId || '');
  const assigneeId = String(assignee.id || assignee.uid || assignee.employeeId || '');
  if (assignerId === assigneeId) return false;

  // Direct reportsTo check
  const assigneeMgr = String(assignee.reportsTo || assignee.reportingManagerId || '');
  if (assigneeMgr && assigneeMgr === assignerId) {
    return true;
  }

  // Downline array check
  if (Array.isArray(assigner.downline) && assigner.downline.map(String).includes(assigneeId)) {
    return true;
  }

  // 2. SSM can assign to ASMs and Coordinators under their downline
  if (assignerRole === 'SSM') {
    return ['ASM', 'Sales Coordinator'].includes(assigneeRole);
  }

  // 3. ASM can assign to Sales Coordinators under their downline
  if (assignerRole === 'ASM') {
    return assigneeRole === 'Sales Coordinator';
  }

  if (assignerRole === 'Sales Coordinator') {
    return !!assigner.canAssign;
  }

  return false;
}

/**
 * Filters a list of dealers according to the user's Sales scope
 */
export function filterDealersByScope(dealers = [], user, allEmployees = []) {
  if (!dealers) return [];
  const scope = getSalesScope(user);

  if (scope === 'ALL') {
    return dealers;
  }

  const userName = (user.fullName || user.name || '').toUpperCase();
  const userEmail = (user.email || '').toLowerCase();

  if (scope === 'OWN') {
    // Sales Coordinator sees only dealers assigned directly to them
    return dealers.filter(d => {
      const staff = (d.assignedStaff || d.assignedTo || '').toUpperCase();
      const email = (d.staffEmail || d.email || '').toLowerCase();
      return staff.includes(userName) || (userEmail && email === userEmail);
    });
  }

  if (scope === 'TERRITORY') {
    // ASM sees their own dealers plus their downline coordinators' dealers
    // E.g., Sarika (Tamil Nadu), Shamna (Kerala North)
    return dealers.filter(d => {
      const staff = (d.assignedStaff || d.assignedTo || '').toUpperCase();
      if (staff.includes(userName)) return true;

      // Downline coordinators of this ASM
      if (userName.includes('SHAMNA')) {
        // Shamna handles Kerala North territory
        return d.region === 'Kerala North' || staff.includes('BINSHA') || staff.includes('APARNA');
      }
      if (userName.includes('SARIKA')) {
        return d.region === 'Tamil Nadu' || staff.includes('VINEETHA');
      }

      return staff.includes(userName);
    });
  }

  if (scope === 'ZONE') {
    // SSM sees their whole state/zone downline
    // E.g., Rashad K, Ajay Vijayan, Shaifil K K (Karnataka), Mohd Ehthesham
    return dealers.filter(d => {
      const staff = (d.assignedStaff || d.assignedTo || '').toUpperCase();
      if (staff.includes(userName)) return true;

      if (userName.includes('SHAIFIL')) {
        return d.region === 'Karnataka';
      }
      if (userName.includes('RASHAD')) {
        return d.region === 'Kerala South' || d.region === 'Kerala North';
      }
      if (userName.includes('AJAY')) {
        return d.region === 'Tamil Nadu' || d.region === 'Commercial';
      }

      return true;
    });
  }

  return dealers;
}

/**
 * Filters dealer bookings according to the user's Sales scope
 */
export function filterBookingsByScope(bookings = [], user, allEmployees = []) {
  if (!bookings) return [];
  const scope = getSalesScope(user);

  if (scope === 'ALL') {
    return bookings;
  }

  const userName = (user.fullName || user.name || '').toUpperCase();
  const userId = user.id || user.uid;

  if (scope === 'OWN') {
    return bookings.filter(b => {
      const assigned = (b.assignedTo || '').toUpperCase();
      return assigned.includes(userName) || b.assignedToId === userId;
    });
  }

  if (scope === 'TERRITORY') {
    return bookings.filter(b => {
      const assigned = (b.assignedTo || '').toUpperCase();
      if (assigned.includes(userName) || b.assignedToId === userId) return true;

      if (userName.includes('SHAMNA')) {
        return b.region === 'Kerala North' || assigned.includes('BINSHA') || assigned.includes('APARNA');
      }
      if (userName.includes('SARIKA')) {
        return b.region === 'Tamil Nadu' || assigned.includes('VINEETHA');
      }
      return false;
    });
  }

  if (scope === 'ZONE') {
    return bookings.filter(b => {
      const assigned = (b.assignedTo || '').toUpperCase();
      if (assigned.includes(userName) || b.assignedToId === userId) return true;

      if (userName.includes('SHAIFIL')) return b.region === 'Karnataka';
      if (userName.includes('RASHAD')) return b.region === 'Kerala South' || b.region === 'Kerala North';
      if (userName.includes('AJAY')) return b.region === 'Tamil Nadu';
      return true;
    });
  }

  return bookings;
}

