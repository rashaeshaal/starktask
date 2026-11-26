import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, UserCheck, Trash2, KeyRound, Loader2, AlertCircle, 
  Building2, Briefcase, Phone, Mail, Calendar, Eye, EyeOff, Check
} from 'lucide-react';
import { apiResetEmployeePassword, apiSetEmployeeStatus } from './firebase';
import { updateFirestoreTask } from './firestoreService';
import { COMPANY_DEPARTMENTS, ORG_TREE, getRoleLevel, getParentRole } from './orgTree';
import { can, PERMISSIONS, isCompanyHead, COMPANY_HEAD_ROLES } from './permissions';
import { writeAuditLog } from './firestoreService';
import { useDepartments } from './useDepartments';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function EditEmployeeModal({ 
  isOpen, 
  onClose, 
  employee,
  departments = [], 
  designations = [], 
  existingUsers = [],
  currentUser,
  onEmployeeUpdated,
  onEmployeeDeleted
}) {
  const { departments: activeDepts } = useDepartments();
  const deptList = (activeDepts && activeDepts.length > 0) ? activeDepts : (departments.length > 0 ? departments : COMPANY_DEPARTMENTS);

  const isAuthorized = can(currentUser, PERMISSIONS.EMPLOYEE_EDIT, employee);

  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('active');
  const [reportsTo, setReportsTo] = useState('');
  const [canAssignTask, setCanAssignTask] = useState(false);

  // Password Reset Panel State
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (employee) {
      setFullName(employee.fullName || employee.name || '');
      setEmployeeId(employee.employeeId || '');
      setEmail(employee.email || '');
      setPhone(employee.phone || '');
      setDepartment(employee.department || employee.departmentId || 'operations');
      setDesignation(employee.designation || employee.role || '');
      setRole(employee.role || employee.designation || '');
      setStatus(employee.status || employee.employmentStatus || 'active');
      setReportsTo(employee.reportsTo || employee.reportingManagerId || '');
      setCanAssignTask(employee.canAssignTask === true || (employee.canAssignTask !== false && Boolean(getRoleLevel(employee.role || employee.designation) <= 5)));
      setIsResetPasswordOpen(false);
      setNewPassword('');
      setResetSuccessMessage('');
      setErrorMessage('');
    }
  }, [employee]);

  // Eligible "Reports To" list
  const eligibleManagers = useMemo(() => {
    const curLevel = getRoleLevel(role || designation);
    if (curLevel === 1) return [];

    return existingUsers
      .filter(u => {
        const uId = u.id || u.employeeId;
        const empId = employee?.id || employee?.employeeId;
        if (uId === empId) return false;
        const uLevel = getRoleLevel(u.role || u.designation);
        return uLevel < curLevel;
      })
      .sort((a, b) => getRoleLevel(a.role) - getRoleLevel(b.role));
  }, [role, designation, existingUsers, employee]);

  if (!isOpen || !employee) return null;

  // Handle Save Profile updates
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!isAuthorized) {
      setErrorMessage('Access Denied: Only HR Manager and Leadership can edit employees.');
      return;
    }

    // Check self role/level change restriction for all users
    const currentUserId = String(currentUser?.id || currentUser?.uid || currentUser?.employeeId || '');
    const targetUserId = String(employee?.id || employee?.uid || employee?.employeeId || '');
    const isSelf = currentUserId && targetUserId && currentUserId === targetUserId;
    const isRoleChanged = role.trim() !== (employee.role || employee.designation || '') || designation !== employee.designation;

    if (isSelf && isRoleChanged && !can(currentUser, PERMISSIONS.EMPLOYEE_EDIT, { ...employee, isRoleChange: true })) {
      setErrorMessage('Safety Rule: You cannot modify your own role, level, or designation.');
      return;
    }

    // Editing another company head requires confirmation and an audit log with a reason
    let editReason = 'Employee profile updated';
    const targetIsCompanyHead = isCompanyHead(employee);
    if (!isSelf && targetIsCompanyHead) {
      const reasonInput = prompt(`EDITING COMPANY HEAD (${employee.fullName || employee.name}): Please enter an operational justification/reason for the audit log:`);
      if (!reasonInput || !reasonInput.trim()) {
        setErrorMessage('Action cancelled: Reason is strictly required when modifying a company head account.');
        return;
      }
      editReason = reasonInput.trim();
    }

    setLoading(true);

    const updatedData = {
      fullName: fullName.trim(),
      name: fullName.trim(),
      employeeId: employeeId.trim(),
      phone: phone.trim(),
      department: department,
      departmentId: department,
      designation: designation,
      role: role.trim() || designation,
      reportsTo: reportsTo || null,
      reportingManagerId: reportsTo || null,
      canAssignTask: canAssignTask,
      status: status,
      employmentStatus: status
    };

    try {
      // 1. Update in Firestore
      await updateDoc(doc(db, 'users', employee.id), updatedData);

      // 2. If status changed, call setEmployeeStatus to also toggle Auth disabled flag
      if (status !== (employee.status || employee.employmentStatus)) {
        try {
          await apiSetEmployeeStatus({ uid: employee.id, status });
        } catch (authErr) {
          console.warn('Could not sync Auth disable status:', authErr);
        }
      }

      // Write audit log
      await writeAuditLog({
        actorId: currentUserId,
        action: 'EMPLOYEE_EDIT',
        targetId: employee.id,
        before: {
          fullName: employee.fullName || employee.name,
          designation: employee.designation,
          phone: employee.phone,
          reportsTo: employee.reportsTo
        },
        after: updatedData,
        reason: editReason
      });

      if (onEmployeeUpdated) {
        onEmployeeUpdated({ ...employee, ...updatedData });
      }

      onClose();
    } catch (err) {
      console.error('Update employee error:', err);
      setErrorMessage(err.message || 'Failed to update employee profile.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Password Reset via Cloud Function
  const handleResetPasswordSubmit = async () => {
    if (!newPassword || newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (!can(currentUser, PERMISSIONS.EMPLOYEE_RESET_PASSWORD, employee)) {
      setErrorMessage('Restriction: You cannot reset the password of this employee.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      await apiResetEmployeePassword({
        uid: employee.id,
        newPassword: newPassword,
        requirePasswordChange: true
      });

      // Write audit log
      await writeAuditLog({
        actorId: currentUser?.id || currentUser?.uid || 'system',
        action: 'EMPLOYEE_RESET_PASSWORD',
        targetId: employee.id,
        before: null,
        after: { passwordReset: true },
        reason: 'Password reset via edit employee modal'
      });

      setResetSuccessMessage('Password reset successfully. User must change it on login.');
      setNewPassword('');
    } catch (err) {
      console.error('Password reset error:', err);
      setErrorMessage(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end transition-opacity"
      onClick={() => { if (!loading) onClose(); }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-xl h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 truncate mr-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold shrink-0 border border-emerald-200">
              <UserCheck className="w-5 h-5 text-[#05331F]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 truncate">Edit Employee Profile</h2>
              <p className="text-xs text-slate-500 font-mono">{employee.email}</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {resetSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{resetSuccessMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Employee ID *</label>
              <input
                type="text"
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-[#05331F]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Work Email</label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full border border-slate-200 bg-slate-50 text-slate-500 rounded-xl px-3 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
              />
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Department *</label>
            <select
              required
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
            >
              {deptList.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Designation & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Designation *</label>
              <input
                type="text"
                required
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Role / Access Level</label>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
              />
            </div>
          </div>

          {/* Reports To */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Reports To {getRoleLevel(role) === 1 && <span className="text-slate-400 font-normal">(Executive Director has no manager)</span>}
            </label>
            <select
              disabled={getRoleLevel(role) === 1}
              value={reportsTo}
              onChange={(e) => setReportsTo(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F] disabled:bg-slate-50"
            >
              <option value="">-- Choose Reporting Manager --</option>
              {eligibleManagers.map(mgr => (
                <option key={mgr.id || mgr.employeeId} value={mgr.id || mgr.employeeId}>
                  {mgr.fullName || mgr.name} — {mgr.role} (Level {getRoleLevel(mgr.role)})
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Account Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
            >
              <option value="active">Active (Full Portal Access)</option>
              <option value="inactive">Inactive / Deactivated (Account Disabled)</option>
            </select>
          </div>

          {/* HR Task Assignment Permission Control */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900 text-xs">Task Delegation Authority</div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Allow this employee to assign tasks to downline team members
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={canAssignTask} 
                onChange={(e) => setCanAssignTask(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#05331F]"></div>
            </label>
          </div>

          {/* Password Reset Section */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-slate-600" />
                <span className="font-bold text-slate-900 text-xs">Reset Employee Password</span>
              </div>
              <button
                type="button"
                onClick={() => setIsResetPasswordOpen(p => !p)}
                className="text-xs text-[#05331F] font-bold hover:underline"
              >
                {isResetPasswordOpen ? 'Cancel' : 'Change Password'}
              </button>
            </div>

            {isResetPasswordOpen && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter new 8+ char password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-3 pr-9 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-[#05331F]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(p => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleResetPasswordSubmit}
                    disabled={loading || !newPassword}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-xs shadow-xs transition disabled:opacity-50"
                  >
                    Confirm Reset
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472c] text-white font-semibold shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Profile</span>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
