/**
 * Dev Test Matrix & Role Switcher for STARK STEEL DOORS (SalesDoor Enterprise)
 * Quality assurance testing tool for checking views of:
 * 1. Director Operations (IHJAS K) - Universal Company Scope
 * 2. HR Manager (SHAHEEN NAZAR) & Admin Manager - HR Branch
 * 3. Chief Sales Officer (ABDUL MAJEED) - Sales Department Scope
 * 4. State Sales Manager (RASHAD K) & ASM (SHAMNA) - Sales Downline Scope
 * 5. Sales Coordinator (BINSHA E S) - Sales Frontline Self Scope
 * 6. Brand Manager, Leads Coordinator, Graphic Designer, Photographer - Marketing Department
 */

import React, { useState } from 'react';
import { Shield, ChevronDown, Check, UserCheck, AlertTriangle } from 'lucide-react';
import { getScope, SCOPES, PAGES, canAccess } from './permissions';

export const TEST_PERSONAS = [
  {
    id: 'emp_101',
    uid: 'emp_101',
    fullName: 'IHJAS K',
    email: 'ihjas@starkdoors.com',
    role: 'Director Operations',
    department: 'management',
    expectedScope: SCOPES.COMPANY,
    allowed: ['Dashboard (10 Depts)', 'Team Performance', 'All Tasks', 'Approvals', 'Escalations', 'My Tasks', 'To-Do', 'My Team', 'Employees', 'Dealers', 'Bookings', 'Reports'],
    forbidden: []
  },
  {
    id: 'emp_104',
    uid: 'emp_104',
    fullName: 'SHAHEEN NAZAR',
    email: 'shaheen@starkdoors.com',
    role: 'HR Manager',
    department: 'hr_admin',
    expectedScope: SCOPES.COMPANY,
    allowed: ['Full Directory (Employees)', 'HR Squad Table', 'Assign to HR Downline', 'Add/Edit Teams', 'Manage Org Structure'],
    forbidden: ['Company-wide Task Assignment', 'Sales Bookings', '10 Dept Overview']
  },
  {
    id: 'emp_104_admin',
    uid: 'emp_104_admin',
    fullName: 'Admin Manager Test',
    email: 'admin.mgr@starkdoors.com',
    role: 'Admin Manager',
    department: 'hr_admin',
    expectedScope: SCOPES.COMPANY,
    allowed: ['Full Directory (Employees)', 'HR Squad Table', 'Assign to Admin Exec/IT/Housekeeping', 'Manage Org Structure'],
    forbidden: ['Company-wide Task Assignment', 'Assign to HR Exec']
  },
  {
    id: 'emp_109',
    uid: 'emp_109',
    fullName: 'Brand Manager Test',
    email: 'brand.mgr@starkdoors.com',
    role: 'Brand Manager',
    department: 'marketing',
    expectedScope: SCOPES.DEPARTMENT,
    allowed: ['Dashboard (Marketing Squad)', 'Team Performance (Marketing Only)', 'All Tasks (Requests Tab)', 'Approvals', 'My Tasks', 'To-Do', 'My Team', 'Reports (Marketing)'],
    forbidden: ['Dealers', 'Bookings', 'Escalations', 'Employees Directory']
  },
  {
    id: 'emp_180',
    uid: 'emp_180',
    fullName: 'SHARANYA V M',
    email: 'sharanya@starkdoors.com',
    role: 'Leads Coordinator',
    department: 'marketing',
    expectedScope: SCOPES.DOWNLINE,
    allowed: ['Dashboard (Squad Table)', 'Team Performance (Under Team)', 'Approvals (Graphic Designer & Photographer)', 'My Tasks', 'To-Do', 'My Team'],
    forbidden: ['Dealers', 'Bookings', 'Reports', 'Employees Directory', 'Assign to Brand Manager']
  },
  {
    id: 'emp_155_design',
    uid: 'emp_155_design',
    fullName: 'IVIN C BIJI',
    email: 'ivin@starkdoors.com',
    role: 'Graphic Designer',
    department: 'marketing',
    expectedScope: SCOPES.SELF,
    allowed: ['Dashboard (Changes Requested / My Tasks)', 'My Tasks', 'To-Do', 'My Team (Read-only)', 'Request from Marketing'],
    forbidden: ['Assign Button', 'Approvals', 'Team Performance', 'Dealers', 'Bookings']
  },
  {
    id: 'emp_156_photo',
    uid: 'emp_156_photo',
    fullName: 'Stark Photographer',
    email: 'photographer@starkdoors.com',
    role: 'Photographer',
    department: 'marketing',
    expectedScope: SCOPES.SELF,
    allowed: ['Dashboard (Changes Requested / My Tasks)', 'My Tasks', 'To-Do', 'My Team (Read-only)', 'Request from Marketing'],
    forbidden: ['Assign Button', 'Approvals', 'Team Performance', 'Dealers', 'Bookings']
  },
  {
    id: 'emp_102',
    uid: 'emp_102',
    fullName: 'ABDUL MAJEED',
    email: 'majeed@starkdoors.com',
    role: 'Chief Sales Officer',
    department: 'sales',
    expectedScope: SCOPES.DEPARTMENT,
    allowed: ['Sees ALL Sales Teams', 'Assign to ANYONE they want', 'Team Performance (All Sales)', 'Dealers', 'Bookings'],
    forbidden: ['Employees Directory', 'Settings']
  },
  {
    id: 'emp_149',
    uid: 'emp_149',
    fullName: 'RASHAD K',
    email: 'rashad@starkdoors.com',
    role: 'State Sales Manager',
    department: 'sales',
    expectedScope: SCOPES.DOWNLINE,
    allowed: ['Dashboard (Squad Table)', 'Team Performance (Their Under Team)', 'Assign to Under Team (ASMs & Coordinators)', 'Dealers', 'Bookings'],
    forbidden: ['Employees Directory', 'Escalations', 'Reports', 'Settings', 'Other Zones']
  },
  {
    id: 'emp_112',
    uid: 'emp_112',
    fullName: 'SHAMNA',
    email: 'shamna@starkdoors.com',
    role: 'Asst Sales Manager',
    department: 'sales',
    expectedScope: SCOPES.DOWNLINE,
    allowed: ['Dashboard (Squad Table)', 'Team Performance (Their Under Team)', 'Assign to Under Team (Coordinators)', 'Dealers', 'Bookings'],
    forbidden: ['Employees Directory', 'Escalations', 'Reports', 'Company-wide Dashboard', 'Other ASMs']
  },
  {
    id: 'emp_153',
    uid: 'emp_153',
    fullName: 'BINSHA E S',
    email: 'binsha@starkdoors.com',
    role: 'Sales Coordinator',
    department: 'sales',
    expectedScope: SCOPES.SELF,
    allowed: ['Dashboard (My Tasks Today)', 'My Tasks', 'To-Do', 'My Team (Read-only)', 'Dealers', 'Bookings'],
    forbidden: ['Employees Directory', 'Approvals Queue', 'Escalations', 'Team Performance', 'Reports']
  },
  {
    id: 'emp_113',
    uid: 'emp_113',
    fullName: 'AKHIL K R',
    email: 'akhil@starkdoors.com',
    role: 'Operations Head',
    department: 'operations',
    expectedScope: SCOPES.DEPARTMENT,
    allowed: ['Dashboard (All 4 Branches)', 'Assign to Anyone in Operations', 'Team Performance (All Operations)', 'Approvals', 'Escalations', 'My Tasks', 'To-Do', 'My Team', 'Reports'],
    forbidden: ['Dealers', 'Bookings', 'Employees Directory', 'Cross-Dept Assignment outside Operations']
  },
  {
    id: 'emp_166',
    uid: 'emp_166',
    fullName: 'MUHAMMED SUHAIB',
    email: 'suhaib@starkdoors.com',
    role: 'Warehouse In-charge',
    department: 'warehouse',
    expectedScope: SCOPES.DOWNLINE,
    allowed: ['Dashboard (Warehouse Squad)', 'Assign down Warehouse branch', 'From Sales Tab', 'Approvals', 'My Tasks', 'To-Do', 'My Team', 'Request from Branch'],
    forbidden: ['Dealers', 'Bookings', 'Assign to Drivers/Technicians/Storekeeper']
  },
  {
    id: 'emp_176',
    uid: 'emp_176',
    fullName: 'NAYAN RAM',
    email: 'nayan@starkdoors.com',
    role: 'Transport Manager',
    department: 'transportation',
    expectedScope: SCOPES.DOWNLINE,
    allowed: ['Dashboard (Transport Squad)', 'Assign down Transport branch', 'From Sales Tab', 'Approvals', 'My Tasks', 'To-Do', 'My Team', 'Request from Branch'],
    forbidden: ['Dealers', 'Bookings', 'Assign to Loading Staff/Technicians']
  },
  {
    id: 'emp_116',
    uid: 'emp_116',
    fullName: 'AMAL KUMAR T K',
    email: 'amal@starkdoors.com',
    role: 'Service Manager',
    department: 'service',
    expectedScope: SCOPES.DOWNLINE,
    allowed: ['Dashboard (Service Squad)', 'Assign down Service branch', 'Approvals', 'My Tasks', 'To-Do', 'My Team', 'Request from Branch'],
    forbidden: ['Dealers', 'Bookings', 'Assign to Warehouse/Transport']
  },
  {
    id: 'emp_175',
    uid: 'emp_175',
    fullName: 'TOBIN THOMAS',
    email: 'tobin@starkdoors.com',
    role: 'Inventory Supervisor',
    department: 'inventory',
    expectedScope: SCOPES.DOWNLINE,
    allowed: ['Dashboard (Inventory Squad)', 'Assign down Inventory (Storekeeper)', 'Approvals', 'My Tasks', 'To-Do', 'My Team', 'Request from Branch'],
    forbidden: ['Dealers', 'Bookings', 'Assign to Warehouse/Transport']
  },
  {
    id: 'emp_122',
    uid: 'emp_122',
    fullName: 'MAHINDAR TUDU',
    email: 'mahindar@starkdoors.com',
    role: 'Loading Staff',
    department: 'warehouse',
    expectedScope: SCOPES.SELF,
    allowed: ['Frontline Mobile UI (Large Start/Done Buttons)', 'Submit 10MB Photo Proof', 'My Tasks', 'To-Do', 'My Team (Read-only)'],
    forbidden: ['Assign Button', 'Approvals', 'Team Performance', 'Dealers', 'Bookings']
  },
  {
    id: 'emp_115',
    uid: 'emp_115',
    fullName: 'HAREESH BABU',
    email: 'hareesh@starkdoors.com',
    role: 'Driver',
    department: 'transportation',
    expectedScope: SCOPES.SELF,
    allowed: ['Frontline Mobile UI (Large Start/Done Buttons)', 'Submit 10MB Photo Proof', 'My Tasks', 'To-Do', 'My Team (Read-only)'],
    forbidden: ['Assign Button', 'Approvals', 'Team Performance', 'Dealers', 'Bookings']
  },
  {
    id: 'emp_133',
    uid: 'emp_133',
    fullName: 'HARSHAL K B',
    email: 'harshal@starkdoors.com',
    role: 'Technician',
    department: 'service',
    expectedScope: SCOPES.SELF,
    allowed: ['Frontline Mobile UI (Large Start/Done Buttons)', 'Submit 10MB Photo Proof', 'My Tasks', 'To-Do', 'My Team (Read-only)'],
    forbidden: ['Assign Button', 'Approvals', 'Team Performance', 'Dealers', 'Bookings']
  },
  {
    id: 'emp_189',
    uid: 'emp_189',
    fullName: 'APARNA V P',
    email: 'aparna@starkdoors.com',
    role: 'Operations Assistant',
    department: 'operations',
    expectedScope: SCOPES.SELF,
    allowed: ['Dashboard (My Tasks Today)', 'My Tasks', 'To-Do', 'My Team (Read-only)'],
    forbidden: ['Assign Button', 'Approvals', 'Team Performance', 'Dealers', 'Bookings']
  }
];

