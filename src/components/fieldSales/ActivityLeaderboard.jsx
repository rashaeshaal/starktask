// src/components/fieldSales/ActivityLeaderboard.jsx
// Neutral Sales Activity Leaderboard with trend indicators

import React, { useState } from 'react';
import { 
  Award, TrendingUp, TrendingDown, Minus, 
  MapPin, ShoppingBag, Calendar, MessageSquare, Filter 
} from 'lucide-react';
import { useActivityLeaderboard } from '../../hooks/useActivityLeaderboard';

export default function ActivityLeaderboard({ employees = [], tasks = [], currentUser }) {
  const [zoneFilter, setZoneFilter] = useState('all');
  const rows = useActivityLeaderboard(employees, tasks);

  const zones = Array.from(new Set(rows.map(r => r.zone).filter(Boolean)));

  const filteredRows = rows.filter(r => {
    if (zoneFilter !== 'all' && r.zone !== zoneFilter) return false;
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-emerald-700" />
          <div>
            <h3 className="font-bold text-sm text-slate-900">Field Activity Pulse & Engagement</h3>
            <p className="text-[11px] text-slate-400">Monthly collaborative activity across dealer network</p>
          </div>
        </div>

        {/* Zone Selector */}
        {zones.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Zone:</span>
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#05331F]"
            >
              <option value="all">All Zones ({rows.length})</option>
              {zones.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {filteredRows.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-6">No field activities recorded for this period yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400">
                <th className="pb-2 pl-2">Sales Staff</th>
                <th className="pb-2">Zone / Role</th>
                <th className="pb-2 text-center">Visits</th>
                <th className="pb-2 text-center">Orders</th>
                <th className="pb-2 text-center">Replies</th>
                <th className="pb-2 text-right pr-2">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredRows.map((r, idx) => (
                <tr key={r.employeeId || idx} className="hover:bg-slate-50/80 transition">
                  <td className="py-2.5 pl-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-900 truncate">{r.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-slate-500">
                    <span className="text-[11px] block">{r.role}</span>
                    <span className="text-[10px] text-slate-400">{r.zone}</span>
                  </td>
                  <td className="py-2.5 text-center font-bold text-slate-800">{r.visits}</td>
                  <td className="py-2.5 text-center font-bold text-emerald-700">{r.orders}</td>
                  <td className="py-2.5 text-center text-slate-700">{r.replies}</td>
                  <td className="py-2.5 text-right pr-2">
                    {r.trend === 'up' && (
                      <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold text-[10px]">
                        <TrendingUp className="w-3.5 h-3.5" /> High Pace
                      </span>
                    )}
                    {r.trend === 'steady' && (
                      <span className="inline-flex items-center gap-0.5 text-slate-500 text-[10px]">
                        <Minus className="w-3.5 h-3.5" /> Steady
                      </span>
                    )}
                    {r.trend === 'starting' && (
                      <span className="inline-flex items-center gap-0.5 text-amber-500 text-[10px]">
                        <TrendingDown className="w-3.5 h-3.5" /> Starting
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

