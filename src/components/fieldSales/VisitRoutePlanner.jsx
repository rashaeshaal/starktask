// src/components/fieldSales/VisitRoutePlanner.jsx
// Drag-and-drop or reorderable visit route planner creating daily DEALER VISIT tasks

import React, { useState } from 'react';
import { 
  MapPin, X, Plus, GripVertical, CheckCircle2, 
  Calendar, AlertCircle, ChevronUp, ChevronDown, Trash2 
} from 'lucide-react';
import { getTodayDateString } from '../../dateUtils';

export default function VisitRoutePlanner({
  isOpen,
  onClose,
  dealers = [],
  currentUser,
  onCreateVisitsBatch
}) {
  const [selectedDealerIds, setSelectedDealerIds] = useState([]);
  const [dealerSearch, setDealerSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const filteredAvailable = dealers.filter(d => {
    if (selectedDealerIds.includes(d.id)) return false;
    if (!dealerSearch.trim()) return true;
    const q = dealerSearch.toLowerCase();
    return (d.name || '').toLowerCase().includes(q) || (d.region || '').toLowerCase().includes(q);
  });

  const selectedDealers = selectedDealerIds
    .map(id => dealers.find(d => d.id === id))
    .filter(Boolean);

  const moveUp = (index) => {
    if (index === 0) return;
    const copy = [...selectedDealerIds];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    setSelectedDealerIds(copy);
  };

  const moveDown = (index) => {
    if (index === selectedDealerIds.length - 1) return;
    const copy = [...selectedDealerIds];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    setSelectedDealerIds(copy);
  };

  const removeDealer = (id) => {
    setSelectedDealerIds(prev => prev.filter(dId => dId !== id));
  };

  const handleCreateRoute = async () => {
    if (selectedDealers.length === 0) return;
    setIsSubmitting(true);
    try {
      const today = getTodayDateString();
      const visitTasks = selectedDealers.map((d, idx) => ({
        title: `Dealer Visit: ${d.name}`,
        taskType: 'DEALER VISIT',
        departmentId: 'sales',
        department: 'sales',
        dealerId: d.id,
        dealerName: d.name,
        dealerRegion: d.region,
        assignedToId: currentUser?.id || currentUser?.uid,
        assignedToName: currentUser?.fullName || currentUser?.name,
        deadlineDate: today,
        taskDate: today,
        routeStopIndex: idx + 1,
        purpose: 'Order discussion',
        status: 'Assigned',
        priority: 'High',
        createdAt: new Date().toISOString()
      }));

      if (onCreateVisitsBatch) {
        await onCreateVisitsBatch(visitTasks);
      }
      onClose();
    } catch (err) {
      console.error('Failed to create route visits:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900">Today's Dealer Visit Route Planner</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Select dealer showrooms in your territory and sequence your itinerary for today:
        </p>

        {/* Selected Route Staging Lane */}
        <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Route Sequence ({selectedDealers.length} stops)
          </span>

          {selectedDealers.length === 0 ? (
            <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
              No stops added yet. Select from the dealer list below.
            </div>
          ) : (
            <div className="space-y-1.5">
              {selectedDealers.map((dealer, idx) => (
                <div 
                  key={dealer.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-[#05331F] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{dealer.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{dealer.region}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveUp(idx)}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      title="Move up in route"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === selectedDealers.length - 1}
                      onClick={() => moveDown(idx)}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      title="Move down in route"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDealer(dealer.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 ml-1"
                      title="Remove from route"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dealer Picker Area */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <input
            type="text"
            placeholder="Search dealers in your territory..."
            value={dealerSearch}
            onChange={(e) => setDealerSearch(e.target.value)}
            className="w-full h-8 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#05331F]"
          />

          <div className="max-h-32 overflow-y-auto space-y-1">
            {filteredAvailable.slice(0, 8).map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDealerIds(prev => [...prev, d.id])}
                className="w-full text-left p-1.5 rounded-lg hover:bg-slate-100 flex items-center justify-between text-xs transition"
              >
                <span className="font-semibold text-slate-700 truncate">{d.name}</span>
                <span className="text-[10px] text-slate-400 shrink-0">{d.region}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || selectedDealers.length === 0}
            onClick={handleCreateRoute}
            className="px-4 py-1.5 rounded-xl bg-[#05331F] hover:bg-[#07472B] text-white text-xs font-bold transition disabled:opacity-40 shadow-2xs"
          >
            {isSubmitting ? 'Creating Route Tasks...' : `Generate ${selectedDealers.length} Visit Tasks`}
          </button>
        </div>
      </div>
    </div>
  );
}

