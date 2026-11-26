import React, { useState, useMemo } from 'react';
import { 
  Package, Plus, Calendar, Clock, AlertTriangle, AlertCircle, 
  CheckCircle2, Search, Filter, ChevronRight, X, ArrowRight,
  ShieldCheck, FileText, Truck, DollarSign, Upload, Trash2, Check,
  Layers, Lock, Sparkles, Camera
} from 'lucide-react';
import { canAccessSales, getSalesScope, filterBookingsByScope, filterDealersByScope } from './salesPermissions';
import { createDealerBookingWithChain, subscribeToDoorCatalog } from './firestoreService';
import { getTodayDateString, getDateOffset } from './dateUtils';
import { 
  STARK_DOOR_CATALOG, 
  getActiveDoorModels, 
  getModelVariants, 
  STARK_LOCK_TYPES, 
  STARK_FINISHES 
} from './doorCatalog';
import { deriveBookingTimeline } from './orderChainWorkflow';

export default function DealerBookingsView({ 
  currentUser, 
  bookings = [], 
  dealers = [],
  employees = [],
  tasks = [],
  onOpenAssignOrderModal,
  onOpenTaskDetails
}) {
  // Access check
  if (!canAccessSales(currentUser)) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 max-w-lg mx-auto space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500">
          Dealer Bookings is restricted to Sales Department personnel and Executive Management.
        </p>
      </div>
    );
  }

  const userScope = getSalesScope(currentUser);
  const todayStr = getTodayDateString();

  // Only Sales Department personnel and Executive Directors can book orders
  const userDept = (currentUser?.department || currentUser?.departmentId || '').toLowerCase();
  const userRole = (currentUser?.role || '');
  const isSalesPerson = userDept === 'sales' || ['CSO', 'SSM', 'ASM', 'Sales Coordinator', 'Sales Executive', 'Executive Director', 'Director Operations'].includes(userRole);

  // Scoped datasets
  const scopedBookings = useMemo(() => {
    return filterBookingsByScope(bookings, currentUser, employees);
  }, [bookings, currentUser, employees]);

  const scopedDealers = useMemo(() => {
    return filterDealersByScope(dealers, currentUser, employees);
  }, [dealers, currentUser, employees]);

  // Tab Filter: 'today' | 'week' | 'due_soon' | 'overdue' | 'all'
  const isTransportUser = (currentUser?.department || currentUser?.departmentId || '').toLowerCase().includes('transport') ||
                          ['Transport Manager', 'Transport Coordinator', 'Driver', 'Delivery Partner'].includes(currentUser?.role);
  const [activeTab, setActiveTab] = useState(isTransportUser ? 'all' : 'today');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDealerFilter, setSelectedDealerFilter] = useState('all');

  // Add Booking Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDealerId, setSelectedDealerId] = useState('');
  const [bookingDate, setBookingDate] = useState(todayStr);
  const [requiredByDate, setRequiredByDate] = useState(() => getDateOffset(3));
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Door lines state (one or more items)
  const [doorLines, setDoorLines] = useState([
    { 
      id: 1, 
      model: 'SRK 001', 
      size: '2050X880X70X5" SL', 
      lockType: STARK_LOCK_TYPES[0], 
      finish: STARK_FINISHES[0], 
      quantity: 1 
    }
  ]);

  // Dynamic Door Catalog from Firestore (fallback to STARK_DOOR_CATALOG)
  const [activeCatalog, setActiveCatalog] = useState(STARK_DOOR_CATALOG);
  React.useEffect(() => {
    const unsub = subscribeToDoorCatalog((models) => {
      if (models && models.length > 0) {
        const map = new Map();
        STARK_DOOR_CATALOG.forEach(item => map.set(item.model, item));
        models.forEach(item => map.set(item.model, item));
        setActiveCatalog(Array.from(map.values()));
      } else {
        setActiveCatalog(STARK_DOOR_CATALOG);
      }
    });
    return () => unsub();
  }, []);

  const getDynamicModelVariants = (modelName) => {
    const item = activeCatalog.find(d => d.model === modelName);
    return item ? item.variants : getModelVariants(modelName);
  };

  // Detail Drawer state
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const selectedBooking = useMemo(() => {
    if (!selectedBookingId) return null;
    return bookings.find(b => b.id === selectedBookingId) || null;
  }, [selectedBookingId, bookings]);
  const setSelectedBooking = (b) => setSelectedBookingId(b ? b.id : null);

  // Summary Strip Counters
  const summaryCounters = useMemo(() => {
    let todayBookings = 0;
    let doorsToday = 0;
    let dueThisWeek = 0;
    let overdueCount = 0;

    const sevenDaysOut = getDateOffset(7);

    scopedBookings.forEach(b => {
      const isBookedToday = (b.bookingDate || b.bookedAt || '').startsWith(todayStr);
      const isCompleted = b.status === 'Dispatched' || b.status === 'Completed';

      if (isBookedToday) {
        todayBookings++;
        doorsToday += parseInt(b.totalQuantity, 10) || (b.lines ? b.lines.length : 1);
      }

      if (!isCompleted && b.requiredBy) {
        if (b.requiredBy < todayStr) {
          overdueCount++;
        } else if (b.requiredBy <= sevenDaysOut) {
          dueThisWeek++;
        }
      }
    });

    return { todayBookings, doorsToday, dueThisWeek, overdueCount };
  }, [scopedBookings, todayStr]);

  // Filtered Bookings based on Tab and Search
  const filteredBookings = useMemo(() => {
    const threeDaysOut = getDateOffset(3);
    const sevenDaysOut = getDateOffset(7);

    return scopedBookings.filter(b => {
      const isCompleted = b.status === 'Dispatched' || b.status === 'Completed';

      if (activeTab === 'today') {
        const isToday = (b.bookingDate || b.bookedAt || '').startsWith(todayStr);
        if (!isToday) return false;
      } else if (activeTab === 'week') {
        if (!b.requiredBy || b.requiredBy < todayStr || b.requiredBy > sevenDaysOut) return false;
      } else if (activeTab === 'due_soon') {
        if (isCompleted || !b.requiredBy || b.requiredBy < todayStr || b.requiredBy > threeDaysOut) return false;
      } else if (activeTab === 'overdue') {
        if (isCompleted || !b.requiredBy || b.requiredBy >= todayStr) return false;
      }

      if (selectedDealerFilter !== 'all' && b.dealerId !== selectedDealerFilter && b.dealerName !== selectedDealerFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDealer = (b.dealerName || '').toLowerCase().includes(q);
        const matchAddress = (b.deliveryAddress || '').toLowerCase().includes(q);
        const matchModel = (b.lines || []).some(l => (l.model || '').toLowerCase().includes(q));
        if (!matchDealer && !matchAddress && !matchModel) return false;
      }

      return true;
    }).sort((a, b) => (a.requiredBy || '').localeCompare(b.requiredBy || ''));
  }, [scopedBookings, activeTab, selectedDealerFilter, searchQuery, todayStr]);

  // Door line handlers
  const addDoorLine = () => {
    const defaultModel = activeCatalog[0]?.model || 'SRK 001';
    const variants = getDynamicModelVariants(defaultModel);
    const defaultSize = variants[0]?.size || '2050X880X70X5" SL';

    setDoorLines(prev => [
      ...prev,
      { 
        id: Date.now(), 
        model: defaultModel, 
        size: defaultSize, 
        lockType: STARK_LOCK_TYPES[0], 
        finish: STARK_FINISHES[0], 
        quantity: 1 
      }
    ]);
  };

  const removeDoorLine = (id) => {
    if (doorLines.length <= 1) return;
    setDoorLines(prev => prev.filter(l => l.id !== id));
  };

  const updateDoorLine = (id, field, val) => {
    setDoorLines(prev => prev.map(l => {
      if (l.id !== id) return l;

      // If model changed, also reset the size to the first active variant of that model
      if (field === 'model') {
        const variants = getDynamicModelVariants(val);
        const firstContinue = variants.find(v => v.status === 'CONTINUE');
        const defaultSize = firstContinue ? firstContinue.size : (variants[0]?.size || '');
        return {
          ...l,
          model: val,
          size: defaultSize
        };
      }

      return { ...l, [field]: val };
    }));
  };

  // Handle Create Booking Submission
  const handleCreateBooking = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!selectedDealerId) {
      setFormError('Please select a dealer from your scope.');
      return;
    }

    if (requiredByDate < bookingDate) {
      setFormError('Required-by date cannot be earlier than booking date.');
      return;
    }

    const dealerObj = scopedDealers.find(d => d.id === selectedDealerId || d.name === selectedDealerId);
    if (!dealerObj) {
      setFormError('Invalid dealer selected.');
      return;
    }

    setIsSubmitting(true);

    try {
      await createDealerBookingWithChain({
        dealerId: dealerObj.id,
        dealerName: dealerObj.name,
        dealerCode: dealerObj.code,
        region: dealerObj.region,
        bookingDate,
        requiredBy: requiredByDate,
        deliveryAddress: deliveryAddress.trim() || dealerObj.address || dealerObj.region,
        notes: notes.trim(),
        lines: doorLines,
        assignedTo: dealerObj.assignedStaff || currentUser.fullName || currentUser.name,
        assignedToId: currentUser.id || currentUser.uid
      }, currentUser);

      setIsAddModalOpen(false);
      const firstModel = activeCatalog[0]?.model || 'SRK 001';
      const defaultVar = getDynamicModelVariants(firstModel)[0]?.size || '2050X880X70X5" SL';
      setDoorLines([{ id: 1, model: firstModel, size: defaultVar, lockType: STARK_LOCK_TYPES[0], finish: STARK_FINISHES[0], quantity: 1 }]);
      setNotes('');
      setDeliveryAddress('');
      setActiveTab('all');
    } catch (err) {
      console.error('Failed to create booking:', err);
      setFormError('Error logging booking and linked chain: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Badge Helper
  const renderStatusPill = (booking) => {
    const isOverdue = booking.requiredBy && booking.requiredBy < todayStr && booking.status !== 'Dispatched';
    const isDueSoon = booking.requiredBy && booking.requiredBy <= getDateOffset(3) && booking.status !== 'Dispatched';

    if (booking.status === 'Payment Hold') {
      return (
        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
          Payment Hold
        </span>
      );
    }
    if (booking.status === 'Pending Approval') {
      return (
        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
          Pending Approval
        </span>
      );
    }
    if (booking.status === 'Dispatched') {
      return (
        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
          Dispatched
        </span>
      );
    }
    if (isOverdue) {
      return (
        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
          Overdue ({booking.status})
        </span>
      );
    }
    if (isDueSoon) {
      return (
        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          Due in 3d ({booking.status})
        </span>
      );
    }

    return (
      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
        {booking.status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dealer Door Bookings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dealer orders and delivery status
          </p>
        </div>

        {isSalesPerson && (
          <button
            onClick={() => {
              if (scopedDealers.length > 0) setSelectedDealerId(scopedDealers[0].id);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472B] text-white text-xs font-semibold shadow-2xs transition shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-300" />
            <span>Add Booking</span>
          </button>
        )}
      </div>

      {/* Summary Strip (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Bookings Today</p>
          <p className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">{summaryCounters.todayBookings}</p>
          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Logged orders</p>
        </div>

        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Doors Booked Today</p>
          <p className="text-lg sm:text-xl font-bold text-[#05331F] mt-0.5">{summaryCounters.doorsToday}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Total units queued</p>
        </div>

        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Due This Week</p>
          <p className="text-lg sm:text-xl font-bold text-amber-600 mt-0.5">{summaryCounters.dueThisWeek}</p>
          <p className="text-[10px] text-amber-600 font-medium mt-0.5">Delivery milestone</p>
        </div>

        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Overdue Deliveries</p>
          <p className="text-lg sm:text-xl font-bold text-rose-600 mt-0.5">{summaryCounters.overdueCount}</p>
          <p className="text-[10px] text-rose-500 font-medium mt-0.5">Escalated to team</p>
        </div>
      </div>

      {/* Toolbar: Filter Tabs & Search */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'due_soon', label: 'Due Soon (≤3d)' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'all', label: 'All Bookings' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-[#05331F] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Dealer Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search dealer, model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#05331F]"
            />
          </div>

          <select
            value={selectedDealerFilter}
            onChange={(e) => setSelectedDealerFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none"
          >
            <option value="all">All Dealers</option>
            {scopedDealers.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bookings Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredBookings.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Package className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-700">No bookings in this filter</p>
            <p className="text-xs">There are no door orders matching the selected scope or timeframe.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Dealer Showroom</th>
                  <th className="py-3 px-4">Doors & Models</th>
                  <th className="py-3 px-4">Required-By Date</th>
                  <th className="py-3 px-4">Assigned Salesperson</th>
                  <th className="py-3 px-4 text-center">Status Flow</th>
                  <th className="py-3 px-4 text-right">Chain Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((booking, bIdx) => {
                  const totalUnits = booking.totalQuantity || (booking.lines ? booking.lines.reduce((s, l) => s + (parseInt(l.quantity, 10) || 1), 0) : 1);
                  const isOverdue = booking.requiredBy && booking.requiredBy < todayStr && booking.status !== 'Dispatched';

                  return (
                    <tr 
                      key={booking.id ? `${booking.id}-${bIdx}` : `booking-${bIdx}`}
                      onClick={() => setSelectedBooking(booking)}
                      className="hover:bg-slate-50/70 cursor-pointer transition"
                    >
                      {/* Dealer */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{booking.dealerName}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{booking.deliveryAddress || booking.region}</p>
                      </td>

                      {/* Doors */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{totalUnits} Door(s)</span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                          {(booking.lines || []).map(l => `${l.quantity}x ${l.model}`).join(', ') || 'Standard Doors'}
                        </p>
                      </td>

                      {/* Required-by */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar className={`w-3.5 h-3.5 ${isOverdue ? 'text-rose-600' : 'text-slate-400'}`} />
                          <span className={`font-semibold ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-800'}`}>
                            {booking.requiredBy || 'Pending'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">Booked: {booking.bookingDate || booking.bookedAt?.slice(0, 10)}</span>
                      </td>

                      {/* Assigned staff */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800">{booking.assignedTo || 'Sales Desk'}</span>
                      </td>

                      {/* Status Flow */}
                      <td className="py-3 px-4 text-center">
                        {renderStatusPill(booking)}
                      </td>

                      {/* Open Chevron */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBooking(booking);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Booking Detail & Status History Drawer */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-2xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{selectedBooking.dealerName}</h3>
                <p className="text-xs text-slate-500">Booking ID: {selectedBooking.id?.slice(0, 8)}</p>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              
              {/* 5-Stage Live Production & Dispatch Chain */}
              {(() => {
                const timelineStages = deriveBookingTimeline(selectedBooking, tasks);
                return (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900 text-xs">Production & Dispatch Chain</p>
                      <span className="text-[10px] font-semibold text-slate-500">Live Stage Tracker</span>
                    </div>
                    
                    <div className="grid grid-cols-5 gap-1 text-[10px] pt-1">
                      {timelineStages.map((stg, sIdx) => {
                        const isDone = stg.status === 'completed';
                        const isHold = stg.status === 'hold' || stg.status === 'blocked';
                        const isInProg = stg.status === 'in_progress';
                        return (
                          <div key={stg.id} className="text-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold mx-auto mb-1 text-[11px] transition ${
                              isDone ? 'bg-emerald-600 text-white' :
                              isHold ? 'bg-rose-500 text-white' :
                              isInProg ? 'bg-amber-500 text-white animate-pulse' :
                              'bg-slate-200 text-slate-500'
                            }`}>
                              {isDone ? '✓' : isHold ? '!' : sIdx + 1}
                            </div>
                            <span className="font-semibold text-slate-700 block truncate" title={stg.title}>
                              {stg.title.split(' ')[0]}
                            </span>
                            <span className="text-[9px] text-slate-400 block truncate">{stg.dept}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                      <span className="text-slate-500">Current Status:</span>
                      <span className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                        selectedBooking.status === 'Payment Hold' ? 'bg-rose-100 text-rose-800' :
                        selectedBooking.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-emerald-50 text-[#05331F]'
                      }`}>
                        {selectedBooking.status}
                      </span>
                    </div>

                    {/* Direct Verify Action for Accounts */}
                    {(() => {
                      const isFinance = (currentUser?.department || '').toLowerCase() === 'finance' ||
                                        (currentUser?.department || '').toLowerCase() === 'accounts' ||
                                        ['Accounts Manager', 'Accountant', 'Junior Accountant'].includes(currentUser?.role);
                      const isPendingClearance = selectedBooking.status === 'Booked' || selectedBooking.status === 'Payment Hold';
                      if (!isFinance || !isPendingClearance) return null;

                      // Match corresponding payment verification task
                      const linkedTask = tasks.find(t => 
                        (selectedBooking.linkedTaskIds && selectedBooking.linkedTaskIds.includes(t.id)) ||
                        t.sourceBookingId === selectedBooking.id || 
                        t.bookingId === selectedBooking.id ||
                        (t.taskType === 'Payment verification' && (t.partyName === selectedBooking.dealerName || t.dealerName === selectedBooking.dealerName))
                      );

                      return (
                        <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                          <div>
                            <p className="font-bold text-emerald-900 text-xs">Action Required: Verify Advance Payment</p>
                            <p className="text-[10px] text-emerald-700">Check payment and clear or place on hold</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const taskToOpen = linkedTask || {
                                id: `temp_pay_${selectedBooking.id}`,
                                taskType: 'Payment verification',
                                title: `Verify payment token - ${selectedBooking.dealerName}`,
                                partyName: selectedBooking.dealerName,
                                dealerName: selectedBooking.dealerName,
                                bookingId: selectedBooking.id,
                                sourceBookingId: selectedBooking.id,
                                reference: selectedBooking.dealerCode || selectedBooking.id?.slice(-6).toUpperCase(),
                                salespersonName: selectedBooking.assignedTo || 'Sales Desk',
                                taskDate: todayStr,
                                date: todayStr,
                                requiredBy: selectedBooking.requiredBy,
                                deadlineDate: selectedBooking.requiredBy,
                                paymentStatus: selectedBooking.paymentStatus || 'Pending Token',
                                accountsClearance: selectedBooking.accountsClearance || 'Pending Token',
                                holdReason: selectedBooking.holdReason || '',
                                department: 'finance',
                                departmentId: 'finance'
                              };
                              onOpenTaskDetails && onOpenTaskDetails(taskToOpen);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-[#05331F] hover:bg-[#07472B] active:bg-[#032214] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                          >
                            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Verify Payment</span>
                          </button>
                        </div>
                      );
                    })()}

                    {/* Direct Warehouse Picking Action for Warehouse */}
                    {(() => {
                      const isWarehouse = (currentUser?.department || '').toLowerCase() === 'warehouse' ||
                                          (currentUser?.department || '').toLowerCase() === 'operations' ||
                                          ['Warehouse In-charge', 'Warehouse Supervisor', 'Warehouse Executive', 'Loading Staff'].includes(currentUser?.role);
                      if (!isWarehouse) return null;

                      // Match corresponding picking task
                      const linkedPickingTask = tasks.find(t => 
                        (selectedBooking.linkedTaskIds && selectedBooking.linkedTaskIds.includes(t.id)) ||
                        t.sourceBookingId === selectedBooking.id || 
                        t.bookingId === selectedBooking.id ||
                        ((t.title || '').toLowerCase().includes('picking') && (t.dealerName === selectedBooking.dealerName || (t.title || '').includes(selectedBooking.dealerName)))
                      );

                      const isAccountsCleared = selectedBooking.status === 'Accounts Cleared' || selectedBooking.paymentStatus === 'Verified';

                      return (
                        <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                          <div>
                            <p className="font-bold text-emerald-900 text-xs">Warehouse Picking & Staging</p>
                            <p className="text-[10px] text-emerald-700">
                              {isAccountsCleared ? 'Payment cleared - Ready for picking' : 'Awaiting payment confirmation before picking'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const taskToOpen = linkedPickingTask || {
                                id: `temp_pick_${selectedBooking.id}`,
                                taskType: 'Warehouse Picking',
                                title: `[Warehouse Picking] ${selectedBooking.dealerName} - ${selectedBooking.totalQuantity || 1} Doors`,
                                partyName: selectedBooking.dealerName,
                                dealerName: selectedBooking.dealerName,
                                bookingId: selectedBooking.id,
                                sourceBookingId: selectedBooking.id,
                                reference: selectedBooking.dealerCode || selectedBooking.id?.slice(-6).toUpperCase(),
                                taskDate: todayStr,
                                date: todayStr,
                                requiredBy: selectedBooking.requiredBy,
                                deadlineDate: selectedBooking.requiredBy,
                                department: 'warehouse',
                                departmentId: 'warehouse',
                                status: isAccountsCleared ? 'Pending' : 'Blocked',
                                blockerReason: isAccountsCleared ? '' : 'Payment confirmation pending from Accounts'
                              };
                              onOpenTaskDetails && onOpenTaskDetails(taskToOpen);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-[#05331F] hover:bg-[#07472B] active:bg-[#032214] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                          >
                            <Package className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{linkedPickingTask ? 'Open Picking Task' : 'Start Picking'}</span>
                          </button>
                        </div>
                      );
                    })()}

                    {/* Direct Transportation Dispatch Action for Transport */}
                    {(() => {
                      const isTransport = (currentUser?.department || '').toLowerCase() === 'transportation' ||
                                          (currentUser?.department || '').toLowerCase() === 'transport' ||
                                          ['Transport Manager', 'Transport Coordinator', 'Driver', 'Delivery Partner'].includes(currentUser?.role);
                      if (!isTransport) return null;

                      const isDriverRole = ['Driver', 'Delivery Partner'].includes(currentUser?.role);
                      const isTransportLead = ['Transport Manager', 'Transport Coordinator', 'Executive Director', 'Director Operations'].includes(currentUser?.role);

                      // Match corresponding dispatch route task
                      const linkedDispatchTask = tasks.find(t => 
                        (selectedBooking.linkedTaskIds && selectedBooking.linkedTaskIds.includes(t.id)) ||
                        t.id === `temp_trans_${selectedBooking.id}` ||
                        t.sourceBookingId === selectedBooking.id || 
                        t.bookingId === selectedBooking.id ||
                        ((t.title || '').toLowerCase().includes('dispatch') && (t.dealerName === selectedBooking.dealerName || (t.title || '').includes(selectedBooking.dealerName)))
                      );

                      const isWarehousePicked = selectedBooking.status === 'Picked' || selectedBooking.status === 'Dispatched' || selectedBooking.status === 'Completed';

                      // Check if already dispatched / driver assigned on booking or task
                      const assignedDriverName = linkedDispatchTask?.driverName || selectedBooking.driverName || (linkedDispatchTask?.assignedToName && linkedDispatchTask?.assignedToName !== 'Transport Manager' ? linkedDispatchTask.assignedToName : null);
                      const assignedVehicle = linkedDispatchTask?.vehicleNumber || selectedBooking.vehicleNumber;
                      const isAlreadyDispatched = selectedBooking.status === 'Dispatched' || selectedBooking.status === 'Delivered' || linkedDispatchTask?.isDispatched || Boolean(assignedDriverName);

                      // Task object for modal
                      const taskToOpen = linkedDispatchTask || {
                        id: `temp_trans_${selectedBooking.id}`,
                        taskType: isDriverRole ? 'Transit Delivery' : 'Dispatch Route',
                        title: `[Dispatch Route] ${selectedBooking.dealerName} - ${selectedBooking.totalQuantity || 1} Doors`,
                        partyName: selectedBooking.dealerName,
                        dealerName: selectedBooking.dealerName,
                        bookingId: selectedBooking.id,
                        sourceBookingId: selectedBooking.id,
                        reference: selectedBooking.dealerCode || selectedBooking.id?.slice(-6).toUpperCase(),
                        taskDate: selectedBooking.dispatchDate || todayStr,
                        date: selectedBooking.dispatchDate || todayStr,
                        requiredBy: selectedBooking.requiredBy,
                        deadlineDate: selectedBooking.requiredBy,
                        department: 'transportation',
                        departmentId: 'transportation',
                        status: isAlreadyDispatched ? 'In Progress' : (isWarehousePicked ? 'In Progress' : 'Blocked'),
                        assignedTo: selectedBooking.assignedDriverId || selectedBooking.driverId || currentUser?.id,
                        assignedToId: selectedBooking.assignedDriverId || selectedBooking.driverId || currentUser?.id,
                        driverId: selectedBooking.assignedDriverId || selectedBooking.driverId || '',
                        assignedDriverId: selectedBooking.assignedDriverId || selectedBooking.driverId || '',
                        driverName: selectedBooking.driverName || '',
                        vehicleNumber: selectedBooking.vehicleNumber || 'KL-55-B-9021',
                        departureWindow: selectedBooking.departureWindow || '6:00 PM Shift',
                        region: selectedBooking.region || 'Kerala North',
                        deliveryRegion: selectedBooking.region || 'Kerala North',
                        customDispatchDate: selectedBooking.dispatchDate || todayStr,
                        blockerReason: isWarehousePicked ? '' : 'Warehouse picking pending'
                      };

                      const isTrSubmitted = linkedDispatchTask?.status === 'Pending Review' || linkedDispatchTask?.status === 'Waiting for Sign-Off' || linkedDispatchTask?.status === 'Completed' || linkedDispatchTask?.isDeliveryCompleted;
                      const isDelivered = selectedBooking.status === 'Delivered' || (linkedDispatchTask && (linkedDispatchTask.status === 'Completed' || linkedDispatchTask.approvalStatus === 'approved'));

                      return (
                        <div className="mt-3 pt-3 border-t border-slate-200 bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-blue-900 text-xs">Transportation Dispatch & POD</p>
                              <p className="text-[10px] text-blue-700">
                                {isDelivered
                                  ? 'Delivery completed and signed off.'
                                  : isTrSubmitted
                                  ? 'Driver marked delivered · Submitted for coordinator sign-off'
                                  : isAlreadyDispatched 
                                  ? `Driver: ${assignedDriverName || 'Assigned'} · Vehicle: ${assignedVehicle || 'Assigned'}`
                                  : isWarehousePicked ? 'Warehouse doors picked & staged - Ready to load & dispatch' : 'Waiting for Warehouse doors picking & staging'}
                              </p>
                            </div>
                            
                            {/* Action Button: Drivers execute delivery and capture POD; Coordinators assign/edit */}
                            {isDriverRole ? (
                              <button
                                type="button"
                                onClick={() => onOpenTaskDetails && onOpenTaskDetails(taskToOpen)}
                                className={`px-3.5 py-1.5 rounded-xl text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0 ${
                                  isTrSubmitted || isDelivered ? 'bg-emerald-800 hover:bg-emerald-700' : 'bg-[#05331F] hover:bg-[#07472B]'
                                }`}
                              >
                                <Camera className="w-3.5 h-3.5 text-emerald-300" />
                                <span>{isDelivered ? 'View Delivery Proof' : isTrSubmitted ? 'Delivered (Awaiting Sign-Off)' : 'Execute Delivery & Upload POD'}</span>
                              </button>
                            ) : isTransportLead ? (
                              <button
                                type="button"
                                onClick={() => onOpenTaskDetails && onOpenTaskDetails(taskToOpen)}
                                className="px-3.5 py-1.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                              >
                                <Truck className="w-3.5 h-3.5 text-blue-300" />
                                <span>{isAlreadyDispatched ? 'Edit / View Driver Assignment' : linkedDispatchTask ? 'Execute Dispatch Route' : 'Assign Driver & Vehicle'}</span>
                              </button>
                            ) : null}
                          </div>
                          {isAlreadyDispatched && (
                            <div className="bg-white/80 p-2 rounded-lg border border-blue-100 flex items-center justify-between text-[11px]">
                              <span className="text-slate-600">
                                Assigned Driver: <strong className="text-slate-900">{assignedDriverName || 'Fleet Driver'}</strong> ({assignedVehicle || 'KL-55-B-9021'})
                              </span>
                              <span className={`font-bold px-2 py-0.5 rounded-md border ${
                                isDelivered 
                                  ? 'text-emerald-800 bg-emerald-100 border-emerald-300' 
                                  : isTrSubmitted 
                                  ? 'text-amber-800 bg-amber-100 border-amber-300' 
                                  : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                              }`}>
                                {isDelivered ? 'Delivered' : isTrSubmitted ? 'Delivered · In Review' : 'Dispatched'}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

              {/* Doors List */}
              <div>
                <p className="font-bold text-slate-800 mb-2">Booked Door Models & Specifications</p>
                <div className="space-y-2">
                  {(selectedBooking.lines || []).map((l, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{l.model}</p>
                        <p className="text-[11px] text-slate-500">Size & Spec: {l.size || l.sizeVariant} {' \u00B7 '} Lock: {l.lockType} {' \u00B7 '} Finish: {l.finish}</p>
                      </div>
                      <span className="text-sm font-bold text-[#05331F] px-2 py-0.5 bg-white rounded-lg border border-slate-200">
                        {l.quantity} Qty
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Audit History */}
              {selectedBooking.statusHistory && (
                <div>
                  <p className="font-bold text-slate-800 mb-2">Status Audit Trail</p>
                  <div className="space-y-2">
                    {selectedBooking.statusHistory.map((sh, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] space-y-0.5">
                        <div className="flex justify-between font-semibold text-slate-800">
                          <span>{sh.status}</span>
                          <span className="text-slate-400 font-normal">{sh.timestamp?.slice(0, 16).replace('T', ' ')}</span>
                        </div>
                        <p className="text-slate-500">By {sh.performedBy} ({sh.performedByRole || 'Staff'})</p>
                        {sh.notes && <p className="text-slate-600 italic mt-0.5">"{sh.notes}"</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Booking Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">New Dealer Door Booking</h3>
                <p className="text-xs text-slate-500">Auto-generates task chain for Accounts, Warehouse and Transport</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              
              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Dealer select */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Dealer (Your Scope) *</label>
                <select
                  value={selectedDealerId}
                  onChange={(e) => setSelectedDealerId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-medium text-slate-800"
                >
                  {scopedDealers.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.region})</option>
                  ))}
                </select>
              </div>

              {/* Booking & Required By Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Booking Date</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Required-By Date *</label>
                  <input
                    type="date"
                    required
                    value={requiredByDate}
                    onChange={(e) => setRequiredByDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50"
                  />
                </div>
              </div>

              {/* Multi-Door Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Door Line Items ({doorLines.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={addDoorLine}
                    className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Model</span>
                  </button>
                </div>

                {doorLines.map((line, idx) => {
                  const variants = getDynamicModelVariants(line.model);
                  const selectedVariant = variants.find(v => v.size === line.size);
                  const isDiscontinued = selectedVariant?.status === 'STOP';

                  return (
                    <div key={line.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3 relative">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[11px] text-slate-700">Door #{idx + 1}</span>
                          {isDiscontinued ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Discontinued Variant
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Production Active
                            </span>
                          )}
                        </div>
                        {doorLines.length > 1 && (
                          <button type="button" onClick={() => removeDoorLine(line.id)} className="text-rose-500 hover:text-rose-700">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Row 1: Model & Quantity */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <span className="text-[10px] font-semibold text-slate-500 block mb-1">STARK Door Model</span>
                          <select
                            value={line.model}
                            onChange={(e) => updateDoorLine(line.id, 'model', e.target.value)}
                            className="w-full border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold text-slate-800"
                          >
                            {Array.from(new Set(activeCatalog.map(d => d.category || 'Standard Series'))).map(cat => (
                              <optgroup key={cat} label={cat}>
                                {activeCatalog.filter(d => (d.category || 'Standard Series') === cat).map(item => (
                                  <option key={item.model} value={item.model}>
                                    {item.model}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold text-slate-500 block mb-1">Quantity (Doors)</span>
                          <input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) => updateDoorLine(line.id, 'quantity', e.target.value)}
                            className="w-full border border-slate-200 rounded-lg p-2 bg-white text-xs text-center font-bold text-slate-900"
                          />
                        </div>
                      </div>

                      {/* Row 2: Available Size & Specification for this Model */}
                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 block mb-1">
                          Size & Category Specification (Filtered for {line.model})
                        </span>
                        <select
                          value={line.size}
                          onChange={(e) => updateDoorLine(line.id, 'size', e.target.value)}
                          className={`w-full border rounded-lg p-2 bg-white text-xs font-medium ${
                            isDiscontinued ? 'border-rose-300 text-rose-900 bg-rose-50/50' : 'border-slate-200 text-slate-800'
                          }`}
                        >
                          {variants.map(v => (
                            <option key={v.size} value={v.size}>
                              {v.size} {v.status === 'STOP' ? '— [STOP / DISCONTINUED]' : '— [ACTIVE]'}
                            </option>
                          ))}
                        </select>
                        {isDiscontinued && (
                          <p className="text-[10px] text-rose-600 mt-1">
                            Warning: Factory marked this size as STOP. Check with factory operations before taking dealer advance.
                          </p>
                        )}
                      </div>

                      {/* Row 3: Lock Mechanism & Finish */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-500 block mb-1">Lock Mechanism</span>
                          <select
                            value={line.lockType}
                            onChange={(e) => updateDoorLine(line.id, 'lockType', e.target.value)}
                            className="w-full border border-slate-200 rounded-lg p-2 bg-white text-xs"
                          >
                            {STARK_LOCK_TYPES.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold text-slate-500 block mb-1">Color / Finish</span>
                          <select
                            value={line.finish}
                            onChange={(e) => updateDoorLine(line.id, 'finish', e.target.value)}
                            className="w-full border border-slate-200 rounded-lg p-2 bg-white text-xs"
                          >
                            {STARK_FINISHES.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Delivery Address */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Site Delivery Address / Route Landmark</label>
                <textarea
                  rows="2"
                  placeholder="Leave empty to use dealer showroom address..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472B] text-white font-semibold"
                >
                  {isSubmitting ? 'Queueing Order...' : 'Confirm Door Booking'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

