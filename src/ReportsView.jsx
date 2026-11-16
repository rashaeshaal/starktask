import React, { useState, useMemo } from 'react';
import { 
  FileText, Download, Calendar, Filter, Users, CheckCircle2, 
  Clock, TrendingUp, BarChart2, ShieldCheck, ChevronRight
} from 'lucide-react';
import { TASK_STATUSES } from './rbac';
import { getTodayDateString, getDateOffset } from './dateUtils';
import { COMPANY_DEPARTMENTS } from './orgTree';

/**
 * Clean & Minimal Operational Reports View
 * Built for Director Operations (IHJAS K) & Executive Leadership
 */
export default function ReportsView({ tasks = [], employees = [] }) {
  const todayStr = getTodayDateString();
  const [period, setPeriod] = useState('week'); // 'today' | 'week' | 'month'

  const { startDate, endDate } = useMemo(() => {
    if (period === 'today') return { startDate: todayStr, endDate: todayStr };
    if (period === 'week') return { startDate: getDateOffset(-7), endDate: todayStr };
    return { startDate: getDateOffset(-30), endDate: todayStr };
  }, [period, todayStr]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const taskDate = (t.taskDate || t.deadlineDate || t.createdAt || '').slice(0, 10);
      return !taskDate || (taskDate >= startDate && taskDate <= endDate);
    });
  }, [tasks, startDate, endDate]);

  // Overall KPIs
  const total = filteredTasks.length;
  const completed = filteredTasks.filter(t => t.status === 'Completed').length;
  const overdue = filteredTasks.filter(t => t.status !== 'Completed' && t.deadlineDate && t.deadlineDate < todayStr).length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Breakdown by Department
  const deptBreakdown = useMemo(() => {
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
  }, [filteredTasks]);

  // Export report as CSV
  const handleExport = () => {
    const headers = ['Department', 'Total Tasks', 'Completed', 'Completion Rate'];
    const rows = deptBreakdown.map(d => [
      `"${d.name}"`,
      d.total,
      d.done,
      `${d.rate}%`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `StarkSteel_Operations_Report_${period}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational efficiency, throughput benchmarks, and department delivery metrics
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                period === 'today' ? 'bg-[#05331F] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                period === 'week' ? 'bg-[#05331F] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                period === 'month' ? 'bg-[#05331F] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 30 Days
            </button>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#05331F] hover:bg-[#07472B] text-white text-xs font-semibold shadow-2xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-xs text-slate-500 font-medium">Logged Tasks</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{total}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-xs text-slate-500 font-medium">Completed</p>
          <p className="text-2xl font-bold text-[#10B981] mt-1">{completed}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-xs text-slate-500 font-medium">Completion Rate</p>
          <p className="text-2xl font-bold text-[#05331F] mt-1">{rate}%</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-xs text-slate-500 font-medium">Overdue Misses</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{overdue}</p>
        </div>
      </div>

      {/* Department Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Operational Breakdown by Department</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold">
                <th className="py-3 px-4">Department Squad</th>
                <th className="py-3 px-4">Squad Leader</th>
                <th className="py-3 px-4 text-center">Tasks Done</th>
                <th className="py-3 px-4 text-center">Total Tasks</th>
                <th className="py-3 px-4 text-center">Delivery %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deptBreakdown.map(dept => (
                <tr key={dept.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 font-bold text-slate-800">{dept.name}</td>
                  <td className="py-3 px-4 text-slate-500">{dept.headName || 'Squad Head'}</td>
                  <td className="py-3 px-4 text-center font-semibold text-emerald-700">{dept.done}</td>
                  <td className="py-3 px-4 text-center text-slate-600">{dept.total}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-bold text-[#05331F]">{dept.rate}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

