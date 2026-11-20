import React, { useState, useMemo, useRef } from 'react';
import { 
  Building2, Users, Briefcase, Plus, Upload, CheckCircle2, 
  Trash2, Edit, ChevronRight, Search, Filter, Shield, UserCheck, 
  FileSpreadsheet, MoreHorizontal, KeyRound, AlertCircle, Check, 
  X, Loader2, Download, ArrowDownRight, Network, Archive, RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { canManageEmployees, canManageOrgStructure, can, PERMISSIONS, isCompanyHead, COMPANY_HEAD_ROLES } from './permissions';
import { COMPANY_DEPARTMENTS, ORG_TREE, getRoleLevel } from './orgTree';
import { useDepartments } from './useDepartments';
import { writeAuditLog } from './firestoreService';
import { apiCreateEmployee, apiSetEmployeeStatus, apiResetEmployeePassword } from './firebase';
import EditEmployeeModal from './EditEmployeeModal';
import EditDesignationModal from './EditDesignationModal';
import EditDepartmentModal from './EditDepartmentModal';
import EmployeeCard from './EmployeeCard';
import EmployeeToolbar from './EmployeeToolbar';
import EmployeeProfileDrawer from './EmployeeProfileDrawer';
import HierarchyTree from './HierarchyTree';
import DepartmentCard from './DepartmentCard';
import DesignationsTable from './DesignationsTable';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useToast } from './ToastContext';

