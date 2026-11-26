import React, { useState } from 'react';
import { GripVertical, Plus, ChevronDown, Check } from 'lucide-react';

export interface TodoItem {
  id: string;
  title: string;
  date?: string;
  projectName?: string;
  completed?: boolean;
  notes?: string;
}

interface MyTodoListProps {
  todos?: any[];
  onToggleTodo?: (id: string, done: boolean) => void;
  onAddTodo?: (text: string) => void;
}

export default function MyTodoList({ todos = [], onToggleTodo, onAddTodo }: MyTodoListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newText, setNewText] = useState('');

  // Adapt real Firestore userTodos ({ id, title, done, dueAtDate, ... }) or fallback mock
  const displayTodos: TodoItem[] = todos.length > 0 ? todos.map(t => ({
    id: t.id,
    title: t.title || 'Untitled note',
    date: t.dueAtDate ? new Date(t.dueAtDate).toLocaleDateString() : (t.date || 'Today'),
    projectName: t.projectName || t.project || 'Personal',
    completed: Boolean(t.done ?? t.completed),
    notes: t.notes || ''
  })) : [
    { id: 'td_1', title: 'Verify door serial codes for showroom', date: 'Today', projectName: 'SalesDoor', completed: true, notes: 'Checked against order #SRK-77.' },
    { id: 'td_2', title: 'Dispatch transit safety sign-off', date: 'Today', projectName: 'Logistics', completed: false, notes: 'Pending driver sign-off sheet.' },
    { id: 'td_3', title: 'Update warehouse packing checklist', date: 'Tomorrow', projectName: 'Operations', completed: false }
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    if (onAddTodo) onAddTodo(newText.trim());
    setNewText('');
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-[0_1px_2px_rgba(16,24,40,0.06)] space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
          My Todo
        </h4>
        <span className="text-[11px] font-bold text-slate-400">
          {displayTodos.filter((t) => t.completed).length}/{displayTodos.length}
        </span>
      </div>

      {/* Todo items */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
        {displayTodos.map((item) => {
          const isDone = Boolean(item.completed);
          const isExpanded = expandedId === item.id;

          return (
            <div
              key={item.id}
              className={`p-2.5 rounded-xl border transition-all text-xs ${
                isDone ? 'bg-slate-50/70 border-slate-100' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 text-slate-300 cursor-grab shrink-0" />
                
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => onToggleTodo && onToggleTodo(item.id, !isDone)}
                  className={`w-4 h-4 rounded-md flex items-center justify-center transition shrink-0 cursor-pointer ${
                    isDone ? 'bg-emerald-600 text-white' : 'border-2 border-slate-300 hover:border-emerald-600'
                  }`}
                >
                  {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                </button>

                {/* Title & metadata */}
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <p className={`font-semibold truncate text-[11px] ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {item.title}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {item.date || 'Today'} • {item.projectName || 'Stark'}
                  </p>
                </div>

                {item.notes && (
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {isExpanded && item.notes && (
                <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600 bg-slate-50/80 p-2 rounded-lg leading-relaxed">
                  {item.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Add Form */}
      <form onSubmit={handleCreate} className="flex items-center gap-1.5 pt-1">
        <input
          type="text"
          placeholder="Add quick to-do…"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          className="flex-1 h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={!newText.trim()}
          className="h-8 px-2.5 bg-[#0B3D2E] hover:bg-[#07472B] disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </form>
    </div>
  );
}
