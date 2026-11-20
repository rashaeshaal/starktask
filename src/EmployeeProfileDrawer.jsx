import React from 'react';
import { 
  X, Mail, Phone, Calendar, Building2, Briefcase, 
  Shield, UserCheck, KeyRound, Edit, Trash2, ChevronRight, User
} from 'lucide-react';
import { getRoleLevel } from './orgTree';

export default function EmployeeProfileDrawer({
  isOpen,
  onClose,
  employee,
  reportingManager,
  isMe = false,
  isHR = false,
  onEdit,
  onResetPassword,
  onToggleStatus
}) {
  if (!isOpen || !employee) return null;

  const isActive = (employee.status || employee.employmentStatus) !== 'inactive';
  const roleName = employee.designation || employee.role || 'Staff Member';
  const roleLvl = getRoleLevel(roleName);

  // Format initials
  const getInitials = (name) => {
    if (!name) return 'ST';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200 border-l border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div>
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Employee Profile
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </div>

          {/* Profile Identity Hero */}
          <div className="p-6 bg-slate-50/70 border-b border-slate-100 flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#05331F] text-emerald-300 font-bold text-xl flex items-center justify-center shrink-0 shadow-sm border-2 border-white">
              {getInitials(employee.fullName || employee.name)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 capitalize">
                  {employee.fullName || employee.name}
                </h2>
                {isMe && (
                  <span className="text-[10px] bg-emerald-600 text-white font-semibold px-2 py-0.5 rounded-full">
                    You
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-600 font-medium mt-0.5">
                {roleName}
              </p>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="font-mono text-xs text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200 font-semibold">
                  {employee.employeeId ? (String(employee.employeeId).startsWith('EMP-') ? employee.employeeId : `EMP-${employee.employeeId}`) : 'EMP-ID'}
                </span>

                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  {isActive ? 'Active' : 'Inactive'}
                </span>

                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700">
                  Level {roleLvl}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata Breakdown */}
          <div className="p-6 space-y-5">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Organization Details
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
                    <span>Department</span>
                  </span>
                  <span className="font-semibold text-slate-900 uppercase font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                    {employee.department || 'Operations'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
                    <span>Reports To</span>
                  </span>
                  <span className="font-semibold text-slate-900 truncate max-w-[200px]" title={reportingManager?.fullName || employee.reportingManagerName || 'Top Leadership'}>
                    {reportingManager?.fullName || employee.reportingManagerName || 'Executive Director'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
                    <span>Joining Date</span>
                  </span>
                  <span className="font-semibold text-slate-800">
                    {employee.joiningDate || 'Standard Active'}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Contact & Communication
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
                    <span>Official Email</span>
                  </span>
                  <a 
                    href={`mailto:${employee.email}`}
                    className="font-semibold text-emerald-700 hover:underline truncate max-w-[210px] font-mono text-[11px]"
                    title={employee.email}
                  >
                    {employee.email}
                  </a>
                </div>

                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
                    <span>Contact Phone</span>
                  </span>
                  <span className="font-semibold text-slate-800 font-mono text-[11px]">
                    {employee.phone || '+91 Not Recorded'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions (HR & Leadership only) */}
        {isHR && (
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit && onEdit(employee);
              }}
              className="flex-1 h-10 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Edit className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
              <span>Edit Profile</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onResetPassword && onResetPassword(employee);
              }}
              className="h-10 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
              title="Reset Password"
            >
              <KeyRound className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onToggleStatus && onToggleStatus(employee);
              }}
              className={`h-10 px-3 rounded-xl border text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs ${
                isActive ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              }`}
              title={isActive ? 'Deactivate Employee' : 'Activate Employee'}
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
