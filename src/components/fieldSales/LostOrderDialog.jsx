// src/components/fieldSales/LostOrderDialog.jsx
// Root-cause capture dialog for expired "Order promised" and lost Quotations

import React, { useState } from 'react';
import { AlertCircle, X, Check, HelpCircle } from 'lucide-react';
import { LOST_ORDER_REASONS } from '../../config/fieldSalesConfig';
import { writeAuditLog } from '../../firestoreService';

export default function LostOrderDialog({
  isOpen,
  onClose,
  dealer,
  orderPromptDetails = null,
  currentUser,
  onReasonSelected
}) {
  const [selectedReason, setSelectedReason] = useState(LOST_ORDER_REASONS[0]);
  const [customText, setCustomText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const reasonPayload = {
      dealerId: dealer?.id || dealer?.dealerId || '',
      dealerName: dealer?.name || 'Dealer',
      reason: selectedReason,
      customNote: selectedReason === 'Other' ? customText.trim() : null,
      loggedBy: currentUser?.fullName || currentUser?.name || 'Staff',
      loggedById: currentUser?.id || currentUser?.uid,
      date: new Date().toISOString()
    };

    try {
      await writeAuditLog({
        actorId: currentUser?.id || currentUser?.uid,
        action: 'LOST_ORDER_REASON_LOGGED',
        targetId: dealer?.id || dealer?.dealerId,
        after: reasonPayload,
        reason: `Lost order reason: ${selectedReason}`
      });

      if (onReasonSelected) onReasonSelected(reasonPayload);
      onClose();
    } catch (err) {
      console.error('Failed to log lost order reason:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <h3>Lost Order Root-Cause Analysis</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            aria-label="Close lost order dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600">
          Dealer <span className="font-bold text-slate-800">{dealer?.name || 'this dealer'}</span> had an "Order Promised" status that has not converted after 7 days. Please record the primary obstacle to assist Sales Management:
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            {LOST_ORDER_REASONS.map(r => (
              <label 
                key={r}
                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs transition ${
                  selectedReason === r 
                    ? 'border-emerald-600 bg-emerald-50/60 font-bold text-[#05331F]' 
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>{r}</span>
                <input
                  type="radio"
                  name="lost_reason"
                  value={r}
                  checked={selectedReason === r}
                  onChange={() => setSelectedReason(r)}
                  className="accent-[#05331F] w-4 h-4"
                />
              </label>
            ))}
          </div>

          {selectedReason === 'Other' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Specify Reason Note *
              </label>
              <textarea
                required
                rows={2}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Details on why the order was not finalized..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#05331F]"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Skip for Now
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (selectedReason === 'Other' && !customText.trim())}
              className="px-4 py-1.5 rounded-xl bg-[#05331F] hover:bg-[#07472B] text-white text-xs font-bold transition disabled:opacity-40 shadow-2xs"
            >
              {isSubmitting ? 'Recording...' : 'Save Reason'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

