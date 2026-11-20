import { useState, useEffect, useMemo } from 'react';
import { subscribeToDepartments } from './firestoreService';
import { MASTER_DEPARTMENTS } from './orgStructure';

/**
 * Normalizes any department id, code, or title string into a canonical ID.
 * e.g., 'HR_ADMIN', 'hr_admin', 'HR & Admin', 'HR & Administration' -> 'hr_admin'
 *       'QC', 'qc', 'quality_control', 'Quality Control (QC)' -> 'qc'
 */
export function normalizeDepartmentId(value) {
  if (!value) return '';
  const str = String(value).trim().toLowerCase();
  
  if (str === 'hr' || str === 'hr_admin' || str === 'hr & admin' || str === 'hr & administration' || str === 'hr/admin') {
    return 'hr_admin';
  }
  if (str === 'qc' || str === 'quality_control' || str === 'quality control' || str === 'quality control (qc)') {
    return 'qc';
  }
  if (str === 'exec' || str === 'management' || str === 'executive management') {
    return 'management';
  }
  if (str === 'fin' || str === 'finance' || str === 'finance & accounts') {
    return 'finance';
  }
  if (str === 'sales') {
    return 'sales';
  }
  if (str === 'ops' || str === 'operations') {
    return 'operations';
  }
  if (str === 'wh' || str === 'warehouse') {
    return 'warehouse';
  }
  if (str === 'trans' || str === 'transportation') {
    return 'transportation';
  }
  if (str === 'serv' || str === 'service') {
    return 'service';
  }
  if (str === 'inv' || str === 'inventory') {
    return 'inventory';
  }
  if (str === 'mkt' || str === 'marketing') {
    return 'marketing';
  }
  return str;
}

/**
 * Shared hook for departments: single source of truth.
 * Subscribes to Firestore `departments` collection, normalizes records, 
 * merges defaults, filters non-archived for active operations, 
 * and provides formatting/lookup helpers.
 */
export function useDepartments() {
  const [firestoreDepts, setFirestoreDepts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToDepartments((list) => {
      setFirestoreDepts(list || []);
      setLoading(false);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Canonical departments map merging MASTER_DEPARTMENTS and Firestore
  const allDepartments = useMemo(() => {
    const map = new Map();

    // 1. Seed with base master structure
    MASTER_DEPARTMENTS.forEach(dept => {
      const canonicalId = normalizeDepartmentId(dept.id);
      map.set(canonicalId, {
        id: canonicalId,
        name: dept.name,
        code: dept.code,
        description: dept.description,
        status: 'active'
      });
    });

    // 2. Overlay Firestore documents
    firestoreDepts.forEach(doc => {
      const canonicalId = normalizeDepartmentId(doc.id || doc.code || doc.name);
      if (!canonicalId) return;

      const existing = map.get(canonicalId) || {};
      map.set(canonicalId, {
        ...existing,
        ...doc,
        id: canonicalId,
        name: doc.name || existing.name || canonicalId,
        code: doc.code || existing.code || canonicalId.toUpperCase(),
        status: doc.status || existing.status || 'active'
      });
    });

    return Array.from(map.values());
  }, [firestoreDepts]);

  // Active departments only, sorted alphabetically by name
  const departments = useMemo(() => {
    return allDepartments
      .filter(d => (d.status || 'active').toLowerCase() !== 'archived')
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [allDepartments]);

  // Lookup helpers
  const getDepartmentName = (idOrCode) => {
    if (!idOrCode) return '';
    const norm = normalizeDepartmentId(idOrCode);
    const found = allDepartments.find(d => 
      normalizeDepartmentId(d.id) === norm || 
      normalizeDepartmentId(d.code) === norm ||
      (d.name && d.name.toLowerCase() === String(idOrCode).toLowerCase())
    );
    return found ? found.name : String(idOrCode);
  };

  const getDepartmentCode = (id) => {
    if (!id) return '';
    const norm = normalizeDepartmentId(id);
    const found = allDepartments.find(d => normalizeDepartmentId(d.id) === norm);
    return found ? (found.code || norm.toUpperCase()) : norm.toUpperCase();
  };

  const formatDepartment = (value) => {
    return getDepartmentName(value);
  };

  return {
    departments,        // Only active, sorted by name
    allDepartments,     // All including archived
    loading,
    getDepartmentName,
    getDepartmentCode,
    formatDepartment,
    normalizeDepartmentId
  };
}

export default useDepartments;
