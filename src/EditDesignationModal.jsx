import React, { useState, useEffect } from 'react';
import { Briefcase, X, AlertCircle, Loader2 } from 'lucide-react';
import { COMPANY_DEPARTMENTS, getRoleLevel } from './orgTree';
import { formatDepartment } from './orgHelpers';

export default function EditDesignationModal({
  isOpen,
  onClose,
  designation,
  departments = [],
  designations = [],
  onDesignationSaved
}) {
  if (!isOpen) return null;

  const isEditing = Boolean(designation && designation.id);

  const [title, setTitle] = useState('');
  const [departmentId, setDepartmentId] = useState(
    departments[0]?.id || COMPANY_DEPARTMENTS[0]?.id || 'operations'
  );
  const [level, setLevel] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Department list options
  const deptList = departments.length > 0 ? departments : COMPANY_DEPARTMENTS;

  useEffect(() => {
    if (designation) {
      const desigTitle = designation.title || designation.name || '';
      setTitle(desigTitle);
      setDepartmentId(designation.departmentId || designation.department || deptList[0]?.id || 'operations');
      setLevel(designation.level || getRoleLevel(desigTitle) || 5);
    } else {
      setTitle('');
      setDepartmentId(deptList[0]?.id || 'operations');
      setLevel(5);
    }
    setError('');
  }, [designation, isOpen, deptList]);

  // Auto-suggest level when title is typed if user hasn't manually set
  const handleTitleChange = (val) => {
    setTitle(val);
    if (!isEditing && val.trim().length > 2) {
      const suggestedLevel = getRoleLevel(val);
      if (suggestedLevel) {
        setLevel(suggestedLevel);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Please enter a designation title.');
      return;
    }

    setLoading(true);

    const payload = {
      id: isEditing ? designation.id : `des_${Date.now()}`,
      title: trimmedTitle,
      name: trimmedTitle,
      departmentId,
      department: departmentId,
      level: Number(level),
      roleMapping: trimmedTitle,
      role: trimmedTitle
    };

    try {
      if (onDesignationSaved) {
        await onDesignationSaved(payload);
      }
      onClose();
    } catch (err) {
      console.error('Error saving designation:', err);
      setError(err.message || 'Failed to save designation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold shrink-0 border border-emerald-200">
              <Briefcase className="w-4 h-4 text-[#05331F]" />
            </div>
            <div className="truncate">
              <h3 className="text-sm font-semibold text-slate-900 truncate">
                {isEditing ? 'Edit Designation' : 'Add Designation'}
              </h3>
              <p className="text-[11px] text-slate-500">Corporate role & level</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Minimal 3-Field Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* 1. Title */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Designation Title *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Sales Coordinator"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* 2. Department */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Department *
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-colors cursor-pointer"
            >
              {deptList.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name || formatDepartment(d.id)}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Level */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Hierarchy Level
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="1">Level 1 · Executive Leadership</option>
              <option value="2">Level 2 · Senior Operations & GM</option>
              <option value="3">Level 3 · Department Head</option>
              <option value="4">Level 4 · Branch / State Manager</option>
              <option value="5">Level 5 · Assistant Manager & Staff</option>
              <option value="6">Level 6 · Frontline Specialist</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-9 px-3.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-9 px-4 rounded-xl bg-[#05331F] hover:bg-[#0a4a2f] text-white font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-2xs"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-300" />}
              <span>{isEditing ? 'Save Changes' : 'Add Designation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
