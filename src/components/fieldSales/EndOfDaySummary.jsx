// src/components/fieldSales/EndOfDaySummary.jsx
// Automated end-of-day sales sign-off summary with copy-as-text and carryover tagging

import React, { useState, useMemo } from 'react';
import { 
  CheckCheck, Copy, Check, X, Calendar, 
  ShoppingBag, MessageSquare, MapPin, AlertCircle, RefreshCw 
} from 'lucide-react';
import { isOrderCountedTask } from '../../dealerWorkTypes';

export default function EndOfDaySummary({
  isOpen,
  onClose,
  currentUser,
  todayTasks = [],
  onConfirmSignOff
}) {
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compute today's accomplishments
  const metrics = useMemo(() => {
    let visits = 0;
    let ordersCount = 0;
    let replies = 0;
    let followUps = 0;
    const unfinished = [];

    todayTasks.forEach(task => {
      const type = task.taskType || task.type;
      const isDone = task.status === 'Completed' || task.status === 'completed';

      if (type === 'DEALER VISIT') {
        if (isDone) visits += 1;
        else unfinished.push(task);
      } else if (isOrderCountedTask(task)) {
        if (isDone) ordersCount += (Number(task.orderCount) || 1);
        else unfinished.push(task);
      } else if (type === 'DEALER REPLY') {
        if (isDone) replies += 1;
        else unfinished.push(task);
      } else if ((task.title || '').includes('Follow-up')) {
        if (isDone) followUps += 1;
        else unfinished.push(task);
      } else if (!isDone) {
        unfinished.push(task);
      }
    });

    return { visits, ordersCount, replies, followUps, unfinished };
  }, [todayTasks]);

  const summaryText = useMemo(() => {
    const name = currentUser?.fullName || currentUser?.name || 'Sales Rep';
    const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    
    let text = `*STARK STEEL - DAILY FIELD SALES SUMMARY*\n`;
    text += `👤 *Officer:* ${name} (${currentUser?.role || 'Sales'})\n`;
    text += `📅 *Date:* ${date}\n\n`;
    text += `✅ *Accomplishments:*\n`;
    text += `• Dealer Visits Done: ${metrics.visits}\n`;
    text += `• Confirmed Orders: ${metrics.ordersCount} units\n`;
    text += `• Dealer Replies Recorded: ${metrics.replies}\n`;
    text += `• Follow-ups Executed: ${metrics.followUps}\n\n`;

    if (metrics.unfinished.length > 0) {
      text += `⏳ *Unfinished Items (Carrying over to Tomorrow):*\n`;
      metrics.unfinished.forEach((t, i) => {
        text += `${i + 1}. ${t.title || 'Task'} [${t.status}]\n`;
      });
    } else {
      text += `🎉 *All Planned Work Completed 100%!*`;
    }

    return text;
  }, [currentUser, metrics]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOff = async () => {
    setIsSubmitting(true);
    try {
      if (onConfirmSignOff) {
        await onConfirmSignOff(metrics);
      }
      onClose();
    } catch (err) {
      console.error('Sign-off error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CheckCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900">End-of-Day Sales Sign-Off Summary</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Key Accomplishment Metric Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Visits</span>
            <p className="text-base font-extrabold text-[#05331F]">{metrics.visits}</p>
          </div>
          <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Orders</span>
            <p className="text-base font-extrabold text-[#05331F]">{metrics.ordersCount}</p>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Replies</span>
            <p className="text-base font-extrabold text-slate-800">{metrics.replies}</p>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Follow-ups</span>
            <p className="text-base font-extrabold text-slate-800">{metrics.followUps}</p>
          </div>
        </div>

        {/* Formatted Plaintext Box for WhatsApp/Teams Copy */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase">
              Field Report Summary
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-[11px] font-bold text-[#05331F] hover:underline flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy for WhatsApp'}</span>
            </button>
          </div>
          <textarea
            readOnly
            rows={7}
            value={summaryText}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-700 select-all outline-none"
          />
        </div>

        {/* Unfinished Work Carry-Over Notice */}
        {metrics.unfinished.length > 0 && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <span className="font-bold">{metrics.unfinished.length} unfinished tasks</span> will automatically carry over to tomorrow's daily sheet with a "Carried Over" priority badge.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Review Tasks
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSignOff}
            className="px-4 py-1.5 rounded-xl bg-[#05331F] hover:bg-[#07472B] text-white text-xs font-bold transition disabled:opacity-40 shadow-2xs"
          >
            {isSubmitting ? 'Signing Off...' : 'Confirm EOD Sign-Off'}
          </button>
        </div>
      </div>
    </div>
  );
}

