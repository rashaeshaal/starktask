import React, { useState } from 'react';
import { UserPlus, X, Building2, Shield, Phone, Mail, CheckCircle2, User } from 'lucide-react';
import { saveEmployeeProfile } from './firestoreService';

export default function AddEmployeeModal({ 
  isOpen, 
  onClose, 
  departments = [], 
  designations = [], 
  existingUsers = [],
  currentUser,
  onEmployeeAdded 
}) {
  if (!isOpen) return null;

  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [department, setDepartment] = useState(departments[0]?.id || 'sales');
  const [role, setRole] = useState(designations[0]?.title || 'Sales Coordinator');
  const [customRole, setCustomRole] = useState('');
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [reportingManagerId, setReportingManagerId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter designations by selected department
  const filteredDesignations = designations.filter(d => d.departmentId === department);

  // Eligible managers: anyone with supervisor or manager rank
  const eligibleManagers = existingUsers.filter(u => {
    return ['Executive Director', 'General Manager', 'HR Manager', 'Admin Manager', 'Accounts Manager', 
            'Warehouse In-charge', 'Transport Manager', 'Service Manager', 'CSO', 'SSM', 'ASM', 'Brand Manager', 'IT Head',
            'Warehouse Supervisor', 'Transport Coordinator', 'Service Coordinator', 'Inventory Supervisor', 'Leads Coordinator']
            .includes(u.role);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert('Please enter employee full name.');
      return;
    }

    const finalRole = isCustomRole ? customRole.trim() : role;
    if (!finalRole) {
      alert('Please enter or select a designation.');
      return;
    }

    setIsSubmitting(true);
    try {
      const generatedDocId = `emp_${Date.now()}`;
      const initials = fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      const employeePayload = {
        id: generatedDocId,
        employeeId: employeeId.trim(),
        fullName: fullName.trim(),
        name: fullName.trim(),
        email: email.trim() || `${fullName.toLowerCase().replace(/\s+/g, '.')}@company.com`,
        phone: phone.trim() || '+91 99000 00000',
        joiningDate,
        department,
        departmentId: department,
        role: finalRole,
        reportingManagerId: reportingManagerId || null,
        employmentStatus: 'active',
        avatar: initials || 'EM'
      };

      await saveEmployeeProfile(employeePayload, currentUser);

      if (onEmployeeAdded) {
        onEmployeeAdded(employeePayload);
      }

      setIsSubmitting(false);
      onClose();
    } catch (err) {
      console.error('Error adding employee to Firestore:', err);
      alert('Error saving employee: ' + err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto safe-pb safe-pt">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 sm:pb-4 border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5 truncate mr-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold shrink-0">
              <UserPlus className="w-5 h-5 text-[#05331F]" />
            </div>
            <div className="truncate">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">Add Real Employee Record</h3>
           
            </div>
          </div>z
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1 pt-2">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Employee Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Chandra"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Employee ID (Unique) *</label>
              <input
                type="text"
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-[#05331F]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Company Email</label>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="+91 98765 00000"
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
                onChange={(e) => {
                  const newDept = e.target.value;
                  setDepartment(newDept);
                  const firstDes = designations.find(d => d.departmentId === newDept);
                  if (firstDes) setRole(firstDes.title);
                }}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Joining Date</label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none"
              />
            </div>
          </div>

          {/* Designation */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-800">Designation / Role *</label>
              <button
                type="button"
                onClick={() => setIsCustomRole(!isCustomRole)}
                className="text-[11px] font-semibold text-emerald-800 hover:underline"
              >
                {isCustomRole ? "← Choose from department designations" : "+ Enter custom title"}
              </button>
            </div>

            {isCustomRole ? (
              <input
                type="text"
                required
                placeholder="e.g. Senior Regional Estimator"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
              />
            ) : (
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
              >
                {filteredDesignations.length === 0 ? (
                  <option value="Staff">General Staff</option>
                ) : (
                  filteredDesignations.map(des => (
                    <option key={des.id} value={des.title}>{des.title} (Level {des.level})</option>
                  ))
                )}
              </select>
            )}
          </div>

          {/* Reporting Manager */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reporting Manager</label>
            <select
              value={reportingManagerId}
              onChange={(e) => setReportingManagerId(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
            >
              <option value="">-- No Direct Reporting Manager (Top Tier) --</option>
              {eligibleManagers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.fullName || m.name} — {m.role} ({(m.department || '').toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#05331F] hover:bg-[#07472c] text-white font-semibold shadow-md transition-all disabled:opacity-50 active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Add Real Employee'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
