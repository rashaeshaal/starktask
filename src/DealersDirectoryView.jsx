import React, { useState, useMemo } from 'react';
import { 
  Building2, Users, Search, Phone, Mail, MapPin, 
  ExternalLink, Plus, Filter, CheckCircle2, ChevronRight,
  ShieldCheck, ArrowUpDown, Download, Package, Calendar, Clock,
  X, UserCheck, History, ArrowRight, AlertCircle, Loader2
} from 'lucide-react';
import { canAccessSales, getSalesScope, filterDealersByScope } from './salesPermissions';
import { saveDealerRecord } from './firestoreService';
import { canViewAll, isGlobalManager } from './permissions';
import { useToast } from './ToastContext';

export default function DealersDirectoryView({ 
  currentUser, 
  dealers = [],
  bookings = [],
  employees = [],
  onOpenAssignOrderModal,
  onNavigateToTab
}) {
  // 1. Access Restriction Check
  const { showToast } = useToast();
  const hasAccess = canAccessSales(currentUser);
  if (!hasAccess) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 max-w-lg mx-auto space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500">
          You don't have access to the Sales Department & Dealer directory. This module is restricted to Sales personnel and Executive Management.
        </p>
      </div>
    );
  }

  const userScope = getSalesScope(currentUser);
  const isAllAccess = userScope === 'ALL';
  const canReassign = ['CSO', 'SSM', 'ASM'].includes(currentUser?.role) || isAllAccess || isGlobalManager(currentUser);

  // Filter scoped dealers
  const scopedDealers = useMemo(() => {
    return filterDealersByScope(dealers, currentUser, employees);
  }, [dealers, currentUser, employees]);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState('all');

  // Modal / Drawer state
  const [selectedDealer, setSelectedDealer] = useState(null); // Detail drawer
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);

  // Form states for Add Dealer
  const [formName, setFormName] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formRegion, setFormRegion] = useState('Kerala South');
  const [formGst, setFormGst] = useState('');
  const [formAssignedStaff, setFormAssignedStaff] = useState(currentUser?.fullName || currentUser?.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Reassign state
  const [reassignTargetStaff, setReassignTargetStaff] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);

  // Regions extracted
  const regions = useMemo(() => {
    const set = new Set();
    scopedDealers.forEach(d => { if (d.region) set.add(d.region); });
    return Array.from(set);
  }, [scopedDealers]);

  // Salespersons extracted
  const salespersons = useMemo(() => {
    const set = new Set();
    scopedDealers.forEach(d => { 
      const staff = d.assignedStaff || d.assignedTo;
      if (staff) set.add(staff);
    });
    return Array.from(set);
  }, [scopedDealers]);

  // Downline sales staff allowed to be assigned dealers
  const assignableSalesStaff = useMemo(() => {
    return employees.filter(e => {
      const dept = (e.department || e.departmentId || '').toLowerCase();
      return dept.includes('sales') || ['CSO', 'SSM', 'ASM', 'Sales Coordinator'].includes(e.role);
    });
  }, [employees]);

  // Filtered list
  const filteredDealers = useMemo(() => {
    return scopedDealers.filter(d => {
      if (selectedRegion !== 'all' && d.region !== selectedRegion) return false;
      if (selectedStaff !== 'all' && (d.assignedStaff || d.assignedTo) !== selectedStaff) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (d.name || '').toLowerCase().includes(q);
        const matchCode = (d.code || '').toLowerCase().includes(q);
        const matchContact = (d.contactPerson || d.contact || '').toLowerCase().includes(q);
        const matchPhone = (d.phone || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchContact && !matchPhone) return false;
      }

      return true;
    });
  }, [scopedDealers, selectedRegion, selectedStaff, searchQuery]);

  // Open tasks / bookings for selected dealer in drawer
  const dealerBookings = useMemo(() => {
    if (!selectedDealer) return [];
    return bookings.filter(b => b.dealerId === selectedDealer.id || b.dealerName === selectedDealer.name);
  }, [selectedDealer, bookings]);

  // Handle Add Dealer Submission
  const handleAddDealer = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Dealer name is required');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const code = 'DLR-' + Math.floor(100 + Math.random() * 900);
      await saveDealerRecord({
        name: formName.trim(),
        contactPerson: formContact.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        address: formAddress.trim(),
        region: formRegion,
        gstNumber: formGst.trim(),
        assignedStaff: formAssignedStaff || (currentUser?.fullName || currentUser?.name),
        code
      }, currentUser);

      setIsAddModalOpen(false);
      setFormName('');
      setFormContact('');
      setFormPhone('');
      setFormEmail('');
      setFormAddress('');
      setFormGst('');
    } catch (err) {
      console.error('Failed to create dealer:', err);
      setFormError('Failed to save dealer record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reassign Dealer
  const handleReassignDealer = async () => {
    if (!selectedDealer || !reassignTargetStaff) return;
    setIsReassigning(true);

    try {
      await saveDealerRecord({
        ...selectedDealer,
        assignedStaff: reassignTargetStaff,
        assignedTo: reassignTargetStaff
      }, currentUser);

      setSelectedDealer(prev => prev ? { ...prev, assignedStaff: reassignTargetStaff, assignedTo: reassignTargetStaff } : null);
      setIsReassignModalOpen(false);
      showToast('Dealer reassigned successfully!', 'success');
    } catch (err) {
      console.error('Failed to reassign dealer:', err);
      showToast('Error reassigning dealer: ' + err.message, 'error');
    } finally {
      setIsReassigning(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dealers Network</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Scope: <span className="font-semibold text-slate-800">{userScope}</span> {' \u00B7 '}
            {scopedDealers.length} authorized dealer account(s)
          </p>
        </div>

        <button
          onClick={() => {
            setFormAssignedStaff(currentUser?.fullName || currentUser?.name || '');
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472B] text-white text-xs font-semibold shadow-2xs transition shrink-0"
        >
          <Plus className="w-4 h-4 text-emerald-300" />
          <span>Add New Dealer</span>
        </button>
      </div>

      {/* Toolbar: Search & Scope Filters */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search dealer by name, code, contact or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#05331F]"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Region filter */}
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none"
          >
            <option value="all">All Regions ({regions.length})</option>
            {regions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {/* Salesperson filter (for managers / CSO) */}
          {userScope !== 'OWN' && (
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">All Sales Staff</option>
              {salespersons.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Dealers Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredDealers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Building2 className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-700">No dealers found in this view</p>
            <p className="text-xs">Try adjusting your search query or region filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Dealer Name & Code</th>
                  <th className="py-3 px-4">Contact & Phone</th>
                  <th className="py-3 px-4">Region / Location</th>
                  <th className="py-3 px-4">Assigned Salesperson</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDealers.map(dealer => {
                  const staffName = dealer.assignedStaff || dealer.assignedTo || 'Unassigned';

                  return (
                    <tr 
                      key={dealer.id}
                      onClick={() => setSelectedDealer(dealer)}
                      className="hover:bg-slate-50/70 cursor-pointer transition"
                    >
                      {/* Name & Code */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{dealer.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{dealer.code || 'DLR'}</p>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800">{dealer.contactPerson || 'Showroom Contact'}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{dealer.phone || 'Phone pending'}</p>
                      </td>

                      {/* Region */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-700">{dealer.region || 'General'}</span>
                      </td>

                      {/* Assigned Staff */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-50 text-[#05331F] font-bold text-[10px] flex items-center justify-center">
                            {staffName.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-800">{staffName}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      </td>

                      {/* Action Chevron */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDealer(dealer);
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

      {/* Dealer Details Drawer */}
      {selectedDealer && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-2xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#05331F] flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{selectedDealer.name}</h3>
                  <p className="text-xs text-slate-500">{selectedDealer.code} {' \u00B7 '} {selectedDealer.region}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDealer(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              
              {/* Profile Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Contact Person:</span>
                  <span className="font-semibold text-slate-800">{selectedDealer.contactPerson || 'Showroom Contact'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-semibold text-slate-800">{selectedDealer.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">GST Number:</span>
                  <span className="font-mono text-slate-800">{selectedDealer.gstNumber || '32AABCS9999A1Z5'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Address:</span>
                  <span className="font-semibold text-slate-800 text-right">{selectedDealer.address || selectedDealer.region}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-slate-500">Assigned Rep:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#05331F]">{selectedDealer.assignedStaff || selectedDealer.assignedTo}</span>
                    {canReassign && (
                      <button
                        onClick={() => {
                          setReassignTargetStaff(selectedDealer.assignedStaff || selectedDealer.assignedTo || '');
                          setIsReassignModalOpen(true);
                        }}
                        className="text-[10px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md font-semibold border border-emerald-200"
                      >
                        Reassign
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Reassignment Audit History */}
              {selectedDealer.reassignHistory && selectedDealer.reassignHistory.length > 0 && (
                <div>
                  <p className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reassignment History</span>
                  </p>
                  <div className="space-y-1.5">
                    {selectedDealer.reassignHistory.map((hist, i) => (
                      <div key={i} className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-600 border border-slate-100 flex items-center justify-between">
                        <div>
                          <span>From <strong className="text-slate-800">{hist.from}</strong> to <strong className="text-[#05331F]">{hist.to}</strong></span>
                          <p className="text-[10px] text-slate-400 mt-0.5">By {hist.by}</p>
                        </div>
                        <span className="text-[10px] text-slate-400">{hist.timestamp?.slice(0, 10)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bookings for this dealer */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-slate-800">Booking History ({dealerBookings.length})</p>
                  <button
                    onClick={() => {
                      if (onOpenAssignOrderModal) {
                        onOpenAssignOrderModal({
                          dealerName: selectedDealer.name,
                          dealerCode: selectedDealer.code
                        });
                      }
                      setSelectedDealer(null);
                    }}
                    className="text-emerald-700 font-semibold hover:underline"
                  >
                    + Log Booking
                  </button>
                </div>

                {dealerBookings.length === 0 ? (
                  <p className="text-slate-400 py-4 text-center">No door bookings recorded yet for this dealer.</p>
                ) : (
                  <div className="space-y-2">
                    {dealerBookings.map(b => (
                      <div key={b.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">Required: {b.requiredBy}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            b.status === 'Dispatched' ? 'bg-emerald-100 text-emerald-800' :
                            b.status === 'Payment Hold' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {b.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Total Doors: <strong className="text-slate-700">{b.totalQuantity || (b.lines && b.lines.length) || 1}</strong>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Drawer Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
              <button
                onClick={() => {
                  if (onOpenAssignOrderModal) {
                    onOpenAssignOrderModal({
                      dealerName: selectedDealer.name,
                      dealerCode: selectedDealer.code
                    });
                  }
                  setSelectedDealer(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#05331F] hover:bg-[#07472B] text-white text-xs font-semibold shadow-2xs transition"
              >
                Create Booking for Dealer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Dealer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Add New Dealer</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDealer} className="p-4 sm:p-5 overflow-y-auto space-y-3 text-xs">
              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dealer Showroom Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Steels & Doors"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:outline-none focus:border-[#05331F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="Owner / Manager name"
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 99000 00000"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Region</label>
                  <select
                    value={formRegion}
                    onChange={(e) => setFormRegion(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50"
                  >
                    <option value="Kerala South">Kerala South</option>
                    <option value="Kerala North">Kerala North</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Andhra Pradesh / Telangana">Andhra Pradesh / Telangana</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GST Number</label>
                  <input
                    type="text"
                    placeholder="32AABCS..."
                    value={formGst}
                    onChange={(e) => setFormGst(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address / Landmark</label>
                <textarea
                  rows="2"
                  placeholder="Showroom location address..."
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Salesperson</label>
                <select
                  value={formAssignedStaff}
                  onChange={(e) => setFormAssignedStaff(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-medium"
                >
                  {assignableSalesStaff.map(emp => (
                    <option key={emp.id || emp.email} value={emp.fullName || emp.name}>
                      {emp.fullName || emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
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
                  {isSubmitting ? 'Saving...' : 'Confirm Dealer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Dealer Modal */}
      {isReassignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm">Reassign Dealer Account</h3>
            <p className="text-xs text-slate-500">
              Transfer <strong className="text-slate-800">{selectedDealer?.name}</strong> to another sales representative:
            </p>

            <select
              value={reassignTargetStaff}
              onChange={(e) => setReassignTargetStaff(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 text-xs font-semibold text-slate-800"
            >
              {assignableSalesStaff.map(emp => (
                <option key={emp.id || emp.email} value={emp.fullName || emp.name}>
                  {emp.fullName || emp.name} ({emp.role})
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsReassignModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReassignDealer}
                disabled={isReassigning}
                className="px-4 py-1.5 rounded-xl bg-[#05331F] hover:bg-[#07472B] text-white text-xs font-semibold"
              >
                {isReassigning ? 'Reassigning...' : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
