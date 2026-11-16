import React, { useState, useEffect } from 'react';
import { UserCheck, X, Building2, Shield, Phone, Mail, CheckCircle2, User, Trash2 } from 'lucide-react';
import { saveEmployeeProfile } from './firestoreService';

export default function EditEmployeeModal({ 
  isOpen, 
  onClose, 
  employee,
  departments = [], 
  designations = [], 
  existingUsers = [],
  currentUser,
  onEmployeeUpdated,
  onEmployeeDeleted
}) {
  if (!isOpen || !employee) return null;

  const [fullName, setFullName] = useState(employee.fullName || employee.name || '');
  const [employeeId, setEmployeeId] = useState(employee.employeeId || '');
  const [email, setEmail] = useState(employee.email || '');
  const [phone, setPhone] = useState(employee.phone || '');
  const [department, setDepartment] = useState(employee.department || employee.departmentId || departments[0]?.id || 'sales');
  const [role, setRole] = useState(employee.role || 'Sales Coordinator');
  const [employmentStatus, setEmploymentStatus] = useState(employee.employmentStatus || 'active');
  const [reportingManagerId, setReportingManagerId] = useState(employee.reportingManagerId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (employee) {
      setFullName(employee.fullName || employee.name || '');
      setEmployeeId(employee.employeeId || '');
      setEmail(employee.email || '');
      setPhone(employee.phone || '');
      setDepartment(employee.department || employee.departmentId || departments[0]?.id || 'sales');
      setRole(employee.role || 'Sales Coordinator');
      setEmploymentStatus(employee.employmentStatus || 'active');
      setReportingManagerId(employee.reportingManagerId || '');
    }
  }, [employee, departments]);

  const filteredDesignations = designations.filter(d => d.departmentId === department);

  const eligibleManagers = existingUsers.filter(u => u.id !== employee.id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert('Please enter employee full name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const mgr = existingUsers.find(u => u.id === reportingManagerId);
      const updatedPayload = {
        ...employee,
        fullName: fullName.trim(),
        name: fullName.trim(),
        employeeId: employeeId.trim(),
        email: email.trim(),
        phone: phone.trim(),
        department,
        departmentId: department,
        role,
        employmentStatus,
        reportingManagerId: reportingManagerId || null,
        reportingManagerName: mgr ? (mgr.fullName || mgr.name) : (employee.reportingManagerName || 'Executive Director')
      };

      try {
        await saveEmployeeProfile(updatedPayload, currentUser);
      } catch (err) {
        console.warn('Firestore remote sync restricted; updating active application state:', err.message);
      }

      if (onEmployeeUpdated) {
        onEmployeeUpdated(updatedPayload);
      }

      setIsSubmitting(false);
      onClose();
    } catch (err) {
      console.error('Error updating employee:', err);
      alert('Error updating employee: ' + err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto safe-pb safe-pt">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 sm:pb-4 border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5 truncate mr-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#05331F] text-emerald-300 flex items-center justify-center font-bold shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">Edit Employee Profile</h3>
              <p className="text-[11px] text-slate-500 truncate">Update designation, department, and contact details</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs overflow-y-auto flex-1 pr-1 pt-3">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Legal Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Employee ID Code *</label>
              <input
                type="text"
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold outline-none focus:ring-2 focus:ring-[#05331F]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Company Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department *</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#05331F]"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Designation / Role *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#05331F]"
              >
                {filteredDesignations.length > 0 ? (
                  filteredDesignations.map(des => (
                    <option key={des.id} value={des.title}>{des.title}</option>
                  ))
                ) : (
                  designations.map(des => (
                    <option key={des.id} value={des.title}>{des.title}</option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Employment Status</label>
              <select
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#05331F]"
              >
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="suspended">Suspended</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reporting Line Manager</label>
              <select
                value={reportingManagerId}
                onChange={(e) => setReportingManagerId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
              >
                <option value="">No Direct Manager (Top Leadership)</option>
                {eligibleManagers.map(mgr => (
                  <option key={mgr.id} value={mgr.id}>
                    {mgr.fullName || mgr.name} ({mgr.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 shrink-0 sticky bottom-0 bg-white">
            {onEmployeeDeleted && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to remove ${fullName}?`)) {
                    onEmployeeDeleted(employee.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove</span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472c] text-white font-bold text-xs shadow-md transition-all active:scale-98 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}

