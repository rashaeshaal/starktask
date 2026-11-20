// src/EmployeeProfileDrawer.jsx
// Complete Employee Profile drawer / page with 10 structured sections, RBAC, skeleton loaders, and responsive layout

import React, { useState, useEffect } from 'react';
import { 
  X, Edit, KeyRound, UserCheck, UserX, Shield, 
  ExternalLink, Loader2 
} from 'lucide-react';

import ProfileHeader from './components/profile/ProfileHeader';
import StatCards from './components/profile/StatCards';
import WorkloadMeter from './components/profile/WorkloadMeter';
import Heatmap from './components/profile/Heatmap';
import PriorityMix from './components/profile/PriorityMix';
import ReasonsList from './components/profile/ReasonsList';
import ReworkCard from './components/profile/ReworkCard';
import Timeline from './components/profile/Timeline';
import ManagerNotes from './components/profile/ManagerNotes';
import DataQualityBanner from './components/profile/DataQualityBanner';

import { useEmployeeStats } from './useEmployeeStats';
import { can, PERMISSIONS, isCompanyHead } from './permissions';
import { formatName } from './orgHelpers';

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
  const [rangeDays, setRangeDays] = useState(30);

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

  // Prevent scrolling on root when drawer is open
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
  
  // Leadership roles can see manager notes & data quality banner
  const canSeeManagerNotes = (isTopLeader || isHRAdmin || isDeptHead) && !isMe;
  const canEditEmployee = can(currentUser, PERMISSIONS.EMPLOYEE_EDIT, employee);
  const canResetPassword = can(currentUser, PERMISSIONS.EMPLOYEE_RESET_PASSWORD, employee);
  const canDeactivate = can(currentUser, PERMISSIONS.EMPLOYEE_DEACTIVATE, employee);

  const isActive = (employee.status || employee.employmentStatus) !== 'inactive';

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
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl bg-slate-50 shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
          
          {/* Top Control Bar */}
          <div className="px-6 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider" id="profile-drawer-title">
                Employee Profile Overview
              </span>
              <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-semibold">
                {employee.employeeId ? (String(employee.employeeId).startsWith('EMP-') ? employee.employeeId : `EMP-${employee.employeeId}`) : 'EMP-ID'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close profile drawer"
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Body - Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Section 1: Header */}
            <ProfileHeader 
              employee={employee}
              reportingManager={reportingManager}
              isMe={isMe}
            />

            <div className="p-4 sm:p-6 space-y-6">
              
              {/* Section 10: Data-quality banner (shown when incomplete metadata detected) */}
              <DataQualityBanner 
                employee={employee}
                onEdit={onEdit}
                canEdit={canEditEmployee}
              />

              {/* Skeleton Loaders during stats query */}
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
                  {/* Section 2: Stat Cards with 7/14/30 day toggle */}
                  <StatCards 
                    stats={stats}
                    rangeDays={rangeDays}
                    onRangeChange={setRangeDays}
                  />

                  {/* Section 3: Workload Meter */}
                  <WorkloadMeter 
                    openCount={stats?.openCount || 0}
                    defaultThreshold={8}
                  />

                  {/* Section 4: 14-day Heatmap */}
                  <Heatmap 
                    heatmapDays={stats?.heatmapDays || []}
                    trendDirection={stats?.trendDirection || 'stable'}
                    last14Completed={stats?.last14Completed || 0}
                    prev14Completed={stats?.prev14Completed || 0}
                  />

                  {/* Section 5: Priority Mix Bar */}
                  <PriorityMix 
                    priorityMix={stats?.priorityMix}
                  />

                  {/* Section 6 & 7: Incomplete reasons & Rework in 2-column grid */}
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

                  {/* Section 8: Timeline from auditLogs */}
                  <Timeline 
                    employeeId={employeeId}
                  />

                  {/* Section 9: Manager notes (Leadership only, hidden for employee) */}
                  {canSeeManagerNotes && (
                    <ManagerNotes 
                      employeeId={employeeId}
                      currentUser={currentUser}
                      canManageNotes={canSeeManagerNotes}
                    />
                  )}
                </>
              )}

            </div>
          </div>

          {/* Action Footer (Actions hidden if not permitted) */}
          {(canEditEmployee || canResetPassword || canDeactivate) && (
            <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-500 hidden sm:inline">
                Authorized Governance Actions
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {canEditEmployee && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose && onClose();
                      onEdit && onEdit(employee);
                    }}
                    className="flex-1 sm:flex-none h-10 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Edit className="w-4 h-4 text-slate-500" />
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
                    className="h-10 px-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
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
