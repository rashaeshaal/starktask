import React, { useState, useEffect } from 'react';
import { Briefcase, X, CheckCircle2 } from 'lucide-react';

export default function EditDesignationModal({
  isOpen,
  onClose,
  designation,
  departments = [],
  onDesignationUpdated
}) {
  if (!isOpen || !designation) return null;

  const [title, setTitle] = useState(designation.title || '');
  const [departmentId, setDepartmentId] = useState(designation.departmentId || departments[0]?.id || 'sales');
  const [level, setLevel] = useState(designation.level || 3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (designation) {
      setTitle(designation.title || '');
      setDepartmentId(designation.departmentId || departments[0]?.id || 'sales');
      setLevel(designation.level || 3);
    }
  }, [designation, departments]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a designation title.');
      return;
    }

    setIsSubmitting(true);
    const updated = {
      ...designation,
      title: title.trim(),
      departmentId,
      level: Number(level)
    };

    if (onDesignationUpdated) {
      onDesignationUpdated(updated);
    }

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto safe-pb safe-pt">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 border-slate-100">
          <div className="flex items-center gap-2.5 truncate mr-2">
            <div className="w-9 h-9 rounded-xl bg-[#05331F] text-emerald-300 flex items-center justify-center font-bold shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">Edit Designation</h3>
              <p className="text-[11px] text-slate-500 truncate">{designation.id}</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs pt-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Designation Title / Role *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Department *</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#05331F]"
            >
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.id})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Hierarchy Tier Level (1: Top, 5: Frontline)</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#05331F]"
            >
              <option value={1}>Level 1 - Board / Executive Director</option>
              <option value={2}>Level 2 - Director Operations</option>
              <option value={3}>Level 3 - Department Head / Manager</option>
              <option value={4}>Level 4 - Supervisor / In-Charge</option>
              <option value={5}>Level 5 - Operational & Field Staff</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472c] text-white font-bold text-xs shadow-md transition-all active:scale-98 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Designation'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

