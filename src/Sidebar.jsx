import React from 'react';
import { 
  LayoutDashboard, BarChart3, ClipboardCheck, ListChecks, FileCheck, 
  ShieldAlert, CalendarCheck, Users, ContactRound, ChartColumn,
  ChevronLeft, ChevronRight, X, LogOut, Package, Briefcase, Plus
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { getScope, canAccess, SCOPES, PAGES } from './permissions';
import { canAccessSales } from './salesPermissions';

/**
 * Premium Deep Forest Green Sidebar for STARK STEEL Task Management System
 * - Background: #05331F
 * - Hover: #0A422B
 * - Active navigation background: #174D37
 * - Active indicator: #34D399
 * - Primary text: #FFFFFF
 * - Secondary text: #C1D5C9
 * - Icons: #D0E2D7
 * - Dividers: #35614B
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
  systemAlerts = [],
  onNavigateToTab,
  onOpenAssignModal,
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
  const canSeeApprovals = canAccess(currentUser, PAGES.APPROVALS);
  const canSeeEscalations = canAccess(currentUser, PAGES.ESCALATIONS);
  const canSeeTodos = canAccess(currentUser, PAGES.TODOS);
  const canSeeTeams = canAccess(currentUser, PAGES.TEAMS);
  const canSeeEmployees = canAccess(currentUser, PAGES.ORGANIZATION);
  const canSeeDealers = canAccess(currentUser, PAGES.DEALERS);
  const canSeeBookings = canAccess(currentUser, PAGES.BOOKINGS);
  const canSeeReports = canAccess(currentUser, PAGES.REPORTS);

  const getInitials = (name) => {
    if (!name) return 'SS';
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

  // Nav Item Styling with Deep Forest Green Theme:
  // Default: transparent bg, #C1D5C9 text, #D0E2D7 icons
  // Hover: #0A422B bg, #FFFFFF text
  // Active: #174D37 bg, #FFFFFF text, #34D399 left indicator & icon accent
  const navItemClass = (isActive) => `
    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer group relative font-medium
    ${isActive 
      ? 'bg-[#174D37] text-white font-semibold shadow-2xs' 
      : 'text-[#C1D5C9] hover:text-white hover:bg-[#0A422B]'
    }
  `;

  const activePill = (isActive) => isActive ? (
    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#34D399] rounded-r-full shadow-[0_0_8px_#34D399]" />
  ) : null;

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Main Sidebar Aside (Dark Forest Green #05331F) */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen bg-[#05331F] text-white flex flex-col justify-between shrink-0
        transition-all duration-200 ease-in-out border-r border-[#35614B] shadow-lg
        ${isCollapsed ? 'w-16' : 'w-60 lg:w-64'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        {/* 1. BRANDING SECTION */}
        <div className="shrink-0 px-4 h-16 flex items-center justify-between border-b border-[#35614B]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-[#174D37] border border-[#35614B] flex items-center justify-center font-bold text-white shrink-0 text-xs shadow-xs">
              SS
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <div className="text-xs font-bold text-white tracking-tight leading-tight">
                  STARK STEEL
                </div>
                <div className="text-[9px] font-medium text-[#C1D5C9] uppercase tracking-wider">
                  Task Management
                </div>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-md text-[#C1D5C9] hover:text-white hover:bg-[#0A422B] transition cursor-pointer"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile Drawer Close */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-md text-[#C1D5C9] hover:text-white hover:bg-[#0A422B] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Assign Action Button */}
        {onOpenAssignModal && (
          <div className="px-3 pt-3 pb-1 shrink-0">
            <button
              onClick={onOpenAssignModal}
              title={isCollapsed ? "Assign Task" : ""}
              className={`w-full py-2 bg-[#174D37] hover:bg-[#1f6347] active:bg-[#0A422B] border border-[#35614B] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition cursor-pointer ${
                isCollapsed ? "px-0" : "px-3"
              }`}
            >
              <Plus className="w-4 h-4 text-[#34D399] shrink-0" />
              {!isCollapsed && <span>Assign Task</span>}
            </button>
          </div>
        )}

        {/* 2. NAVIGATION GROUPS (Independently Scrollable) */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin scrollbar-thumb-[#35614B] scrollbar-track-transparent">
          
          {/* GROUP 1: OVERVIEW */}
          {(canSeeDashboard || canSeeTeamPerf) && (
            <div>
              {!isCollapsed && (
                <p className="px-3 text-[10px] font-semibold text-[#C1D5C9]/70 uppercase tracking-wider mb-1.5">
                  Overview
                </p>
              )}
              <div className="space-y-0.5">
                {canSeeDashboard && (
                  <button
                    onClick={() => handleNavClick('dashboard')}
                    title={isCollapsed ? 'Dashboard' : ''}
                    className={navItemClass(activeTab === 'dashboard')}
                  >
                    {activePill(activeTab === 'dashboard')}
                    <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeTab === 'dashboard' ? 'text-white' : 'text-[#D0E2D7] group-hover:text-white'}`} />
                    {!isCollapsed && <span>Dashboard</span>}
                  </button>
                )}

                {canSeeTeamPerf && (
                  <button
                    onClick={() => handleNavClick('team_performance')}
                    title={isCollapsed ? 'Performance' : ''}
                    className={navItemClass(activeTab === 'team_performance')}
                  >
                    {activePill(activeTab === 'team_performance')}
                    <BarChart3 className={`w-4 h-4 shrink-0 ${activeTab === 'team_performance' ? 'text-white' : 'text-[#D0E2D7] group-hover:text-white'}`} />
                    {!isCollapsed && <span>Performance</span>}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* GROUP 2: WORKSPACE */}
          <div>
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-semibold text-[#C1D5C9]/70 uppercase tracking-wider mb-1.5">
                Workspace
              </p>
            )}
            <div className="space-y-0.5">
              {canSeeMyTasks && (
                <button
                  onClick={() => handleNavClick('my_tasks')}
                  title={isCollapsed ? 'My Tasks' : ''}
                  className={navItemClass(activeTab === 'my_tasks')}
                >
                  {activePill(activeTab === 'my_tasks')}
                  <ClipboardCheck className={`w-4 h-4 shrink-0 ${activeTab === 'my_tasks' ? 'text-white' : 'text-[#D0E2D7] group-hover:text-white'}`} />
                  {!isCollapsed && (
                    <div className="flex-1 flex items-center justify-between text-left">
                      <span>My Tasks</span>
                      {taskCounts?.myTasks > 0 && (
                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-[#0A422B] text-[#C1D5C9] border border-[#35614B]">
                          {taskCounts.myTasks}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              )}

              {canSeeAllTasks && (
                <button
                  onClick={() => handleNavClick('all_tasks')}
                  title={isCollapsed ? 'Task Directory' : ''}
                  className={navItemClass(activeTab === 'all_tasks')}
                >
                  {activePill(activeTab === 'all_tasks')}
                  <ListChecks className={`w-4 h-4 shrink-0 ${activeTab === 'all_tasks' ? 'text-white' : 'text-[#D0E2D7] group-hover:text-white'}`} />
                  {!isCollapsed && <span>Task Directory</span>}
                </button>
              )}

              {canSeeApprovals && (
                <button
                  onClick={() => handleNavClick('approvals')}
                  title={isCollapsed ? 'Sign-Offs' : ''}
                  className={navItemClass(activeTab === 'approvals')}
                >
                  {activePill(activeTab === 'approvals')}
                  <FileCheck className={`w-4 h-4 shrink-0 ${activeTab === 'approvals' ? 'text-white' : 'text-[#D0E2D7] group-hover:text-white'}`} />
                  {!isCollapsed && (
                    <div className="flex-1 flex items-center justify-between text-left">
                      <span>Sign-Offs</span>
                      {pendingApprovalsCount > 0 && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                          {pendingApprovalsCount}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              )}

              {canSeeEscalations && (
                <button
                  onClick={() => handleNavClick('escalations')}
                  title={isCollapsed ? 'Blockers' : ''}
                  className={navItemClass(activeTab === 'escalations')}
                >
                  {activePill(activeTab === 'escalations')}
                  <ShieldAlert className={`w-4 h-4 shrink-0 ${activeTab === 'escalations' ? 'text-rose-400' : 'text-[#D0E2D7] group-hover:text-rose-300'}`} />
                  {!isCollapsed && (
                    <div className="flex-1 flex items-center justify-between text-left">
                      <span>Blockers</span>
                      {escalationsCount > 0 && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {escalationsCount}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              )}

              {canSeeTodos && (
                <button
                  onClick={() => handleNavClick('todos')}
                  title={isCollapsed ? 'To-Dos' : ''}
                  className={navItemClass(activeTab === 'todos')}
                >
                  {activePill(activeTab === 'todos')}
                  <CalendarCheck className={`w-4 h-4 shrink-0 ${activeTab === 'todos' ? 'text-white' : 'text-[#D0E2D7] group-hover:text-white'}`} />
                  {!isCollapsed && <span>To-Dos</span>}
                </button>
              )}
            </div>
          </div>

          {/* GROUP 3: SALES NETWORK (Where authorized) */}
          {showSalesModule && (canSeeDealers || canSeeBookings) && (
            <div>
              {!isCollapsed && (
                <p className="px-3 text-[10px] font-semibold text-[#C1D5C9]/70 uppercase tracking-wider mb-1.5">
                  Sales Network
                </p>
              )}
              <div className="space-y-0.5">
                {canSeeDealers && (
                  <button
                    onClick={() => handleNavClick('dealers')}
                    title={isCollapsed ? 'Dealers' : ''}
                    className={navItemClass(activeTab === 'dealers')}
                  >
                    {activePill(activeTab === 'dealers')}
                    <Briefcase className={`w-4 h-4 shrink-0 ${activeTab === 'dealers' ? 'text-white' : 'text-[#D0E2D7] group-hover:text-white'}`} />
                    {!isCollapsed && <span>Dealers</span>}
                  </button>
                )}

                {canSeeBookings && (
                  <button
                    onClick={() => handleNavClick('bookings')}
                    title={isCollapsed ? 'Door Orders' : ''}
                    className={navItemClass(activeTab === 'bookings')}
                  >
                    {activePill(activeTab === 'bookings')}
                    <Package className={`w-4 h-4 shrink-0 ${activeTab === 'bookings' ? 'text-white' : 'text-[#D0E2D7] group-hover:text-white'}`} />
                    {!isCollapsed && <span>Door Bookings</span>}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* GROUP 4: ORGANIZATION */}
          {(canSeeTeams || canSeeEmployees) && (
            <div>
              {!isCollapsed && (
                <p className="px-3 text-[10px] font-semibold text-[#C1D5C9]/70 uppercase tracking-wider mb-1.5">
                  Organization
                </p>
              )}
              <div className="space-y-0.5">
                {canSeeTeams && (
                  <button
                    onClick={() => handleNavClick('teams')}
                    title={isCollapsed ? 'Teams & Squads' : ''}
                    className={navItemClass(activeTab === 'teams')}
                  >
                    {activePill(activeTab === 'teams')}
                    <Users className={`w-4 h-4 shrink-0 ${activeTab === 'teams' ? 'text-white' : 'text-[#D0E2D7] group-hover:text-white'}`} />
                    {!isCollapsed && <span>Teams & Squads</span>}
                  </button>
                )}

                {canSeeEmployees && (
                  <button
                    onClick={() => handleNavClick('organization')}
                    title={isCollapsed ? 'Employees' : ''}
                    className={navItemClass(activeTab === 'organization')}
                  >
                    {activePill(activeTab === 'organization')}
                    <ContactRound className={`w-4 h-4 shrink-0 ${activeTab === 'organization' ? 'text-white' : 'text-[#D0E2D7] group-hover:text-white'}`} />
                    {!isCollapsed && <span>Employees</span>}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* GROUP 5: ANALYTICS */}
          {canSeeReports && (
            <div>
              {!isCollapsed && (
                <p className="px-3 text-[10px] font-semibold text-[#C1D5C9]/70 uppercase tracking-wider mb-1.5">
                  Analytics
                </p>
              )}
              <div className="space-y-0.5">
                <button
                  onClick={() => handleNavClick('reports')}
                  title={isCollapsed ? 'Reports' : ''}
                  className={navItemClass(activeTab === 'reports')}
                >
                  {activePill(activeTab === 'reports')}
                  <ChartColumn className={`w-4 h-4 shrink-0 ${activeTab === 'reports' ? 'text-white' : 'text-[#D0E2D7] group-hover:text-white'}`} />
                  {!isCollapsed && <span>Reports</span>}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* 3. ANCHORED EMPLOYEE PROFILE SECTION */}
        <div className="p-3 border-t border-[#35614B] shrink-0 bg-[#0A422B]/60">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[#174D37] text-white font-bold text-xs flex items-center justify-center shrink-0 border border-[#35614B]">
                {getInitials(currentUser?.fullName || currentUser?.name)}
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <p className="text-xs font-semibold text-white truncate leading-tight">
                    {currentUser?.fullName || currentUser?.name || 'Staff User'}
                  </p>
                  <p className="text-[10px] text-[#C1D5C9] truncate">
                    {currentUser?.role || 'Staff'}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-md text-[#C1D5C9] hover:text-rose-400 hover:bg-[#174D37] transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

      </aside>
    </>
  );
}
