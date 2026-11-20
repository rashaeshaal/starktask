import React, { useState, useRef, useEffect } from 'react';
import { 
  MoreHorizontal, Edit, KeyRound, Trash2, Mail, Check, Copy
} from 'lucide-react';
import { useToast } from './ToastContext';

// Color dots per department
const DEPT_DOT_COLORS = {
  management: 'bg-indigo-500',
  sales: 'bg-emerald-500',
  operations: 'bg-blue-500',
  warehouse: 'bg-amber-500',
  transportation: 'bg-cyan-500',
  service: 'bg-purple-500',
  inventory: 'bg-teal-500',
  finance: 'bg-emerald-600',
  hr_admin: 'bg-rose-500',
  marketing: 'bg-pink-500',
  quality_control: 'bg-orange-500'
};

export default function EmployeeCard({
  employee,
  isMe = false,
  isHR = false,
  onSelect,
  onEdit,
  onResetPassword,
  onToggleStatus
}) {
  const { showToast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  const isActive = (employee.status || employee.employmentStatus) !== 'inactive';
  const roleName = employee.designation || employee.role || 'Staff Member';
  const deptKey = (employee.department || employee.departmentId || 'operations').toLowerCase();
  const dotColor = DEPT_DOT_COLORS[deptKey] || 'bg-slate-400';

  // Format initials
  const getInitials = (name) => {
    if (!name) return 'ST';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Format employee ID: add EMP- prefix if bare number
  const formatEmpId = (raw) => {
    if (!raw) return 'EMP-000';
    const s = String(raw).trim();
    if (s.toUpperCase().startsWith('EMP-')) return s.toUpperCase();
    return `EMP-${s}`;
  };

  // Convert all caps to Title Case for pleasant readability
  const formatName = (str) => {
    if (!str) return 'Employee';
    // If string has mixed case already, keep as is
    if (/[a-z]/.test(str) && /[A-Z]/.test(str)) return str;
    return str
      .toLowerCase()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  // Outside click & ESC listener
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isMenuOpen]);

  const toggleMenu = (e) => {
    e.stopPropagation();
    if (!isMenuOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 150);
    }
    setIsMenuOpen(prev => !prev);
  };

  const handleCopyEmail = (e) => {
    e.stopPropagation();
    if (!employee.email) return;
    navigator.clipboard.writeText(employee.email);
    setCopied(true);
    showToast('Email copied to clipboard');
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      onClick={() => onSelect && onSelect(employee)}
      className="group bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all duration-150 flex flex-col justify-between cursor-pointer relative"
    >
      {/* ROW 1: Avatar | Name + Designation | Status Pill + 3-dots */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          
          {/* Avatar + Name block */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-xl bg-[#05331F] text-emerald-300 font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
              {getInitials(employee.fullName || employee.name)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 
                  className="font-semibold text-sm text-slate-900 truncate"
                  title={employee.fullName || employee.name}
                >
                  {formatName(employee.fullName || employee.name)}
                </h3>
                {isMe && (
                  <span className="text-[10px] bg-emerald-600 text-white font-medium px-1.5 py-0.2 rounded-full shrink-0">
                    You
                  </span>
                )}
              </div>

              <p 
                className="text-sm text-slate-600 truncate mt-0.5"
                title={roleName}
              >
                {roleName}
              </p>
            </div>
          </div>

          {/* Right: Fixed-size Status Pill + Menu Button */}
          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 whitespace-nowrap ${
              isActive 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span>{isActive ? 'Active' : 'Inactive'}</span>
            </span>

            {isHR && (
              <div className="relative">
                <button
                  ref={btnRef}
                  type="button"
                  onClick={toggleMenu}
                  aria-label="Employee options"
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/40 outline-none"
                >
                  <MoreHorizontal className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </button>

                {/* Popover Menu */}
                {isMenuOpen && (
                  <div
                    ref={menuRef}
                    className={`absolute right-0 z-30 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 text-left text-xs animate-in fade-in zoom-in-95 duration-100 ${
                      openUpward ? 'bottom-9' : 'top-9'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        onEdit && onEdit(employee);
                      }}
                      className="w-full px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-medium transition-colors"
                    >
                      <Edit className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                      <span>Edit Profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        onResetPassword && onResetPassword(employee);
                      }}
                      className="w-full px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-medium transition-colors"
                    >
                      <KeyRound className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                      <span>Reset Password</span>
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        onToggleStatus && onToggleStatus(employee);
                      }}
                      className={`w-full px-3 py-2 flex items-center gap-2 font-medium transition-colors ${
                        isActive ? 'text-red-600 hover:bg-red-50' : 'text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                      <span>{isActive ? 'Deactivate' : 'Activate'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ROW 2: Employee ID */}
        <div className="pt-0.5">
          <span className="font-mono text-xs text-slate-500 font-medium">
            {formatEmpId(employee.employeeId)}
          </span>
        </div>
      </div>

      {/* FOOTER: Department Chip (left) + Email Click-to-copy (right) */}
      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
        
        {/* Department chip with color-coded dot */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold uppercase tracking-wider shrink-0 max-w-[140px] truncate">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
          <span className="truncate">{employee.department || 'Operations'}</span>
        </div>

        {/* Official Email */}
        <button
          type="button"
          onClick={handleCopyEmail}
          title={copied ? "Copied!" : `Click to copy: ${employee.email}`}
          className="flex items-center gap-1.5 text-slate-500 hover:text-emerald-700 text-[11px] font-mono truncate max-w-[160px] sm:max-w-[180px] transition-colors group/mail"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2} />
          ) : (
            <Mail className="w-3.5 h-3.5 text-slate-400 group-hover/mail:text-emerald-600 shrink-0" strokeWidth={1.75} />
          )}
          <span className="truncate">{employee.email}</span>
        </button>

      </div>
    </div>
  );
}
