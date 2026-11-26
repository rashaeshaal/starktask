// src/EmployeeProfileDrawer.jsx
// Clean, modern Employee Profile drawer with intuitive tabs, clean metrics, and quick actions

import React, { useState, useEffect } from 'react';
import { 
  X, Edit, KeyRound, UserCheck, UserX, Send, 
  User, BarChart2, StickyNote, Mail, Phone, Calendar, 
  Building2, Award, CheckCircle2, Clock, AlertTriangle, ChevronRight
} from 'lucide-react';
import { useToast } from './ToastContext';

import StatCards from './components/profile/StatCards';
import WorkloadMeter from './components/profile/WorkloadMeter';
import Heatmap from './components/profile/Heatmap';
import PriorityMix from './components/profile/PriorityMix';
import ReasonsList from './components/profile/ReasonsList';
import ReworkCard from './components/profile/ReworkCard';
import ManagerNotes from './components/profile/ManagerNotes';
import DataQualityBanner from './components/profile/DataQualityBanner';

import { useEmployeeStats } from './useEmployeeStats';
import { can, PERMISSIONS, isCompanyHead } from './permissions';
import { formatName, formatDepartment } from './orgHelpers';
import { getRoleLevel } from './orgTree';

export default function EmployeeProfileDrawer({
  isOpen,
  onClose,
  employee,
  reportingManager,
  currentUser,
  isMe = false,
  isHR = false,
  onEdit,
  onResetPassword,
  onToggleStatus
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'performance' | 'notes'
  const [rangeDays, setRangeDays] = useState(30);
  const { showToast } = useToast();

  const handleRequestChange = () => {
    const details = prompt(`Request HR change for ${employee?.fullName || employee?.name} (e.g. Update manager or designation):`);
    if (!details || !details.trim()) return;
    showToast('Change request submitted to HR & Admin successfully.', 'success');
  };

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose && onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const employeeId = employee ? String(employee.id || employee.uid || employee.employeeId || '') : '';
  const { isLoading, stats } = useEmployeeStats(employeeId, rangeDays);

  if (!isOpen || !employee) return null;

  // RBAC permissions checks
  const myRole = currentUser?.role || '';
  const isTopLeader = isCompanyHead(currentUser) || isCompanyHead(myRole);
  const isHRAdmin = isHR || myRole === 'HR Manager' || myRole === 'Admin Manager' || myRole === 'HR & Admin Manager' || myRole === 'General Manager';
  const isDeptHead = myRole.includes('Head') || myRole.includes('Manager') || myRole === 'CSO';
  
  const canSeeManagerNotes = (isTopLeader || isHRAdmin || isDeptHead) && !isMe;
  const canEditEmployee = can(currentUser, PERMISSIONS.EMPLOYEE_EDIT, employee);
  const canResetPassword = can(currentUser, PERMISSIONS.EMPLOYEE_RESET_PASSWORD, employee);
  const canDeactivate = can(currentUser, PERMISSIONS.EMPLOYEE_DEACTIVATE, employee);

  const isActive = (employee.status || employee.employmentStatus) !== 'inactive';
  const displayName = formatName(employee.fullName || employee.name || 'Employee');
  const roleName = employee.designation || employee.role || 'Staff Member';
  const roleLevel = employee.level || getRoleLevel(roleName) || 6;
  const deptDisplay = formatDepartment(employee.department || employee.departmentId || 'Operations');
  const managerName = reportingManager ? formatName(reportingManager.fullName || reportingManager.name) : (employee.reportingManagerName ? formatName(employee.reportingManagerName) : 'Executive Leadership');
  const joinedDate = employee.joiningDate || employee.createdAt ? String(employee.joiningDate || employee.createdAt).slice(0, 10) : 'Standard Active';
  const email = employee.email || `${(employee.fullName || 'staff').toLowerCase().replace(/\s+/g, '.')}@starkdoors.com`;
  const phone = employee.phone || employee.mobile || employee.contactNumber || '+91 98460 00000';
  const empCode = employee.employeeId ? (String(employee.employeeId).startsWith('EMP-') ? employee.employeeId : `EMP-${employee.employeeId}`) : 'EMP-ID';

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'ST';

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-drawer-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer slide-over */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10">
        <div className="w-screen max-w-full sm:max-w-2xl md:max-w-3xl bg-slate-50 shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
          
          {/* Top Header / Profile Banner */}
          <div className="bg-white border-b border-slate-200 shrink-0">
            {/* Action Bar */}
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider" id="profile-drawer-title">
                  Employee Profile
                </span>
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  {empCode}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close profile drawer"
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Overview Card */}
            <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-[#05331F] text-emerald-300 font-bold text-xl flex items-center justify-center shadow-sm border-2 border-white ring-1 ring-slate-200">
                    {initials}
                  </div>
                  <span 
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                      isActive ? 'bg-emerald-500' : 'bg-red-500'
                    }`} 
                    title={isActive ? 'Active status' : 'Inactive status'}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                      {displayName}
                    </h2>
                    {isMe && (
                      <span className="text-[10px] bg-emerald-600 text-white font-semibold px-2 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                    <span className="font-semibold text-slate-900">{roleName}</span>
                    <span className="text-slate-300">•</span>
                    <span className="inline-flex items-center gap-1 text-slate-600">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {deptDisplay}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-100">
                      <Award className="w-3 h-3 text-emerald-700" />
                      Level {roleLevel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Contact & Info Pills */}
              <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5 text-xs text-slate-500">
                <a 
                  href={`mailto:${email}`} 
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-700 hover:underline"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono text-[11px]">{email}</span>
                </a>
                <span className="inline-flex items-center gap-1 text-slate-600">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reports to: <strong className="text-slate-800 font-semibold">{managerName}</strong></span>
                </span>
                <span className="inline-flex items-center gap-1 text-slate-400 text-[11px]">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Joined: {joinedDate}</span>
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="px-5 flex items-center gap-2 border-t border-slate-100 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'overview'
                    ? 'border-[#05331F] text-[#05331F]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Overview</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('performance')}
                className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'performance'
                    ? 'border-[#05331F] text-[#05331F]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Performance & Metrics</span>
              </button>

              {canSeeManagerNotes && (
                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeTab === 'notes'
                      ? 'border-[#05331F] text-[#05331F]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <StickyNote className="w-3.5 h-3.5" />
                  <span>Leadership Notes</span>
                </button>
              )}
            </div>
          </div>

          {/* Drawer Body - Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* Incomplete metadata warning */}
            <DataQualityBanner 
              employee={employee}
              onEdit={onEdit}
              canEdit={canEditEmployee}
            />

            {isLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map(k => (
                    <div key={k} className="h-24 bg-white rounded-2xl border border-slate-200 p-4 animate-pulse" />
                  ))}
                </div>
                <div className="h-28 bg-white rounded-2xl border border-slate-200 p-4 animate-pulse" />
              </div>
            ) : (
              <>
                {/* TAB 1: OVERVIEW */}
                {activeTab === 'overview' && (
                  <div className="space-y-5">
                    {/* Key Stats Summary (Clean 4-Card Grid) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
                        <span className="text-[11px] font-medium text-slate-500">Assigned Tasks</span>
                        <div className="text-lg sm:text-xl font-bold text-slate-900">{stats?.assigned || 0}</div>
                        <p className="text-[10px] text-slate-400">Past {rangeDays} days</p>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
                        <span className="text-[11px] font-medium text-emerald-700">Completed</span>
                        <div className="text-lg sm:text-xl font-bold text-emerald-700">{stats?.completed || 0}</div>
                        <p className="text-[10px] text-slate-400">
                          {stats?.assigned > 0 ? `${Math.round(((stats?.completed || 0) / stats?.assigned) * 100)}% execution` : 'No tasks'}
                        </p>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
                        <span className="text-[11px] font-medium text-slate-500">On-Time Rate</span>
                        <div className="text-lg sm:text-xl font-bold text-slate-900">{stats?.onTimePercent ?? 100}%</div>
                        <p className="text-[10px] text-emerald-600 font-semibold">Target ≥ 90%</p>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
                        <span className="text-[11px] font-medium text-slate-500">Sign-Off Streak</span>
                        <div className="text-lg sm:text-xl font-bold text-amber-600">{stats?.signOffStreak || 0}d</div>
                        <p className="text-[10px] text-slate-400">Consecutive days</p>
                      </div>
                    </div>

                    {/* Live Workload Capacity */}
                    <WorkloadMeter 
                      openCount={stats?.openCount || 0}
                      defaultThreshold={8}
                    />

                    {/* Employee Organizational Profile Details */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Employee Information & Department Assignment
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                          <span className="text-slate-400 font-medium">Department</span>
                          <p className="font-bold text-slate-900">{deptDisplay}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                          <span className="text-slate-400 font-medium">Designation / Role</span>
                          <p className="font-bold text-slate-900">{roleName}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                          <span className="text-slate-400 font-medium">Direct Manager</span>
                          <p className="font-bold text-slate-900">{managerName}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                          <span className="text-slate-400 font-medium">Official Contact</span>
                          <p className="font-mono text-slate-900">{phone}</p>
                        </div>
                      </div>
                    </div>

                    {/* 14-Day Activity Heatmap */}
                    <Heatmap 
                      heatmapDays={stats?.heatmapDays || []}
                      trendDirection={stats?.trendDirection || 'stable'}
                      last14Completed={stats?.last14Completed || 0}
                      prev14Completed={stats?.prev14Completed || 0}
                    />
                  </div>
                )}

                {/* TAB 2: PERFORMANCE & METRICS */}
                {activeTab === 'performance' && (
                  <div className="space-y-5">
                    <StatCards 
                      stats={stats}
                      rangeDays={rangeDays}
                      onRangeChange={setRangeDays}
                    />

                    <PriorityMix 
                      priorityMix={stats?.priorityMix}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <ReasonsList 
                        reasons={stats?.incompleteReasons || []}
                      />
                      <ReworkCard 
                        reworkCount={stats?.reworkCount || 0}
                        reworkRate={stats?.reworkRate || 0}
                        assigned={stats?.assigned || 0}
                      />
                    </div>
                  </div>
                )}

                {/* TAB 3: LEADERSHIP NOTES */}
                {activeTab === 'notes' && canSeeManagerNotes && (
                  <div className="space-y-5">
                    <ManagerNotes 
                      employeeId={employeeId}
                      currentUser={currentUser}
                      canManageNotes={canSeeManagerNotes}
                    />
                  </div>
                )}
              </>
            )}

          </div>

          {/* Action Footer */}
          {(canEditEmployee || canResetPassword || canDeactivate || !canEditEmployee) && (
            <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
             

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {!canEditEmployee && !isMe && (
                  <button
                    type="button"
                    onClick={handleRequestChange}
                    className="flex-1 sm:flex-none h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-slate-500" />
                    <span>Request Change</span>
                  </button>
                )}

                {canEditEmployee && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose && onClose();
                      onEdit && onEdit(employee);
                    }}
                    className="flex-1 sm:flex-none h-10 px-4 rounded-xl bg-[#05331F] hover:bg-[#07472B] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Edit className="w-4 h-4 text-emerald-300" />
                    <span>Edit Profile</span>
                  </button>
                )}

                {canResetPassword && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose && onClose();
                      onResetPassword && onResetPassword(employee);
                    }}
                    className="h-10 px-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    title="Generate Password Reset"
                    aria-label="Generate Password Reset"
                  >
                    <KeyRound className="w-4 h-4 text-slate-500" />
                    <span className="hidden md:inline">Reset Password</span>
                  </button>
                )}

                {canDeactivate && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose && onClose();
                      onToggleStatus && onToggleStatus(employee);
                    }}
                    className={`h-10 px-3.5 rounded-xl border text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer ${
                      isActive 
                        ? 'border-amber-200 text-amber-700 hover:bg-amber-50' 
                        : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                    }`}
                    title={isActive ? 'Deactivate Employee' : 'Activate Employee'}
                    aria-label={isActive ? 'Deactivate Employee' : 'Activate Employee'}
                  >
                    {isActive ? (
                      <UserX className="w-4 h-4 text-amber-600" />
                    ) : (
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                    )}
                    <span className="hidden md:inline">{isActive ? 'Deactivate' : 'Activate'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
