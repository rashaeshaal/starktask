import React, { useState, useMemo } from 'react';
import { 
  Building2, Users, Search, Phone, Mail, MapPin, 
  ExternalLink, Plus, Filter, CheckCircle2, ChevronRight,
  ShieldCheck, ArrowUpDown, Download, FileSpreadsheet, Package, Calendar, Clock
} from 'lucide-react';
import { STARK_DEALER_DIRECTORY, SALES_STAFF_ASSIGNMENTS } from './dealerDirectory';

export default function DealersDirectoryView({ 
  currentUser, 
  tasks = [],
  onOpenAssignOrderModal 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'orders'
  const [selectedDealerForOrder, setSelectedDealerForOrder] = useState(null);

  // Quick Order Inputs on Dealer Modal/Card
  const [quickModel, setQuickModel] = useState('');
  const [quickCount, setQuickCount] = useState(1);
  const [quickNeededDate, setQuickNeededDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2); // Default 2 days for production/dispatch
    return d.toISOString().split('T')[0];
  });

  // Check if current user is one of the designated sales reps
  const currentUserName = (currentUser?.fullName || currentUser?.name || '').toUpperCase();
  const isBinsha = currentUserName.includes('BINSHA') || currentUserName.includes('BINISHA');
  const isShamna = currentUserName.includes('SHAMNA');
  const isSarika = currentUserName.includes('SARIKA') || currentUserName.includes('SHARIKA');
  const isShaifil = currentUserName.includes('SHAIFIL');

  // Filtered actual door orders placed with dealers
  const dealerOrders = useMemo(() => {
    return tasks.filter(t => t.dealerName || t.taskCategory === 'stark_door_order' || t.doorModel);
  }, [tasks]);

  // Regions summary
  const regionStats = useMemo(() => {
    const counts = {
      'Kerala South': 0,
      'Kerala North': 0,
      'Tamil Nadu': 0,
      'Karnataka': 0,
      'Andhra Pradesh / Telangana': 0
    };
    STARK_DEALER_DIRECTORY.forEach(d => {
      if (counts[d.region] !== undefined) counts[d.region]++;
    });
    return counts;
  }, []);

  // Filtered dealers
  const filteredDealers = useMemo(() => {
    return STARK_DEALER_DIRECTORY.filter(dealer => {
      // Region filter
      if (selectedRegion !== 'all' && dealer.region !== selectedRegion) return false;

      // Staff filter
      if (selectedStaff !== 'all' && dealer.assignedStaff !== selectedStaff) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = dealer.name.toLowerCase().includes(q);
        const matchesCode = dealer.code.toLowerCase().includes(q);
        const matchesRegion = dealer.region.toLowerCase().includes(q);
        const matchesStaff = dealer.assignedStaff.toLowerCase().includes(q);
        return matchesName || matchesCode || matchesRegion || matchesStaff;
      }
      return true;
    });
  }, [searchQuery, selectedRegion, selectedStaff]);

  // Handle Quick Order Submission
  const handleLaunchOrder = (dealer) => {
    if (onOpenAssignOrderModal) {
      onOpenAssignOrderModal({
        dealerName: dealer.name,
        dealerCode: dealer.code,
        doorModel: quickModel || 'SSD-Premium-35mm',
        quantity: Number(quickCount) || 1,
        requiredDate: quickNeededDate,
        title: `Order: ${quickModel || 'SSD Steel Door'} (${quickCount} Units) - ${dealer.name}`
      });
    }
    setSelectedDealerForOrder(null);
    setQuickModel('');
    setQuickCount(1);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16 font-sans select-none">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Dealer Network & Order Hub</h1>
            <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold px-2 py-0.5 rounded-full uppercase">
              Sales Portal
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Book dealer orders: Specify Door Model, Count, and Needed Delivery Date
          </p>
        </div>

        {/* Tab switch: All Dealers vs Live Dealer Orders */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'directory' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dealers ({filteredDealers.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'orders' ? 'bg-[#05331F] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-emerald-300" />
            <span>Active Orders ({dealerOrders.length})</span>
          </button>
        </div>
      </div>

      {/* Region KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Kerala South */}
        <div 
          onClick={() => {
            setSelectedRegion(selectedRegion === 'Kerala South' ? 'all' : 'Kerala South');
            setSelectedStaff('all');
          }}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            selectedRegion === 'Kerala South' 
              ? 'bg-[#05331F] text-white border-[#05331F] shadow-sm' 
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className={`text-[10px] font-bold uppercase tracking-wider ${selectedRegion === 'Kerala South' ? 'text-emerald-300' : 'text-slate-500'}`}>
            Kerala South
          </div>
          <div className="text-xl font-black font-mono mt-0.5">{regionStats['Kerala South']} Dealers</div>
          <div className={`text-[10px] truncate mt-1 ${selectedRegion === 'Kerala South' ? 'text-white/80' : 'text-emerald-700 font-semibold'}`}>
            Staff: BINSHA E S
          </div>
        </div>

        {/* Kerala North */}
        <div 
          onClick={() => {
            setSelectedRegion(selectedRegion === 'Kerala North' ? 'all' : 'Kerala North');
            setSelectedStaff('all');
          }}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            selectedRegion === 'Kerala North' 
              ? 'bg-[#05331F] text-white border-[#05331F] shadow-sm' 
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className={`text-[10px] font-bold uppercase tracking-wider ${selectedRegion === 'Kerala North' ? 'text-emerald-300' : 'text-slate-500'}`}>
            Kerala North
          </div>
          <div className="text-xl font-black font-mono mt-0.5">{regionStats['Kerala North']} Dealers</div>
          <div className={`text-[10px] truncate mt-1 ${selectedRegion === 'Kerala North' ? 'text-white/80' : 'text-emerald-700 font-semibold'}`}>
            Staff: SHAMNA
          </div>
        </div>

        {/* Tamil Nadu */}
        <div 
          onClick={() => {
            setSelectedRegion(selectedRegion === 'Tamil Nadu' ? 'all' : 'Tamil Nadu');
            setSelectedStaff('all');
          }}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            selectedRegion === 'Tamil Nadu' 
              ? 'bg-[#05331F] text-white border-[#05331F] shadow-sm' 
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className={`text-[10px] font-bold uppercase tracking-wider ${selectedRegion === 'Tamil Nadu' ? 'text-emerald-300' : 'text-slate-500'}`}>
            Tamil Nadu
          </div>
          <div className="text-xl font-black font-mono mt-0.5">{regionStats['Tamil Nadu']} Dealers</div>
          <div className={`text-[10px] truncate mt-1 ${selectedRegion === 'Tamil Nadu' ? 'text-white/80' : 'text-emerald-700 font-semibold'}`}>
            Staff: SARIKA S
          </div>
        </div>

        {/* Karnataka */}
        <div 
          onClick={() => {
            setSelectedRegion(selectedRegion === 'Karnataka' ? 'all' : 'Karnataka');
            setSelectedStaff('all');
          }}
          className={`p-3.5 rounded-2xl border transition cursor-pointer ${
            selectedRegion === 'Karnataka' 
              ? 'bg-[#05331F] text-white border-[#05331F] shadow-sm' 
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className={`text-[10px] font-bold uppercase tracking-wider ${selectedRegion === 'Karnataka' ? 'text-emerald-300' : 'text-slate-500'}`}>
            Karnataka
          </div>
          <div className="text-xl font-black font-mono mt-0.5">{regionStats['Karnataka']} Dealers</div>
          <div className={`text-[10px] truncate mt-1 ${selectedRegion === 'Karnataka' ? 'text-white/80' : 'text-emerald-700 font-semibold'}`}>
            Staff: SHAIFIL K K
          </div>
        </div>

        {/* Andhra / Telangana */}
        <div 
          onClick={() => {
            setSelectedRegion(selectedRegion === 'Andhra Pradesh / Telangana' ? 'all' : 'Andhra Pradesh / Telangana');
            setSelectedStaff('all');
          }}
          className={`p-3.5 rounded-2xl border transition cursor-pointer col-span-2 sm:col-span-4 lg:col-span-1 ${
            selectedRegion === 'Andhra Pradesh / Telangana' 
              ? 'bg-[#05331F] text-white border-[#05331F] shadow-sm' 
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className={`text-[10px] font-bold uppercase tracking-wider ${selectedRegion === 'Andhra Pradesh / Telangana' ? 'text-emerald-300' : 'text-slate-500'}`}>
            AP / Telangana
          </div>
          <div className="text-xl font-black font-mono mt-0.5">{regionStats['Andhra Pradesh / Telangana']} Dealers</div>
          <div className={`text-[10px] truncate mt-1 ${selectedRegion === 'Andhra Pradesh / Telangana' ? 'text-white/80' : 'text-slate-500'}`}>
            General Sales Desk
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dealer by name, dealer code (e.g. DLR-KS-01), region or sales rep..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-[#05331F]"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Filter: My Assigned Dealers */}
          {(isBinsha || isShamna || isSarika || isShaifil) && (
            <button
              onClick={() => {
                if (isBinsha) setSelectedStaff('BINSHA E S');
                if (isShamna) setSelectedStaff('SHAMNA');
                if (isSarika) setSelectedStaff('SARIKA S');
                if (isShaifil) setSelectedStaff('SHAIFIL K K');
                setSelectedRegion('all');
              }}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold text-[#05331F] transition whitespace-nowrap"
            >
              ★ My Assigned Dealers
            </button>
          )}

          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Regions ({STARK_DEALER_DIRECTORY.length})</option>
            <option value="Kerala South">Kerala South</option>
            <option value="Kerala North">Kerala North</option>
            <option value="Tamil Nadu">Tamil Nadu</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Andhra Pradesh / Telangana">AP / Telangana</option>
          </select>

          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Sales Reps</option>
            <option value="BINSHA E S">BINSHA E S (Kerala South)</option>
            <option value="SHAMNA">SHAMNA (Kerala North)</option>
            <option value="SARIKA S">SARIKA S (Tamil Nadu)</option>
            <option value="SHAIFIL K K">SHAIFIL K K (Karnataka)</option>
            <option value="General Sales Desk">General Sales Desk</option>
          </select>
        </div>
      </div>

      {/* VIEW A: REGISTERED DEALERS ROSTER WITH QUICK ORDER BOOKING */}
      {activeTab === 'directory' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Dealer Network Roster ({filteredDealers.length})
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Direct Order Entry Enabled
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-mono text-[11px] uppercase">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Dealer Name</th>
                  <th className="px-4 py-3">Dealer Code</th>
                  <th className="px-4 py-3">Territory</th>
                  <th className="px-4 py-3">Assigned Sales Rep</th>
                  <th className="px-4 py-3 text-right">Order Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDealers.map((dealer, idx) => (
                  <tr key={dealer.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{dealer.name}</td>
                    <td className="px-4 py-3 font-mono text-emerald-800 font-bold">{dealer.code}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {dealer.region}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{dealer.assignedStaff}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{dealer.staffEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedDealerForOrder(dealer)}
                        className="px-3 py-1.5 bg-[#05331F] hover:bg-[#07472b] text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1 ml-auto"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Book Order</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (

        /* VIEW B: ACTIVE DEALER ORDERS TABLE (SHOWING MODEL, COUNT, AND NEEDED DATE) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Active Dealer Orders & Delivery Dates ({dealerOrders.length})
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Live Pipeline
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-mono text-[11px] uppercase">
                <tr>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Dealer Name</th>
                  <th className="px-4 py-3">Door Model</th>
                  <th className="px-4 py-3 text-center">Door Count (Qty)</th>
                  <th className="px-4 py-3">Needed Delivery Date</th>
                  <th className="px-4 py-3">Sales Rep</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dealerOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      No door orders found in the system yet. Click "Book Order" on any dealer to submit.
                    </td>
                  </tr>
                ) : (
                  dealerOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-700">{order.id}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{order.dealerName || 'Dealer Order'}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {order.doorModel || 'SSD Standard Teak'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-sm text-[#05331F]">
                        {order.quantity || order.doorsConfirmed || 1} Doors
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                          <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                          {order.requiredDate || order.deadlineDate || 'Immediate'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{order.assignedToName || order.createdByName}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                          {order.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUICK ORDER MODAL FOR DEALER (MODEL, COUNT & NEEDED DATE) */}
      {selectedDealerForOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Dealer Order Entry
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">{selectedDealerForOrder.name}</h3>
              <p className="text-xs text-slate-500 font-mono">Code: {selectedDealerForOrder.code} • {selectedDealerForOrder.region}</p>
            </div>

            <div className="space-y-3 text-xs">
              {/* Door Model */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Door Model *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SSD-Teak-35mm / High-Gloss 40mm"
                  value={quickModel}
                  onChange={(e) => setQuickModel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-[#05331F]"
                />
              </div>

              {/* Door Count */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Door Count (Quantity) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quickCount}
                  onChange={(e) => setQuickCount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-[#05331F] outline-none focus:bg-white focus:ring-2 focus:ring-[#05331F]"
                />
              </div>

              {/* Needed Delivery Date */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">Needed Delivery Date *</label>
                <input
                  type="date"
                  required
                  value={quickNeededDate}
                  onChange={(e) => setQuickNeededDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-[#05331F] outline-none focus:bg-white focus:ring-2 focus:ring-[#05331F]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedDealerForOrder(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleLaunchOrder(selectedDealerForOrder)}
                className="px-4 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472b] text-white font-bold text-xs shadow-md transition"
              >
                Forward to Order Form
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
