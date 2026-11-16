import React, { useState } from 'react';
import { 
  AlertTriangle, ShieldAlert, Clock, UserCheck, CheckCircle2, 
  ArrowUpRight, Send, AlertCircle, ChevronRight, Filter,
  CornerDownRight, UserPlus, BellRing, Wrench
} from 'lucide-react';
import { COMPANY_DEPARTMENTS } from './orgTree';

/**
 * Clean & Actionable Operational Escalations View
 * Designed for Director Operations (IHJAS K) & Operations Head (AKHIL K R)
 * 
 * Tracks:
 * 1. Operational Blockers
 * 2. Overdue tasks in Operations & Company
 * 3. Payment Holds
 * 4. Nudge & Reassign actions
 */
export default function EscalationsView({ 
  tasks = [], 
  currentUser, 
  onResolveEscalation,
  onOpenAssignModal,
  onNavigateToTab 
}) {
  const [selectedFilter, setSelectedFilter] = useState('unresolved'); // 'all' | 'unresolved' | 'resolved'
  const [selectedDept, setSelectedDept] = useState('all');
  const [nudgedTaskIds, setNudgedTaskIds] = useState(new Set());

  const today = new Date().toISOString().split('T')[0];
  const userRole = currentUser?.role || '';
  const isOperationsHead = userRole === 'Operations Head';

  const opsDepts = ['operations', 'warehouse', 'transportation', 'service', 'inventory', 'qc'];

  // Extract real incidents from task blockers, overdue statuses, and payment holds
  const incidentList = [];

  tasks.forEach(task => {
    const taskDept = (task.departmentId || task.department || 'operations').toLowerCase();

    // If viewer is Operations Head, restrict escalations strictly to Operations branches
    if (isOperationsHead && !opsDepts.includes(taskDept)) {
      return;
    }

    const taskDate = (task.deadlineDate || task.createdAt || today).slice(0, 10);
    const ageDays = Math.max(1, Math.ceil((new Date() - new Date(taskDate)) / (1000 * 60 * 60 * 24)));

    // 1. Operational Blockers
    if (task.status === 'Blocked' || task.status === 'Operational Blocker') {
      incidentList.push({
        id: `esc-blk-${task.id}`,
        taskId: task.id,
        rawTask: task,
        taskTitle: task.title,
        department: task.departmentName || task.department || 'Operations',
        departmentId: task.departmentId || 'operations',
        responsibleEmployee: task.assignedToName || 'Unassigned',
        responsibleEmployeeId: task.assignedToId || task.assignedTo,
        issue: task.blockerReason || 'Operational Blocker Reported',
        severity: 'Critical',
        ageDays,
        deadline: `${task.deadlineDate || ''} ${task.deadlineTime || ''}`,
        escalationLevel: isOperationsHead ? 'Operations Head' : 'Director Operations',
        status: task.isResolved ? 'Resolved' : 'Active Escalation',
        reason: task.description || 'Task execution stopped due to operational impediment',
        timestamp: task.lastUpdated || task.createdAt
      });
    }

    // 2. Overdue tasks
    if (task.deadlineDate && task.deadlineDate < today && task.status !== 'Completed') {
      incidentList.push({
        id: `esc-ovd-${task.id}`,
        taskId: task.id,
        rawTask: task,
        taskTitle: task.title,
        department: task.departmentName || task.department || 'Operations',
        departmentId: task.departmentId || 'operations',
        responsibleEmployee: task.assignedToName || 'Unassigned',
        responsibleEmployeeId: task.assignedToId || task.assignedTo,
        issue: `Task Overdue by ${ageDays} days`,
        severity: task.priority === 'Critical' || task.priority === 'Urgent' ? 'Critical' : 'High',
        ageDays,
        deadline: `${task.deadlineDate} ${task.deadlineTime || '6:00 PM'}`,
        escalationLevel: isOperationsHead ? 'Operations Head' : 'Director Operations',
        status: 'Active Escalation',
        reason: `Target deadline missed. Requires supervisor follow-up.`,
        timestamp: task.lastUpdated || task.createdAt
      });
    }

    // 3. Payment Holds
    if (!isOperationsHead && (task.paymentStatus === 'Payment Hold' || task.accountsClearance === 'Payment Hold')) {
      incidentList.push({
        id: `esc-pay-${task.id}`,
        taskId: task.id,
        rawTask: task,
        taskTitle: task.title,
        department: 'Finance & Accounts',
        departmentId: 'finance',
        responsibleEmployee: task.assignedToName || 'Accounts Manager',
        responsibleEmployeeId: task.assignedToId || task.assignedTo,
        issue: 'PAYMENT HOLD: Warehouse Picking Disallowed',
        severity: 'Critical',
        ageDays,
        deadline: `${task.deadlineDate || today} 12:00 PM`,
        escalationLevel: 'Director Operations',
        status: 'Active Escalation',
        reason: 'Advance token or credit ledger unpaid. Disallow dispatch.',
        timestamp: task.lastUpdated || task.createdAt
      });
    }
  });

  // Filter incidents
  const filteredIncidents = incidentList.filter(inc => {
    if (selectedFilter === 'resolved' && inc.status !== 'Resolved') return false;
    if (selectedFilter === 'unresolved' && inc.status !== 'Active Escalation') return false;

    if (selectedDept !== 'all') {
      const d = (inc.department || inc.departmentId || '').toLowerCase();
      if (!d.includes(selectedDept.toLowerCase())) return false;
    }

    return true;
  });

  const handleNudge = (taskId) => {
    setNudgedTaskIds(prev => new Set([...prev, taskId]));
    alert(`Nudge reminder sent to responsible assignee.`);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isOperationsHead ? 'Operations Escalations & Blockers' : 'Escalations & Bottlenecks'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isOperationsHead 
              ? 'Real-time tracking of overdue tasks, loading bottlenecks, and operational impediments across all 4 branches'
              : 'Real-time tracking of overdue tasks, operational bottlenecks, payment holds, and delivery risks'}
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Status buttons */}
          <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setSelectedFilter('unresolved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition min-h-[36px] ${
                selectedFilter === 'unresolved'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({incidentList.filter(i => i.status === 'Active Escalation').length})
            </button>
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition min-h-[36px] ${
                selectedFilter === 'all'
                  ? 'bg-[#05331F] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({incidentList.length})
            </button>
          </div>

          {/* Department Filter (Only for Company leadership) */}
          {!isOperationsHead && (
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-white border border-slate-200 rounded-2xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#05331F] min-h-[40px]"
            >
              <option value="all">All Departments</option>
              {COMPANY_DEPARTMENTS.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}

        </div>
      </div>

      {/* Incidents List */}
      {filteredIncidents.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Zero Active Escalations</h3>
          <p className="text-xs max-w-sm mx-auto">
            {isOperationsHead
              ? 'No blocked tasks or overdue orders reported across warehouse, transport, service or inventory.'
              : 'All departments are executing within standard SOP parameters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIncidents.map(inc => {
            const isNudged = nudgedTaskIds.has(inc.taskId);

            return (
              <div 
                key={inc.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:border-slate-300 transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      <span>{inc.issue}</span>
                    </span>

                    <span className="text-[11px] font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      {inc.department}
                    </span>

                    <span className="text-[11px] text-slate-400 font-mono">
                      Stuck for {inc.ageDays} {inc.ageDays === 1 ? 'day' : 'days'}
                    </span>
                  </div>

                  <span className="text-[11px] font-semibold text-slate-500">
                    Target: {inc.deadline}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="md:col-span-2 space-y-1">
                    <h4 className="font-bold text-sm text-slate-900">{inc.taskTitle}</h4>
                    <p className="text-slate-600 leading-relaxed">{inc.reason}</p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                    <div className="text-slate-500">Responsible Assignee:</div>
                    <div className="font-bold text-slate-800 text-sm">{inc.responsibleEmployee}</div>
                    <div className="text-[10px] text-slate-400">Escalation Scope: {inc.escalationLevel}</div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleNudge(inc.taskId)}
                    disabled={isNudged}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition disabled:opacity-50 min-h-[44px]"
                  >
                    <BellRing className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isNudged ? 'Nudged' : 'Nudge Assignee'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (onOpenAssignModal) {
                        onOpenAssignModal({
                          title: `Reassigned: ${inc.taskTitle}`,
                          description: `Reassigned from ${inc.responsibleEmployee}. Previous issue: ${inc.issue}`,
                          priority: 'High',
                          department: inc.departmentId
                        });
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#05331F] hover:bg-[#07472B] text-white rounded-xl font-bold text-xs shadow-2xs transition min-h-[44px]"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Reassign Task</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
