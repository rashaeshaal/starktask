import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';
import { STARK_LOCK_TYPES, STARK_FINISHES } from './doorCatalog';

export default function EditDoorModelModal({
  isOpen,
  onClose,
  model = null,
  onSave,
  currentUser
}) {
  const [modelCode, setModelCode] = useState('');
  const [category, setCategory] = useState('Standard Series');
  const [description, setDescription] = useState('');
  const [variants, setVariants] = useState([]);
  const [newSize, setNewSize] = useState('');
  const [newVariantStatus, setNewVariantStatus] = useState('CONTINUE');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (model) {
      setModelCode(model.model || '');
      setCategory(model.category || 'Standard Series');
      setDescription(model.description || '');
      setVariants(Array.isArray(model.variants) ? [...model.variants] : []);
    } else {
      setModelCode('');
      setCategory('Standard Series');
      setDescription('');
      setVariants([
        { size: '2050X1080X70X9" ML', status: 'CONTINUE' },
        { size: '2050X1200X70X9" MS', status: 'CONTINUE' }
      ]);
    }
    setError('');
  }, [model, isOpen]);

  if (!isOpen) return null;

  const handleAddVariant = (e) => {
    e?.preventDefault();
    if (!newSize.trim()) return;
    const cleanSize = newSize.trim();
    if (variants.some(v => v.size.toLowerCase() === cleanSize.toLowerCase())) {
      setError('This size/spec variant already exists for this model.');
      return;
    }
    setVariants([...variants, { size: cleanSize, status: newVariantStatus }]);
    setNewSize('');
    setError('');
  };

  const handleRemoveVariant = (index) => {
    setVariants(variants.filter((_, idx) => idx !== index));
  };

  const handleToggleVariantStatus = (index) => {
    setVariants(variants.map((v, idx) => {
      if (idx !== index) return v;
      return {
        ...v,
        status: v.status === 'CONTINUE' ? 'STOP' : 'CONTINUE'
      };
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedCode = modelCode.trim().toUpperCase();
    if (!trimmedCode) {
      setError('Model Code/Name is required (e.g. SRK 250, SRK 505).');
      return;
    }

    if (variants.length === 0) {
      setError('Please add at least one size specification variant.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        ...(model?.id ? { id: model.id } : {}),
        model: trimmedCode,
        category,
        description: description.trim(),
        variants,
        status: 'Active'
      });
      onClose();
    } catch (err) {
      console.error('Failed to save door model:', err);
      setError(err.message || 'Failed to save door model.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#05331F] flex items-center justify-center font-bold">
              <Layers className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                {model ? 'Edit Door Model' : 'Add New Door Model'}
              </h2>
              <p className="text-[11px] text-slate-500">
                Authorized for HR Management & Operations Directors
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Model Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Model Code / Name *
              </label>
              <input
                type="text"
                placeholder="e.g. SRK 250, SRK 600"
                value={modelCode}
                onChange={(e) => setModelCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#05331F] font-semibold text-slate-800"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Door Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#05331F] text-slate-800"
              >
                <option value="Standard Series">Standard Series</option>
                <option value="Luxury Series">Luxury Series</option>
                <option value="Standard Series (90mm Series)">Standard Series (90mm Series)</option>
                <option value="Fire Rated Series">Fire Rated Series</option>
                <option value="Custom Project Series">Custom Project Series</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Description / Series Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Premium embossed heavy steel finish with sound dampening core..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#05331F] text-slate-700 resize-none"
            />
          </div>

          {/* Size Variants Table / Manager */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-bold text-slate-900 block text-xs">
                  Available Size & Specification Variants ({variants.length})
                </label>
                <p className="text-[11px] text-slate-500">
                  Specify standard dimensions and production status (CONTINUE / STOP).
                </p>
              </div>
            </div>

            {/* Add Variant Form */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder='e.g. 2050X1080X70X9" ML'
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddVariant();
                  }
                }}
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#05331F]"
              />
              <select
                value={newVariantStatus}
                onChange={(e) => setNewVariantStatus(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700"
              >
                <option value="CONTINUE">CONTINUE</option>
                <option value="STOP">STOP</option>
              </select>
              <button
                type="button"
                onClick={handleAddVariant}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Variant List */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
              {variants.length === 0 ? (
                <p className="text-center text-slate-400 py-3 text-xs italic">
                  No size variants added yet.
                </p>
              ) : (
                variants.map((v, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 shadow-2xs text-xs"
                  >
                    <span className="font-mono font-medium text-slate-800">
                      {v.size}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleVariantStatus(idx)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition ${
                          v.status === 'CONTINUE'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                        title="Click to toggle CONTINUE / STOP status"
                      >
                        {v.status}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition"
                        title="Delete variant"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick presets for common lock types */}
          <div className="pt-2">
            <span className="text-[11px] text-slate-500 font-medium">Standard Lock Types Supported:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {['SL (Single Lock)', 'ML (Multi-Point)', 'MS (Mother & Son)', 'MO (Mother Opening)', 'Digital'].map(l => (
                <span key={l} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px]">
                  {l}
                </span>
              ))}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472B] text-white font-semibold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              {isSaving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{model ? 'Update Door Model' : 'Save Door Model'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
