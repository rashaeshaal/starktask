import React, { useState } from 'react';
import { 
  Building2, BarChart3, Inbox, CheckCheck, PlusCircle, 
  Users, Layers, Clock, ShieldAlert, CheckCircle2, AlertTriangle, 
  Settings, LogOut, ChevronLeft, ChevronRight, X, Shield, 
  Calendar, RefreshCw, UserCheck, CheckSquare
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { hasPermission } from './employeeDirectory';

/**
 * Minimal, Clean, and Professional Sidebar for STARK STEEL DOORS (SalesDoor Enterprise)
 * 
 * Features:
 * - Brand Dark Green: #05331F
 * - Compact STARK STEEL logo and branding header with collapse toggle
 * - Clean, short menu labels: My Tasks, My Team, Daily Tasks, All Tasks, In Progress, Overdue, Blocked, Completed, Approvals, Reports, Settings
 * - Active menu item highlighted with subtle green pill (#0d4a2d / text-emerald-300 / text-white)
 * - Compact employee profile with avatar, name, short designation and direct logout button
 * - Collapsible on desktop (Expanded: w-64 vs. Compact Icon-only: w-18)
 * - Responsive slide-out drawer on mobile
 * - Permission-based visibility
 */
export default function Sidebar({ 
  currentUser, 
  activeTab, 
  onTabChange, 
  employeeSubFilter, 
  onSubFilterChange, 
  taskCounts = {}, 
  pendingApprovalsCount = 0,
  onOpenAssignModal,
  isMobileOpen,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse
}) {
  const { logout } = useAuth();
  
  // Real Permission Validation
  const canAssign = hasPermission(currentUser, 'assign_tasks') || hasPermission(currentUser, 'create_tasks');
  const canViewReports = hasPermission(currentUser, 'view_reports');
  const canManageEmployees = hasPermission(currentUser, 'manage_employees');
  const canReviewApprovals = hasPermission(currentUser, 'approve_tasks') || hasPermission(currentUser, 'review_tasks');
  const canManageTeams = canAssign || canManageEmployees || [
    'Executive Director', 'Director Operations', 'General Manager', 'HR Manager', 'Accounts Manager', 
    'Operations Head', 'CSO', 'Brand Manager', 'Warehouse Supervisor', 
    'Transport Manager', 'Service Manager', 'Inventory Supervisor', 'SSM', 'ASM'
  ].includes(currentUser?.role);

  // Short initials helper
  const getInitials = (name) => {
    if (!name) return 'EM';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Nav item click helper
  const handleNavClick = (tab, subFilter = null) => {
    onTabChange(tab);
    if (subFilter && onSubFilterChange) {
      onSubFilterChange(subFilter);
    }
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar - Desktop fixed, Mobile slide-out drawer */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 bg-[#05331F] text-white flex flex-col transition-all duration-300 ease-in-out border-r border-emerald-950/70 shadow-2xl select-none
        w-72 max-w-[85vw] lg:max-w-none
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-[72px]' : 'lg:w-64'}
      `}>
        
        {/* 1. COMPACT BRAND HEADER */}
        <div className="h-16 px-4 border-b border-emerald-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold shrink-0 border border-emerald-400/30 shadow-inner">
              <Building2 className="w-5 h-5 text-emerald-300" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="truncate">
                <div className="font-bold text-xs tracking-wider text-white truncate flex items-center gap-1.5">
                  <span>STARK STEEL</span>
                  <span className="text-[8px] bg-emerald-400/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">ERP</span>
                </div>
                <div className="text-[10px] text-emerald-300/70 truncate font-mono">Enterprise Task Hub</div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              title="Close navigation"
              className="lg:hidden p-2 text-emerald-300/80 hover:text-white rounded-lg hover:bg-emerald-900/40 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Desktop Collapse Toggle */}
            <button
              onClick={onToggleCollapse}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden lg:flex p-1.5 text-emerald-300/80 hover:text-white rounded-lg hover:bg-emerald-900/40 transition-colors ml-auto"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Quick Assign Action (if permitted) */}
        {canAssign && (
          <div className="p-3 border-b border-emerald-900/40">
            <button
              onClick={() => {
                onOpenAssignModal();
                if (onCloseMobile) onCloseMobile();
              }}
              title="Assign New Task"
              className={`w-full flex items-center justify-center gap-2 bg-emerald-400 text-[#05331F] hover:bg-emerald-300 font-bold py-2.5 rounded-xl text-xs shadow-sm transition-all active:scale-98 ${
                isCollapsed ? 'px-0' : 'px-3'
              }`}
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate">Assign Task</span>}
            </button>
          </div>
        )}

        {/* 2. MAIN NAVIGATION ITEMS (Grouped per Section 12 Specification) */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 text-xs no-scrollbar">
          
          {/* GROUP 1: WORKSPACE */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300/60 font-mono">
                Workspace
              </div>
            )}

            {/* Dashboard */}
            <button
              onClick={() => handleNavClick('dashboard')}
              title="Dashboard"
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-900/90 text-white font-bold shadow-2xs border border-emerald-500/30'
                  : 'text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0 text-emerald-300" />
              {!isCollapsed && <span className="truncate">Dashboard</span>}
            </button>

            {/* My Tasks */}
            <button
              onClick={() => handleNavClick('my_tasks', 'all')}
              title="My Tasks"
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
                activeTab === 'my_tasks' && employeeSubFilter === 'all'
                  ? 'bg-emerald-900/90 text-white font-bold shadow-2xs border border-emerald-500/30'
                  : 'text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white'
              }`}
            >
              <Inbox className="w-4 h-4 shrink-0 text-emerald-300" />
              {!isCollapsed && <span className="truncate">My Tasks</span>}
              {!isCollapsed && taskCounts.total > 0 && (
                <span className="ml-auto text-[10px] bg-emerald-950/80 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">
                  {taskCounts.total}
                </span>
              )}
            </button>

            {/* My Team */}
            {canManageTeams && (
              <button
                onClick={() => handleNavClick('teams')}
                title="My Team"
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
                  activeTab === 'teams'
                    ? 'bg-emerald-900/90 text-white font-bold shadow-2xs border border-emerald-500/30'
                    : 'text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 shrink-0 text-emerald-300" />
                {!isCollapsed && <span className="truncate">My Team</span>}
              </button>
            )}

            {/* Daily Tasks */}
            <button
              onClick={() => handleNavClick('my_tasks', 'today')}
              title="Daily Tasks"
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
                activeTab === 'my_tasks' && employeeSubFilter === 'today'
                  ? 'bg-emerald-900/90 text-white font-bold shadow-2xs border border-emerald-500/30'
                  : 'text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0 text-emerald-300" />
              {!isCollapsed && <span className="truncate">Daily Tasks</span>}
              {!isCollapsed && taskCounts.today > 0 && (
                <span className="ml-auto text-[10px] bg-emerald-950/80 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                  {taskCounts.today}
                </span>
              )}
            </button>

            {/* To-Do & Reminders */}
            <button
              onClick={() => handleNavClick('todos')}
              title="To-Do & Reminders"
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
                activeTab === 'todos'
                  ? 'bg-emerald-900/90 text-white font-bold shadow-2xs border border-emerald-500/30'
                  : 'text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white'
              }`}
            >
              <CheckSquare className="w-4 h-4 shrink-0 text-emerald-300" />
              {!isCollapsed && <span className="truncate">To-Do & Reminders</span>}
            </button>
          </div>

          {/* GROUP 2: TASK MANAGEMENT */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300/60 font-mono">
                Task Management
              </div>
            )}

            {/* All Tasks */}
            <button
              onClick={() => handleNavClick('my_tasks', 'all')}
              title="All Tasks"
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white`}
            >
              <Layers className="w-4 h-4 shrink-0 text-emerald-300" />
              {!isCollapsed && <span className="truncate">All Tasks</span>}
            </button>

            {/* Create Task */}
            {canAssign && (
              <button
                onClick={() => {
                  onOpenAssignModal();
                  if (onCloseMobile) onCloseMobile();
                }}
                title="Create Task"
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white"
              >
                <PlusCircle className="w-4 h-4 shrink-0 text-emerald-300" />
                {!isCollapsed && <span className="truncate">Create Task</span>}
              </button>
            )}

            {/* SOP Templates */}
            {canManageTeams && (
              <button
                onClick={() => handleNavClick('templates')}
                title="SOP Templates"
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
                  activeTab === 'templates'
                    ? 'bg-emerald-900/90 text-white font-bold shadow-2xs border border-emerald-500/30'
                    : 'text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4 shrink-0 text-emerald-300" />
                {!isCollapsed && <span className="truncate">SOP Templates</span>}
              </button>
            )}

            {/* Dealers Directory (Dedicated Sales Roster) */}
            <button
              onClick={() => handleNavClick('dealers')}
              title="Dealers Directory"
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
                activeTab === 'dealers'
                  ? 'bg-emerald-900/90 text-white font-bold shadow-2xs border border-emerald-500/30'
                  : 'text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4 shrink-0 text-emerald-300" />
              {!isCollapsed && <span className="truncate">Dealers Directory</span>}
            </button>

            {/* Approvals */}
            {canReviewApprovals && (
              <button
                onClick={() => handleNavClick('approvals')}
                title="Approvals"
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
                  activeTab === 'approvals'
                    ? 'bg-emerald-900/90 text-white font-bold shadow-2xs border border-emerald-500/30'
                    : 'text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white'
                }`}
              >
                <CheckCheck className="w-4 h-4 shrink-0 text-amber-300" />
                {!isCollapsed && <span className="truncate">Approvals</span>}
                {!isCollapsed && pendingApprovalsCount > 0 && (
                  <span className="ml-auto text-[10px] bg-amber-400 text-slate-900 px-1.5 py-0.2 rounded-full font-bold">
                    {pendingApprovalsCount}
                  </span>
                )}
              </button>
            )}

            {/* Escalations */}
            <button
              onClick={() => handleNavClick('escalations')}
              title="Escalations"
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
                activeTab === 'escalations'
                  ? 'bg-emerald-900/90 text-white font-bold shadow-2xs border border-emerald-500/30'
                  : 'text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-300" />
              {!isCollapsed && <span className="truncate">Escalations</span>}
            </button>
          </div>

          {/* GROUP 3: OPERATIONS */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300/60 font-mono">
                Operations
              </div>
            )}

            {/* Daily Operations */}
            <button
              onClick={() => handleNavClick('dashboard')}
              title="Daily Operations"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white"
            >
              <RefreshCw className="w-4 h-4 shrink-0 text-emerald-300" />
              {!isCollapsed && <span className="truncate">Daily Operations</span>}
            </button>

            {/* Departments */}
            <button
              onClick={() => handleNavClick('organization')}
              title="Departments"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white"
            >
              <Building2 className="w-4 h-4 shrink-0 text-emerald-300" />
              {!isCollapsed && <span className="truncate">Departments</span>}
            </button>

            {/* Reports */}
            {canViewReports && (
              <button
                onClick={() => handleNavClick('dashboard')}
                title="Reports"
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white"
              >
                <BarChart3 className="w-4 h-4 shrink-0 text-emerald-300" />
                {!isCollapsed && <span className="truncate">Reports</span>}
              </button>
            )}
          </div>

          {/* GROUP 4: ADMINISTRATION */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300/60 font-mono">
                Administration
              </div>
            )}

            {/* Employees */}
            <button
              onClick={() => handleNavClick('organization')}
              title="Employees"
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
                activeTab === 'organization'
                  ? 'bg-emerald-900/90 text-white font-bold shadow-2xs border border-emerald-500/30'
                  : 'text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4 shrink-0 text-emerald-300" />
              {!isCollapsed && <span className="truncate">Employees</span>}
            </button>

            {/* Settings */}
            <button
              onClick={() => handleNavClick('organization')}
              title="Settings"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white"
            >
              <Settings className="w-4 h-4 shrink-0 text-emerald-300" />
              {!isCollapsed && <span className="truncate">Settings</span>}
            </button>
          </div>

        </nav>

        {/* 3. MINIMAL EMPLOYEE PROFILE AT BOTTOM */}
        <div className="p-3 border-t border-emerald-900/60 bg-emerald-950/40 shrink-0 safe-pb">
          <div className="flex items-center justify-between gap-2.5">
            
            {/* Small Avatar + Name + Designation */}
            <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-400 text-[#05331F] font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                {currentUser?.photoUrl ? (
                  <img src={currentUser.photoUrl} alt="" className="w-8 h-8 rounded-xl object-cover" />
                ) : (
                  getInitials(currentUser?.fullName || currentUser?.name)
                )}
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden min-w-0 leading-tight">
                  <div className="font-bold text-xs text-white truncate">
                    {currentUser?.fullName || currentUser?.name || 'Staff User'}
                  </div>
                  <div className="text-[10px] text-emerald-300/80 truncate font-medium">
                    {currentUser?.role || 'Employee'}
                  </div>
                </div>
              )}
            </div>

            {/* Compact Logout Icon Button */}
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 text-emerald-300 hover:text-rose-200 hover:bg-rose-950/50 rounded-xl transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>

          </div>
        </div>

      </aside>
    </>
  );
}
