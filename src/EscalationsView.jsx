import React, { useState } from 'react';
import { 
  AlertTriangle, ShieldAlert, Clock, UserCheck, CheckCircle2, 
  ArrowUpRight, Send, AlertCircle, ChevronRight, Filter,
  CornerDownRight, UserPlus, BellRing
} from 'lucide-react';
import { ESCALATION_MATRIX } from './sopRules';
import { COMPANY_DEPARTMENTS } from './orgTree';

/**
 * Clean & Actionable Operational Escalations View
 * Designed for Director Operations (IHJAS K) & Senior Leadership
 * 
 * Capabilities:
 * 1. Filter by department or status (Active vs Resolved)
 * 2. Real-time age tracking ("3 days stuck")
 * 3. Stuck assignee highlight
 * 4. "Nudge Assignee" and "Reassign Task" actions
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

  // Extract real incidents from task blockers, overdue statuses, QC rejections, and payment holds
  const incidentList = [];

  tasks.forEach(task => {
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
        escalationLevel: 'Director Operations',
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
        severity: task.priority === 'Critical' ? 'Critical' : 'High',
        ageDays,
        deadline: `${task.deadlineDate} ${task.deadlineTime || '6:00 PM'}`,
        escalationLevel: 'Director Operations',
        status: 'Active Escalation',
        reason: `Target deadline missed. Requires supervisor follow-up.`,
        timestamp: task.lastUpdated || task.createdAt
      });
    }

    // 3. Payment Holds
    if (task.paymentStatus === 'Payment Hold' || task.accountsClearance === 'Payment Hold') {
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

  // Nudge handler
  const handleNudge = (taskId) => {
    setNudgedTaskIds(prev => new Set([...prev, taskId]));
    alert(`Nudge reminder sent to responsible assignee.`);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Escalations & Blockers</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time tracking of overdue tasks, operational bottlenecks, payment holds, and delivery risks
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Status buttons */}
          <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setSelectedFilter('unresolved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedFilter === 'unresolved'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({incidentList.filter(i => i.status === 'Active Escalation').length})
            </button>
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedFilter === 'all'
                  ? 'bg-[#05331F] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({incidentList.length})
            </button>
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-2xl font-medium text-slate-700 focus:outline-none focus:border-[#05331F]"
          >
            <option value="all">All Departments</option>
            {COMPANY_DEPARTMENTS.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredIncidents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
            <p className="font-bold text-slate-800">Zero Active Escalations</p>
            <p className="text-xs text-slate-500">
              All factory operations and department deadlines are currently running on schedule.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Severity & Age</th>
                  <th className="py-3 px-4">Issue Details</th>
                  <th className="py-3 px-4">Task Name</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Stuck Assignee</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIncidents.map(inc => {
                  const isNudged = nudgedTaskIds.has(inc.taskId);

                  return (
                    <tr key={inc.id} className="hover:bg-slate-50/70 transition">
                      
                      {/* Severity & Age */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            inc.severity === 'Critical' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {inc.severity}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400">
                            {inc.ageDays}d old
                          </span>
                        </div>
                      </td>

                      {/* Issue */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{inc.issue}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs truncate">{inc.reason}</p>
                      </td>

                      {/* Task Name */}
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800 max-w-xs truncate">{inc.taskTitle}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {inc.taskId}</p>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-700">{inc.department}</span>
                      </td>

                      {/* Stuck Assignee */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                            {inc.responsibleEmployee.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-800">{inc.responsibleEmployee}</span>
                        </div>
                      </td>

                      {/* Actions: Nudge & Reassign */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Nudge button */}
                          <button
                            onClick={() => handleNudge(inc.taskId)}
                            disabled={isNudged}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                              isNudged
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                            }`}
                          >
                            <BellRing className="w-3 h-3" />
                            <span>{isNudged ? 'Nudged' : 'Nudge'}</span>
                          </button>

                          {/* Reassign button */}
                          <button
                            onClick={() => {
                              if (onOpenAssignModal) {
                                onOpenAssignModal({
                                  title: `[Reassigned] ${inc.taskTitle}`,
                                  description: `Reassigned from ${inc.responsibleEmployee} due to escalation: ${inc.issue}`,
                                  memberId: ''
                                });
                              }
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#05331F] text-white hover:bg-[#07472B] transition"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>Reassign</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
