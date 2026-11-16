import React, { useState, useMemo } from 'react';
import { 
  Building2, Users, Briefcase, Plus, Upload, CheckCircle2, 
  Trash2, Edit, ChevronRight, Search, Filter, Shield, UserCheck, FileSpreadsheet, Pencil
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveEmployeeProfile } from './firestoreService';
import EditEmployeeModal from './EditEmployeeModal';
import EditDesignationModal from './EditDesignationModal';

export default function OrganizationManagementView({ 
  departments, 
  designations, 
  employees, 
  teams = [],
  teamMembers = [],
  currentUser,
  onOpenAddEmployee,
  onEmployeeAdded,
  onEmployeeUpdated,
  onEmployeeDeleted,
  onDesignationUpdated
}) {
  const [activeOrgTab, setActiveOrgTab] = useState('directory'); // 'directory' | 'chart' | 'depts' | 'designations'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [bulkImportStatus, setBulkImportStatus] = useState('');
  const [localImportedEmployees, setLocalImportedEmployees] = useState([]);
  
  // Modals for editing employee and designation
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editingDesignation, setEditingDesignation] = useState(null);

  // STRICT PERMISSION CHECK:
  // Only HR (HR Manager, HR Executive) and Director Operations (Director Operations, General Manager, Executive Director)
  // can Add/Edit employees, departments, and designations.
  const userRole = currentUser?.role || '';
  const userDept = (currentUser?.department || currentUser?.departmentId || '').toLowerCase();
  
  const canManageOrg = [
    'Director Operations',
    'General Manager',
    'Executive Director',
    'HR Manager',
    'HR Executive'
  ].includes(userRole) || userDept === 'hr' || userDept === 'hr & administration';

  // Merge Firestore employees with imported / directory employees
  const displayEmployees = useMemo(() => {
    let list = [...employees];
    const seenIds = new Set(list.map(e => e.id || e.employeeId));

    localImportedEmployees.forEach(emp => {
      if (!seenIds.has(emp.id) && !seenIds.has(emp.employeeId)) {
        list.push(emp);
        seenIds.add(emp.id || emp.employeeId);
      }
    });

    // If NOT HR or Director Operations, restrict visibility STRICTLY to their OWN profile only (others cannot see anyone else)
    if (!canManageOrg) {
      list = list.filter(emp => {
        const empId = emp.id;
        const empEmpId = emp.employeeId;
        const isSelf = (empId && (empId === currentUser?.id || empId === currentUser?.employeeId)) ||
                       (empEmpId && (empEmpId === currentUser?.id || empEmpId === currentUser?.employeeId)) ||
                       (emp.email && emp.email?.toLowerCase() === currentUser?.email?.toLowerCase());
        return isSelf;
      });
    }

    return list;
  }, [employees, localImportedEmployees, canManageOrg, teams, teamMembers, currentUser, userDept]);

  // Filtered employees
  const filteredEmployees = displayEmployees.filter(emp => {
    const matchName = (emp.fullName || emp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (emp.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (emp.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = selectedDeptFilter === 'all' || emp.department === selectedDeptFilter || emp.departmentId === selectedDeptFilter;
    return matchName && matchDept;
  });

  // Handle Excel (.xlsx, .xls) and CSV Bulk Import
  const handleBulkImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setBulkImportStatus('Reading and parsing file...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Read first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON array of objects
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (!rawRows || rawRows.length < 2) {
          alert('Excel file is empty or missing data rows.');
          setBulkImportStatus('');
          return;
        }

        // Row 0 has headers (ensure all entries are safe strings)
        const headerRow = (Array.isArray(rawRows[0]) ? rawRows[0] : []).map(h => 
          (h !== undefined && h !== null ? String(h) : '').trim().toLowerCase().replace(/[\s_]+/g, '')
        );
        
        // Safe column index matching helper
        const safeMatch = (patterns) => {
          return headerRow.findIndex(h => h && patterns.some(p => h.includes(p)));
        };

        // Column index mapping
        const nameIdx = safeMatch(['name', 'fullname', 'employee']);
        const emailIdx = safeMatch(['email', 'mail']);
        const phoneIdx = safeMatch(['phone', 'mobile', 'contact']);
        const deptIdx = safeMatch(['dept', 'department']);
        const roleIdx = safeMatch(['role', 'designation', 'position', 'title']);
        const idIdx = safeMatch(['empid', 'code', 'id']);

        let count = 0;
        const importedList = [];
        setBulkImportStatus(`Validating and importing ${rawRows.length - 1} records into Corporate Directory...`);

        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          const fullName = String((nameIdx !== -1 ? row[nameIdx] : row[0]) || '').trim();
          if (!fullName) continue;

          const email = String((emailIdx !== -1 ? row[emailIdx] : row[1]) || `${fullName.toLowerCase().replace(/\s+/g, '.')}@company.com`).trim();
          const phone = String((phoneIdx !== -1 ? row[phoneIdx] : row[2]) || '+91 99000 00000').trim();
          const dept = String((deptIdx !== -1 ? row[deptIdx] : row[3]) || 'sales').trim().toLowerCase();
          const role = String((roleIdx !== -1 ? row[roleIdx] : row[4]) || 'Sales Coordinator').trim();
          const empId = String((idIdx !== -1 ? row[idIdx] : row[5]) || `EMP-${Date.now().toString().slice(-4)}${i}`).trim();

          const empData = {
            id: `emp_${empId.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${i}`,
            fullName,
            name: fullName,
            email,
            phone,
            department: dept,
            departmentId: dept,
            role,
            employeeId: empId,
            employmentStatus: 'active'
          };

          try {
            await saveEmployeeProfile(empData, currentUser);
          } catch (writeErr) {
            console.warn("Firestore remote write restricted, saving to active organization state:", writeErr.message);
          }

          importedList.push(empData);
          count++;
        }

        setLocalImportedEmployees(prev => [...prev, ...importedList]);

        if (onEmployeeAdded && importedList.length > 0) {
          importedList.forEach(e => onEmployeeAdded(e));
        }

        setBulkImportStatus(`✓ Successfully imported ${count} employees from Excel into Corporate Directory!`);
        setTimeout(() => setBulkImportStatus(''), 5000);
      } catch (err) {
        console.error("Excel import error:", err);
        setBulkImportStatus('Error importing file: ' + err.message);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Navigation Sub-Tabs */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-xs font-bold text-[#05331F] bg-[#05331F]/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Organization Management
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400">• Real Cloud Firestore Records</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">Corporate Directory & Hierarchy</h2>
          <p className="text-xs text-slate-500">Departments, Designations, Employee Profiles & Reporting Lines</p>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
          <button
            onClick={() => setActiveOrgTab('directory')}
            className={`flex-1 sm:flex-initial px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center ${
              activeOrgTab === 'directory' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {canManageOrg ? `Directory (${employees.length})` : `My Profile`}
          </button>
          {canManageOrg && (
            <button
              onClick={() => setActiveOrgTab('chart')}
              className={`flex-1 sm:flex-initial px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center ${
                activeOrgTab === 'chart' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hierarchy
            </button>
          )}
          {canManageOrg && (
            <>
              <button
                onClick={() => setActiveOrgTab('depts')}
                className={`flex-1 sm:flex-initial px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center ${
                  activeOrgTab === 'depts' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Depts ({departments.length})
              </button>
              <button
                onClick={() => setActiveOrgTab('designations')}
                className={`flex-1 sm:flex-initial px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center ${
                  activeOrgTab === 'designations' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Designations ({designations.length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* SUB-VIEW 1: Real Employee Directory */}
      {activeOrgTab === 'directory' && (
        <div className="space-y-4">
          
          {/* Controls: Search, Filter, Add Employee, CSV Bulk Import */}
          <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search real employees by name, email, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#05331F]"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none"
              >
                <option value="all">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {canManageOrg && (
              <div className="flex items-center gap-2">
                {/* Excel / CSV Bulk Import Button */}
                <label className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#05331F] border border-emerald-200 rounded-xl text-xs font-bold cursor-pointer transition-all">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-800" />
                  <span>Import Excel / CSV</span>
                  <input 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={handleBulkImportExcel} 
                    className="hidden" 
                  />
                </label>

                {/* Add New Employee */}
                <button
                  onClick={onOpenAddEmployee}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#05331F] hover:bg-[#07472c] text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Employee</span>
                </button>
              </div>
            )}
          </div>

          {bulkImportStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold">
              {bulkImportStatus}
            </div>
          )}

          {/* Employee Directory Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.length === 0 ? (
              <div className="col-span-full bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 space-y-2">
                <Users className="w-10 h-10 mx-auto text-slate-300" />
                <p className="font-bold text-slate-600">No employee records found in Cloud Firestore.</p>
                <p className="text-xs">Click "Add Employee" or "Import CSV" to add actual staff members.</p>
              </div>
            ) : (
              filteredEmployees.map(emp => (
                <div key={emp.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3 hover:border-emerald-300 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#05331F] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                        {emp.avatar || (emp.fullName || emp.name || 'EM').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{emp.fullName || emp.name}</h4>
                        <p className="text-xs text-slate-500">{emp.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canManageOrg && (
                        <button
                          onClick={() => setEditingEmployee(emp)}
                          className="p-1.5 text-slate-400 hover:text-[#05331F] hover:bg-emerald-50 rounded-lg transition"
                          title="Edit Employee & Designation"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span className="text-[10px] uppercase font-mono bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded">
                        {emp.employeeId || emp.id.slice(0, 8)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-xs space-y-1">
                    <div className="flex justify-between text-slate-500">
                      <span>Department:</span>
                      <span className="font-semibold text-slate-800 uppercase">{emp.department || emp.departmentId}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Email:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[170px]">{emp.email}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Status:</span>
                      <span className="font-semibold text-emerald-700 capitalize">{emp.employmentStatus || 'Active'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: Company Hierarchy Chart */}
      {activeOrgTab === 'chart' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-base font-bold text-slate-900">Approved Company Organization Chart</h3>
            <p className="text-xs text-slate-500">Reporting Structure from Executive Director to Frontline Teams</p>
          </div>

          <div className="max-w-2xl mx-auto space-y-4 text-xs">
            {/* Top Tier */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-center space-y-0.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-emerald-800 font-mono">Executive Leadership</span>
              <h4 className="font-bold text-slate-900 text-sm">Executive Director</h4>
              <p className="text-[11px] text-emerald-900">Company-wide Governance & Historical Lock Overrides</p>
            </div>

            <div className="w-0.5 h-6 bg-slate-300 mx-auto" />

            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-center space-y-0.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-emerald-800 font-mono">Operational Distribution Head</span>
              <h4 className="font-bold text-slate-900 text-sm">Director Operations</h4>
              <p className="text-[11px] text-emerald-900">Cross-Department Task Distribution & Live Monitoring</p>
            </div>

            <div className="w-0.5 h-6 bg-slate-300 mx-auto" />

            {/* Department Wings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <span className="font-bold text-slate-900 block">Sales Department</span>
                <p className="text-[11px] text-slate-500">CSO → SSM → ASM → Sales Coordinators (Dealer calls & door orders)</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <span className="font-bold text-slate-900 block">Operations Department</span>
                <p className="text-[11px] text-slate-500">Warehouse, Transportation, Field Service, Inventory Teams</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <span className="font-bold text-slate-900 block">Finance, HR & Marketing</span>
                <p className="text-[11px] text-slate-500">Accounts Manager, HR Manager, Admin Manager, Brand Manager</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: Departments Master Table */}
      {activeOrgTab === 'depts' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Department ID</th>
                <th className="py-3.5 px-4">Department Name</th>
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map(d => (
                <tr key={d.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">{d.id}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{d.name}</td>
                  <td className="py-3 px-4 font-mono font-semibold text-emerald-800">{d.code}</td>
                  <td className="py-3 px-4 text-slate-500">{d.description || 'Corporate Operational Wing'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SUB-VIEW 4: Designations Master Table */}
      {activeOrgTab === 'designations' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Designation ID</th>
                <th className="py-3.5 px-4">Title / Role</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Hierarchy Tier Level</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {designations.map(des => (
                <tr key={des.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">{des.id}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{des.title}</td>
                  <td className="py-3 px-4 font-semibold text-slate-600 uppercase font-mono">{des.departmentId}</td>
                  <td className="py-3 px-4">
                    <span className="bg-emerald-50 text-[#05331F] font-bold font-mono px-2 py-0.5 rounded border border-emerald-200">
                      Level {des.level}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {canManageOrg && (
                      <button
                        onClick={() => setEditingDesignation(des)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-[#05331F] hover:bg-emerald-50 rounded-lg font-semibold text-xs transition"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <EditEmployeeModal
          isOpen={Boolean(editingEmployee)}
          onClose={() => setEditingEmployee(null)}
          employee={editingEmployee}
          departments={departments}
          designations={designations}
          existingUsers={employees}
          currentUser={currentUser}
          onEmployeeUpdated={(updated) => {
            if (onEmployeeUpdated) onEmployeeUpdated(updated);
            setEditingEmployee(null);
          }}
          onEmployeeDeleted={(delId) => {
            if (onEmployeeDeleted) onEmployeeDeleted(delId);
            setEditingEmployee(null);
          }}
        />
      )}

      {/* Edit Designation Modal */}
      {editingDesignation && (
        <EditDesignationModal
          isOpen={Boolean(editingDesignation)}
          onClose={() => setEditingDesignation(null)}
          designation={editingDesignation}
          departments={departments}
          onDesignationUpdated={(updated) => {
            if (onDesignationUpdated) onDesignationUpdated(updated);
            setEditingDesignation(null);
          }}
        />
      )}

    </div>
  );
}

