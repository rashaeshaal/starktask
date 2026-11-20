// src/EmployeeCard.jsx
// Equal-height employee card with Title Case names, humanized departments, and actions

import React, { useState, useRef, useEffect } from 'react';
import { 
  MoreHorizontal, Edit, KeyRound, Trash2, Mail, Check, Copy
} from 'lucide-react';
import { useToast } from './ToastContext';
import { formatName, formatEmpId, formatDepartment, DEPT_DOT_COLORS, getInitials } from './orgHelpers';
import { can, PERMISSIONS } from './permissions';

export default function EmployeeCard({
  employee,
  isMe = false,
  isHR = false,
  currentUser = null,
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
  const displayName = formatName(employee.fullName || employee.name);
  const empIdFormatted = formatEmpId(employee.employeeId);
  const deptKey = (employee.department || employee.departmentId || 'operations').toLowerCase();
  const deptDisplay = formatDepartment(employee.department || employee.departmentId);
  const dotColor = DEPT_DOT_COLORS[deptKey] || 'bg-slate-400';

  // Check if role name is redundant (identical to display name)
  const isRedundantRole = roleName.trim().toLowerCase() === displayName.trim().toLowerCase();

  const canEdit = currentUser ? can(currentUser, PERMISSIONS.EMPLOYEE_EDIT, employee) : isHR;
  const canReset = currentUser ? can(currentUser, PERMISSIONS.EMPLOYEE_RESET_PASSWORD, employee) : isHR;
  const canToggle = currentUser 
    ? (isActive ? can(currentUser, PERMISSIONS.EMPLOYEE_DEACTIVATE, employee) : can(currentUser, PERMISSIONS.EMPLOYEE_ACTIVATE, employee))
    : isHR;

  const showActionsMenu = canEdit || canReset || canToggle;

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
    if (employee.email) {
      navigator.clipboard.writeText(employee.email);
      setCopied(true);
      showToast({ type: 'success', message: 'Email copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      onClick={() => onSelect && onSelect(employee)}
      className="group relative bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all duration-150 flex flex-col justify-between cursor-pointer h-full"
    >
      <div className="space-y-3">
        {/* Row 1: Avatar, Name & Designation, Status pill, 3-dots */}
        <div className="flex items-start justify-between gap-2">
          
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {employee.photoUrl ? (
                <img
                  src={employee.photoUrl}
                  alt={displayName}
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[#05331F] text-emerald-200 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {getInitials(displayName)}
                </div>
              )}
              {isMe && (
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-600 border-2 border-white rounded-full" title="You" />
              )}
            </div>

            {/* Name & Designation */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-sm text-slate-900 truncate group-hover:text-emerald-900 transition-colors">
                  {displayName}
                </h3>
              </div>

              {!isRedundantRole && (
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {roleName}
                </p>
              )}
            </div>
          </div>

          {/* Status pill & 3-dots menu */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              isActive 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span>{isActive ? 'Active' : 'Inactive'}</span>
            </span>

            {showActionsMenu && (
              <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
                <button
                  ref={btnRef}
                  type="button"
                  onClick={toggleMenu}
                  aria-label="Actions menu"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {isMenuOpen && (
                  <div className={`absolute right-0 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100 ${
                    openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
                  }`}>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => { setIsMenuOpen(false); onEdit && onEdit(employee); }}
                        className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5 text-slate-400" />
                        <span>Edit Details</span>
                      </button>
                    )}
                    {canReset && (
                      <button
                        type="button"
                        onClick={() => { setIsMenuOpen(false); onResetPassword && onResetPassword(employee); }}
                        className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                        <span>Reset Password</span>
                      </button>
                    )}
                    {canToggle && (
                      <>
                        <div className="h-px bg-slate-100 my-1" />
                        <button
                          type="button"
                          onClick={() => { setIsMenuOpen(false); onToggleStatus && onToggleStatus(employee); }}
                          className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 cursor-pointer ${
                            isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isActive ? 'Deactivate' : 'Activate'} Employee</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: EMP-ID */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {empIdFormatted}
          </span>
        </div>
      </div>

      {/* Footer: Department chip & Email */}
      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
        {/* Department chip with colored dot */}
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 text-slate-600 text-[11px] font-medium border border-slate-100 truncate">
          <span className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0`} />
          <span className="truncate">{deptDisplay}</span>
        </div>

        {/* Email with copy button */}
        {employee.email && (
          <div 
            onClick={handleCopyEmail}
            title={`${employee.email} (Click to copy)`}
            className="group/mail flex items-center gap-1 text-slate-400 hover:text-emerald-700 transition-colors cursor-pointer max-w-[50%]"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            ) : (
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            <span className="font-mono text-[11px] truncate">{employee.email}</span>
          </div>
        )}
      </div>

    </div>
  );
}
