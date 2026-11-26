// src/components/fieldSales/QuotationForm.jsx
// Quotation Task logging form with Sent, Negotiating, Won, Lost states

import React, { useState } from 'react';
import { 
  FileText, DollarSign, Calendar, AlertCircle, 
  CheckCircle2, X, ArrowRight, Loader2 
} from 'lucide-react';
import { QUOTATION_STATUSES } from '../../dealerWorkTypes';
import VoiceInputButton from './VoiceInputButton';
import DealerQuickCard from './DealerQuickCard';

export default function QuotationForm({
  dealers = [],
  currentUser,
  tasks = [],
  escalations = [],
  onSubmitQuotation,
  onCancel
}) {
  const [selectedDealerId, setSelectedDealerId] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteReference, setQuoteReference] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [status, setStatus] = useState('Sent');
  const [sentDate, setSentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedDealer = dealers.find(d => d.id === selectedDealerId) || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDealerId) return;

    setIsSubmitting(true);
    try {
      const payload = {
        title: `Quotation: ${selectedDealer?.name || 'Dealer'} (${quoteReference || 'Ref'})`,
        taskType: 'QUOTATION',
        departmentId: 'sales',
        department: 'sales',
        dealerId: selectedDealerId,
        dealerName: selectedDealer?.name,
        dealerRegion: selectedDealer?.region,
        amount: quoteAmount ? Number(quoteAmount) : null,
        quotationRef: quoteReference.trim(),
        quotationStatus: status,
        sentDate,
        notes: quoteNotes.trim(),
        assignedToId: currentUser?.id || currentUser?.uid,
        assignedToName: currentUser?.fullName || currentUser?.name,
        status: status === 'Won' ? 'Completed' : (status === 'Lost' ? 'Completed' : 'In Progress'),
        completedAt: (status === 'Won' || status === 'Lost') ? new Date().toISOString() : null,
        createdAt: new Date().toISOString()
      };

      if (onSubmitQuotation) {
        await onSubmitQuotation(payload);
      }
    } catch (err) {
      console.error('Failed to submit quotation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
      {/* Dealer Selector */}
      <div>
        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
          Dealer Showroom *
        </label>
        <select
          required
          value={selectedDealerId}
          onChange={(e) => setSelectedDealerId(e.target.value)}
          className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#05331F] font-semibold text-slate-800"
        >
          <option value="">Select dealer...</option>
          {dealers.map(d => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.region})
            </option>
          ))}
        </select>
      </div>

      {/* Dealer Quick Card */}
      {selectedDealer && (
        <DealerQuickCard dealer={selectedDealer} tasks={tasks} escalations={escalations} />
      )}

      {/* Reference & Amount */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
            Quotation Reference / ID
          </label>
          <input
            type="text"
            placeholder="e.g. QT-2026-1049"
            value={quoteReference}
            onChange={(e) => setQuoteReference(e.target.value)}
            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#05331F]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
            Total Quoted Amount (₹)
          </label>
          <input
            type="number"
            min="0"
            step="100"
            placeholder="e.g. 150000"
            value={quoteAmount}
            onChange={(e) => setQuoteAmount(e.target.value)}
            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#05331F]"
          />
        </div>
      </div>

      {/* Status & Sent Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
            Quotation Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-[#05331F]"
          >
            {QUOTATION_STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
            Submission Date
          </label>
          <input
            type="date"
            value={sentDate}
            onChange={(e) => setSentDate(e.target.value)}
            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#05331F]"
          />
        </div>
      </div>

      {/* Notes with Voice Input */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-bold text-slate-700 uppercase">
            Quotation Terms & Specifications
          </label>
          <VoiceInputButton onSpeechInput={(text) => setQuoteNotes(prev => prev ? `${prev} ${text}` : text)} />
        </div>
        <textarea
          rows={2}
          placeholder="Model series, lock types, discount brackets discussed..."
          value={quoteNotes}
          onChange={(e) => setQuoteNotes(e.target.value)}
          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#05331F]"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !selectedDealerId}
          className="px-4 py-1.5 rounded-xl bg-[#05331F] hover:bg-[#07472B] text-white text-xs font-bold transition disabled:opacity-40 shadow-2xs flex items-center gap-1.5"
        >
          {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
          <span>Save Quotation Record</span>
        </button>
      </div>
    </form>
  );
}

