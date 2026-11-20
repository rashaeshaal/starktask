import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, UserPlus, Eye, EyeOff, Sparkles, Check, Copy, 
  AlertCircle, Loader2, Building2, Briefcase, Shield, 
  Calendar, Phone, Mail, UserCheck, RefreshCw, KeyRound
} from 'lucide-react';
import { apiCreateEmployee } from './firebase';
import { COMPANY_DEPARTMENTS, ORG_TREE, getParentRole, getRoleLevel } from './orgTree';
import { canManageEmployees } from './permissions';
import { ENTERPRISE_EMPLOYEE_DIRECTORY } from './employeeDirectory';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

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
  return { score, label: 'Strong', color: 'bg-emerald-600' };
}

/**
 * Calculate the next strictly unused Employee ID dynamically across all datasets
 */
export function calculateNextEmployeeId(employeesList = [], directoryList = []) {
  const usedNumbers = new Set();

  const scan = (item) => {
    if (!item) return;
    const candidates = [item.employeeId, item.id, item.code];
    candidates.forEach(cand => {
      if (!cand) return;
      const str = String(cand).trim();
      // Match number sequence
      const numMatch = str.match(/\d+/);
      if (numMatch) {
        const num = parseInt(numMatch[0], 10);
        if (!isNaN(num) && num > 0 && num < 10000) {
          usedNumbers.add(num);
        }
      }
    });
  };

  employeesList.forEach(scan);
  directoryList.forEach(scan);

  // If no employees, start at 100
  if (usedNumbers.size === 0) return 'EMP-100';

  // Find lowest integer >= 100 that is not used
  let nextNum = 100;
  while (usedNumbers.has(nextNum)) {
    nextNum++;
  }

  return `EMP-${nextNum}`;
}

