import React, { useState } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import TaskCard, { TaskItem } from './TaskCard';

export const COLUMNS: Array<{ id: string; title: string; color: string; borderClass: string; badgeClass: string }> = [
  { id: 'Todo', title: 'Todo', color: '#94A3B8', borderClass: 'border-slate-400', badgeClass: 'bg-slate-100 text-slate-700' },
  { id: 'In Progress', title: 'In Progress', color: '#10B981', borderClass: 'border-emerald-500', badgeClass: 'bg-emerald-50 text-emerald-800' },
  { id: 'Review', title: 'Review', color: '#F59E0B', borderClass: 'border-amber-500', badgeClass: 'bg-amber-50 text-amber-800' },
  { id: 'Done', title: 'Done', color: '#3B82F6', borderClass: 'border-blue-500', badgeClass: 'bg-blue-50 text-blue-800' }
];

interface ColumnDroppableProps {
  column: typeof COLUMNS[0];
  tasks: TaskItem[];
  onTaskClick: (task: TaskItem) => void;
  onOpenOptions: (task: TaskItem, e: React.MouseEvent) => void;
}

function ColumnDroppable({ column, tasks, onTaskClick, onOpenOptions }: ColumnDroppableProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col bg-slate-50/70 rounded-2xl border transition-colors p-3.5 min-h-[500px] ${
        isOver ? 'border-emerald-400 bg-emerald-50/20' : 'border-slate-200'
      }`}
    >
      {/* Column Header with 2px colored underline & count badge */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b-2" style={{ borderBottomColor: column.color }}>
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
            {column.title}
          </h3>
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${column.badgeClass}`}>
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Task List */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 flex-1 overflow-y-auto pr-0.5">
          {tasks.length === 0 ? (
            <div className="h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
              <span>No tasks</span>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
                onOpenOptions={(e) => onOpenOptions(task, e)}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

interface TaskBoardProps {
  tasks: TaskItem[];
  onTaskClick: (task: TaskItem) => void;
  onTaskMove: (taskId: string, targetStatus: string) => void;
  onOpenOptions?: (task: TaskItem, e: React.MouseEvent) => void;
}

export default function TaskBoard({ tasks, onTaskClick, onTaskMove, onOpenOptions }: TaskBoardProps) {
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const getTasksByStatus = (status: string) => {
    return tasks.filter((t) => {
      const s = (t.status || 'Todo').toLowerCase();
      if (status === 'Todo') return s === 'todo' || s === 'assigned' || s === 'pending';
      if (status === 'In Progress') return s === 'in progress' || s === 'paused';
      if (status === 'Review') return s === 'review' || s === 'pending review' || s === 'waiting for sign-off';
      if (status === 'Done') return s === 'done' || s === 'completed';
      return false;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const item = tasks.find((t) => t.id === event.active.id);
    if (item) setActiveTask(item);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // If dropped directly onto a column ID
    const isColumn = COLUMNS.some((c) => c.id === overId);
    if (isColumn) {
      onTaskMove(activeId, overId);
      return;
    }

    // Dropped over another card -> find that card's column
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask) {
      let targetStatus = 'Todo';
      const s = (overTask.status || 'Todo').toLowerCase();
      if (s === 'todo' || s === 'assigned' || s === 'pending') targetStatus = 'Todo';
      else if (s === 'in progress' || s === 'paused') targetStatus = 'In Progress';
      else if (s === 'review' || s === 'pending review' || s === 'waiting for sign-off') targetStatus = 'Review';
      else if (s === 'done' || s === 'completed') targetStatus = 'Done';

      onTaskMove(activeId, targetStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <ColumnDroppable
            key={col.id}
            column={col}
            tasks={getTasksByStatus(col.id)}
            onTaskClick={onTaskClick}
            onOpenOptions={onOpenOptions || (() => {})}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-2 scale-105 shadow-2xl opacity-90">
            <TaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
