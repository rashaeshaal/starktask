// src/components/profile/Timeline.jsx
// Section 8: Timeline: designation, manager and team changes, resets, day unlocks, read from `auditLogs`

import React, { useState, useEffect } from 'react';
import { 
  History, KeyRound, Unlock, UserCheck, 
  Briefcase, Users, Clock, ShieldAlert 
} from 'lucide-react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { AUDIT_LOGS_COL } from '../../firestoreService';

export default function Timeline({ employeeId }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) {
      setLogs([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const fetchLogs = async () => {
      try {
        const empIdStr = String(employeeId);
        const auditRef = collection(db, AUDIT_LOGS_COL);
        const q = query(
          auditRef,
          where('targetId', '==', empIdStr),
          limit(20)
        );

        const snap = await getDocs(q);
        const list = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() });
        });

        // Sort descending by timestamp
        list.sort((a, b) => {
          const tA = new Date(a.timestamp || a.createdAt || 0).getTime();
          const tB = new Date(b.timestamp || b.createdAt || 0).getTime();
          return tB - tA;
        });

        if (isMounted) {
          setLogs(list);
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('Error reading employee timeline audit logs:', err);
        if (isMounted) {
          setLogs([]);
          setIsLoading(false);
        }
      }
    };

    fetchLogs();
    return () => { isMounted = false; };
  }, [employeeId]);

  const getLogIcon = (action) => {
    switch (action) {
      case 'EMPLOYEE_PASSWORD_RESET':
        return <KeyRound className="w-3.5 h-3.5 text-blue-600" />;
      case 'DAY_UNLOCK':
        return <Unlock className="w-3.5 h-3.5 text-amber-600" />;
      case 'EMPLOYEE_STATUS_CHANGE':
        return <UserCheck className="w-3.5 h-3.5 text-emerald-600" />;
      case 'TEAM_MEMBER_TRANSFER':
        return <Users className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <Briefcase className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const formatActionTitle = (log) => {
    switch (log.action) {
      case 'EMPLOYEE_PASSWORD_RESET':
        return 'Password Reset Generated';
      case 'DAY_UNLOCK':
        return `Day Unlocked: ${log.after?.date || 'Override'}`;
      case 'EMPLOYEE_STATUS_CHANGE':
        return `Status Changed to ${log.after?.status || 'Updated'}`;
      case 'EMPLOYEE_EDIT':
        return 'Profile / Designation Updated';
      case 'TEAM_MEMBER_TRANSFER':
        return 'Team Squad Reassigned';
      default:
        return log.action ? log.action.replace(/_/g, ' ') : 'System Audit Event';
    }
  };

  return (
    <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Governance & Change Timeline
            </h4>
            <p className="text-[11px] text-slate-500">
              Verified record from enterprise audit logs
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2 py-2">
          <div className="h-10 bg-slate-100 animate-pulse rounded-xl" />
          <div className="h-10 bg-slate-100 animate-pulse rounded-xl" />
        </div>
      ) : logs.length === 0 ? (
        <div className="p-4 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl text-center">
          <p className="text-xs text-slate-500">
            No administrative change events logged for this employee yet.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {logs.map((log) => {
            const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : 'Recorded';

            return (
              <div key={log.id} className="relative text-xs">
                {/* Bullet */}
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center shadow-2xs">
                  {getLogIcon(log.action)}
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      {formatActionTitle(log)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {timeStr}
                    </span>
                  </div>

                  {log.reason && (
                    <p className="text-slate-600 text-[11px] italic">
                      "{log.reason}"
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>Actor: {log.actorId || 'Administrator'}</span>
                    {log.targetId && <span>• Target: {log.targetId}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

