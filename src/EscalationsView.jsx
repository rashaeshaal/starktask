import React, { useState } from 'react';
import { 
  AlertTriangle, ShieldAlert, Clock, UserCheck, CheckCircle2, 
  ArrowUpRight, Send, AlertCircle, ChevronRight, Filter
} from 'lucide-react';
import { ESCALATION_MATRIX } from './sopRules';

export default function EscalationsView({ tasks = [], currentUser, onResolveEscalation }) {
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'unresolved' | 'resolved'
  const [activeIncident, setActiveIncident] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');

  // Extract real incidents from task blockers, overdue statuses, QC rejections, and payment holds
  const incidentList = [];

  tasks.forEach(task => {
    // 1. Operational Blockers
    if (task.status === 'Blocked' || task.status === 'Operational Blocker') {
      incidentList.push({
        id: `esc-blk-${task.id}`,
        taskId: task.id,
        taskTitle: task.title,
        department: task.departmentName || task.department,
        responsibleEmployee: task.assignedToName || 'Unassigned',
        issue: task.blockerReason || 'Operational Blocker Reported',
        severity: 'High',
        originalDeadline: `${task.deadlineDate || ''} ${task.deadlineTime || ''}`,
        escalationLevel: 'Operations Head',
        status: task.isResolved ? 'Resolved' : 'Active Escalation',
        reason: task.description || 'Task execution stopped due to operational impediment',
        timestamp: task.lastUpdated || task.createdAt
      });
    }

    // 2. Overdue critical tasks
    const today = new Date().toISOString().split('T')[0];
    if (task.deadlineDate && task.deadlineDate < today && task.status !== 'Completed') {
      incidentList.push({
        id: `esc-ovd-${task.id}`,
        taskId: task.id,
        taskTitle: task.title,
        department: task.departmentName || task.department,
        responsibleEmployee: task.assignedToName || 'Unassigned',
        issue: `Task Overdue by ${Math.ceil((new Date() - new Date(task.deadlineDate)) / (1000 * 60 * 60 * 24))} days`,
        severity: task.priority === 'Critical' ? 'Critical' : 'High',
        originalDeadline: `${task.deadlineDate} ${task.deadlineTime || '6:00 PM'}`,
        escalationLevel: task.priority === 'Critical' ? 'Director Operations' : 'Department Head',
        status: 'Active Escalation',
        reason: `Target milestone missed. Requires supervisor intervention.`,
        timestamp: task.lastUpdated || task.createdAt
      });
    }

    // 3. Payment Holds
    if (task.paymentStatus === 'Payment Hold' || task.accountsClearance === 'Payment Hold') {
      incidentList.push({
        id: `esc-pay-${task.id}`,
        taskId: task.id,
        taskTitle: task.title,
        department: 'Finance & Accounts',
        responsibleEmployee: 'Accounts Manager',
        issue: 'PAYMENT HOLD: Warehouse Picking & Loading Disallowed',
        severity: 'Critical',
        originalDeadline: `${task.deadlineDate || today} 12:00 PM`,
        escalationLevel: 'Director Operations',
        status: 'Active Escalation',
        reason: 'Advance token or credit ledger unpaid. Disallow dispatch.',
        timestamp: task.lastUpdated || task.createdAt
      });
    }
  });

  const filteredIncidents = incidentList.filter(inc => {
    if (selectedFilter === 'resolved') return inc.status === 'Resolved';
    if (selectedFilter === 'unresolved') return inc.status === 'Active Escalation';
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-rose-200">
              SOP 2.0 Governance
            </span>
            <span className="text-xs text-slate-400">• Multi-Tier Escalation Matrix</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Operational Escalations & Audit Log</h2>
          <p className="text-xs text-slate-500">
            Real-time tracking of delivery blockers, overdue milestones, payment holds, and QC failures
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-rose-100 text-rose-800 px-3 py-1.5 rounded-xl border border-rose-200">
            {filteredIncidents.filter(i => i.status === 'Active Escalation').length} Active Issues
          </span>
        </div>
      </div>

      {/* Standard SOP Escalation Hierarchy Reference Card */}
      <div className="bg-slate-50/80 p-4 rounded-3xl border border-slate-200/80 space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-emerald-800" />
          <span>SOP Section 15: Standard Escalation Paths</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 text-xs">
          {ESCALATION_MATRIX.slice(0, 4).map((esc, idx) => (
            <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="font-bold text-slate-900 truncate">{esc.issue}</div>
              <div className="text-[11px] text-slate-500">
                1st: <span className="font-semibold text-slate-700">{esc.owner}</span> → Escalation: <span className="font-bold text-[#05331F]">{esc.escalation}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">Active Operational Incidents</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${selectedFilter === 'all' ? 'bg-[#05331F] text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              All ({incidentList.length})
            </button>
            <button
              onClick={() => setSelectedFilter('unresolved')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${selectedFilter === 'unresolved' ? 'bg-[#05331F] text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              Active
            </button>
          </div>
        </div>

        {filteredIncidents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
            <p className="font-bold text-slate-700">Zero Active Escalations</p>
            <p className="text-xs">All factory operations and department deadlines are currently on schedule.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Issue / Reason</th>
                  <th className="py-3 px-4">Task Name</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Responsible</th>
                  <th className="py-3 px-4">Escalated To</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIncidents.map(inc => (
                  <tr key={inc.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                        inc.severity === 'Critical' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 max-w-xs truncate">{inc.issue}</td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate">{inc.taskTitle}</td>
                    <td className="py-3 px-4 font-semibold text-slate-600">{inc.department}</td>
                    <td className="py-3 px-4 text-slate-800">{inc.responsibleEmployee}</td>
                    <td className="py-3 px-4 font-bold text-[#05331F]">{inc.escalationLevel}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        inc.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {inc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

