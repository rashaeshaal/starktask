// src/hooks/useActivityLeaderboard.js
// Neutral, constructive field sales activity aggregator with trend indicators

import { useMemo } from 'react';
import { isOrderCountedTask } from '../dealerWorkTypes';

export function useActivityLeaderboard(employees = [], tasks = [], userScope = 'ALL') {
  return useMemo(() => {
    const salesEmps = employees.filter(e => {
      const dept = (e.department || e.departmentId || '').toLowerCase();
      const r = (e.role || '').toLowerCase();
      return dept.includes('sales') || ['cso', 'ssm', 'asm', 'sales coordinator'].includes(r);
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const rows = salesEmps.map(emp => {
      const eId = String(emp.id || emp.uid || emp.employeeId || '');
      const empTasks = tasks.filter(t => String(t.assignedToId || t.assignedTo || '') === eId);

      let visits = 0;
      let orders = 0;
      let replies = 0;

      empTasks.forEach(t => {
        const d = new Date(t.completedAt || t.createdAt || 0);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          const isDone = t.status === 'Completed' || t.status === 'completed';
          const type = t.taskType || t.type;

          if (type === 'DEALER VISIT' && isDone) visits += 1;
          if (isOrderCountedTask(t) && isDone) orders += (Number(t.orderCount) || 1);
          if (type === 'DEALER REPLY' && isDone) replies += 1;
        }
      });

      // Composite constructive activity score
      const totalActivities = visits + orders + replies;

      return {
        employeeId: eId,
        name: emp.fullName || emp.name || 'Sales Staff',
        role: emp.role || 'Sales Staff',
        zone: emp.zoneId || emp.region || 'General',
        visits,
        orders,
        replies,
        totalActivities,
        trend: totalActivities >= 15 ? 'up' : (totalActivities >= 5 ? 'steady' : 'starting')
      };
    });

    // Sort descending by activity
    rows.sort((a, b) => b.totalActivities - a.totalActivities);

    return rows;
  }, [employees, tasks, userScope]);
}

