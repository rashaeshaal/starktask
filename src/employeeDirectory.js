/**
 * Real Stark Steel Doors Employee Master Data Sheet - October 2026
 * Contains all verified employees, departments, designations, joining dates, and reporting lines.
 */

export const ENTERPRISE_EMPLOYEE_DIRECTORY = [
  // 1. Top Leadership
  {
    id: 'emp_100',
    email: 'director@starkdoors.com',
    fullName: 'Executive Director',
    role: 'Executive Director',
    department: 'management',
    employeeId: '100',
    reportingManagerId: null,
    reportingManagerName: 'Board of Directors',
    employmentStatus: 'active',
    joiningDate: '2020-01-01',
    phone: '+91 99000 00001',
    permissions: [
      'view_own_tasks', 'view_team_tasks', 'view_department_tasks', 'create_tasks', 
      'assign_tasks', 'reassign_tasks', 'update_own_tasks', 'submit_tasks', 
      'review_tasks', 'approve_tasks', 'reject_tasks', 'view_reports', 
      'manage_employees', 'manage_departments', 'manage_designations', 
      'view_audit_logs', 'authorize_historical_corrections'
    ]
  },
  {
    email: 'ihjas@starkdoors.com',
    fullName: 'IHJAS K',
    role: 'Director Operations',
    department: 'management',
    employeeId: '101',
    reportingManagerId: '100',
    reportingManagerName: 'Executive Director',
    employmentStatus: 'active',
    joiningDate: '2020-03-01',
    phone: '+91 99000 00101',
    permissions: [
      'view_own_tasks', 'view_team_tasks', 'view_department_tasks', 'create_tasks', 
      'assign_tasks', 'reassign_tasks', 'update_own_tasks', 'submit_tasks', 
      'review_tasks', 'approve_tasks', 'reject_tasks', 'view_reports', 
      'manage_employees', 'manage_departments', 'manage_designations', 
      'view_audit_logs', 'authorize_historical_corrections'
    ]
  },
  {
    email: 'majeed@starkdoors.com',
    fullName: 'ABDUL MAJEED',
    role: 'Chief Sales Officer',
    department: 'sales',
    employeeId: '102',
    reportingManagerId: '101',
    reportingManagerName: 'IHJAS K (Director Operations)',
    employmentStatus: 'active',
    joiningDate: '2023-11-01',
    phone: '+91 99000 00102',
    permissions: [
      'view_own_tasks', 'view_team_tasks', 'view_department_tasks', 'create_tasks', 
      'assign_tasks', 'reassign_tasks', 'update_own_tasks', 'submit_tasks', 
      'review_tasks', 'approve_tasks', 'view_reports'
    ]
  },
  {
    email: 'shaheen@starkdoors.com',
    fullName: 'SHAHEEN NAZAR',
    role: 'HR & Admin Manager',
    department: 'hr_admin',
    employeeId: '104',
    reportingManagerId: '101',
    reportingManagerName: 'IHJAS K (Director Operations)',
    employmentStatus: 'active',
    joiningDate: '2025-08-01',
    phone: '+91 99000 00104',
    permissions: [
      'view_own_tasks', 'view_team_tasks', 'view_department_tasks', 'create_tasks', 
      'assign_tasks', 'reassign_tasks', 'update_own_tasks', 'submit_tasks', 
      'review_tasks', 'approve_tasks', 'manage_employees', 'view_reports'
    ]
  },
  {
    email: 'akhil.kr@starkdoors.com',
    fullName: 'AKHIL K R',
    role: 'Operations Head',
    department: 'operations',
    employeeId: '113',
    reportingManagerId: '101',
    reportingManagerName: 'IHJAS K (Director Operations)',
    employmentStatus: 'active',
    joiningDate: '2023-11-01',
    phone: '+91 99000 00113',
    permissions: [
      'view_own_tasks', 'view_team_tasks', 'view_department_tasks', 'create_tasks', 
      'assign_tasks', 'reassign_tasks', 'update_own_tasks', 'submit_tasks', 
      'review_tasks', 'approve_tasks', 'view_reports'
    ]
  },

  // 2. Digital Marketing & Expansion
  {
    email: 'ivin@starkdoors.com',
    fullName: 'IVIN C BIJI',
    role: 'Graphic Designer',
    department: 'marketing',
    employeeId: '155',
    reportingManagerId: '180',
    reportingManagerName: 'SHARANYA V M (Leads Coordinator)',
    employmentStatus: 'active',
    joiningDate: '2026-04-26',
    phone: '+91 99000 00155',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'brand.manager@starkdoors.com',
    fullName: 'Brand Manager',
    role: 'Brand Manager',
    department: 'marketing',
    employeeId: '109',
    reportingManagerId: '100',
    reportingManagerName: 'Executive Director',
    employmentStatus: 'active',
    joiningDate: '2024-01-15',
    phone: '+91 99000 00109',
    permissions: [
      'view_own_tasks', 'view_team_tasks', 'view_department_tasks', 'create_tasks',
      'assign_tasks', 'reassign_tasks', 'update_own_tasks', 'submit_tasks',
      'review_tasks', 'approve_tasks', 'view_reports'
    ]
  },
  {
    email: 'photographer@starkdoors.com',
    fullName: 'Stark Photographer',
    role: 'Photographer',
    department: 'marketing',
    employeeId: '156',
    reportingManagerId: '180',
    reportingManagerName: 'SHARANYA V M (Leads Coordinator)',
    employmentStatus: 'active',
    joiningDate: '2026-05-01',
    phone: '+91 99000 00156',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'ajas@starkdoors.com',
    fullName: 'AJAS AMEEN',
    role: 'Purchase Executive',
    department: 'operations',
    employeeId: '161',
    reportingManagerId: '101',
    reportingManagerName: 'IHJAS K (Director Operations)',
    employmentStatus: 'active',
    joiningDate: '2026-06-26',
    phone: '+91 99000 00161',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'aparna.vp@starkdoors.com',
    fullName: 'APARNA V P',
    role: 'Operations Assistant',
    department: 'operations',
    employeeId: '189',
    reportingManagerId: '113',
    reportingManagerName: 'AKHIL K R (Operations Head)',
    employmentStatus: 'active',
    joiningDate: '2026-10-26',
    phone: '+91 99000 00189',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'sharanya@starkdoors.com',
    fullName: 'SHARANYA V M',
    role: 'Leads Coordinator',
    department: 'marketing',
    employeeId: '180',
    reportingManagerId: '109',
    reportingManagerName: 'Brand Manager',
    employmentStatus: 'active',
    joiningDate: '2026-08-26',
    phone: '+91 99000 00180',
    permissions: ['view_own_tasks', 'view_team_tasks', 'create_tasks', 'assign_tasks', 'update_own_tasks', 'submit_tasks', 'approve_tasks']
  },

  // 3. Accounts & Finance
  {
    email: 'sreekumar@starkdoors.com',
    fullName: 'SREEKUMAR E R',
    role: 'Accounts Executive',
    department: 'finance',
    employeeId: '106',
    reportingManagerId: '101',
    reportingManagerName: 'IHJAS K (Director Operations)',
    employmentStatus: 'active',
    joiningDate: '2025-03-01',
    phone: '+91 99000 00106',
    permissions: ['view_own_tasks', 'view_department_tasks', 'create_tasks', 'update_own_tasks', 'submit_tasks', 'approve_tasks']
  },
  {
    email: 'anshid@starkdoors.com',
    fullName: 'ANSHID K',
    role: 'Accountant',
    department: 'finance',
    employeeId: '105',
    reportingManagerId: '101',
    reportingManagerName: 'IHJAS K (Director Operations)',
    employmentStatus: 'active',
    joiningDate: '2025-01-01',
    phone: '+91 99000 00105',
    permissions: ['view_own_tasks', 'view_department_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'aginsha@starkdoors.com',
    fullName: 'AGINSHA K A',
    role: 'Accountant',
    department: 'finance',
    employeeId: '107',
    reportingManagerId: '106',
    reportingManagerName: 'SREEKUMAR E R (Accounts Executive)',
    employmentStatus: 'active',
    joiningDate: '2025-03-01',
    phone: '+91 99000 00107',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'nihas@starkdoors.com',
    fullName: 'MUHAMMED NIHAS',
    role: 'Junior Accountant',
    department: 'finance',
    employeeId: '178',
    reportingManagerId: '106',
    reportingManagerName: 'SREEKUMAR E R (Accounts Executive)',
    employmentStatus: 'active',
    joiningDate: '2026-08-26',
    phone: '+91 99000 00178',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'nafid@starkdoors.com',
    fullName: 'MUHAMMED NAFID',
    role: 'Junior Accountant',
    department: 'finance',
    employeeId: '182',
    reportingManagerId: '106',
    reportingManagerName: 'SREEKUMAR E R (Accounts Executive)',
    employmentStatus: 'active',
    joiningDate: '2026-09-26',
    phone: '+91 99000 00182',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },

  // 4. Sales & Marketing (CSO -> SSM -> ASM -> Sales Coordinators)
  {
    email: 'rashad@starkdoors.com',
    fullName: 'RASHAD K',
    role: 'State Sales Manager',
    department: 'sales',
    employeeId: '149',
    reportingManagerId: '102',
    reportingManagerName: 'ABDUL MAJEED (Chief Sales Officer)',
    employmentStatus: 'active',
    joiningDate: '2026-04-01',
    phone: '+91 99000 00149',
    permissions: ['view_own_tasks', 'view_team_tasks', 'view_department_tasks', 'create_tasks', 'assign_tasks', 'reassign_tasks', 'update_own_tasks', 'submit_tasks', 'approve_tasks']
  },
  {
    email: 'ajay@starkdoors.com',
    fullName: 'AJAY VIJAYAN',
    role: 'State Sales Manager',
    department: 'sales',
    employeeId: '146',
    reportingManagerId: '102',
    reportingManagerName: 'ABDUL MAJEED (Chief Sales Officer)',
    employmentStatus: 'active',
    joiningDate: '2026-03-01',
    phone: '+91 99000 00146',
    permissions: ['view_own_tasks', 'view_team_tasks', 'view_department_tasks', 'create_tasks', 'assign_tasks', 'reassign_tasks', 'update_own_tasks', 'submit_tasks', 'approve_tasks']
  },
  {
    email: 'mohd.ehthesham@starkdoors.com',
    fullName: 'MOHD EHTHESHAM',
    role: 'State Sales Manager',
    department: 'sales',
    employeeId: '154',
    reportingManagerId: '102',
    reportingManagerName: 'ABDUL MAJEED (Chief Sales Officer)',
    employmentStatus: 'active',
    joiningDate: '2026-04-26',
    phone: '+91 99000 00154',
    permissions: ['view_own_tasks', 'view_team_tasks', 'view_department_tasks', 'create_tasks', 'assign_tasks', 'reassign_tasks', 'update_own_tasks', 'submit_tasks', 'approve_tasks']
  },
  {
    email: 'shaifil@starkdoors.com',
    fullName: 'SHAIFIL K K',
    role: 'State Sales Manager',
    department: 'sales',
    employeeId: '183',
    reportingManagerId: '102',
    reportingManagerName: 'ABDUL MAJEED (Chief Sales Officer)',
    employmentStatus: 'active',
    joiningDate: '2026-10-26',
    phone: '+91 99000 00183',
    permissions: ['view_own_tasks', 'view_team_tasks', 'view_department_tasks', 'create_tasks', 'assign_tasks', 'reassign_tasks', 'update_own_tasks', 'submit_tasks', 'approve_tasks']
  },
  {
    email: 'sarika@starkdoors.com',
    fullName: 'SARIKA S',
    role: 'Asst Sales Manager',
    department: 'sales',
    employeeId: '108',
    reportingManagerId: '149',
    reportingManagerName: 'RASHAD K (State Sales Manager)',
    employmentStatus: 'active',
    joiningDate: '2025-06-01',
    phone: '+91 99000 00108',
    permissions: ['view_own_tasks', 'view_team_tasks', 'create_tasks', 'assign_tasks', 'update_own_tasks', 'submit_tasks', 'approve_tasks']
  },
  {
    email: 'shamna@starkdoors.com',
    fullName: 'SHAMNA',
    role: 'Asst Sales Manager',
    department: 'sales',
    employeeId: '112',
    reportingManagerId: '146',
    reportingManagerName: 'AJAY VIJAYAN (State Sales Manager)',
    employmentStatus: 'active',
    joiningDate: '2026-09-26',
    phone: '+91 99000 00112',
    permissions: ['view_own_tasks', 'view_team_tasks', 'create_tasks', 'assign_tasks', 'update_own_tasks', 'submit_tasks', 'approve_tasks']
  },
  {
    email: 'binsha@starkdoors.com',
    fullName: 'BINSHA E S',
    role: 'Sales Coordinator',
    department: 'sales',
    employeeId: '153',
    reportingManagerId: '108',
    reportingManagerName: 'SARIKA S (Asst Sales Manager)',
    employmentStatus: 'active',
    joiningDate: '2026-04-26',
    phone: '+91 99000 00153',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'aparna.anilkumar@starkdoors.com',
    fullName: 'APARNA ANILKUMAR',
    role: 'Sales Coordinator',
    department: 'sales',
    employeeId: '181',
    reportingManagerId: '108',
    reportingManagerName: 'SARIKA S (Asst Sales Manager)',
    employmentStatus: 'active',
    joiningDate: '2026-09-26',
    phone: '+91 99000 00181',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'vineetha@starkdoors.com',
    fullName: 'VINEETHA M',
    role: 'Sales Coordinator',
    department: 'sales',
    employeeId: '186',
    reportingManagerId: '149',
    reportingManagerName: 'RASHAD K (State Sales Manager)',
    employmentStatus: 'active',
    joiningDate: '2026-10-26',
    phone: '+91 99000 00186',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },

  // 5. Service Department
  {
    email: 'amal.kumar@starkdoors.com',
    fullName: 'AMAL KUMAR T K',
    role: 'Service Manager',
    department: 'operations',
    employeeId: '116',
    reportingManagerId: '101',
    reportingManagerName: 'IHJAS K (Director Operations)',
    employmentStatus: 'active',
    joiningDate: '2023-12-01',
    phone: '+91 99000 00116',
    permissions: ['view_own_tasks', 'view_team_tasks', 'create_tasks', 'assign_tasks', 'update_own_tasks', 'submit_tasks', 'approve_tasks']
  },
  {
    email: 'harshal@starkdoors.com',
    fullName: 'HARSHAL K B',
    role: 'Service Technician',
    department: 'operations',
    employeeId: '133',
    reportingManagerId: '116',
    reportingManagerName: 'AMAL KUMAR T K (Service Manager)',
    employmentStatus: 'active',
    joiningDate: '2025-12-01',
    phone: '+91 99000 00133',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'zainul@starkdoors.com',
    fullName: 'ZAINUL ABID V K',
    role: 'Service Technician',
    department: 'operations',
    employeeId: '136',
    reportingManagerId: '116',
    reportingManagerName: 'AMAL KUMAR T K (Service Manager)',
    employmentStatus: 'active',
    joiningDate: '2025-12-01',
    phone: '+91 99000 00136',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'sivadas@starkdoors.com',
    fullName: 'SIVADAS P K',
    role: 'Service Technician',
    department: 'operations',
    employeeId: '151',
    reportingManagerId: '116',
    reportingManagerName: 'AMAL KUMAR T K (Service Manager)',
    employmentStatus: 'active',
    joiningDate: '2026-04-26',
    phone: '+91 99000 00151',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'aneesh@starkdoors.com',
    fullName: 'ANEESH V A',
    role: 'Service Technician',
    department: 'operations',
    employeeId: '177',
    reportingManagerId: '116',
    reportingManagerName: 'AMAL KUMAR T K (Service Manager)',
    employmentStatus: 'active',
    joiningDate: '2026-08-26',
    phone: '+91 99000 00177',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'adith@starkdoors.com',
    fullName: 'ADITH SUDARSANAN',
    role: 'Service Technician',
    department: 'operations',
    employeeId: '159',
    reportingManagerId: '116',
    reportingManagerName: 'AMAL KUMAR T K (Service Manager)',
    employmentStatus: 'active',
    joiningDate: '2026-06-26',
    phone: '+91 99000 00159',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'ajith.chandran@starkdoors.com',
    fullName: 'AJITH CHANDRAN',
    role: 'Service Technician',
    department: 'operations',
    employeeId: '169',
    reportingManagerId: '116',
    reportingManagerName: 'AMAL KUMAR T K (Service Manager)',
    employmentStatus: 'active',
    joiningDate: '2026-06-26',
    phone: '+91 99000 00169',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'shameena@starkdoors.com',
    fullName: 'SHAMEENA P M',
    role: 'Service Coordinator',
    department: 'operations',
    employeeId: '135',
    reportingManagerId: '116',
    reportingManagerName: 'AMAL KUMAR T K (Service Manager)',
    employmentStatus: 'active',
    joiningDate: '2025-12-01',
    phone: '+91 99000 00135',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },

  // 6. Transportation & Expansion
  {
    email: 'shameer@starkdoors.com',
    fullName: 'SHAMEER HAMEED',
    role: 'Expansion Head',
    department: 'operations',
    employeeId: '103',
    reportingManagerId: '101',
    reportingManagerName: 'IHJAS K (Director Operations)',
    employmentStatus: 'active',
    joiningDate: '2024-03-01',
    phone: '+91 99000 00103',
    permissions: ['view_own_tasks', 'view_team_tasks', 'create_tasks', 'assign_tasks', 'update_own_tasks', 'submit_tasks', 'approve_tasks']
  },
  {
    email: 'nayan.ram@starkdoors.com',
    fullName: 'NAYAN RAM',
    role: 'Transport Manager',
    department: 'operations',
    employeeId: '176',
    reportingManagerId: '113',
    reportingManagerName: 'AKHIL K R (Operations Head)',
    employmentStatus: 'active',
    joiningDate: '2026-08-26',
    phone: '+91 99000 00176',
    permissions: ['view_own_tasks', 'view_team_tasks', 'create_tasks', 'assign_tasks', 'update_own_tasks', 'submit_tasks', 'approve_tasks']
  },
  {
    email: 'aswani@starkdoors.com',
    fullName: 'ASWANI R',
    role: 'Transport Coordinator',
    department: 'operations',
    employeeId: '188',
    reportingManagerId: '176',
    reportingManagerName: 'NAYAN RAM (Transport Manager)',
    employmentStatus: 'active',
    joiningDate: '2026-10-26',
    phone: '+91 99000 00188',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'hareesh.babu@starkdoors.com',
    fullName: 'HAREESH BABU',
    role: 'Delivery Partner',
    department: 'operations',
    employeeId: '115',
    reportingManagerId: '176',
    reportingManagerName: 'NAYAN RAM (Transport Manager)',
    employmentStatus: 'active',
    joiningDate: '2025-06-01',
    phone: '+91 99000 00115',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'akhil.ts@starkdoors.com',
    fullName: 'AKHIL T S',
    role: 'Delivery Partner',
    department: 'operations',
    employeeId: '134',
    reportingManagerId: '176',
    reportingManagerName: 'NAYAN RAM (Transport Manager)',
    employmentStatus: 'active',
    joiningDate: '2025-12-01',
    phone: '+91 99000 00134',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'sirajudheen@starkdoors.com',
    fullName: 'SIRAJUDHEEN C B',
    role: 'Delivery Partner',
    department: 'operations',
    employeeId: '191',
    reportingManagerId: '176',
    reportingManagerName: 'NAYAN RAM (Transport Manager)',
    employmentStatus: 'active',
    joiningDate: '2026-10-26',
    phone: '+91 99000 00191',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'abhay@starkdoors.com',
    fullName: 'ABHAY V J',
    role: 'Delivery Partner',
    department: 'operations',
    employeeId: '192',
    reportingManagerId: '176',
    reportingManagerName: 'NAYAN RAM (Transport Manager)',
    employmentStatus: 'active',
    joiningDate: '2026-10-26',
    phone: '+91 99000 00192',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'gautham@starkdoors.com',
    fullName: 'GAUTHAM B',
    role: 'Delivery Partner',
    department: 'operations',
    employeeId: '193',
    reportingManagerId: '176',
    reportingManagerName: 'NAYAN RAM (Transport Manager)',
    employmentStatus: 'active',
    joiningDate: '2026-10-26',
    phone: '+91 99000 00193',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },

  // 7. Warehouse & Inventory
  {
    email: 'suhaib@starkdoors.com',
    fullName: 'MUHAMMED SUHAIB',
    role: 'Warehouse In-charge',
    department: 'operations',
    employeeId: '166',
    reportingManagerId: '113',
    reportingManagerName: 'AKHIL K R (Operations Head)',
    employmentStatus: 'active',
    joiningDate: '2026-06-26',
    phone: '+91 99000 00166',
    permissions: ['view_own_tasks', 'view_team_tasks', 'create_tasks', 'assign_tasks', 'update_own_tasks', 'submit_tasks', 'approve_tasks']
  },
  {
    email: 'nishanth@starkdoors.com',
    fullName: 'NISHANTH P S',
    role: 'Warehouse Executive',
    department: 'operations',
    employeeId: '132',
    reportingManagerId: '166',
    reportingManagerName: 'MUHAMMED SUHAIB (Warehouse In-charge)',
    employmentStatus: 'active',
    joiningDate: '2025-11-01',
    phone: '+91 99000 00132',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'vishnu@starkdoors.com',
    fullName: 'VISHNU K G',
    role: 'QC Supervisor',
    department: 'operations',
    employeeId: '139',
    reportingManagerId: '166',
    reportingManagerName: 'MUHAMMED SUHAIB (Warehouse In-charge)',
    employmentStatus: 'active',
    joiningDate: '2026-01-01',
    phone: '+91 99000 00139',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks', 'review_tasks']
  },
  {
    email: 'rizwan@starkdoors.com',
    fullName: 'MUHAMMED RIZWAN',
    role: 'QC Supervisor',
    department: 'operations',
    employeeId: '170',
    reportingManagerId: '166',
    reportingManagerName: 'MUHAMMED SUHAIB (Warehouse In-charge)',
    employmentStatus: 'active',
    joiningDate: '2026-06-26',
    phone: '+91 99000 00170',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks', 'review_tasks']
  },
  {
    email: 'ajmal@starkdoors.com',
    fullName: 'AJMAL B',
    role: 'QC Supervisor',
    department: 'operations',
    employeeId: '179',
    reportingManagerId: '166',
    reportingManagerName: 'MUHAMMED SUHAIB (Warehouse In-charge)',
    employmentStatus: 'active',
    joiningDate: '2026-08-26',
    phone: '+91 99000 00179',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks', 'review_tasks']
  },
  {
    email: 'aswin@starkdoors.com',
    fullName: 'ASWIN P G',
    role: 'Dispatch Supervisor',
    department: 'operations',
    employeeId: '174',
    reportingManagerId: '166',
    reportingManagerName: 'MUHAMMED SUHAIB (Warehouse In-charge)',
    employmentStatus: 'active',
    joiningDate: '2026-08-26',
    phone: '+91 99000 00174',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'tobin@starkdoors.com',
    fullName: 'TOBIN THOMAS',
    role: 'Inventory Supervisor',
    department: 'operations',
    employeeId: '175',
    reportingManagerId: '113',
    reportingManagerName: 'AKHIL K R (Operations Head)',
    employmentStatus: 'active',
    joiningDate: '2026-08-26',
    phone: '+91 99000 00175',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'afsal@starkdoors.com',
    fullName: 'MUHAMMED AFSAL N',
    role: 'Inventory Supervisor',
    department: 'operations',
    employeeId: '190',
    reportingManagerId: '113',
    reportingManagerName: 'AKHIL K R (Operations Head)',
    employmentStatus: 'active',
    joiningDate: '2026-10-26',
    phone: '+91 99000 00190',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'naseema@starkdoors.com',
    fullName: 'NASEEMA MAJEED',
    role: 'Housekeeper',
    department: 'hr_admin',
    employeeId: '118',
    reportingManagerId: '113',
    reportingManagerName: 'AKHIL K R (Operations Head)',
    employmentStatus: 'active',
    joiningDate: '2025-03-01',
    phone: '+91 99000 00118',
    permissions: ['view_own_tasks']
  },

  // 8. Loading Staff (Reporting to Warehouse Incharge)
  {
    email: 'mahindar@starkdoors.com',
    fullName: 'MAHINDAR TUDU',
    role: 'Loading Staff',
    department: 'operations',
    employeeId: '122',
    reportingManagerId: '166',
    reportingManagerName: 'MUHAMMED SUHAIB (Warehouse In-charge)',
    employmentStatus: 'active',
    joiningDate: '2024-06-01',
    phone: '+91 99000 00122',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'deepak@starkdoors.com',
    fullName: 'DEEPAK KUMAR',
    role: 'Loading Staff',
    department: 'operations',
    employeeId: '124',
    reportingManagerId: '166',
    reportingManagerName: 'MUHAMMED SUHAIB (Warehouse In-charge)',
    employmentStatus: 'active',
    joiningDate: '2023-06-01',
    phone: '+91 99000 00124',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'durga@starkdoors.com',
    fullName: 'DURGA KUMAR',
    role: 'Loading Staff',
    department: 'operations',
    employeeId: '126',
    reportingManagerId: '166',
    reportingManagerName: 'MUHAMMED SUHAIB (Warehouse In-charge)',
    employmentStatus: 'active',
    joiningDate: '2025-12-01',
    phone: '+91 99000 00126',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'suman@starkdoors.com',
    fullName: 'SUMAN JANA',
    role: 'Loading Staff',
    department: 'operations',
    employeeId: '137',
    reportingManagerId: '166',
    reportingManagerName: 'MUHAMMED SUHAIB (Warehouse In-charge)',
    employmentStatus: 'active',
    joiningDate: '2026-01-01',
    phone: '+91 99000 00137',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'ranjan@starkdoors.com',
    fullName: 'RANJAN MUKHIYA',
    role: 'Loading Staff',
    department: 'operations',
    employeeId: '125',
    reportingManagerId: '166',
    reportingManagerName: 'MUHAMMED SUHAIB (Warehouse In-charge)',
    employmentStatus: 'active',
    joiningDate: '2023-06-01',
    phone: '+91 99000 00125',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'sanjeet@starkdoors.com',
    fullName: 'SANJEET MAHTO',
    role: 'Loading Staff',
    department: 'operations',
    employeeId: '119',
    reportingManagerId: '166',
    reportingManagerName: 'MUHAMMED SUHAIB (Warehouse In-charge)',
    employmentStatus: 'active',
    joiningDate: '2023-01-01',
    phone: '+91 99000 00119',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'vishal@starkdoors.com',
    fullName: 'VISHAL KUMAR',
    role: 'Loading Staff',
    department: 'operations',
    employeeId: '142',
    reportingManagerId: '166',
    reportingManagerName: 'MUHAMMED SUHAIB (Warehouse In-charge)',
    employmentStatus: 'active',
    joiningDate: '2026-02-01',
    phone: '+91 99000 00142',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'bablu@starkdoors.com',
    fullName: 'BABLU SOREN',
    role: 'Loading Staff',
    department: 'operations',
    employeeId: '144',
    reportingManagerId: '166',
    reportingManagerName: 'MUHAMMED SUHAIB (Warehouse In-charge)',
    employmentStatus: 'active',
    joiningDate: '2026-03-01',
    phone: '+91 99000 00144',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'sourav@starkdoors.com',
    fullName: 'SOURAV SINGHA',
    role: 'Loading Staff',
    department: 'operations',
    employeeId: '157',
    reportingManagerId: '166',
    reportingManagerName: 'MUHAMMED SUHAIB (Warehouse In-charge)',
    employmentStatus: 'active',
    joiningDate: '2026-05-26',
    phone: '+91 99000 00157',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'tinku@starkdoors.com',
    fullName: 'TINKU KUMAR',
    role: 'Loading Staff',
    department: 'operations',
    employeeId: '163',
    reportingManagerId: '166',
    reportingManagerName: 'MUHAMMED SUHAIB (Warehouse In-charge)',
    employmentStatus: 'active',
    joiningDate: '2026-06-26',
    phone: '+91 99000 00163',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'sumit@starkdoors.com',
    fullName: 'SUMIT KUMAR MUKHIYA',
    role: 'Loading Staff',
    department: 'operations',
    employeeId: '164',
    reportingManagerId: '166',
    reportingManagerName: 'MUHAMMED SUHAIB (Warehouse In-charge)',
    employmentStatus: 'active',
    joiningDate: '2026-06-26',
    phone: '+91 99000 00164',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'jitan@starkdoors.com',
    fullName: 'JITAN KUMAR',
    role: 'Loading Staff',
    department: 'operations',
    employeeId: '171',
    reportingManagerId: '166',
    reportingManagerName: 'MUHAMMED SUHAIB (Warehouse In-charge)',
    employmentStatus: 'active',
    joiningDate: '2026-06-26',
    phone: '+91 99000 00171',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'dilip@starkdoors.com',
    fullName: 'DILIP KUMAR',
    role: 'Loading Staff',
    department: 'operations',
    employeeId: '172',
    reportingManagerId: '166',
    reportingManagerName: 'MUHAMMED SUHAIB (Warehouse In-charge)',
    employmentStatus: 'active',
    joiningDate: '2026-06-26',
    phone: '+91 99000 00172',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  },
  {
    email: 'kalu@starkdoors.com',
    fullName: 'KALU KUMAR',
    role: 'Loading Staff',
    department: 'operations',
    employeeId: '173',
    reportingManagerId: '166',
    reportingManagerName: 'MUHAMMED SUHAIB (Warehouse In-charge)',
    employmentStatus: 'active',
    joiningDate: '2026-08-26',
    phone: '+91 99000 00173',
    permissions: ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
  }
];

// Ensure every employee has an immutable id for keys, selection, and Firestore mapping
ENTERPRISE_EMPLOYEE_DIRECTORY.forEach((emp, index) => {
  if (!emp.id) {
    emp.id = emp.employeeId ? `emp_${emp.employeeId}` : `emp_${index + 1}`;
  }
});

/**
 * Returns employee profile mapped by email or UID or employeeId
 */
export function getEmployeeProfileByEmail(emailOrId) {
  if (!emailOrId) return null;
  const normalized = String(emailOrId).toLowerCase().trim();
  return ENTERPRISE_EMPLOYEE_DIRECTORY.find(e => 
    e.email.toLowerCase() === normalized || 
    e.employeeId.toLowerCase() === normalized ||
    (e.id && e.id.toLowerCase() === normalized)
  ) || null;
}

/**
 * Checks if an employee has a specific permission
 */
export function hasPermission(employee, permissionKey) {
  if (!employee) return false;
  // Executive Director and Director Operations have all permissions
  if (employee.role === 'Executive Director' || employee.role === 'Director Operations' || employee.role === 'General Manager') {
    return true;
  }
  const perms = employee.permissions || [];
  return perms.includes(permissionKey);
}
