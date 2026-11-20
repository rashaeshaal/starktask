import React, { useState, useMemo } from 'react';
import { 
  Building2, BarChart3, Inbox, CheckCheck, PlusCircle, 
  Users, Layers, Clock, ShieldAlert, CheckCircle2, AlertTriangle, 
  Settings, LogOut, ChevronLeft, ChevronRight, X, Shield, 
  Calendar, RefreshCw, UserCheck, CheckSquare, Briefcase,
  TrendingUp, Award, FileText, Check, Package, BookOpen, Send
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { getScope, canAccess, SCOPES, PAGES } from './permissions';
import { canAccessSales } from './salesPermissions';

/**
 * Systematic Left Navigation Sidebar for STARK STEEL DOORS (SalesDoor Enterprise)
 * Enforces central permissions and roles cleanly.
 * 
 * Desktop: In-flow fixed width column (w-72 or w-80, collapsed w-20) with smooth transition.
 * Mobile: Slide-over drawer with backdrop.
 */
export default function Sidebar({ 
  currentUser, 
  activeTab, 
  onTabChange, 
  employeeSubFilter, 
  onSubFilterChange, 
  taskCounts = {}, 
  pendingApprovalsCount = 0,
  escalationsCount = 0,
  dueRemindersCount = 0,
  isMobileOpen,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse
}) {
  const { logout } = useAuth();
  
  const scope = getScope(currentUser);
  const showSalesModule = canAccessSales(currentUser);

  // Permissions check by central layer
  const canSeeDashboard = canAccess(currentUser, PAGES.DASHBOARD);
  const canSeeTeamPerf = canAccess(currentUser, PAGES.TEAM_PERFORMANCE);
  const canSeeAllTasks = canAccess(currentUser, PAGES.ALL_TASKS);
  const canSeeMyTasks = canAccess(currentUser, PAGES.MY_TASKS);
  const canSeeAssignedTasks = canAccess(currentUser, PAGES.ASSIGNED_TASKS);
  const canSeeApprovals = canAccess(currentUser, PAGES.APPROVALS);
  const canSeeEscalations = canAccess(currentUser, PAGES.ESCALATIONS);
  const canSeeTodos = canAccess(currentUser, PAGES.TODOS);
  const canSeeTeams = canAccess(currentUser, PAGES.TEAMS);
  const canSeeEmployees = canAccess(currentUser, PAGES.ORGANIZATION);
  const canSeeDealers = canAccess(currentUser, PAGES.DEALERS);
  const canSeeBookings = canAccess(currentUser, PAGES.BOOKINGS);
  const canSeeReports = canAccess(currentUser, PAGES.REPORTS);
  const canSeeSettings = canAccess(currentUser, PAGES.SETTINGS);

  const getInitials = (name) => {
    if (!name) return 'EM';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const handleNavClick = (tab, subFilter = null) => {
    onTabChange(tab);
    if (subFilter && onSubFilterChange) {
      onSubFilterChange(subFilter);
    }
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Main Sidebar Aside */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen bg-[#05331F] text-white flex flex-col justify-between shrink-0
        transition-all duration-300 ease-in-out border-r border-[#07472B]/60 shadow-xl
        ${isCollapsed ? 'w-20' : 'w-64 lg:w-72'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        {/* Top Header & Logo */}
        <div className="shrink-0">
          <div className="h-16 flex items-center justify-between px-4 border-b border-[#07472B]/70">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#10B981] to-[#07472B] flex items-center justify-center font-black text-white shrink-0 shadow-xs text-sm">
                SS
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <div className="text-xs font-bold text-white tracking-wider uppercase">STARK STEEL</div>
                  <div className="text-[10px] text-emerald-300/80 tracking-tight font-medium">SalesDoor Enterprise</div>
                </div>
              )}
            </div>

            {/* Collapse toggle button on desktop */}
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-emerald-200/60 hover:text-white hover:bg-[#07472B] transition"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Close button on mobile */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-emerald-200/60 hover:text-white hover:bg-[#07472B]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-emerald-900">
          
          {/* GROUP 1: OVERVIEW */}
          {(canSeeDashboard || canSeeTeamPerf) && (
            <div>
              {!isCollapsed && (
                <p className="px-3 text-[10px] font-bold text-emerald-300/50 uppercase tracking-wider mb-1">
                  Overview
                </p>
              )}
              <div className="space-y-1">
                {canSeeDashboard && (
                  <button
                    onClick={() => handleNavClick('dashboard')}
                    title={isCollapsed ? 'Dashboard' : ''}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      activeTab === 'dashboard'
                        ? 'bg-[#0d4a2d] text-white shadow-xs'
                        : 'text-emerald-100/70 hover:bg-[#07472B]/60 hover:text-white'
                    }`}
                  >
                    <Layers className="w-4 h-4 shrink-0 text-emerald-400" />
                    {!isCollapsed && <span>Dashboard</span>}
                  </button>
                )}

                {canSeeTeamPerf && (
                  <button
                    onClick={() => handleNavClick('team_performance')}
                    title={isCollapsed ? 'Team Performance' : ''}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      activeTab === 'team_performance'
                        ? 'bg-[#0d4a2d] text-white shadow-xs'
                        : 'text-emerald-100/70 hover:bg-[#07472B]/60 hover:text-white'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 shrink-0 text-emerald-400" />
                    {!isCollapsed && <span>Team Performance</span>}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* GROUP 2: SALES (Visible to Sales & Universal roles) */}
          {showSalesModule && (canSeeBookings || canSeeDealers) && (
            <div>
              {!isCollapsed && (
                <p className="px-3 text-[10px] font-bold text-emerald-300/50 uppercase tracking-wider mb-1">
                  Sales
                </p>
              )}
              <div className="space-y-1">
                {canSeeBookings && (
                  <button
                    onClick={() => handleNavClick('bookings')}
                    title={isCollapsed ? 'Dealer Bookings' : ''}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      activeTab === 'bookings'
                        ? 'bg-[#0d4a2d] text-white shadow-xs'
                        : 'text-emerald-100/70 hover:bg-[#07472B]/60 hover:text-white'
                    }`}
                  >
                    <Package className="w-4 h-4 shrink-0 text-emerald-400" />
                    {!isCollapsed && <span>Dealer Bookings</span>}
                  </button>
                )}

                {canSeeDealers && (
                  <button
                    onClick={() => handleNavClick('dealers')}
                    title={isCollapsed ? 'Dealers' : ''}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      activeTab === 'dealers'
                        ? 'bg-[#0d4a2d] text-white shadow-xs'
                        : 'text-emerald-100/70 hover:bg-[#07472B]/60 hover:text-white'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 shrink-0 text-emerald-400" />
                    {!isCollapsed && <span>Dealers</span>}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* GROUP 3: WORK */}
          <div>
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-bold text-emerald-300/50 uppercase tracking-wider mb-1">
                Work
              </p>
            )}
            <div className="space-y-1">
              
              {/* All Tasks (Company & Department scope only) */}
              {canSeeAllTasks && (
                <button
                  onClick={() => handleNavClick('my_tasks', 'all')}
                  title={isCollapsed ? 'All Tasks' : ''}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    activeTab === 'my_tasks' && employeeSubFilter === 'all'
                      ? 'bg-[#0d4a2d] text-white shadow-xs'
                      : 'text-emerald-100/70 hover:bg-[#07472B]/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Inbox className="w-4 h-4 shrink-0 text-emerald-400" />
                    {!isCollapsed && <span>All Tasks</span>}
                  </div>
                  {!isCollapsed && taskCounts.total > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#07472B] text-emerald-200">
                      {taskCounts.total}
                    </span>
                  )}
                </button>
              )}

              {/* Approvals */}
              {canSeeApprovals && (
                <button
                  onClick={() => handleNavClick('approvals')}
                  title={isCollapsed ? 'Approvals' : ''}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    activeTab === 'approvals'
                      ? 'bg-[#0d4a2d] text-white shadow-xs'
                      : 'text-emerald-100/70 hover:bg-[#07472B]/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CheckSquare className="w-4 h-4 shrink-0 text-amber-400" />
                    {!isCollapsed && <span>Approvals</span>}
                  </div>
                  {!isCollapsed && pendingApprovalsCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                      {pendingApprovalsCount}
                    </span>
                  )}
                </button>
              )}

              {/* Escalations (Excluded from Downline & Self scopes) */}
              {canSeeEscalations && (
                <button
                  onClick={() => handleNavClick('escalations')}
                  title={isCollapsed ? 'Escalations' : ''}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    activeTab === 'escalations'
                      ? 'bg-[#0d4a2d] text-white shadow-xs'
                      : 'text-emerald-100/70 hover:bg-[#07472B]/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                    {!isCollapsed && <span>Escalations</span>}
                  </div>
                  {!isCollapsed && escalationsCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30">
                      {escalationsCount}
                    </span>
                  )}
                </button>
              )}

              {/* My Tasks (Daily Task Sheet) */}
              {canSeeMyTasks && (
                <button
                  onClick={() => handleNavClick('my_tasks', 'my_assigned')}
                  title={isCollapsed ? 'My Tasks' : ''}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    activeTab === 'my_tasks' && employeeSubFilter === 'my_assigned'
                      ? 'bg-[#0d4a2d] text-white shadow-xs'
                      : 'text-emerald-100/70 hover:bg-[#07472B]/60 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  {!isCollapsed && <span>My Tasks</span>}
                </button>
              )}

              {/* Notes & Notebooks (Zoho Cliq style) */}
              {canSeeTodos && (
                <button
                  onClick={() => handleNavClick('todos')}
                  title={isCollapsed ? 'Notes & Notebook' : ''}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    activeTab === 'todos'
                      ? 'bg-[#0d4a2d] text-white shadow-xs'
                      : 'text-emerald-100/70 hover:bg-[#07472B]/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4 shrink-0 text-emerald-400" />
                    {!isCollapsed && <span>Notes & Notebook</span>}
                  </div>
                  {!isCollapsed && dueRemindersCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                  )}
                </button>
              )}

              {/* My Team */}
              {canSeeTeams && (
                <button
                  onClick={() => handleNavClick('teams')}
                  title={isCollapsed ? 'My Team' : ''}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    activeTab === 'teams'
                      ? 'bg-[#0d4a2d] text-white shadow-xs'
                      : 'text-emerald-100/70 hover:bg-[#07472B]/60 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0 text-emerald-400" />
                  {!isCollapsed && <span>My Team</span>}
                </button>
              )}
            </div>
          </div>

          {/* GROUP 4: PEOPLE (Employees Directory - Company scope only) */}
          {canSeeEmployees && (
            <div>
              {!isCollapsed && (
                <p className="px-3 text-[10px] font-bold text-emerald-300/50 uppercase tracking-wider mb-1">
                  People
                </p>
              )}
              <div className="space-y-1">
                <button
                  onClick={() => handleNavClick('organization')}
                  title={isCollapsed ? 'Employees' : ''}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    activeTab === 'organization'
                      ? 'bg-[#0d4a2d] text-white shadow-xs'
                      : 'text-emerald-100/70 hover:bg-[#07472B]/60 hover:text-white'
                  }`}
                >
                  <Building2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  {!isCollapsed && <span>Employees</span>}
                </button>
              </div>
            </div>
          )}

          {/* GROUP 5: REPORTS & SETTINGS (Company & Dept scopes only) */}
          {(canSeeReports || canSeeSettings) && (
            <div>
              {!isCollapsed && (
                <p className="px-3 text-[10px] font-bold text-emerald-300/50 uppercase tracking-wider mb-1">
                  Reports & Settings
                </p>
              )}
              <div className="space-y-1">
                {canSeeReports && (
                  <button
                    onClick={() => handleNavClick('reports')}
                    title={isCollapsed ? 'Reports' : ''}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      activeTab === 'reports'
                        ? 'bg-[#0d4a2d] text-white shadow-xs'
                        : 'text-emerald-100/70 hover:bg-[#07472B]/60 hover:text-white'
                    }`}
                  >
                    <FileText className="w-4 h-4 shrink-0 text-emerald-400" />
                    {!isCollapsed && <span>Reports</span>}
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer: User Profile & Direct Logout */}
        <div className="p-3 border-t border-[#07472B]/70 shrink-0 bg-[#042818]/60">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[#10B981]/20 text-[#10B981] font-bold text-xs flex items-center justify-center shrink-0 border border-[#10B981]/30">
                {getInitials(currentUser?.fullName || currentUser?.name)}
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <p className="text-xs font-semibold text-white truncate">
                    {currentUser?.fullName || currentUser?.name || 'Staff User'}
                  </p>
                  <p className="text-[10px] text-emerald-300/70 truncate">
                    {currentUser?.role || 'Staff'}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-emerald-300/60 hover:text-white hover:bg-rose-900/40 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

      </aside>
    </>
  );
}