export default function DevRoleSwitcher({ activeEmployee, onSwitchRole }) {
  const [isOpen, setIsOpen] = useState(false);
  const currentScope = getScope(activeEmployee);

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300 text-[11px] font-semibold transition"
        title="Dev Role Switcher Matrix"
      >
        <Shield className="w-3.5 h-3.5 text-amber-700" />
        <span>Dev Persona: <strong>{activeEmployee.role}</strong> ({currentScope})</span>
        <ChevronDown className="w-3 h-3 text-amber-700" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
            <div>
              <span className="font-bold text-slate-900">RBAC Persona Matrix</span>
              <p className="text-[10px] text-slate-500">Test how permissions adapt per role</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">
              ✕
            </button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {TEST_PERSONAS.map(p => {
              const isActive = (activeEmployee.role === p.role) || (activeEmployee.email === p.email);
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    onSwitchRole(p);
                    setIsOpen(false);
                  }}
                  className={`p-2.5 rounded-xl border cursor-pointer transition ${
                    isActive 
                      ? 'bg-emerald-50/70 border-emerald-300' 
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{p.fullName}</p>
                      <p className="text-[11px] text-slate-500">{p.role} · <span className="text-emerald-700 font-semibold">{p.expectedScope}</span></p>
                    </div>
                    {isActive && (
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <div className="mt-2 text-[10px] text-slate-600 space-y-0.5">
                    <p><strong className="text-emerald-700">✓ Sees:</strong> {p.allowed.slice(0, 3).join(', ')}...</p>
                    {p.forbidden.length > 0 && (
                      <p><strong className="text-rose-600">✗ Hidden:</strong> {p.forbidden.join(', ')}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
