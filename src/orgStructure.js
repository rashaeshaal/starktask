/**
 * Schema and Definitions for Organization Hierarchy, Departments & Designations.
 * This file defines the company master structure used to initialize Firestore collections.
 * It contains NO hardcoded employee records.
 */

export const MASTER_DEPARTMENTS = [
  { id: 'management', name: 'Executive Management', code: 'EXEC', description: 'Executive Leadership & General Administration' },
  { id: 'hr_admin', name: 'HR & Administration', code: 'HR', description: 'Human Resources, Facilities, IT & Admin Services' },
  { id: 'finance', name: 'Finance & Accounts', code: 'FIN', description: 'Accounts, Ledger Reconciliations, Financial Controls' },
  { id: 'sales', name: 'Sales', code: 'SALES', description: 'Dealer Call Desk, Order Confirmations, Door Distribution' },
  { id: 'operations', name: 'Operations', code: 'OPS', description: 'Overall Operations Oversight & Handover' },
  { id: 'warehouse', name: 'Warehouse', code: 'WH', description: 'Stock Allocation, Picking, Protective Packaging, Loading' },
  { id: 'qc', name: 'Quality Control (QC)', code: 'QC', description: '9-Point Product & Batch QC Verification' },
  { id: 'transportation', name: 'Transportation', code: 'TRANS', description: 'Vehicles, Drivers, Route Logistics & Dispatches' },
  { id: 'service', name: 'Service', code: 'SERV', description: 'Customer Complaints, SLA Handling & Field Technicians' },
  { id: 'inventory', name: 'Inventory', code: 'INV', description: 'Daily Stock Audits, Inward/Outward & ERP Accuracy' },
  { id: 'marketing', name: 'Marketing', code: 'MKT', description: 'Branding, Photography, Graphic Design, Lead Generation' },
];

export const ORG_ROLES = {
  EXECUTIVE_DIRECTOR: 'Executive Director',
  GENERAL_MANAGER: 'Director Operations',
  HR_MANAGER: 'HR Manager',
  ADMIN_MANAGER: 'Admin Manager',
  HR_EXECUTIVE: 'HR Executive',
  ADMIN_EXECUTIVE: 'Admin Executive',
  IT_HEAD: 'IT Head',
  HOUSEKEEPING: 'Housekeeping',
  ACCOUNTS_MANAGER: 'Accounts Manager',
  ACCOUNTANT: 'Accountant',
  WAREHOUSE_INCHARGE: 'Warehouse In-charge',
  WAREHOUSE_SUPERVISOR: 'Warehouse Supervisor',
  LOADING_STAFF: 'Loading Staff',
  TRANSPORT_MANAGER: 'Transport Manager',
  TRANSPORT_COORDINATOR: 'Transport Coordinator',
  DRIVER: 'Driver',
  SERVICE_MANAGER: 'Service Manager',
  SERVICE_COORDINATOR: 'Service Coordinator',
  TECHNICIAN: 'Technician',
  INVENTORY_SUPERVISOR: 'Inventory Supervisor',
  STOREKEEPER: 'Storekeeper',
  OPERATIONS_HEAD: 'Operations Head',
  OPERATIONS_ASSISTANT: 'Operations Assistant',
  QC_INSPECTOR: 'QC Inspector',
  CSO: 'CSO',
  SSM: 'SSM',
  ASM: 'ASM',
  SALES_COORDINATOR: 'Sales Coordinator',
  BRAND_MANAGER: 'Brand Manager',
  LEADS_COORDINATOR: 'Leads Coordinator',
  GRAPHIC_DESIGNER: 'Graphic Designer',
  PHOTOGRAPHER: 'Photographer'
};