export default function AddEmployeeModal({ 
  isOpen, 
  onClose, 
  departments = [], 
  designations = [], 
  employees = [],
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
  const [isGeneratingId, setIsGeneratingId] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  // Merge full employees roster
  const allEmployeesRoster = useMemo(() => {
    const map = new Map();
    ENTERPRISE_EMPLOYEE_DIRECTORY.forEach(e => {
      const key = String(e.id || e.employeeId || e.email);
      map.set(key, e);
    });
    (employees || []).forEach(e => {
      const key = String(e.id || e.employeeId || e.email);
      map.set(key, { ...map.get(key), ...e });
    });
    return Array.from(map.values());
  }, [employees]);

  // Recalculate dynamic next ID
  const refreshNextId = async () => {
    setIsGeneratingId(true);
    try {
      // Check live Firestore users collection as well to ensure total global uniqueness
      const snap = await getDocs(collection(db, 'users'));
      const liveUsers = [];
      snap.forEach(d => liveUsers.push({ id: d.id, ...d.data() }));

      const nextId = calculateNextEmployeeId(
        [...allEmployeesRoster, ...liveUsers],
        ENTERPRISE_EMPLOYEE_DIRECTORY
      );
      setEmployeeId(nextId);
    } catch {
      // Fallback to local roster
      const nextId = calculateNextEmployeeId(allEmployeesRoster, ENTERPRISE_EMPLOYEE_DIRECTORY);
      setEmployeeId(nextId);
    } finally {
      setIsGeneratingId(false);
    }
  };

  // Auto-generate next Employee ID and dynamic defaults when opening modal
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setCreatedCredentials(null);
      setCopied(false);

      refreshNextId();

      const defaultDept = departments[0]?.id || 'sales';
      setDepartment(defaultDept);
      setFullName('');
      setEmail('');
      setPhone('');
      const generated = generateSecurePassword();
      setPassword(generated);
      setShowPassword(false);
      setMustChangePassword(true);
    }
  }, [isOpen, departments]);

  // Handle department change: dynamically filter designations and adjust role
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

  // When designation changes, dynamically update derived role and find eligible reportsTo
  useEffect(() => {
    if (designation) {
      setRole(designation);

      // Find natural reportsTo from org tree
      const pRole = getParentRole(designation);
      if (pRole) {
        const potentialBoss = allEmployeesRoster.find(u => 
          (u.role === pRole || u.designation === pRole) &&
          (u.department === department || pRole === 'Director Operations' || pRole === 'General Manager' || pRole === 'Executive Director')
        );
        if (potentialBoss) {
          setReportsTo(potentialBoss.id || potentialBoss.employeeId);
        } else {
          // Fallback to any boss of that parent role
          const anyBoss = allEmployeesRoster.find(u => (u.role === pRole || u.designation === pRole));
          if (anyBoss) {
            setReportsTo(anyBoss.id || anyBoss.employeeId);
          }
        }
      }
    }
  }, [designation, department, allEmployeesRoster]);

  // Dynamic email generator from Name
  const handleNameChange = (val) => {
    setFullName(val);
    if (!email || email.endsWith('@starkdoors.com')) {
      const clean = val.trim().toLowerCase().replace(/[^a-z0-9]/g, '.');
      if (clean) {
        setEmail(`${clean}@starkdoors.com`);
      }
    }
  };

  // Eligible "Reports To" list: strictly higher hierarchy level (lower level number)
  const eligibleManagers = useMemo(() => {
    const curLevel = getRoleLevel(role || designation);
    if (curLevel === 1) return [];

    return allEmployeesRoster
      .filter(u => {
        const uLevel = getRoleLevel(u.role || u.designation);
        return uLevel < curLevel;
      })
      .sort((a, b) => getRoleLevel(a.role || a.designation) - getRoleLevel(b.role || b.designation));
  }, [role, designation, allEmployeesRoster]);

  // Password strength
  const pwdStrength = getPasswordStrength(password);

  if (!isOpen) return null;

  // Handle Save Submission
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

    // Check duplicate employee ID locally
    const existingEmpIdMatch = allEmployeesRoster.some(u => 
      String(u.employeeId || '').toLowerCase() === employeeId.trim().toLowerCase()
    );
    if (existingEmpIdMatch) {
      setErrorMessage(`Employee ID ${employeeId.trim()} is already assigned. Please click refresh to get the next unused ID.`);
      return;
    }

    setLoading(true);

    const payload = {
      employeeId: employeeId.trim(),
      fullName: fullName.trim(),
      name: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      department: department,
      designation: designation,
      role: role.trim() || designation,
      reportsTo: reportsTo || null,
      reportingManagerId: reportsTo || null,
      reportingManagerName: allEmployeesRoster.find(u => (u.id || u.employeeId) === reportsTo)?.fullName || null,
      joiningDate: joiningDate,
      status: status,
      employmentStatus: status,
      password: password,
      mustChangePassword: Boolean(mustChangePassword)
    };

    try {
      const res = await apiCreateEmployee(payload);

      const createdUser = {
        id: res.data?.uid || `emp_${Date.now()}`,
        ...payload
      };

      if (onEmployeeAdded) {
        onEmployeeAdded(createdUser);
      }

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
    const text = `STARK STEEL DOORS - Employee Portal Login Credentials\n\nEmployee ID: ${createdCredentials.employeeId}\nName: ${createdCredentials.name}\nEmail: ${createdCredentials.email}\nInitial Password: ${createdCredentials.password}\nPortal: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold shrink-0 border border-emerald-200">
              <UserPlus className="w-5 h-5 text-emerald-700" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add New Employee</h2>
              <p className="text-xs text-slate-500">
                Dynamic next Employee ID, hierarchy mapping, and secure portal access.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. SUCCESS CREDENTIALS PANEL */}
        {createdCredentials ? (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-700 shrink-0" />
                <h3 className="font-bold text-sm text-emerald-950">Employee Account Created Successfully</h3>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Save or copy these one-time login credentials now. The generated password will not be shown again.
              </p>

              <div className="p-4 bg-white border border-emerald-200 rounded-xl space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Employee ID:</span>
                  <span className="font-bold text-slate-900">{createdCredentials.employeeId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Full Name:</span>
                  <span className="font-bold text-slate-900 font-sans">{createdCredentials.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Work Email:</span>
                  <span className="font-bold text-slate-900 select-all">{createdCredentials.email}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                  <span className="text-slate-500 font-sans">Initial Password:</span>
                  <span className="font-bold text-[#05331F] select-all bg-emerald-100 px-2 py-0.5 rounded">
                    {createdCredentials.password}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={copyCredentials}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-xs transition shadow-xs cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Credentials Copied to Clipboard</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Login Credentials</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-[#05331F] text-white font-semibold text-xs hover:bg-[#07472c] transition"
              >
                Done & Close
              </button>
            </div>
          </div>
        ) : (
          /* 2. EMPLOYEE CREATION FORM */
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Inline Error */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Dynamic Employee ID & Full Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 text-xs">
                    Employee ID (Next Unused) *
                  </label>
                  <button
                    type="button"
                    onClick={refreshNextId}
                    disabled={isGeneratingId}
                    title="Find next available unused ID"
                    className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isGeneratingId ? 'animate-spin' : ''}`} />
                    <span>Auto-Next</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-[#05331F] bg-slate-50 focus:bg-white"
                  />
                  {isGeneratingId && (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 text-xs mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={fullName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                />
              </div>
            </div>

            {/* Work Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 text-xs mb-1">Work Email *</label>
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
                <label className="block font-semibold text-slate-700 text-xs mb-1">Phone Number</label>
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
                <label className="font-semibold text-slate-700 text-xs">Department *</label>
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
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F] bg-white cursor-pointer"
              >
                {COMPANY_DEPARTMENTS.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Designation + Derived Level */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700 text-xs">Designation *</label>
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
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F] bg-white cursor-pointer"
              >
                {designations
                  .filter(d => (d.departmentId || d.department || '').toLowerCase() === department.toLowerCase())
                  .map(d => (
                    <option key={d.id || d.title} value={d.title}>
                      {d.title} (Level {d.level || getRoleLevel(d.title)})
                    </option>
                  ))}
                {Object.entries(ORG_TREE)
                  .filter(([, conf]) => conf.department === department.toLowerCase())
                  .map(([r, conf]) => (
                    <option key={r} value={r}>
                      {r} (Level {conf.level})
                    </option>
                  ))}
              </select>
            </div>

            {/* Dynamic Reports To */}
            <div>
              <label className="block font-semibold text-slate-700 text-xs mb-1">
                Reports To * {getRoleLevel(role) === 1 && <span className="text-slate-400 font-normal">(Executive Director has no manager)</span>}
              </label>
              <select
                required={getRoleLevel(role) > 1}
                disabled={getRoleLevel(role) === 1}
                value={reportsTo}
                onChange={(e) => setReportsTo(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F] disabled:bg-slate-100 bg-white cursor-pointer"
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
                <label className="block font-semibold text-slate-700 text-xs mb-1">Joining Date</label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 text-xs mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F] bg-white cursor-pointer"
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
                  className="text-[11px] text-emerald-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
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
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#05331F] hover:bg-[#07472c] text-white font-semibold text-xs shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
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
