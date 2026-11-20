// src/components/profile/DataQualityBanner.jsx
// Section 10: Data-quality banner for leaders when the employee has no manager, level or designation

import React from 'react';
import { AlertCircle, Edit, ArrowRight } from 'lucide-react';

export default function DataQualityBanner({ employee, onEdit, canEdit = false }) {
  if (!employee) return null;

  const missingFields = [];
  if (!employee.reportsTo && !employee.reportingManagerId && !employee.reportingManagerName) {
    missingFields.push('Reporting Manager');
  }
  if (!employee.designation && !employee.role) {
    missingFields.push('Official Designation');
  }
  if (employee.level === undefined || employee.level === null || employee.level === '') {
    // If getRoleLevel doesn't resolve or level is missing
    if (!employee.level) {
      missingFields.push('Organization Level (L1-L6)');
    }
  }

  if (missingFields.length === 0) return null;

  return (
    <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-3 shadow-2xs">
      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1 space-y-1">
        <h4 className="text-xs font-bold text-amber-900">
          Incomplete Employee Record Detected
        </h4>
        <p className="text-[11px] text-amber-700 leading-normal">
          This profile has missing structural data: <span className="font-semibold underline">{missingFields.join(', ')}</span>. Missing metadata can break hierarchy routing and sign-off escalation.
        </p>
      </div>

      {canEdit && onEdit && (
        <button
          type="button"
          onClick={() => onEdit(employee)}
          aria-label="Fix employee profile metadata"
          className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0 flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
        >
          <Edit className="w-3.5 h-3.5" />
          <span>Fix Now</span>
        </button>
      )}
    </div>
  );
}

