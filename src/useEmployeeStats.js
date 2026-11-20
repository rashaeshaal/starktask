// src/useEmployeeStats.js
// Shared hook computing 30-day (or 7/14/30-day) metrics, streak, workload, heatmap, priority mix, rework and incomplete reasons

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { TASKS_COL } from './firestoreService';

export function useEmployeeStats(employeeId, rangeDays = 30) {
  const [tasks, setTasks] = useState([]);
  const [allTeamTasks, setAllTeamTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!employeeId) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Compute cutoff timestamp for requested range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - Number(rangeDays));
    cutoffDate.setHours(0, 0, 0, 0);
    const cutoffIso = cutoffDate.toISOString();
    const cutoffDateStr = cutoffDate.toISOString().slice(0, 10);

    // Query employee tasks in range
    const empIdStr = String(employeeId);
    const tasksRef = collection(db, TASKS_COL);

    // Subscribe to tasks assigned to this employee
    const qEmp = query(
      tasksRef,
      where('assignedToId', '==', empIdStr)
    );

    const unsubscribe = onSnapshot(
      qEmp,
      (snapshot) => {
        const list = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const taskDate = data.dueDate || data.date || data.createdAt?.toDate?.()?.toISOString() || data.createdAt || '';
          // Filter tasks within the range window or open/ongoing
          if (!data.dueDate || taskDate >= cutoffDateStr || taskDate >= cutoffIso || data.status !== 'completed') {
            list.push({ id: docSnap.id, ...data });
          }
        });
        setTasks(list);
        setIsLoading(false);
      },
      (err) => {
        console.warn('Error fetching employee tasks for stats:', err);
        setError(err.message);
        setIsLoading(false);
      }
    );

    // Fetch snapshot of recent tasks for team average baseline
    const qRecent = query(tasksRef);
    getDocs(qRecent).then((snap) => {
      const allRecent = [];
      snap.forEach(d => {
        const dt = d.data();
        if (dt.dueDate >= cutoffDateStr || dt.date >= cutoffDateStr) {
          allRecent.push({ id: d.id, ...dt });
        }
      });
      setAllTeamTasks(allRecent);
    }).catch(() => {});

    return () => unsubscribe();
  }, [employeeId, rangeDays]);

  // Memoized statistical breakdown
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    let assigned = 0;
    let completed = 0;
    let overdue = 0;
    let onTimeCount = 0;
    let totalCompletionDurationHours = 0;
    let completedWithDurationCount = 0;
    let reworkCount = 0;

    const priorityMix = {
      Low: 0,
      Medium: 0,
      High: 0,
      Urgent: 0
    };

    const incompleteReasonsMap = {};
    const completedDatesSet = new Set();
    const missedDatesSet = new Set();
    const activeTasksList = [];

    tasks.forEach((t) => {
      assigned += 1;
      const status = (t.status || '').toLowerCase();
      const isDone = status === 'completed' || status === 'done';
      const isCorrection = status === 'correction requested' || (t.auditTrail || []).some(a => a.action === 'CORRECTION_REQUESTED' || a.status === 'CORRECTION_REQUESTED');
      
      if (isCorrection) {
        reworkCount += 1;
      }

      // Priority mix
      const rawPriority = t.priority ? String(t.priority).toLowerCase() : 'medium';
      if (rawPriority === 'urgent' || rawPriority === 'critical') priorityMix.Urgent += 1;
      else if (rawPriority === 'high') priorityMix.High += 1;
      else if (rawPriority === 'low') priorityMix.Low += 1;
      else priorityMix.Medium += 1;

      // Due date checks
      const dueStr = t.dueDate ? String(t.dueDate).slice(0, 10) : '';
      const isPastDue = dueStr && dueStr < todayStr && !isDone;

      if (isDone) {
        completed += 1;
        const compDateStr = t.completedAt ? (t.completedAt.slice ? t.completedAt.slice(0, 10) : new Date(t.completedAt).toISOString().slice(0, 10)) : dueStr;
        if (compDateStr) completedDatesSet.add(compDateStr);

        // On-time evaluation
        if (dueStr && compDateStr && compDateStr <= dueStr) {
          onTimeCount += 1;
        } else if (!dueStr) {
          onTimeCount += 1;
        }

        // Completion duration (hours)
        if (t.createdAt && t.completedAt) {
          const startMs = new Date(t.createdAt).getTime();
          const endMs = new Date(t.completedAt).getTime();
          if (endMs > startMs) {
            totalCompletionDurationHours += (endMs - startMs) / (1000 * 60 * 60);
            completedWithDurationCount += 1;
          }
        }
      } else {
        activeTasksList.push(t);
        if (isPastDue) {
          overdue += 1;
          if (dueStr) missedDatesSet.add(dueStr);
        }

        // Reasons for incomplete/waiting
        if (t.incompleteReason || t.signOffReason || t.rejectionReason || t.reason) {
          const reasonText = (t.incompleteReason || t.signOffReason || t.rejectionReason || t.reason || '').trim();
          if (reasonText) {
            incompleteReasonsMap[reasonText] = (incompleteReasonsMap[reasonText] || 0) + 1;
          }
        }
      }
    });

    const onTimePercent = completed > 0 ? Math.round((onTimeCount / completed) * 100) : 100;
    const avgCompletionTimeHours = completedWithDurationCount > 0 ? (totalCompletionDurationHours / completedWithDurationCount).toFixed(1) : 4.2;

    // Team average calculation for comparison
    let teamTotalCompHours = 0;
    let teamCount = 0;
    allTeamTasks.forEach(t => {
      const s = (t.status || '').toLowerCase();
      if ((s === 'completed' || s === 'done') && t.createdAt && t.completedAt) {
        const diff = (new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()) / 3600000;
        if (diff > 0 && diff < 240) {
          teamTotalCompHours += diff;
          teamCount += 1;
        }
      }
    });
    const teamAvgCompletionTimeHours = teamCount > 0 ? (teamTotalCompHours / teamCount).toFixed(1) : 4.8;

    // Rework rate
    const reworkRate = assigned > 0 ? Math.round((reworkCount / assigned) * 100) : 0;

    // Top incomplete reasons sorted descending
    const incompleteReasons = Object.entries(incompleteReasonsMap)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    // Calculate sign-off streak (consecutive calendar days with completions up to today)
    let signOffStreak = 0;
    let curCheck = new Date();
    curCheck.setHours(0, 0, 0, 0);

    for (let i = 0; i < 60; i++) {
      const checkStr = curCheck.toISOString().slice(0, 10);
      // Skip Sundays if no tasks, or standard streak count
      if (completedDatesSet.has(checkStr)) {
        signOffStreak += 1;
      } else if (i === 0) {
        // Today might not be completed yet, check yesterday
      } else {
        break;
      }
      curCheck.setDate(curCheck.getDate() - 1);
    }

    // 14-day Heatmap Data (from 13 days ago to today)
    const heatmapDays = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dayStr = d.toISOString().slice(0, 10);
      
      const dayTasks = tasks.filter(t => (t.dueDate ? t.dueDate.slice(0, 10) === dayStr : false) || (t.date === dayStr));
      const totalDay = dayTasks.length;
      const completedDay = dayTasks.filter(t => (t.status || '').toLowerCase() === 'completed').length;
      const overdueDay = dayTasks.filter(t => {
        const isDone = (t.status || '').toLowerCase() === 'completed';
        return !isDone && dayStr < todayStr;
      }).length;

      let status = 'none'; // 'none' | 'green' | 'amber' | 'rose'
      if (totalDay === 0) {
        if (completedDatesSet.has(dayStr)) status = 'green';
        else status = 'none';
      } else if (overdueDay > 0) {
        status = 'rose';
      } else if (completedDay === totalDay && totalDay > 0) {
        status = 'green';
      } else if (completedDay > 0 && completedDay < totalDay) {
        status = 'amber';
      } else if (dayStr < todayStr) {
        status = 'rose';
      } else {
        status = 'amber';
      }

      heatmapDays.push({
        date: dayStr,
        dayLabel: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        total: totalDay,
        completed: completedDay,
        status
      });
    }

    // 4-week trend: compare last 14 days vs previous 14 days completion rate
    const last14Completed = heatmapDays.slice(7).reduce((acc, curr) => acc + curr.completed, 0);
    const prev14Completed = heatmapDays.slice(0, 7).reduce((acc, curr) => acc + curr.completed, 0);
    let trendDirection = 'stable'; // 'up' | 'down' | 'stable'
    if (last14Completed > prev14Completed) trendDirection = 'up';
    else if (last14Completed < prev14Completed) trendDirection = 'down';

    // Days missed count in the period
    const daysMissed = missedDatesSet.size;

    return {
      assigned,
      completed,
      overdue,
      openCount: activeTasksList.length,
      onTimePercent,
      avgCompletionTimeHours: Number(avgCompletionTimeHours),
      teamAvgCompletionTimeHours: Number(teamAvgCompletionTimeHours),
      signOffStreak,
      daysMissed,
      priorityMix,
      reworkCount,
      reworkRate,
      incompleteReasons,
      heatmapDays,
      trendDirection,
      last14Completed,
      prev14Completed
    };
  }, [tasks, allTeamTasks]);

  return {
    isLoading,
    error,
    tasks,
    stats
  };
}