export default function OrganizationManagementView({ 
  departments = [], 
  designations = [], 
  employees = [], 
  currentUser,
  onOpenAddEmployee,
  onEmployeeAdded,
  onEmployeeUpdated,
  onEmployeeDeleted,
  onDesignationUpdated
}) {
  // Tabs: 'directory' | 'hierarchy' | 'depts' | 'designations'
  const [activeOrgTab, setActiveOrgTab] = useState('directory');

  // Search & Filter state for Directory
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Pagination state (24 cards per page)
  const [visibleCount, setVisibleCount] = useState(24);

  // Profile Drawer state
  const [profileDrawerEmployee, setProfileDrawerEmployee] = useState(null);

  // Modals state
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editingDesignation, setEditingDesignation] = useState(null);
  const [isAddDesignationOpen, setIsAddDesignationOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [isAddDepartmentOpen, setIsAddDepartmentOpen] = useState(false);

  // Bulk Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importedCredentialsSheet, setImportedCredentialsSheet] = useState(null);
  const [hasDownloadedCredentials, setHasDownloadedCredentials] = useState(false);

  // Modern Toast Context
  const { showToast, confirm } = useToast();

  const deptHook = useDepartments();
  const allDepartments = deptHook.allDepartments;
  const activeDepartments = deptHook.departments;

  const isHR = can(currentUser, PERMISSIONS.EMPLOYEE_VIEW);
  const canManageOrg = canManageOrgStructure(currentUser);
  const currentUserId = currentUser?.id || currentUser?.uid || currentUser?.employeeId;

  // Filtered employees for directory
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const mName = (emp.fullName || emp.name || '').toLowerCase().includes(q);
        const mEmail = (emp.email || '').toLowerCase().includes(q);
        const mEmpId = (emp.employeeId || '').toLowerCase().includes(q);
        const mRole = (emp.role || emp.designation || '').toLowerCase().includes(q);
        if (!mName && !mEmail && !mEmpId && !mRole) return false;
      }

      if (selectedDeptFilter !== 'all') {
        const empDept = (emp.department || emp.departmentId || '').toLowerCase();
        if (empDept !== selectedDeptFilter.toLowerCase()) return false;
      }

      if (selectedStatusFilter !== 'all') {
        const empStatus = (emp.status || emp.employmentStatus || 'active').toLowerCase();
        if (empStatus !== selectedStatusFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [employees, searchTerm, selectedDeptFilter, selectedStatusFilter]);

  // Visible paginated slice
  const paginatedEmployees = useMemo(() => {
    return filteredEmployees.slice(0, visibleCount);
  }, [filteredEmployees, visibleCount]);

  // Toggle Employee Status (Activate / Deactivate)
  const handleToggleEmployeeStatus = async (emp) => {
    const curStatus = emp.status || emp.employmentStatus || 'active';
    const nextStatus = curStatus === 'active' ? 'inactive' : 'active';
    const requiredPerm = nextStatus === 'inactive' ? PERMISSIONS.EMPLOYEE_DEACTIVATE : PERMISSIONS.EMPLOYEE_ACTIVATE;

    // Check count of active company heads if attempting to deactivate a company head
    const targetIsCompanyHead = isCompanyHead(emp);
    const activeHeadCount = employees.filter(e => 
      isCompanyHead(e) && (e.status || e.employmentStatus || 'active').toLowerCase() !== 'inactive'
    ).length;

    if (nextStatus === 'inactive' && targetIsCompanyHead && activeHeadCount <= 1) {
      showToast('Safety Rule: The system must always keep at least one active company head. Cannot deactivate the last company head.', 'error');
      return;
    }

    if (!can(currentUser, requiredPerm, { ...emp, activeCompanyHeadsCount: activeHeadCount })) {
      showToast(`Permission denied: You are not authorized to ${nextStatus === 'inactive' ? 'deactivate' : 'activate'} this user.`, 'error');
      return;
    }

    // Special modal / prompt for deactivating another company head
    let auditReason = `Status changed to ${nextStatus}`;
    if (targetIsCompanyHead && nextStatus === 'inactive') {
      const reasonInput = prompt(`DEACTIVATING COMPANY HEAD (${emp.fullName || emp.name}): Please enter an operational justification/reason for the audit log:`);
      if (!reasonInput || !reasonInput.trim()) {
        showToast('Action cancelled: Reason is strictly required when altering a company head account.', 'warning');
        return;
      }
      auditReason = reasonInput.trim();
    }

    const confirmed = await confirm({
      title: `${nextStatus === 'inactive' ? 'Deactivate' : 'Activate'} Employee`,
      message: `Are you sure you want to ${nextStatus === 'inactive' ? 'deactivate' : 'activate'} ${emp.fullName || emp.name}?${targetIsCompanyHead ? ' (COMPANY HEAD ACCOUNT)' : ''}`,
      confirmText: nextStatus === 'inactive' ? 'Deactivate' : 'Activate',
      type: nextStatus === 'inactive' ? 'danger' : 'info'
    });
    if (!confirmed) return;

    try {
      await apiSetEmployeeStatus({ uid: emp.id, status: nextStatus });
      await updateDoc(doc(db, 'users', emp.id), { status: nextStatus, employmentStatus: nextStatus });
      
      // Write audit log
      await writeAuditLog({
        actorId: currentUserId,
        action: nextStatus === 'inactive' ? 'EMPLOYEE_DEACTIVATE' : 'EMPLOYEE_ACTIVATE',
        targetId: emp.id,
        before: { status: curStatus, role: emp.role },
        after: { status: nextStatus, role: emp.role },
        reason: auditReason
      });

      if (onEmployeeUpdated) {
        onEmployeeUpdated({ ...emp, status: nextStatus, employmentStatus: nextStatus });
      }
      showToast(`Employee ${nextStatus === 'inactive' ? 'deactivated' : 'activated'} successfully.`, 'success');
    } catch (err) {
      console.error('Status toggle error:', err);
      showToast(err.message || 'Failed to update employee status.', 'error');
    }
  };

  // Quick Password Reset Prompt
  const handleQuickResetPassword = async (emp) => {
    if (!can(currentUser, PERMISSIONS.EMPLOYEE_RESET_PASSWORD, emp)) {
      showToast('Permission denied: You cannot reset password for this user.', 'error');
      return;
    }

    const newPwd = prompt(`Enter new password for ${emp.fullName || emp.name} (min 8 chars):`);
    if (!newPwd) return;
    if (newPwd.length < 8) {
      showToast('Password must be at least 8 characters long.', 'warning');
      return;
    }

    try {
      await apiResetEmployeePassword({
        uid: emp.id,
        newPassword: newPwd,
        requirePasswordChange: true
      });

      // Write audit log
      await writeAuditLog({
        actorId: currentUserId,
        action: 'EMPLOYEE_RESET_PASSWORD',
        targetId: emp.id,
        before: null,
        after: { passwordReset: true },
        reason: 'Password reset via directory quick action'
      });

      showToast('Password reset successfully. User must change it on login.', 'success');
    } catch (err) {
      console.error('Reset password error:', err);
      showToast(err.message || 'Failed to reset password.', 'error');
    }
  };

  // Save / Update Department in Firestore
  const handleSaveDepartment = async (deptData) => {
    await setDoc(doc(db, 'departments', deptData.id), deptData, { merge: true });
    showToast(`Department "${deptData.name}" saved successfully.`, 'success');
  };

  // Archive Department (A department with active employees cannot be deleted, only archived)
  const handleArchiveDepartment = async (dept) => {
    const activeMemberCount = employees.filter(e => {
      const eDept = (e.department || e.departmentId || '').toLowerCase();
      const eStatus = (e.status || e.employmentStatus || 'active').toLowerCase();
      return eDept === dept.id.toLowerCase() && eStatus !== 'inactive';
    }).length;

    // Strict Director Operations check: cannot archive if active employees exist
    if (!can(currentUser, PERMISSIONS.DEPARTMENT_ARCHIVE, { ...dept, activeEmployeesCount: activeMemberCount })) {
      showToast(`Restriction: Department "${dept.name}" cannot be archived because it still has ${activeMemberCount} active employees.`, 'error');
      return;
    }

    if (activeMemberCount > 0 && dept.status !== 'archived') {
      const confirmed = await confirm({
        title: 'Archive Department',
        message: `"${dept.name}" has ${activeMemberCount} assigned employees. It cannot be deleted, but it will be archived. Proceed?`,
        confirmText: 'Archive Department',
        type: 'warning'
      });
      if (!confirmed) return;
    }

    const nextStatus = dept.status === 'archived' ? 'active' : 'archived';
    await updateDoc(doc(db, 'departments', dept.id), { status: nextStatus });

    // Write audit log
    await writeAuditLog({
      actorId: currentUserId,
      action: 'DEPARTMENT_ARCHIVE',
      targetId: dept.id,
      before: { status: dept.status || 'active' },
      after: { status: nextStatus },
      reason: `Department status changed to ${nextStatus}`
    });

    showToast(`Department "${dept.name}" ${nextStatus === 'archived' ? 'archived' : 'activated'}.`, 'success');
  };

  // Save / Update Designation in Firestore
  const handleSaveDesignation = async (desData) => {
    await setDoc(doc(db, 'designations', desData.id), desData, { merge: true });
    if (onDesignationUpdated) onDesignationUpdated(desData);
    showToast(`Designation "${desData.title}" saved successfully.`, 'success');
  };

  // Excel / CSV File Read & Validation
  const handleImportFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rawJson = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const validatedRows = [];
        const existingEmails = new Set(employees.map(u => (u.email || '').toLowerCase()));

        rawJson.forEach((row, idx) => {
          const rowNum = idx + 2;
          const name = (row['Full Name'] || row['Name'] || row['fullName'] || '').toString().trim();
          const email = (row['Email'] || row['Work Email'] || row['email'] || '').toString().trim().toLowerCase();
          const empId = (row['Employee ID'] || row['employeeId'] || row['ID'] || `EMP-${1000 + idx}`).toString().trim();
          const dept = (row['Department'] || row['department'] || 'operations').toString().trim().toLowerCase();
          const desig = (row['Designation'] || row['designation'] || row['Role'] || 'Staff').toString().trim();
          const phone = (row['Phone'] || row['phone'] || '').toString().trim();

          const errors = [];
          if (!name) errors.push('Missing Name');
          if (!email || !email.includes('@')) errors.push('Invalid Email');
          if (existingEmails.has(email)) errors.push('Duplicate Email');

          validatedRows.push({
            rowNum,
            name,
            email,
            empId,
            department: dept,
            designation: desig,
            phone,
            isValid: errors.length === 0,
            error: errors.join(', ')
          });
        });

        setImportRows(validatedRows);
      } catch (err) {
        showToast('Failed to parse Excel file: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Execute Bulk Import of Valid Rows via Cloud Function
  const handleExecuteBulkImport = async () => {
    const validRows = importRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      showToast('No valid rows found to import.', 'warning');
      return;
    }

    setIsImporting(true);
    const credentialsToExport = [];

    for (const r of validRows) {
      const generatedPwd = `Stark@${Math.floor(100000 + Math.random() * 900000)}`;
      try {
        await apiCreateEmployee({
          employeeId: r.empId,
          fullName: r.name,
          email: r.email,
          phone: r.phone,
          department: r.department,
          designation: r.designation,
          role: r.designation,
          status: 'active',
          password: generatedPwd,
          mustChangePassword: true
        });

        credentialsToExport.push({
          'Employee ID': r.empId,
          'Full Name': r.name,
          'Work Email': r.email,
          'Initial Password': generatedPwd,
          'Department': r.department,
          'Designation': r.designation
        });
      } catch (err) {
        console.warn(`Failed to import row ${r.rowNum} (${r.email}):`, err.message);
      }
    }

    setIsImporting(false);
    setIsImportModalOpen(false);

    if (credentialsToExport.length > 0) {
      setImportedCredentialsSheet(credentialsToExport);
      setHasDownloadedCredentials(false);
      showToast(`Successfully imported ${credentialsToExport.length} employees.`);
    }
  };

  // Download Generated Credentials Sheet
  const downloadCredentialsSheet = () => {
    if (!importedCredentialsSheet) return;
    const ws = XLSX.utils.json_to_sheet(importedCredentialsSheet);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Credentials');
    XLSX.writeFile(wb, 'Stark_Imported_Credentials.xlsx');
    setHasDownloadedCredentials(true);
    showToast('Credentials sheet downloaded.');
  };

  // Download Template
  const downloadTemplate = () => {
    const templateData = [
      { 'Full Name': 'Suresh Kumar', 'Work Email': 'suresh@starkdoors.com', 'Employee ID': 'EMP-180', 'Department': 'sales', 'Designation': 'Sales Coordinator', 'Phone': '+91 99000 00180' },
      { 'Full Name': 'Pooja Nair', 'Work Email': 'pooja@starkdoors.com', 'Employee ID': 'EMP-181', 'Department': 'operations', 'Designation': 'Loading Staff', 'Phone': '+91 99000 00181' }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'EmployeeTemplate');
    XLSX.writeFile(wb, 'Stark_Employee_Import_Template.xlsx');
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedDeptFilter('all');
    setSelectedStatusFilter('all');
    setVisibleCount(24);
  };

  // Navigate to Directory from Department card
  const handleFilterByDepartment = (deptId) => {
    setSelectedDeptFilter(deptId);
    setActiveOrgTab('directory');
  };

  // Navigate to Directory from Designation table
  const handleFilterByDesignation = (desigTitle) => {
    setSearchTerm(desigTitle);
    setActiveOrgTab('directory');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      
      {/* 1. PAGE HEADER (Plain on slate-50, NOT a bordered card) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Corporate Directory & Hierarchy
            </h1>
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {employees.length} Employees
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Departmental structures, verified corporate users, designations, and live reporting lines.
          </p>
        </div>

        {/* Right Actions (Role-gated for HR & Leadership) */}
        {isHR && (
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-2xs focus-visible:ring-2 focus-visible:ring-emerald-500/40 w-full sm:w-auto"
            >
              <FileSpreadsheet className="w-[18px] h-[18px] text-slate-500" strokeWidth={1.75} />
              <span>Import Excel / CSV</span>
            </button>

            <button
              type="button"
              onClick={onOpenAddEmployee}
              className="h-10 px-5 rounded-xl bg-[#05331F] hover:bg-[#0a4a2f] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-2xs focus-visible:ring-2 focus-visible:ring-emerald-500/40 w-full sm:w-auto"
            >
              <Plus className="w-[18px] h-[18px] text-emerald-300" strokeWidth={2} />
              <span>Add Employee</span>
            </button>
          </div>
        )}
      </div>

      {/* Bulk Credentials Banner (Under header, dismissal requires download) */}
      {importedCredentialsSheet && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="font-semibold text-xs text-emerald-950">Bulk Import Complete</h3>
              <p className="text-xs text-emerald-800">
                Download generated credentials sheet now. Plain passwords cannot be retrieved later.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={downloadCredentialsSheet}
              className="h-9 px-3.5 rounded-lg bg-[#05331F] text-white text-xs font-semibold hover:bg-[#0a4a2f] flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Download className="w-4 h-4" />
              <span>Download generated passwords</span>
            </button>

            {hasDownloadedCredentials && (
              <button
                type="button"
                onClick={() => setImportedCredentialsSheet(null)}
                aria-label="Dismiss banner"
                className="p-1.5 text-emerald-800 hover:text-emerald-950 rounded-lg hover:bg-emerald-100"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. TABS (Underline style inside a single bottom border, sticky) */}
      <div className="border-b border-slate-200 sticky top-0 bg-slate-50/95 backdrop-blur-xs z-20">
        <div 
          role="tablist" 
          className="flex items-center gap-8 overflow-x-auto no-scrollbar"
        >
          {[
            { id: 'directory', label: 'Employee Directory', icon: Users, count: filteredEmployees.length },
            { id: 'hierarchy', label: 'Hierarchy Tree', icon: Network },
            { id: 'depts', label: 'Departments', icon: Building2, count: allDepartments.length },
            { id: 'designations', label: 'Designations', icon: Briefcase, count: designations.length }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeOrgTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => setActiveOrgTab(tab.id)}
                className={`flex items-center gap-2 py-3 text-sm transition-colors relative whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-[#05331F] font-semibold border-b-2 border-emerald-600'
                    : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent'
                }`}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    isActive ? 'bg-emerald-100 text-[#05331F]' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. TAB CONTENT */}
      
      {/* TAB 1: EMPLOYEE DIRECTORY */}
      {activeOrgTab === 'directory' && (
        <div role="tabpanel" className="space-y-6">
          
          {/* Toolbar */}
          <EmployeeToolbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            departmentFilter={selectedDeptFilter}
            onDepartmentFilterChange={setSelectedDeptFilter}
            statusFilter={selectedStatusFilter}
            onStatusFilterChange={setSelectedStatusFilter}
            departments={activeDepartments}
            totalCount={employees.length}
            filteredCount={filteredEmployees.length}
            onResetFilters={handleResetFilters}
          />

          {/* Directory Cards Grid */}
          {filteredEmployees.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Users className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h3 className="font-semibold text-sm text-slate-900">No employees match your filters</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try searching with a different term, changing department, or reset filters.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginatedEmployees.map(emp => (
                  <EmployeeCard
                    key={emp.id || emp.employeeId}
                    employee={emp}
                    isMe={(emp.id || emp.employeeId) === currentUserId}
                    isHR={isHR}
                    currentUser={currentUser}
                    onSelect={(e) => setProfileDrawerEmployee(e)}
                    onEdit={(e) => setEditingEmployee(e)}
                    onResetPassword={handleQuickResetPassword}
                    onToggleStatus={handleToggleEmployeeStatus}
                  />
                ))}
              </div>

              {/* Load more pagination */}
              {filteredEmployees.length > visibleCount && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setVisibleCount(prev => prev + 24)}
                    className="h-10 px-5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors shadow-2xs"
                  >
                    Load more ({filteredEmployees.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* TAB 2: HIERARCHY TREE */}
      {activeOrgTab === 'hierarchy' && (
        <div role="tabpanel">
          <HierarchyTree
            employees={employees}
            currentUserId={currentUserId}
            onSelectEmployee={(e) => setProfileDrawerEmployee(e)}
          />
        </div>
      )}

      {/* TAB 3: DEPARTMENTS */}
      {activeOrgTab === 'depts' && (
        <div role="tabpanel" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Corporate Divisions & Departments
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Departments with active employees can only be archived to preserve operational integrity.
              </p>
            </div>

            {canManageOrg && (
              <button
                type="button"
                onClick={() => setIsAddDepartmentOpen(true)}
                className="h-10 px-4 bg-[#05331F] hover:bg-[#0a4a2f] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Department</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {allDepartments.map(dept => {
              const assignedMembers = employees.filter(e => 
                (e.department || e.departmentId || '').toLowerCase() === dept.id.toLowerCase()
              );
              return (
                <DepartmentCard
                  key={dept.id}
                  department={dept}
                  assignedCount={assignedMembers.length}
                  totalEmployeesCount={employees.length}
                  employees={employees}
                  canManageOrg={canManageOrg}
                  onSelect={handleFilterByDepartment}
                  onArchive={handleArchiveDepartment}
                  onEdit={() => setEditingDepartment(dept)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: DESIGNATIONS */}
      {activeOrgTab === 'designations' && (
        <div role="tabpanel" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Corporate Designations & Level Mapping
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Designations placed in org hierarchy preserving salary and task assignment bands.
              </p>
            </div>

            {canManageOrg && (
              <button
                type="button"
                onClick={() => setIsAddDesignationOpen(true)}
                className="h-10 px-4 bg-[#05331F] hover:bg-[#0a4a2f] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Designation</span>
              </button>
            )}
          </div>

          <DesignationsTable
            designations={designations}
            employees={employees}
            departments={allDepartments}
            canManageOrg={canManageOrg}
            onSelectDesignation={handleFilterByDesignation}
            onEditDesignation={(des) => setEditingDesignation(des)}
          />
        </div>
      )}

      {/* PROFILE SLIDE-OVER DRAWER */}
      <EmployeeProfileDrawer
        isOpen={Boolean(profileDrawerEmployee)}
        onClose={() => setProfileDrawerEmployee(null)}
        employee={profileDrawerEmployee}
        currentUser={currentUser}
        reportingManager={employees.find(e => 
          String(e.id || e.employeeId) === String(profileDrawerEmployee?.reportsTo || profileDrawerEmployee?.reportingManagerId)
        )}
        isMe={(profileDrawerEmployee?.id || profileDrawerEmployee?.employeeId) === currentUserId}
        isHR={isHR}
        onEdit={(e) => {
          setEditingEmployee(e);
        }}
        onResetPassword={handleQuickResetPassword}
        onToggleStatus={handleToggleEmployeeStatus}
      />

      {/* MODAL 1: Edit Employee */}
      <EditEmployeeModal
        isOpen={Boolean(editingEmployee)}
        onClose={() => setEditingEmployee(null)}
        employee={editingEmployee}
        departments={allDepartments}
        designations={designations}
        existingUsers={employees}
        currentUser={currentUser}
        onEmployeeUpdated={(updated) => {
          if (onEmployeeUpdated) onEmployeeUpdated(updated);
          showToast('Employee profile updated successfully.');
        }}
        onEmployeeDeleted={(delId) => {
          if (onEmployeeDeleted) onEmployeeDeleted(delId);
        }}
      />

      {/* MODAL 2: Add / Edit Designation */}
      {(isAddDesignationOpen || editingDesignation) && (
        <EditDesignationModal
          isOpen={Boolean(isAddDesignationOpen || editingDesignation)}
          onClose={() => {
            setIsAddDesignationOpen(false);
            setEditingDesignation(null);
          }}
          designation={editingDesignation}
          departments={allDepartments}
          designations={designations}
          onDesignationSaved={handleSaveDesignation}
        />
      )}

      {/* MODAL 3: Add / Edit Department */}
      {(isAddDepartmentOpen || editingDepartment) && (
        <EditDepartmentModal
          isOpen={Boolean(isAddDepartmentOpen || editingDepartment)}
          onClose={() => {
            setIsAddDepartmentOpen(false);
            setEditingDepartment(null);
          }}
          department={editingDepartment}
          onDepartmentSaved={handleSaveDepartment}
        />
      )}

      {/* MODAL 4: Bulk Excel / CSV Import */}
      {isImportModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsImportModalOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-slate-900">Bulk Import Employees</h3>
                  <p className="text-xs text-slate-500">Upload a spreadsheet to batch create enterprise accounts.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 text-xs">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleImportFileChange}
                className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#05331F] file:text-white hover:file:bg-[#0a4a2f] file:cursor-pointer"
              />
              <button
                type="button"
                onClick={downloadTemplate}
                className="text-xs text-emerald-700 font-semibold underline flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample Template</span>
              </button>
            </div>

            {/* Preview Table */}
            {importRows.length > 0 && (
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl overflow-x-auto text-xs">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Row</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Email</th>
                      <th className="py-2 px-3">Dept</th>
                      <th className="py-2 px-3">Designation</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importRows.map(r => (
                      <tr key={r.rowNum} className={r.isValid ? 'bg-white' : 'bg-red-50/50'}>
                        <td className="py-2 px-3 font-mono">{r.rowNum}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{r.name}</td>
                        <td className="py-2 px-3 font-mono">{r.email}</td>
                        <td className="py-2 px-3 uppercase">{r.department}</td>
                        <td className="py-2 px-3">{r.designation}</td>
                        <td className="py-2 px-3">
                          {r.isValid ? (
                            <span className="text-emerald-700 font-medium flex items-center gap-1">
                              <Check className="w-3 h-3" /> Ready
                            </span>
                          ) : (
                            <span className="text-red-600 font-medium">{r.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-500">
                Ready to import: <strong className="text-slate-900">{importRows.filter(r => r.isValid).length}</strong> / {importRows.length} rows
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBulkImport}
                  disabled={isImporting || importRows.filter(r => r.isValid).length === 0}
                  className="h-10 px-5 rounded-xl bg-[#05331F] hover:bg-[#0a4a2f] text-white font-semibold text-xs shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                      <span>Creating Accounts...</span>
                    </>
                  ) : (
                    <span>Execute Import</span>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