export const MASTER_DESIGNATIONS = [
  // Executive Leadership
  { id: 'des_ed', title: 'Executive Director', departmentId: 'management', level: 1, reportsToDesignationId: null },
  { id: 'des_gm', title: 'Director Operations', departmentId: 'management', level: 2, reportsToDesignationId: 'des_ed' },

  // HR & Administration
  { id: 'des_hrm', title: 'HR Manager', departmentId: 'hr_admin', level: 3, reportsToDesignationId: 'des_gm' },
  { id: 'des_adminm', title: 'Admin Manager', departmentId: 'hr_admin', level: 3, reportsToDesignationId: 'des_gm' },
  { id: 'des_ithead', title: 'IT Head', departmentId: 'hr_admin', level: 3, reportsToDesignationId: 'des_gm' },
  { id: 'des_hrexe', title: 'HR Executive', departmentId: 'hr_admin', level: 5, reportsToDesignationId: 'des_hrm' },
  { id: 'des_adminexe', title: 'Admin Executive', departmentId: 'hr_admin', level: 5, reportsToDesignationId: 'des_adminm' },
  { id: 'des_hk', title: 'Housekeeping', departmentId: 'hr_admin', level: 6, reportsToDesignationId: 'des_adminm' },

  // Finance & Accounts
  { id: 'des_accm', title: 'Accounts Manager', departmentId: 'finance', level: 3, reportsToDesignationId: 'des_gm' },
  { id: 'des_acc', title: 'Accountant', departmentId: 'finance', level: 5, reportsToDesignationId: 'des_accm' },

  // Operations Head
  { id: 'des_ops_head', title: 'Operations Head', departmentId: 'operations', level: 3, reportsToDesignationId: 'des_gm' },
  { id: 'des_ops_asst', title: 'Operations Assistant', departmentId: 'operations', level: 5, reportsToDesignationId: 'des_ops_head' },

  // Quality Control (QC)
  { id: 'des_qc_inspector', title: 'QC Inspector', departmentId: 'qc', level: 4, reportsToDesignationId: 'des_ops_head' },
  { id: 'des_qc_exe', title: 'QC Executive', departmentId: 'qc', level: 5, reportsToDesignationId: 'des_qc_inspector' },

  // Warehouse
  { id: 'des_wh_inc', title: 'Warehouse In-charge', departmentId: 'warehouse', level: 3, reportsToDesignationId: 'des_ops_head' },
  { id: 'des_wh_sup', title: 'Warehouse Supervisor', departmentId: 'warehouse', level: 4, reportsToDesignationId: 'des_wh_inc' },
  { id: 'des_load', title: 'Loading Staff', departmentId: 'warehouse', level: 6, reportsToDesignationId: 'des_wh_sup' },

  // Transportation
  { id: 'des_tm', title: 'Transport Manager', departmentId: 'transportation', level: 3, reportsToDesignationId: 'des_ops_head' },
  { id: 'des_tc', title: 'Transport Coordinator', departmentId: 'transportation', level: 4, reportsToDesignationId: 'des_tm' },
  { id: 'des_driver', title: 'Driver', departmentId: 'transportation', level: 6, reportsToDesignationId: 'des_tc' },

  // Service
  { id: 'des_sm', title: 'Service Manager', departmentId: 'service', level: 3, reportsToDesignationId: 'des_ops_head' },
  { id: 'des_sc', title: 'Service Coordinator', departmentId: 'service', level: 4, reportsToDesignationId: 'des_sm' },
  { id: 'des_tech', title: 'Technician', departmentId: 'service', level: 6, reportsToDesignationId: 'des_sc' },

  // Inventory
  { id: 'des_inv_sup', title: 'Inventory Supervisor', departmentId: 'inventory', level: 4, reportsToDesignationId: 'des_ops_head' },
  { id: 'des_storekeeper', title: 'Storekeeper', departmentId: 'inventory', level: 5, reportsToDesignationId: 'des_inv_sup' },

  // Sales
  { id: 'des_cso', title: 'CSO', departmentId: 'sales', level: 3, reportsToDesignationId: 'des_gm' },
  { id: 'des_ssm', title: 'SSM', departmentId: 'sales', level: 4, reportsToDesignationId: 'des_cso' },
  { id: 'des_asm', title: 'ASM', departmentId: 'sales', level: 5, reportsToDesignationId: 'des_ssm' },
  { id: 'des_sales_coord', title: 'Sales Coordinator', departmentId: 'sales', level: 6, reportsToDesignationId: 'des_asm' },

  // Marketing
  { id: 'des_bm', title: 'Brand Manager', departmentId: 'marketing', level: 3, reportsToDesignationId: 'des_gm' },
  { id: 'des_lc', title: 'Leads Coordinator', departmentId: 'marketing', level: 4, reportsToDesignationId: 'des_bm' },
  { id: 'des_gd', title: 'Graphic Designer', departmentId: 'marketing', level: 5, reportsToDesignationId: 'des_bm' },
  { id: 'des_photo', title: 'Photographer', departmentId: 'marketing', level: 5, reportsToDesignationId: 'des_bm' },
];

export const ROLE_HIERARCHY_LEVELS = MASTER_DESIGNATIONS.reduce((acc, des) => {
  acc[des.title] = des.level;
  return acc;
}, {});

