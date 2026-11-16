import React, { useState, useMemo, useRef } from 'react';
import { 
  Building2, Users, Briefcase, Plus, Upload, CheckCircle2, 
  Trash2, Edit, ChevronRight, Search, Filter, Shield, UserCheck, 
  FileSpreadsheet, MoreHorizontal, KeyRound, AlertCircle, Check, 
  X, Loader2, Download, ArrowDownRight, Network, Archive
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { canManageEmployees } from './permissions';
import { COMPANY_DEPARTMENTS, ORG_TREE, getRoleLevel } from './orgTree';
import { apiCreateEmployee, apiSetEmployeeStatus, apiResetEmployeePassword } from './firebase';
import EditEmployeeModal from './EditEmployeeModal';
import EditDesignationModal from './EditDesignationModal';
import EditDepartmentModal from './EditDepartmentModal';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

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
  const [selectedDesigFilter, setSelectedDesigFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Modals state
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editingDesignation, setEditingDesignation] = useState(null);
  const [isAddDesignationOpen, setIsAddDesignationOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [isAddDepartmentOpen, setIsAddDepartmentOpen] = useState(false);

  // Overflow action menu state
  const [activeMenuEmployeeId, setActiveMenuEmployeeId] = useState(null);
  const menuRef = useRef(null);

  // Bulk Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importedCredentialsSheet, setImportedCredentialsSheet] = useState(null);

  // Toast notification
  const [toast, setToast] = useState(null);

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const isHR = canManageEmployees(currentUser);
  const currentUserId = currentUser?.id || currentUser?.uid || currentUser?.employeeId;

  // Click outside to dismiss overflow menu
  React.useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuEmployeeId(null);
      }
    };
    if (activeMenuEmployeeId) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [activeMenuEmployeeId]);

  // Merge default COMPANY_DEPARTMENTS with Firestore departments
  const allDepartments = useMemo(() => {
    const map = new Map();
    COMPANY_DEPARTMENTS.forEach(d => map.set(d.id, { ...d, status: 'active' }));
    departments.forEach(d => {
      const id = d.id || (d.code || '').toLowerCase();
      map.set(id, { ...map.get(id), ...d });
    });
    return Array.from(map.values());
  }, [departments]);

  // Filtered employees for directory
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const mName = (emp.fullName || emp.name || '').toLowerCase().includes(q);
        const mEmail = (emp.email || '').toLowerCase().includes(q);
        const mEmpId = (emp.employeeId || '').toLowerCase().includes(q);
        const mRole = (emp.role || emp.designation || '').toLowerCase().includes(q);
        if (!mName && !mEmail && !mEmpId && !mRole) return false;
      }

      // Department filter
      if (selectedDeptFilter !== 'all') {
        const empDept = (emp.department || emp.departmentId || '').toLowerCase();
        if (empDept !== selectedDeptFilter.toLowerCase()) return false;
      }

      // Designation filter
      if (selectedDesigFilter !== 'all') {
        const empDes = (emp.designation || emp.role || '').toLowerCase();
        if (empDes !== selectedDesigFilter.toLowerCase()) return false;
      }

      // Status filter
      if (selectedStatusFilter !== 'all') {
        const empStatus = (emp.status || emp.employmentStatus || 'active').toLowerCase();
        if (empStatus !== selectedStatusFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [employees, searchTerm, selectedDeptFilter, selectedDesigFilter, selectedStatusFilter]);

  // Initials helper
  const getInitials = (name) => {
    if (!name) return 'ST';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Toggle Employee Status (Activate / Deactivate)
  const handleToggleEmployeeStatus = async (emp) => {
    setActiveMenuEmployeeId(null);
    const curStatus = emp.status || emp.employmentStatus || 'active';
    const nextStatus = curStatus === 'active' ? 'inactive' : 'active';

    if (!confirm(`Are you sure you want to ${nextStatus === 'inactive' ? 'deactivate' : 'activate'} ${emp.fullName || emp.name}?`)) {
      return;
    }

    try {
      await apiSetEmployeeStatus({ uid: emp.id, status: nextStatus });
      await updateDoc(doc(db, 'users', emp.id), { status: nextStatus, employmentStatus: nextStatus });
      if (onEmployeeUpdated) {
        onEmployeeUpdated({ ...emp, status: nextStatus, employmentStatus: nextStatus });
      }
      showToast(`Employee ${nextStatus === 'inactive' ? 'deactivated' : 'activated'} successfully.`);
    } catch (err) {
      console.error('Status toggle error:', err);
      alert(err.message || 'Failed to update employee status.');
    }
  };

  // Quick Password Reset Prompt
  const handleQuickResetPassword = async (emp) => {
    setActiveMenuEmployeeId(null);
    const newPwd = prompt(`Enter new password for ${emp.fullName || emp.name} (min 8 chars):`);
    if (!newPwd) return;
    if (newPwd.length < 8) {
      alert('Password must be at least 8 characters long.');
      return;
    }

    try {
      await apiResetEmployeePassword({
        uid: emp.id,
        newPassword: newPwd,
        requirePasswordChange: true
      });
      showToast('Password reset successfully. User must change it on login.');
    } catch (err) {
      console.error('Reset password error:', err);
      alert(err.message || 'Failed to reset password.');
    }
  };

  // Save / Update Department in Firestore
  const handleSaveDepartment = async (deptData) => {
    await setDoc(doc(db, 'departments', deptData.id), deptData, { merge: true });
    showToast(`Department "${deptData.name}" saved successfully.`);
  };

  // Archive Department (A department with active employees cannot be deleted, only archived)
  const handleArchiveDepartment = async (dept) => {
    const memberCount = employees.filter(e => (e.department || e.departmentId || '').toLowerCase() === dept.id.toLowerCase()).length;
    if (memberCount > 0 && dept.status !== 'archived') {
      if (!confirm(`"${dept.name}" has ${memberCount} assigned employees. It cannot be deleted, but it will be archived. Proceed?`)) {
        return;
      }
    }

    const nextStatus = dept.status === 'archived' ? 'active' : 'archived';
    await updateDoc(doc(db, 'departments', dept.id), { status: nextStatus });
    showToast(`Department "${dept.name}" ${nextStatus === 'archived' ? 'archived' : 'activated'}.`);
  };

  // Save / Update Designation in Firestore
  const handleSaveDesignation = async (desData) => {
    await setDoc(doc(db, 'designations', desData.id), desData, { merge: true });
    if (onDesignationUpdated) onDesignationUpdated(desData);
    showToast(`Designation "${desData.title}" saved successfully.`);
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
        const deptIds = new Set(allDepartments.map(d => d.id.toLowerCase()));

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
          if (existingEmails.has(email)) errors.push('Duplicate Email (Already in system)');

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
        alert('Failed to parse Excel file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Execute Bulk Import of Valid Rows via Cloud Function
  const handleExecuteBulkImport = async () => {
    const validRows = importRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert('No valid rows found to import.');
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans select-none">
      
      {/* Toast Alert */}
      {toast && (
        <div 
          className={`fixed top-4 right-4 z-50 p-3.5 rounded-2xl shadow-lg border text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-3 ${
            toast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Corporate Directory & Hierarchy</h1>
            <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {employees.length} Employees
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Departmental structures, verified corporate users, designations, and reporting lines.
          </p>
        </div>

        {/* Action Buttons: Add, Import (Hidden for unauthorized users) */}
        {isHR && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-semibold transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-500" />
              <span>Import Excel / CSV</span>
            </button>

            <button
              type="button"
              onClick={onOpenAddEmployee}
              className="flex items-center gap-2 px-4 py-2 bg-[#05331F] hover:bg-[#07472c] text-white rounded-2xl text-xs font-bold shadow-xs transition-all active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-300" />
              <span>Add Employee</span>
            </button>
          </div>
        )}
      </div>

      {/* One-Time Credentials Download Banner (After bulk import) */}
      {importedCredentialsSheet && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <h3 className="font-bold text-xs text-emerald-950">Bulk Import Complete</h3>
              <p className="text-xs text-emerald-800">
                Download the generated employee login credentials sheet now. Plain passwords cannot be retrieved later.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={downloadCredentialsSheet}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#05331F] text-white text-xs font-semibold hover:bg-[#07472c] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Credentials Sheet</span>
          </button>
        </div>
      )}

      {/* 4 Tabs: Directory / Hierarchy / Depts / Designations */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-1 no-scrollbar">
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
              type="button"
              onClick={() => setActiveOrgTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#05331F] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 rounded-full ${
                  isActive ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-200 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: EMPLOYEE DIRECTORY */}
      {activeOrgTab === 'directory' && (
        <div className="space-y-4">
          {/* Filters & Search Toolbar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, employee ID or designation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              {/* Department Filter */}
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#05331F] cursor-pointer"
              >
                <option value="all">All Departments</option>
                {allDepartments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#05331F] cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Clean Directory Grid (Single column on mobile, 2 on md, 3 on xl) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredEmployees.length === 0 ? (
              <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400 space-y-2">
                <Users className="w-10 h-10 mx-auto text-slate-300" />
                <p className="font-semibold text-slate-700 text-sm">No Matching Employees</p>
                <p className="text-xs">Adjust your search or department filter.</p>
              </div>
            ) : (
              filteredEmployees.map(emp => {
                const isActive = (emp.status || emp.employmentStatus) !== 'inactive';
                const isMe = (emp.id || emp.employeeId) === currentUserId;

                return (
                  <div
                    key={emp.id || emp.employeeId}
                    className={`bg-white rounded-2xl border transition p-4 shadow-xs flex flex-col justify-between space-y-3 relative ${
                      isMe ? 'border-emerald-400 bg-emerald-50/10' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 truncate min-w-0">
                        {/* Avatar initials */}
                        <div className="w-11 h-11 rounded-xl bg-[#05331F] text-emerald-300 font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                          {getInitials(emp.fullName || emp.name)}
                        </div>

                        <div className="truncate min-w-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <h3 className="font-bold text-xs text-slate-900 truncate">
                              {emp.fullName || emp.name}
                            </h3>
                            {isMe && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-semibold px-1 rounded">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 truncate font-medium">
                            {emp.designation || emp.role || 'Staff Member'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {emp.employeeId || 'EMP-ID'}
                          </div>
                        </div>
                      </div>

                      {/* Status Pill + HR Overflow Menu */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isActive 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>

                        {isHR && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveMenuEmployeeId(activeMenuEmployeeId === emp.id ? null : emp.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                              aria-label="Employee actions"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {/* Dropdown Menu */}
                            {activeMenuEmployeeId === emp.id && (
                              <div
                                ref={menuRef}
                                className="absolute right-0 top-7 z-30 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1 text-left text-xs animate-in fade-in zoom-in-95 duration-100"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuEmployeeId(null);
                                    setEditingEmployee(emp);
                                  }}
                                  className="w-full px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Edit Profile</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickResetPassword(emp)}
                                  className="w-full px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Reset Password</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleEmployeeStatus(emp)}
                                  className={`w-full px-3 py-1.5 flex items-center gap-2 cursor-pointer ${
                                    isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-700 hover:bg-emerald-50'
                                  }`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{isActive ? 'Deactivate' : 'Activate'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Department Chip + Email */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold truncate max-w-[130px]">
                        {emp.department || 'Operations'}
                      </span>
                      <span className="truncate max-w-[170px] text-slate-600 font-mono text-[10px]">
                        {emp.email}
                      </span>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: HIERARCHY TREE */}
      {activeOrgTab === 'hierarchy' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b pb-4 border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Corporate Hierarchy Tree</h2>
              <p className="text-xs text-slate-500">
                Built live from employee "Reports To" links. Changing a manager in Edit immediately updates this tree.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100 inline-block" />
              <span className="text-xs font-semibold text-slate-700">Your Position</span>
            </div>
          </div>

          {/* Indented Tree */}
          <div className="space-y-2">
            {employees
              .sort((a, b) => getRoleLevel(a.role) - getRoleLevel(b.role))
              .map(emp => {
                const lvl = getRoleLevel(emp.role || emp.designation);
                const isMe = (emp.id || emp.employeeId) === currentUserId;
                const indentPx = Math.max(0, (lvl - 1) * 16);

                return (
                  <div
                    key={emp.id || emp.employeeId}
                    style={{ marginLeft: `${indentPx}px` }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                      isMe 
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-xs' 
                        : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate mr-2">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        isMe ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'
                      }`}>
                        L{lvl}
                      </span>
                      <span className="truncate">{emp.fullName || emp.name}</span>
                      {isMe && (
                        <span className="text-[9px] bg-emerald-600 text-white px-1.5 rounded font-mono font-bold">
                          YOU
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] text-slate-500 font-medium">
                        {emp.designation || emp.role}
                      </span>
                      <span className="text-[9px] uppercase font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500">
                        {emp.department}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 3: DEPARTMENTS */}
      {activeOrgTab === 'depts' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Corporate Divisions & Departments</h2>
              <p className="text-xs text-slate-500">
                Departments with assigned employees can only be archived, never accidentally deleted.
              </p>
            </div>
            {isHR && (
              <button
                type="button"
                onClick={() => setIsAddDepartmentOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#05331F] hover:bg-[#07472c] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Department</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allDepartments.map(dept => {
              const assignedMembers = employees.filter(e => 
                (e.department || e.departmentId || '').toLowerCase() === dept.id.toLowerCase()
              );
              const isArchived = dept.status === 'archived';

              return (
                <div
                  key={dept.id}
                  className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                    isArchived ? 'bg-slate-50/70 border-slate-200 opacity-70' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {dept.code || dept.id.toUpperCase()}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isArchived ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isArchived ? 'Archived' : 'Active'}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 mt-1">{dept.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{dept.description || 'Corporate division.'}</p>
                    </div>

                    {isHR && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingDepartment(dept)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="Edit Department"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchiveDepartment(dept)}
                          className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer"
                          title={isArchived ? 'Re-activate Department' : 'Archive Department'}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Head: <strong>{dept.headName || 'Unassigned'}</strong></span>
                    <span className="font-semibold text-slate-900">{assignedMembers.length} Staff</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: DESIGNATIONS */}
      {activeOrgTab === 'designations' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Corporate Designations</h2>
              <p className="text-xs text-slate-500">
                Designations placed in org tree to preserve task assignment hierarchy.
              </p>
            </div>
            {isHR && (
              <button
                type="button"
                onClick={() => setIsAddDesignationOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#05331F] hover:bg-[#07472c] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Designation</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {designations.map(des => {
              const assignedCount = employees.filter(e => 
                (e.designation || e.role || '').toLowerCase() === (des.title || des.name || '').toLowerCase()
              ).length;

              return (
                <div key={des.id} className="py-3 flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      L{des.level || 3}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">{des.title || des.name}</h4>
                      <p className="text-[11px] text-slate-500">
                        Dept: <span className="capitalize">{des.departmentId || des.department}</span> • Maps to: <strong>{des.roleMapping || des.role || des.title}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">{assignedCount} employees</span>
                    {isHR && (
                      <button
                        type="button"
                        onClick={() => setEditingDesignation(des)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                        title="Edit Designation"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          employees={employees}
          onDepartmentSaved={handleSaveDepartment}
        />
      )}

      {/* MODAL 4: Excel / CSV Bulk Import Preview */}
      {isImportModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto safe-pb safe-pt"
          onClick={() => { if (!isImporting) setIsImportModalOpen(false); }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col p-5 sm:p-6 shadow-2xl border border-slate-200 my-auto space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">Bulk Employee Import</h3>
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
                className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#05331F] file:text-white hover:file:bg-[#07472c] file:cursor-pointer"
              />
              <button
                type="button"
                onClick={downloadTemplate}
                className="text-xs text-[#05331F] font-semibold underline flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample Template</span>
              </button>
            </div>

            {/* Preview Table */}
            {importRows.length > 0 && (
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl overflow-x-auto text-xs">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Row</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Email</th>
                      <th className="py-2 px-3">Dept</th>
                      <th className="py-2 px-3">Designation</th>
                      <th className="py-2 px-3">Validation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importRows.map(r => (
                      <tr key={r.rowNum} className={r.isValid ? 'bg-white' : 'bg-rose-50/50'}>
                        <td className="py-2 px-3 font-mono">{r.rowNum}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{r.name}</td>
                        <td className="py-2 px-3 font-mono">{r.email}</td>
                        <td className="py-2 px-3 uppercase">{r.department}</td>
                        <td className="py-2 px-3">{r.designation}</td>
                        <td className="py-2 px-3">
                          {r.isValid ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Ready
                            </span>
                          ) : (
                            <span className="text-rose-600 font-semibold">{r.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">
                Ready to import: <strong>{importRows.filter(r => r.isValid).length}</strong> / {importRows.length} rows
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBulkImport}
                  disabled={isImporting || importRows.filter(r => r.isValid).length === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472c] text-white font-semibold shadow-md disabled:opacity-50 cursor-pointer"
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
