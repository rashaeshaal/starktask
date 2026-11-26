import React, { useState } from 'react';
import { ChevronDown, ArrowUpDown, Filter, Search, MoreHorizontal, Check, Plus } from 'lucide-react';
import { TaskItem } from './TaskCard';
import PriorityBadge from './PriorityBadge';
import AvatarStack from './AvatarStack';
import LabelChip from './LabelChip';

interface TaskTableProps {
  tasks: TaskItem[];
  onTaskClick: (task: TaskItem) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onPriorityChange?: (taskId: string, newPriority: string) => void;
}

export default function TaskTable({ tasks, onTaskClick, onStatusChange, onPriorityChange }: TaskTableProps) {
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<'title' | 'dueDate' | 'priority' | 'status'>('dueDate');
  const [sortAsc, setSortAsc] = useState(true);
  const [activeFilterStatus, setActiveFilterStatus] = useState<string>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [viewScope, setViewScope] = useState<'all' | 'active' | 'completed'>('all');
  const [isViewScopeOpen, setIsViewScopeOpen] = useState(false);

  // Dynamic filtered & sorted tasks
  const processedTasks = React.useMemo(() => {
    let list = [...tasks];

    // Filter by view scope
    if (viewScope === 'active') {
      list = list.filter(t => t.status !== 'Done');
    } else if (viewScope === 'completed') {
      list = list.filter(t => t.status === 'Done');
    }

    // Filter by table status filter
    if (activeFilterStatus !== 'all') {
      list = list.filter(t => t.status.toLowerCase() === activeFilterStatus.toLowerCase());
    }

    // Sort
    list.sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      if (sortField === 'priority') {
        const order: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1, basic: 1 };
        valA = order[a.priority?.toLowerCase()] || 0;
        valB = order[b.priority?.toLowerCase()] || 0;
        return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      }
      return sortAsc 
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    return list;
  }, [tasks, viewScope, activeFilterStatus, sortField, sortAsc]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(processedTasks.length / pageSize));
  const currentTasks = processedTasks.slice((page - 1) * pageSize, page * pageSize);

  const getStatusDot = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'done' || s === 'completed') return { dot: 'bg-blue-500', pill: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Done' };
    if (s === 'in progress') return { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-800 border-emerald-200', label: 'In progress' };
    if (s === 'review' || s === 'pending review') return { dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-800 border-amber-200', label: 'In review' };
    if (s === 'blocked') return { dot: 'bg-rose-500', pill: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Blocked' };
    return { dot: 'bg-slate-400', pill: 'bg-slate-50 text-slate-700 border-slate-200', label: 'Not started' };
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_1px_2px_rgba(16,24,40,0.06)] overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      <div className="p-3.5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
        <div className="relative flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsViewScopeOpen(!isViewScopeOpen)}
            className="h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <span>
              {viewScope === 'active' ? 'Active Tasks View' : viewScope === 'completed' ? 'Completed Tasks View' : 'All Features View'}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isViewScopeOpen ? 'rotate-180' : ''}`} />
          </button>

          {isViewScopeOpen && (
            <div className="absolute top-11 left-0 z-20 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 animate-in fade-in zoom-in-95">
              {[
                { id: 'all', label: 'All Features View' },
                { id: 'active', label: 'Active Tasks Only' },
                { id: 'completed', label: 'Completed Tasks Only' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setViewScope(opt.id as any);
                    setIsViewScopeOpen(false);
                    setPage(1);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                    viewScope === opt.id ? 'font-semibold text-emerald-800 bg-emerald-50/50' : 'text-slate-700'
                  }`}
                >
                  <span>{opt.label}</span>
                  {viewScope === opt.id && <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end relative">
          {/* Filters dropdown button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition ${
                activeFilterStatus !== 'all'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filters</span>
              {activeFilterStatus !== 'all' && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-bold">1</span>
              )}
            </button>

            {isFilterOpen && (
              <div className="absolute top-11 right-0 z-20 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 animate-in fade-in zoom-in-95">
                {[
                  { id: 'all', label: 'All Statuses' },
                  { id: 'Todo', label: 'Not Started' },
                  { id: 'In Progress', label: 'In Progress' },
                  { id: 'Review', label: 'Review' },
                  { id: 'Done', label: 'Done' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setActiveFilterStatus(opt.id);
                      setIsFilterOpen(false);
                      setPage(1);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                      activeFilterStatus === opt.id ? 'font-semibold text-emerald-800 bg-emerald-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {activeFilterStatus === opt.id && <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sorting dropdown button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="h-9 px-3 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Sort: {sortField.toUpperCase()} ({sortAsc ? 'ASC' : 'DESC'})</span>
            </button>

            {isSortOpen && (
              <div className="absolute top-11 right-0 z-20 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 animate-in fade-in zoom-in-95">
                {[
                  { id: 'dueDate', label: 'Due Date' },
                  { id: 'priority', label: 'Priority Level' },
                  { id: 'title', label: 'Task Title' },
                  { id: 'status', label: 'Status' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      if (sortField === opt.id) {
                        setSortAsc(!sortAsc);
                      } else {
                        setSortField(opt.id as any);
                        setSortAsc(true);
                      }
                      setIsSortOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                      sortField === opt.id ? 'font-semibold text-emerald-800 bg-emerald-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {sortField === opt.id && (
                      <span className="text-[10px] text-emerald-700 font-bold">{sortAsc ? '▲ ASC' : '▼ DESC'}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-10 text-[11px]">
            <tr>
              <th className="py-3 px-4 w-72">Task</th>
              <th className="py-3 px-4 w-36">Status</th>
              <th className="py-3 px-4 w-36">Assignee</th>
              <th className="py-3 px-4 w-32">Due Date</th>
              <th className="py-3 px-4 w-32">Priority</th>
              <th className="py-3 px-4">Labels</th>
              <th className="py-3 px-4 w-12 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentTasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                  No tasks matching this view
                </td>
              </tr>
            ) : (
              currentTasks.map((task) => {
                const st = getStatusDot(task.status);
                const assigneesList = task.assignees && task.assignees.length > 0 
                  ? task.assignees 
                  : task.assignedToName 
                  ? [{ name: task.assignedToName }] 
                  : [];

                const labelsList = task.labels && task.labels.length > 0
                  ? task.labels
                  : ['Operations', 'Stark'];

                return (
                  <tr
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    {/* Task Title + Subtitle */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-[#0B3D2E] text-xs">
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5 font-normal">
                          {task.description}
                        </div>
                      )}
                    </td>

                    {/* Status with dot & pill */}
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={task.status}
                        onChange={(e) => onStatusChange(task.id, e.target.value)}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer outline-none ${st.pill}`}
                      >
                        <option value="Todo">Not started</option>
                        <option value="In Progress">In progress</option>
                        <option value="Review">In review</option>
                        <option value="Done">Done</option>
                        <option value="Blocked">Blocked</option>
                      </select>
                    </td>

                    {/* Assignee */}
                    <td className="py-3 px-4">
                      <AvatarStack assignees={assigneesList} limit={2} />
                    </td>

                    {/* Due Date */}
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {task.dueDate || 'Today'}
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <PriorityBadge priority={task.priority || 'medium'} withChevron />
                    </td>

                    {/* Labels */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {labelsList.slice(0, 2).map((lbl, idx) => (
                          <LabelChip key={idx} label={lbl} />
                        ))}
                        {labelsList.length > 2 && (
                          <span className="text-[10px] text-slate-400 font-semibold">
                            +{labelsList.length - 2}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Options */}
                    <td className="py-3 px-4 text-right text-slate-400">
                      <MoreHorizontal className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Pagination */}
      <div className="p-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-white">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white font-medium cursor-pointer"
        >
          ← Previous
        </button>

        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
            const pageNum = i + 1;
            const isActive = pageNum === page;
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => setPage(pageNum)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                  isActive
                    ? 'bg-[#0B3D2E] text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          {totalPages > 5 && <span className="px-1 text-slate-400">…</span>}
        </div>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white font-medium cursor-pointer"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
