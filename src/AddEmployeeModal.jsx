import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, UserPlus, Eye, EyeOff, Sparkles, Check, Copy, 
  AlertCircle, Loader2, Building2, Briefcase, Shield, 
  Calendar, Phone, Mail, UserCheck
} from 'lucide-react';
import { apiCreateEmployee } from './firebase';
import { COMPANY_DEPARTMENTS, ORG_TREE, getParentRole, getRoleLevel } from './orgTree';
import { canManageEmployees } from './permissions';

/**
 * Generate a strong, secure password
 */
function generateSecurePassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*';
  
  let pwd = '';
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += digits[Math.floor(Math.random() * digits.length)];
  pwd += special[Math.floor(Math.random() * special.length)];
  
  const allChars = upper + lower + digits + special;
  for (let i = 4; i < 12; i++) {
    pwd += allChars[Math.floor(Math.random() * allChars.length)];
  }
  return pwd.split('').sort(() => 0.5 - Math.random()).join('');
}

/**
 * Password strength evaluator
 */
function getPasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: 'None', color: 'bg-slate-200' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 2) return { score, label: 'Weak', color: 'bg-rose-500' };
  if (score <= 4) return { score, label: 'Good', color: 'bg-amber-500' };
  return { score, label: 'Strong', color: 'bg-[#10B981]' };
}

