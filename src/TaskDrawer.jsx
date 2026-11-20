// src/TaskDrawer.jsx
// Right-side task detail drawer with edit controls, subtasks, activities, and Esc trap

import React, { useState, useEffect } from 'react';
import { 
  X, Check, Edit3, Calendar, Clock, User, Building2, 
  MapPin, AlertCircle, GitFork, Paperclip, CheckSquare, 
  Square, Plus, Loader2 
} from 'lucide-react';
import StatusPill from './StatusPill';
import PriorityPill from './PriorityPill';
import { formatName, formatDepartment, formatDue } from './taskHelpers';
import { TASK_STATUSES, TASK_PRIORITIES } from './rbac';

export default function TaskDrawer({
  isOpen,
  onClose,
  task,
  currentUser,
  onStatusChange,
  onUpdateTask,
  onSplitTask
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [subtasks, setSubtasks] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setPriority(task.priority || 'medium');
      setSubtasks(task.subtasks || []);
      setIsEditing(false);
    }
  }, [task]);

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  const dueInfo = formatDue(task.requiredBy || task.deadlineDate || task.date || task.taskDate);
  const assigneeName = formatName(task.assignedToName || task.assigneeName || 'Unassigned');
  const assignerName = formatName(task.assignedByName || task.createdByName || 'Self');

  const handleSave = async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, {
          title: title.trim(),
          description: description.trim(),
          priority,
          subtasks
        });
      }
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSubtask = async (subIndex) => {
    const updated = subtasks.map((st, idx) => 
      idx === subIndex ? { ...st, completed: !st.completed } : st
    );
    setSubtasks(updated);
    if (onUpdateTask) {
      await onUpdateTask(task.id, { subtasks: updated });
    }
  };

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtaskText.trim()) return;
    const newSt = {
      id: `sub_${Date.now()}`,
      title: newSubtaskText.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    };
    const updated = [...subtasks, newSt];
    setSubtasks(updated);
    setNewSubtaskText('');
    if (onUpdateTask) {
      await onUpdateTask(task.id, { subtasks: updated });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusPill task={task} onStatusChange={onStatusChange} />
              <PriorityPill priority={isEditing ? priority : task.priority} />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                aria-label={isEditing ? "Cancel editing" : "Edit task"}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close drawer"
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Title & Description */}
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Task Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/40"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="h-10 px-4 rounded-xl bg-[#05331F] hover:bg-[#0a4a2f] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
                  {task.title}
                </h2>
                {task.description ? (
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {task.description}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">No description provided.</p>
                )}
              </div>
            )}

            {/* Meta Properties Grid */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Assignee
                </span>
                <span className="font-semibold text-slate-900">{assigneeName}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Assigned By
                </span>
                <span className="font-semibold text-slate-900">{assignerName}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  Department
                </span>
                <span className="font-semibold text-slate-900">
                  {formatDepartment(task.departmentId || task.department)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Due Date
                </span>
                <span className={`font-semibold ${dueInfo.isOverdue ? 'text-red-600' : 'text-slate-900'}`}>
                  {dueInfo.label}
                </span>
              </div>

              {task.location && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Location
                  </span>
                  <span className="font-semibold text-slate-900">{task.location}</span>
                </div>
              )}
            </div>

            {/* Subtasks Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Subtasks ({subtasks.filter(s => s.completed).length}/{subtasks.length})
                </h3>
              </div>

              {/* Subtasks list */}
              <div className="space-y-2">
                {subtasks.map((st, idx) => (
                  <div 
                    key={st.id || idx}
                    onClick={() => handleToggleSubtask(idx)}
                    className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer text-xs"
                  >
                    <div className="pt-0.5">
                      {st.completed ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                    </div>
                    <span className={`flex-1 ${st.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {st.title}
                    </span>
                  </div>
                ))}
              </div>

              {/* Add subtask input */}
              <form onSubmit={handleAddSubtask} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Add a subtask…"
                  value={newSubtaskText}
                  onChange={(e) => setNewSubtaskText(e.target.value)}
                  className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40"
                />
                <button
                  type="submit"
                  disabled={!newSubtaskText.trim()}
                  className="h-9 px-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-xl text-xs font-medium flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </form>
            </div>

            {/* Split / Delegate Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSplitTask && onSplitTask(task);
                }}
                className="w-full h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <GitFork className="w-4 h-4 text-slate-500" />
                <span>Split task & delegate to downline</span>
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

