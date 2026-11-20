// src/DeleteTeamModal.jsx
// Confirmation modal for deleting / deactivating a squad

import React, { useEffect } from 'react';
import { AlertCircle, Trash2, X, Loader2 } from 'lucide-react';
import { formatName } from './orgHelpers';

export default function DeleteTeamModal({
  isOpen,
  onClose,
  team,
  onConfirm,
  isDeleting = false
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !team) return null;

  const teamTitle = formatName(team.name || 'this team');

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 my-auto animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-slate-900">
              Delete Squad
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900 font-semibold">{teamTitle}</strong>? All member assignments in this squad will be removed. This action cannot be undone.
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="h-10 px-4 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm && onConfirm(team)}
            disabled={isDeleting}
            className="h-10 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-2xs"
          >
            {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Delete Squad</span>
          </button>
        </div>
      </div>
    </div>
  );
}

