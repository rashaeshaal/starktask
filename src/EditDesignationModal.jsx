import React, { useState, useEffect } from 'react';
import { Briefcase, X, AlertCircle, Loader2 } from 'lucide-react';
import { COMPANY_DEPARTMENTS, ORG_TREE, getRoleLevel } from './orgTree';

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
  const [departmentId, setDepartmentId] = useState(COMPANY_DEPARTMENTS[0].id);
  const [level, setLevel] = useState(4);
  const [parentDesignation, setParentDesignation] = useState('');
  const [roleMapping, setRoleMapping] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (designation) {
      setTitle(designation.title || designation.name || '');
      setDepartmentId(designation.departmentId || designation.department || COMPANY_DEPARTMENTS[0].id);
      setLevel(designation.level || 4);
      setParentDesignation(designation.parentDesignation || designation.reportsToDesignationId || '');
      setRoleMapping(designation.roleMapping || designation.role || designation.title || '');
    } else {
      setTitle('');
      setDepartmentId(COMPANY_DEPARTMENTS[0].id);
      setLevel(4);
      setParentDesignation('');
      setRoleMapping('');
    }
    setError('');
  }, [designation, isOpen]);

  // Eligible parent designations (must be in org tree)
  const eligibleParents = designations.filter(d => {
    if (isEditing && d.id === designation.id) return false;
    return true;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Designation title is required.');
      return;
    }

    setLoading(true);

    const payload = {
      id: isEditing ? designation.id : `des_${Date.now()}`,
      title: title.trim(),
      name: title.trim(),
      departmentId,
      department: departmentId,
      level: Number(level),
      parentDesignation: parentDesignation || null,
      reportsToDesignationId: parentDesignation || null,
      roleMapping: roleMapping.trim() || title.trim(),
      role: roleMapping.trim() || title.trim()
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
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto safe-pb safe-pt"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto"
      >
        <div className="flex items-center justify-between border-b pb-3 border-slate-100">
          <div className="flex items-center gap-2.5 truncate mr-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold shrink-0 border border-emerald-200">
              <Briefcase className="w-5 h-5 text-[#05331F]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 truncate">
                {isEditing ? 'Edit Designation' : 'Add Corporate Designation'}
              </h3>
              <p className="text-xs text-slate-500">Org Tree Hierarchy Mapping</p>
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

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Designation Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Senior Logistics Coordinator"
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
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
            >
              {COMPANY_DEPARTMENTS.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Org Tree Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
              >
                <option value="1">Level 1 (Executive)</option>
                <option value="2">Level 2 (Director / GM)</option>
                <option value="3">Level 3 (Department Head)</option>
                <option value="4">Level 4 (Supervisor / Senior)</option>
                <option value="5">Level 5 (Operational Staff)</option>
                <option value="6">Level 6 (Crew / Support)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Parent Designation</label>
              <select
                value={parentDesignation}
                onChange={(e) => setParentDesignation(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
              >
                <option value="">-- Choose Parent --</option>
                {eligibleParents.map(p => (
                  <option key={p.id || p.title} value={p.id || p.title}>
                    {p.title} (Level {p.level || 3})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Role / Access Level Mapping</label>
            <input
              type="text"
              placeholder="e.g. Transport Coordinator"
              value={roleMapping}
              onChange={(e) => setRoleMapping(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472c] text-white font-semibold shadow-md transition-all active:scale-98 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? 'Save Changes' : 'Create Designation'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
