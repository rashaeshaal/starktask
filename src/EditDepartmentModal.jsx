import React, { useState, useEffect } from 'react';
import { Building2, X, AlertCircle, Loader2 } from 'lucide-react';

export default function EditDepartmentModal({
  isOpen,
  onClose,
  department,
  employees = [],
  onDepartmentSaved
}) {
  if (!isOpen) return null;

  const isEditing = Boolean(department && department.id);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [headId, setHeadId] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (department) {
      setName(department.name || '');
      setCode(department.code || '');
      setHeadId(department.headId || department.leaderId || '');
      setDescription(department.description || '');
      setStatus(department.status || 'active');
    } else {
      setName('');
      setCode('');
      setHeadId('');
      setDescription('');
      setStatus('active');
    }
    setError('');
  }, [department, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Department name is required.');
      return;
    }
    if (!code.trim()) {
      setError('Department code is required.');
      return;
    }

    setLoading(true);

    const headObj = employees.find(e => (e.id || e.employeeId) === headId);

    const payload = {
      id: isEditing ? department.id : (code.trim().toLowerCase().replace(/\s+/g, '_')),
      name: name.trim(),
      code: code.trim().toUpperCase(),
      headId: headId || null,
      headName: headObj ? (headObj.fullName || headObj.name) : null,
      description: description.trim(),
      status: status
    };

    try {
      if (onDepartmentSaved) {
        await onDepartmentSaved(payload);
      }
      onClose();
    } catch (err) {
      console.error('Error saving department:', err);
      setError(err.message || 'Failed to save department.');
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
              <Building2 className="w-5 h-5 text-[#05331F]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 truncate">
                {isEditing ? 'Edit Department' : 'Add Corporate Department'}
              </h3>
              <p className="text-xs text-slate-500">Divisional Structure</p>
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
            <label className="block font-semibold text-slate-700 mb-1">Department Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Quality Control (QC)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. QC"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono uppercase outline-none focus:ring-2 focus:ring-[#05331F]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Department Head</label>
            <select
              value={headId}
              onChange={(e) => setHeadId(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
            >
              <option value="">-- Choose Department Head --</option>
              {employees.map(emp => (
                <option key={emp.id || emp.employeeId} value={emp.id || emp.employeeId}>
                  {emp.fullName || emp.name} — {emp.role}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows="2"
              placeholder="Department responsibilities and function..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
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
                <span>{isEditing ? 'Save Changes' : 'Create Department'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

