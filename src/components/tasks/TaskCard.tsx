import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoreHorizontal, Bell, CheckCircle2, Clock } from 'lucide-react';
import PriorityBadge from './PriorityBadge';
import AvatarStack from './AvatarStack';

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: 'Todo' | 'In Progress' | 'Review' | 'Done' | string;
  priority?: 'urgent' | 'high' | 'medium' | 'low' | 'basic' | string;
  assignees?: Array<{ name: string; avatar?: string }>;
  assignedToName?: string;
  dueDate?: string;
  labels?: string[];
  reminder?: boolean;
  iconEmoji?: string;
  progressPercentage?: number;
  rawTask?: any;
}

interface TaskCardProps {
  task: TaskItem;
  onClick?: () => void;
  onStatusChange?: (newStatus: string) => void;
  onOpenOptions?: (e: React.MouseEvent) => void;
}

export default function TaskCard({ task, onClick, onStatusChange, onOpenOptions }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id, data: { task } });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    cursor: 'grab'
  };

  const getEmojiIcon = () => {
    if (task.iconEmoji) return task.iconEmoji;
    const t = (task.title || '').toLowerCase();
    if (t.includes('dispatch') || t.includes('delivery') || t.includes('transport')) return '🚚';
    if (t.includes('door') || t.includes('booking') || t.includes('sales')) return '🚪';
    if (t.includes('warehouse') || t.includes('pick') || t.includes('load')) return '📦';
    if (t.includes('payment') || t.includes('finance') || t.includes('account')) return '💳';
    if (t.includes('meeting') || t.includes('call') || t.includes('client')) return '📞';
    return '📋';
  };

  const assigneesList = task.assignees && task.assignees.length > 0 
    ? task.assignees 
    : task.assignedToName 
    ? [{ name: task.assignedToName }] 
    : [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`group relative bg-white rounded-2xl p-4 border border-[#E5E7EB] shadow-[0_1px_2px_rgba(16,24,40,0.06)] hover:shadow-[0_8px_24px_rgba(16,24,40,0.08)] hover:-translate-y-0.5 transition-all duration-200 select-none ${
        isDragging ? 'rotate-1 ring-2 ring-emerald-500 shadow-xl' : ''
      }`}
    >
      {/* Top Row: Icon tile, title, 3-dots */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-sm shrink-0 border border-slate-200/60 shadow-2xs">
            {getEmojiIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-[13px] text-slate-900 leading-snug truncate group-hover:text-[#0B3D2E] transition-colors">
              {task.title}
            </h4>
            {task.description && (
              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed font-normal">
                {task.description}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenOptions) onOpenOptions(e);
          }}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Metadata: Priority, Assignees, Reminder, Due Date */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <PriorityBadge priority={task.priority || 'medium'} />
          {task.reminder && (
            <span className="p-1 rounded-md text-amber-600 bg-amber-50" title="Reminder set">
              <Bell className="w-3 h-3" />
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {task.dueDate && (
            <span className="text-[10px] text-slate-400 font-medium">
              {task.dueDate}
            </span>
          )}
          <AvatarStack assignees={assigneesList} limit={2} />
        </div>
      </div>
    </div>
  );
}