export function canAssignTask(assigner, assignee, teams = [], teamMembers = []) {
  if (!assigner || !assignee) return false;
  
  // Executive Leadership has universal assignment authority
  if (assigner.role === 'Executive Director' || assigner.role === 'Director Operations' || assigner.role === 'General Manager') {
    return true;
  }
  
  // 1. Peer-to-peer / Lateral Team Delegation & Collaboration
  // If both employees belong to the same operational team (or if assigner leads the team)
  if (Array.isArray(teams) && Array.isArray(teamMembers)) {
    const assignerId = assigner.id || assigner.employeeId || assigner.uid;
    const assigneeId = assignee.id || assignee.employeeId || assignee.uid;
    
    // Check if assigner is designated team leader of a team containing assignee
    const isLeaderOfTeamWithAssignee = teams.some(t => {
      const leaderMatches = t.leaderId === assignerId || t.teamLeaderId === assignerId || t.leaderId === assigner.employeeId || t.teamLeaderId === assigner.employeeId;
      if (leaderMatches) {
        // Check in teamMembers collection array or team.members array
        const hasMember = teamMembers.some(m => m.teamId === t.id && (m.userId === assigneeId || m.uid === assigneeId || m.id === assigneeId || m.userId === assignee.id)) ||
          (Array.isArray(t.members) && t.members.some(m => (m.userId === assigneeId || m.uid === assigneeId || m.id === assigneeId || m.userId === assignee.id)));
        return hasMember;
      }
      return false;
    });
    if (isLeaderOfTeamWithAssignee) return true;

    // Check individual per-member permission: canAssign, assignScope, assignableTo
    // Inspect both teamMembers array and team.members array for any team where assigner is a member
    for (const team of teams) {
      // Find assigner's membership record in this team
      const memberEntry = teamMembers.find(m => m.teamId === team.id && (m.userId === assignerId || m.uid === assignerId || m.id === assignerId || m.userId === assigner.id) && m.status !== 'inactive') ||
        (Array.isArray(team.members) ? team.members.find(m => (m.userId === assignerId || m.uid === assignerId || m.id === assignerId || m.userId === assigner.id)) : null);

      if (memberEntry && memberEntry.canAssign === true) {
        // Assigner has explicit assign privileges in this team
        // Check if assignee is also in this team (not the assigner themselves, and not the leader)
        const isAssigneeInTeam = teamMembers.some(m => m.teamId === team.id && (m.userId === assigneeId || m.uid === assigneeId || m.id === assigneeId || m.userId === assignee.id) && m.status !== 'inactive') ||
          (Array.isArray(team.members) && team.members.some(m => (m.userId === assigneeId || m.uid === assigneeId || m.id === assigneeId || m.userId === assignee.id)));
        
        const isTeamLeader = team.leaderId === assigneeId || team.teamLeaderId === assigneeId;

        if (isAssigneeInTeam && !isTeamLeader) {
          const scope = memberEntry.assignScope || 'all';
          if (scope === 'all') {
            return true;
          }
          if (scope === 'selected' && Array.isArray(memberEntry.assignableTo)) {
            if (memberEntry.assignableTo.includes(assigneeId) || memberEntry.assignableTo.includes(assignee.id) || memberEntry.assignableTo.includes(assignee.employeeId)) {
              return true;
            }
          }
        }
      }
    }

    // Check shared team membership with allowPeerDelegation (Link Tree)
    // Respect HR Team Policy: allowPeerDelegation (defaults to true)
    const assignerTeamIds = teamMembers
      .filter(m => (m.userId === assignerId || m.uid === assignerId || m.id === assignerId || m.userId === assigner.id) && m.status === 'active')
      .map(m => m.teamId);
    
    const assigneeTeamIds = teamMembers
      .filter(m => (m.userId === assigneeId || m.uid === assigneeId || m.id === assigneeId || m.userId === assignee.id) && m.status === 'active')
      .map(m => m.teamId);
    
    const commonTeamIds = assignerTeamIds.filter(tId => assigneeTeamIds.includes(tId));
    if (commonTeamIds.length > 0) {
      const allowsDelegation = commonTeamIds.some(tId => {
        const teamObj = teams.find(t => t.id === tId);
        return !teamObj || teamObj.allowPeerDelegation !== false;
      });
      if (allowsDelegation) return true;
    }
  }

  // 2. Department Management & Reporting Line
  const assignerLevel = ROLE_HIERARCHY_LEVELS[assigner.role] || 99;
  const assigneeLevel = ROLE_HIERARCHY_LEVELS[assignee.role] || 99;

  if (assignerLevel < assigneeLevel) return true;
  if (assignee.reportingManagerId === assigner.id || assignee.reportingManagerId === assigner.employeeId) return true;
  
  // 3. Same department collaboration
  if (assigner.department && assigner.department === assignee.department && assignerLevel <= assigneeLevel + 1) {
    return true;
  }

  return false;
}

export function getReportees(managerId, employeeList = []) {
  if (!managerId || !employeeList) return [];
  const direct = employeeList.filter(u => u.reportingManagerId === managerId);
  let all = [...direct];
  for (const d of direct) {
    all = [...all, ...getReportees(d.id, employeeList)];
  }
  return all;
}
