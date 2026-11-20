// src/components/profile/ProfileHeader.jsx
// Section 1: Avatar, Title Case name, designation, level badge, department, reporting manager, joined date, status pill, email

import React from 'react';
import { Mail, Calendar, Building2, User, Award, ShieldCheck } from 'lucide-react';
import { formatName, formatDepartment } from '../../orgHelpers';
import { getRoleLevel } from '../../orgTree';

export default function ProfileHeader({ employee, reportingManager, isMe = false }) {
  if (!employee) return null;

  const displayName = formatName(employee.fullName || employee.name || 'Employee');
  const roleName = employee.designation || employee.role || 'Staff Member';
  const roleLevel = employee.level || getRoleLevel(roleName) || 6;
  const deptDisplay = formatDepartment(employee.department || employee.departmentId || 'Operations');
  const managerName = reportingManager ? formatName(reportingManager.fullName || reportingManager.name) : (employee.reportingManagerName ? formatName(employee.reportingManagerName) : 'Executive Leadership');
  const joinedDate = employee.joiningDate || employee.createdAt ? (String(employee.joiningDate || employee.createdAt).slice(0, 10)) : 'Standard Active';
  const isActive = (employee.status || employee.employmentStatus) !== 'inactive';
  const email = employee.email || `${(employee.fullName || 'staff').toLowerCase().replace(/\s+/g, '.')}@starkdoors.com`;

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'ST';

  return (
    <div className="bg-white border-b border-slate-200 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#05331F] text-emerald-300 font-bold text-xl sm:text-2xl flex items-center justify-center shadow-sm border-2 border-white ring-1 ring-slate-200">
            {initials}
          </div>
          <span 
            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
              isActive ? 'bg-emerald-500' : 'bg-red-500'
            }`} 
            title={isActive ? 'Active status' : 'Inactive status'}
          />
        </div>

        {/* Identity Details */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {displayName}
            </h1>
            {isMe && (
              <span className="text-[11px] bg-emerald-600 text-white font-semibold px-2 py-0.5 rounded-full">
                You
              </span>
            )}
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-slate-600 flex-wrap">
            <span className="font-semibold text-slate-800">{roleName}</span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
              <Award className="w-3.5 h-3.5 text-emerald-700" />
              Level {roleLevel}
            </span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1 font-medium text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {deptDisplay}
            </span>
          </div>

          <div className="flex items-center gap-3 pt-1 text-xs text-slate-500 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Reports to: <strong className="text-slate-800 font-medium ml-1">{managerName}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Joined: <span className="text-slate-700 font-mono text-[11px] ml-1">{joinedDate}</span>
            </span>
            <span className="text-slate-300">•</span>
            <a 
              href={`mailto:${email}`}
              className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 hover:underline font-mono text-[11px]"
              aria-label={`Send email to ${email}`}
            >
              <Mail className="w-3.5 h-3.5" />
              {email}
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