export default function AddEmployeeModal({ 
  isOpen, 
  onClose, 
  departments = [], 
  designations = [], 
  existingUsers = [],
  currentUser,
  onEmployeeAdded,
  onOpenInlineAddDept,
  onOpenInlineAddDesignation
}) {
  const isAuthorized = canManageEmployees(currentUser);

  // Form Fields
  const [employeeId, setEmployeeId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [role, setRole] = useState('');
  const [reportsTo, setReportsTo] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('active');

  // Password fields
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(true);

  // States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState(null); // { email, password, name }
  const [copied, setCopied] = useState(false);

  // Auto-generate next Employee ID when opening
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setCreatedCredentials(null);
      setCopied(false);

      // Auto-generate employee ID e.g. EMP-1074 or numerical
      const existingIds = existingUsers
        .map(u => {
          const num = parseInt(String(u.employeeId || '').replace(/\D/g, ''), 10);
          return isNaN(num) ? 0 : num;
        })
        .filter(n => n > 0);

      const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 100;
      setEmployeeId(`EMP-${maxId + 1}`);

      const defaultDept = departments[0]?.id || 'operations';
      setDepartment(defaultDept);
      setFullName('');
      setEmail('');
      setPhone('');
      const generated = generateSecurePassword();
      setPassword(generated);
      setMustChangePassword(true);
    }
  }, [isOpen, existingUsers, departments]);

  // Handle department change: filter designations and adjust role
  useEffect(() => {
    if (department) {
      const deptDesignations = designations.filter(d => 
        (d.departmentId || d.department || '').toLowerCase() === department.toLowerCase()
      );
      if (deptDesignations.length > 0) {
        setDesignation(deptDesignations[0].title);
        setRole(deptDesignations[0].title);
      } else {
        // Fallback from ORG_TREE
        const matchingTreeRoles = Object.entries(ORG_TREE)
          .filter(([, conf]) => conf.department === department.toLowerCase())
          .map(([r]) => r);
        const initialRole = matchingTreeRoles[0] || 'Staff';
        setDesignation(initialRole);
        setRole(initialRole);
      }
    }
  }, [department, designations]);

  // When designation changes, update derived role and find eligible reportsTo
  useEffect(() => {
    if (designation) {
      setRole(designation);

      // Find natural reportsTo from org tree
      const pRole = getParentRole(designation);
      if (pRole) {
        const potentialBoss = existingUsers.find(u => 
          (u.role === pRole || u.designation === pRole) &&
          (u.department === department || pRole === 'Director Operations' || pRole === 'General Manager' || pRole === 'Executive Director')
        );
        if (potentialBoss) {
          setReportsTo(potentialBoss.id || potentialBoss.employeeId);
        }
      }
    }
  }, [designation, department, existingUsers]);

  // Eligible "Reports To" list (roles strictly above current designation level in org tree)
  const eligibleManagers = useMemo(() => {
    const curLevel = getRoleLevel(role || designation);
    // Executive Director needs no manager
    if (curLevel === 1) return [];

    return existingUsers
      .filter(u => {
        const uLevel = getRoleLevel(u.role || u.designation);
        // Boss must be higher in hierarchy (lower level number)
        return uLevel < curLevel;
      })
      .sort((a, b) => getRoleLevel(a.role) - getRoleLevel(b.role));
  }, [role, designation, existingUsers]);

  // Password strength
  const pwdStrength = getPasswordStrength(password);

  if (!isOpen) return null;

  // Handle Save Submission via Cloud Function
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!isAuthorized) {
      setErrorMessage('Access Denied: Only HR Manager and Leadership can add employees.');
      return;
    }
    if (!fullName.trim()) {
      setErrorMessage('Employee full name is mandatory.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('A valid unique corporate email is required.');
      return;
    }
    if (getRoleLevel(role) > 1 && !reportsTo) {
      setErrorMessage('Reports To is required for all positions below Executive Director.');
      return;
    }
    if (!password || password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    const payload = {
      employeeId: employeeId.trim(),
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      department: department,
      designation: designation,
      role: role.trim() || designation,
      reportsTo: reportsTo || null,
      joiningDate: joiningDate,
      status: status,
      password: password,
      mustChangePassword: Boolean(mustChangePassword)
    };

    try {
      // Call Admin SDK Cloud Function (prevents signing out HR user)
      const res = await apiCreateEmployee(payload);

      const createdUser = {
        id: res.data?.uid || `emp_${Date.now()}`,
        ...payload
      };

      if (onEmployeeAdded) {
        onEmployeeAdded(createdUser);
      }

      // Show one-time credentials panel
      setCreatedCredentials({
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        employeeId: employeeId.trim()
      });
    } catch (err) {
      console.error('Create employee error:', err);
      const msg = err.message || 'Failed to create employee account.';
      if (msg.includes('already-exists') || msg.includes('email-already-in-use')) {
        setErrorMessage('This work email is already assigned to an existing corporate user.');
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    if (!createdCredentials) return;
    const text = `STARK STEEL Corporate Credentials\nName: ${createdCredentials.name}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\nEmployee ID: ${createdCredentials.employeeId}\nPortal: http://localhost:5173`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end transition-opacity"
      onClick={() => { if (!loading) onClose(); }}
    >
      {/* Side Drawer (Full screen on mobile, w-[540px] on desktop) */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-xl h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 truncate mr-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold shrink-0 border border-emerald-200">
              <UserPlus className="w-5 h-5 text-[#05331F]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 truncate">Add Employee</h2>
              <p className="text-xs text-slate-500">Corporate Directory & Security Setup</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0 cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ONE-TIME CREDENTIALS PANEL (Shown on successful creation) */}
        {createdCredentials ? (
          <div className="p-6 overflow-y-auto flex-1 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-xs text-emerald-950">Employee Created Successfully</h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Account created via Firebase Admin SDK. Share these credentials with the employee. The plain password will not be shown again.
                  </p>
                </div>
              </div>

              {/* Credentials Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 font-mono text-xs">
                <div className="flex justify-between border-b pb-2 border-slate-200">
                  <span className="text-slate-500">Employee ID:</span>
                  <span className="font-bold text-slate-900">{createdCredentials.employeeId}</span>
                </div>
                <div className="flex justify-between border-b pb-2 border-slate-200">
                  <span className="text-slate-500">Work Email:</span>
                  <span className="font-bold text-slate-900 select-all">{createdCredentials.email}</span>
                </div>
                <div className="flex justify-between border-b pb-2 border-slate-200">
                  <span className="text-slate-500">Initial Password:</span>
                  <span className="font-bold text-[#05331F] select-all bg-emerald-100/80 px-2 py-0.5 rounded">
                    {createdCredentials.password}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 pt-1">
                  • User is marked for mandatory password change on first login.
                </div>
              </div>

              <button
                type="button"
                onClick={copyCredentials}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-xs shadow-xs transition cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Credentials Copied!' : 'Copy Login Credentials'}</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-[#05331F] text-white font-semibold text-xs hover:bg-[#07472c] transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
            
            {/* Inline Error */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Basic Info */}
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
                  placeholder="e.g. Rahul Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  placeholder="user@starkdoors.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 99000 00000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                />
              </div>
            </div>

            {/* Department + Inline Add */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Department *</label>
                {onOpenInlineAddDept && (
                  <button
                    type="button"
                    onClick={onOpenInlineAddDept}
                    className="text-[11px] text-[#05331F] font-bold hover:underline"
                  >
                    + Add new department
                  </button>
                )}
              </div>
              <select
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
              >
                {COMPANY_DEPARTMENTS.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Designation + Inline Add */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Designation *</label>
                {onOpenInlineAddDesignation && (
                  <button
                    type="button"
                    onClick={onOpenInlineAddDesignation}
                    className="text-[11px] text-[#05331F] font-bold hover:underline"
                  >
                    + Add new designation
                  </button>
                )}
              </div>
              <select
                required
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
              >
                {designations
                  .filter(d => (d.departmentId || d.department || '').toLowerCase() === department.toLowerCase())
                  .map(d => (
                    <option key={d.id || d.title} value={d.title}>
                      {d.title} (Level {d.level || getRoleLevel(d.title)})
                    </option>
                  ))}
                {/* Fallback to tree roles if designations list is empty */}
                {Object.entries(ORG_TREE)
                  .filter(([, conf]) => conf.department === department.toLowerCase())
                  .map(([r, conf]) => (
                    <option key={r} value={r}>
                      {r} (Level {conf.level})
                    </option>
                  ))}
              </select>
            </div>

            {/* Role / Access Level (Overridable) */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Role / Access Level (Derived from Designation)
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
              />
            </div>

            {/* Reports To (Filtered to employees above this level in org tree) */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Reports To * {getRoleLevel(role) === 1 && <span className="text-slate-400 font-normal">(Executive Director has no manager)</span>}
              </label>
              <select
                required={getRoleLevel(role) > 1}
                disabled={getRoleLevel(role) === 1}
                value={reportsTo}
                onChange={(e) => setReportsTo(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F] disabled:bg-slate-50"
              >
                <option value="">-- Select Reporting Manager --</option>
                {eligibleManagers.map(mgr => (
                  <option key={mgr.id || mgr.employeeId} value={mgr.id || mgr.employeeId}>
                    {mgr.fullName || mgr.name} — {mgr.role} (Level {getRoleLevel(mgr.role)})
                  </option>
                ))}
              </select>
            </div>

            {/* Joining Date & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Joining Date</label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Password Section */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-900 text-xs">Initial Password *</label>
                <button
                  type="button"
                  onClick={() => setPassword(generateSecurePassword())}
                  className="text-[11px] text-[#05331F] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>Generate secure password</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-3 pr-9 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-[#05331F]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength meter */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Strength: <strong>{pwdStrength.label}</strong></span>
                  <span>Min 8 characters</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${pwdStrength.color}`} 
                    style={{ width: `${(pwdStrength.score / 5) * 100}%` }}
                  />
                </div>
              </div>

              {/* Require Password Change on first login */}
              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={mustChangePassword}
                  onChange={(e) => setMustChangePassword(e.target.checked)}
                  className="rounded text-[#05331F] focus:ring-[#05331F]"
                />
                <span className="text-slate-700 text-xs font-medium">
                  Require password change on first login
                </span>
              </label>
            </div>

            {/* Sticky Submit Button */}
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
                    <span>Creating Login...</span>
                  </>
                ) : (
                  <span>Create Employee</span>
                )}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}
