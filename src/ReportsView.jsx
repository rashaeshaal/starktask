import React, { useState, useMemo } from 'react';
import { 
  FileText, Download, Calendar, Filter, Users, CheckCircle2, 
  Clock, TrendingUp, BarChart2, ShieldCheck, ChevronRight
} from 'lucide-react';
import { TASK_STATUSES } from './rbac';
import { getTodayDateString, getDateOffset } from './dateUtils';
import { COMPANY_DEPARTMENTS } from './orgTree';
import { getScope, SCOPES, normalizeRoleName } from './permissions';

/**
 * Clean & Minimal Operational Reports View
 * Scoped cleanly for Company Leadership, Accounts Manager, and Department Heads
 */
export default function ReportsView({ tasks = [], employees = [], currentUser }) {
  const todayStr = getTodayDateString();
  const [period, setPeriod] = useState('week'); // 'today' | 'week' | 'month'

  const userRole = normalizeRoleName(currentUser?.role || '');
  const userDept = (currentUser?.department || '').toLowerCase();
  const isFinanceManager = userRole === 'Accounts Manager' || userDept === 'finance' || userDept === 'accounts';
  const scope = getScope(currentUser);

  const { startDate, endDate } = useMemo(() => {
    if (period === 'today') return { startDate: todayStr, endDate: todayStr };
    if (period === 'week') return { startDate: getDateOffset(-7), endDate: todayStr };
    return { startDate: getDateOffset(-30), endDate: todayStr };
  }, [period, todayStr]);

  // Filter tasks by date and by user's authorized department/scope
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const taskDate = (t.taskDate || t.deadlineDate || t.createdAt || '').slice(0, 10);
      const inDate = !taskDate || (taskDate >= startDate && taskDate <= endDate);
      if (!inDate) return false;

      // If Finance Manager, report strictly on Finance tasks
      if (isFinanceManager && scope !== SCOPES.COMPANY) {
        const d = (t.department || t.departmentId || '').toLowerCase();
        return d === 'finance' || d === 'accounts' || t.taskType === 'Payment verification';
      }

      return true;
    });
  }, [tasks, startDate, endDate, isFinanceManager, scope]);

  // Overall KPIs
  const total = filteredTasks.length;
  const completed = filteredTasks.filter(t => t.status === 'Completed').length;
  const overdue = filteredTasks.filter(t => t.status !== 'Completed' && t.deadlineDate && t.deadlineDate < todayStr).length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Breakdown by Department (or Finance categories if Finance scope)
  const deptBreakdown = useMemo(() => {
    if (isFinanceManager && scope !== SCOPES.COMPANY) {
      const finCategories = [
        { id: 'payment_verif', name: 'Payment Verification' },
        { id: 'invoicing', name: 'Invoice Processing' },
        { id: 'reconciliation', name: 'Bank Reconciliation' },
        { id: 'collection', name: 'Collection Follow-up' },
        { id: 'vendor', name: 'Vendor Payments' }
      ];

      return finCategories.map(cat => {
        const catTasks = filteredTasks.filter(t => {
          const type = (t.taskType || t.title || '').toLowerCase();
          return type.includes(cat.name.toLowerCase()) || type.includes(cat.id);
        });
        const cTotal = catTasks.length;
        const cDone = catTasks.filter(t => t.status === 'Completed').length;
        const cRate = cTotal > 0 ? Math.round((cDone / cTotal) * 100) : 0;
        return {
          id: cat.id,
          name: cat.name,
          total: cTotal,
          done: cDone,
          rate: cRate
        };
      });
    }

    return COMPANY_DEPARTMENTS.map(d => {
      const dTasks = filteredTasks.filter(t => {
        const dept = (t.department || t.departmentName || t.departmentId || '').toLowerCase();
        return dept.includes(d.id.toLowerCase()) || dept.includes(d.name.toLowerCase());
      });
      const dTotal = dTasks.length;
      const dDone = dTasks.filter(t => t.status === 'Completed').length;
      const dRate = dTotal > 0 ? Math.round((dDone / dTotal) * 100) : 0;
      return {
        ...d,
        total: dTotal,
        done: dDone,
        rate: dRate
      };
    });
  }, [filteredTasks, isFinanceManager, scope]);

  const handleExport = () => {
    const csvRows = [
      ['Department / Activity', 'Total Tasks', 'Completed', 'Throughput Rate'],
      ...deptBreakdown.map(d => [d.name, d.total, d.done, `${d.rate}%`])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `StarkSteel_${isFinanceManager ? 'Finance' : 'Operations'}_Report_${period}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isFinanceManager && scope !== SCOPES.COMPANY ? 'Finance & Accounts Reports' : 'Executive Reports'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isFinanceManager && scope !== SCOPES.COMPANY
              ? 'Payment token clearance rates, invoice throughput, and ledger audit metrics'
              : 'Operational efficiency, throughput benchmarks, and department delivery metrics'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition min-h-[36px] ${
                period === 'today' ? 'bg-[#05331F] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition min-h-[36px] ${
                period === 'week' ? 'bg-[#05331F] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition min-h-[36px] ${
                period === 'month' ? 'bg-[#05331F] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 30 Days
            </button>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#05331F] hover:bg-[#07472B] text-white text-xs font-semibold shadow-2xs transition min-h-[40px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] text-slate-500 font-medium">Logged Tasks</p>
          <p className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">{total}</p>
        </div>
        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] text-slate-500 font-medium">Completed</p>
          <p className="text-lg sm:text-xl font-bold text-[#10B981] mt-0.5">{completed}</p>
        </div>
        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] text-slate-500 font-medium">Completion Rate</p>
          <p className="text-lg sm:text-xl font-bold text-[#05331F] mt-0.5">{rate}%</p>
        </div>
        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] text-slate-500 font-medium">Overdue / Action Needed</p>
          <p className={`text-lg sm:text-xl font-bold mt-0.5 ${overdue > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{overdue}</p>
        </div>
      </div>

      {/* Department Breakdown Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            {isFinanceManager && scope !== SCOPES.COMPANY ? 'Finance Activity Throughput' : 'Department Operational Throughput'}
          </h2>
          <span className="text-xs text-slate-400">Audited activity period</span>
        </div>

        <div className="divide-y divide-slate-100">
          {deptBreakdown.map(d => (
            <div key={d.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50/60 transition">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                  <FileText className="w-4 h-4 text-[#05331F]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">{d.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{d.total} tasks logged in period</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900">{d.done} / {d.total}</p>
                  <p className="text-[10px] text-slate-400">Completed</p>
                </div>
                <div className="w-24 sm:w-32">
                  <div className="flex justify-between text-[10px] font-semibold text-slate-600 mb-1">
                    <span>Rate</span>
                    <span>{d.rate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${d.rate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
