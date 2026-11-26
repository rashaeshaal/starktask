// src/components/fieldSales/DealerQuickCard.jsx
// Compact Dealer Quick Card shown upon selection in dealer tasks & picker

import React from 'react';
import { 
  Building2, Calendar, MessageSquare, AlertCircle, 
  ShoppingBag, Clock, ExternalLink, ChevronRight 
} from 'lucide-react';
import { useDealerQuickCard } from '../../hooks/useDealerQuickCard';
import DealerHealthChip from './DealerHealthChip';

export default function DealerQuickCard({ dealer, tasks = [], escalations = [], onOpenDealerDetails = null }) {
  const cardData = useDealerQuickCard(dealer, tasks, escalations);

  if (!cardData) return null;

  return (
    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5 text-xs shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[#05331F] text-emerald-300 flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate">{cardData.dealerName}</p>
            <p className="text-[10px] text-slate-400 truncate">{cardData.region}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <DealerHealthChip health={cardData.health} />
          {onOpenDealerDetails && (
            <button
              type="button"
              onClick={() => onOpenDealerDetails(dealer)}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition"
              title="Open Dealer Full Details"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {/* Last Visit */}
        <div className="p-2 bg-white rounded-xl border border-slate-200/60 flex items-start gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Last Visit</span>
            <p className="font-bold text-slate-800 truncate">
              {cardData.lastVisitDate ? cardData.lastVisitDate : 'No visits recorded'}
            </p>
          </div>
        </div>

        {/* Last Reply */}
        <div className="p-2 bg-white rounded-xl border border-slate-200/60 flex items-start gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Last Reply</span>
            <p className="font-bold text-slate-800 truncate">{cardData.lastReplyOutcome}</p>
          </div>
        </div>

        {/* Orders This Month */}
        <div className="p-2 bg-white rounded-xl border border-slate-200/60 flex items-start gap-1.5">
          <ShoppingBag className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Month Orders</span>
            <p className="font-bold text-emerald-800">{cardData.ordersThisMonth} orders</p>
          </div>
        </div>

        {/* Open Follow-ups & Issues */}
        <div className="p-2 bg-white rounded-xl border border-slate-200/60 flex items-start gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Pending</span>
            <p className="font-bold text-slate-800">
              {cardData.openFollowUpsCount} follow-ups
              {cardData.openIssuesCount > 0 && (
                <span className="text-rose-600 ml-1">({cardData.openIssuesCount} issues)</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

