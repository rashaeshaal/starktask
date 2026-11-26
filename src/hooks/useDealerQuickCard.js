// src/hooks/useDealerQuickCard.js
// Aggregates real-time dealer card metrics: last visit, last reply outcome, open follow-ups, month orders, open issues

import { useMemo } from 'react';
import { calculateDealerHealth } from '../config/fieldSalesConfig';
import { isOrderCountedTask } from '../dealerWorkTypes';

export function useDealerQuickCard(dealer, tasks = [], escalations = []) {
  return useMemo(() => {
    if (!dealer) return null;
    const dId = String(dealer.id || dealer.dealerId || '');

    // Filter dealer-related tasks
    const dealerTasks = tasks.filter(t => String(t.dealerId || t.targetDealerId || '') === dId);

    // 1. Last visit
    const visits = dealerTasks.filter(t => (t.taskType || t.type) === 'DEALER VISIT');
    visits.sort((a, b) => new Date(b.completedAt || b.createdAt || 0) - new Date(a.completedAt || a.createdAt || 0));
    const lastVisit = visits[0] || null;

    // 2. Last reply outcome
    const replies = dealerTasks.filter(t => (t.taskType || t.type) === 'DEALER REPLY');
    replies.sort((a, b) => new Date(b.completedAt || b.createdAt || 0) - new Date(a.completedAt || a.createdAt || 0));
    const lastReply = replies[0] || null;

    // 3. Open follow-ups
    const openFollowUps = dealerTasks.filter(t => {
      const isFollowUp = (t.taskType || t.type) === 'Dealer follow-up' || (t.title || '').includes('Follow-up');
      const isDone = t.status === 'Completed' || t.status === 'completed';
      return isFollowUp && !isDone;
    });

    // 4. Orders taken this month
    const now = new Date();
    const ordersThisMonth = dealerTasks.filter(t => {
      if (!isOrderCountedTask(t)) return false;
      const isDone = t.status === 'Completed' || t.status === 'completed';
      if (!isDone) return false;
      const d = new Date(t.completedAt || t.createdAt || 0);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((sum, t) => sum + (Number(t.orderCount) || 1), 0);

    // 5. Open issues / escalations
    const openIssues = escalations.filter(e => {
      const eDealerId = String(e.dealerId || '');
      const isOpen = e.status !== 'Resolved' && e.status !== 'Closed';
      return eDealerId === dId && isOpen;
    });

    // Health
    const health = calculateDealerHealth(dealer, visits, dealerTasks.filter(isOrderCountedTask), openIssues);

    return {
      dealerId: dId,
      dealerName: dealer.name || 'Unknown Dealer',
      region: dealer.region || dealer.zoneId || 'General',
      lastVisitDate: lastVisit ? (lastVisit.visitDate || lastVisit.completedAt?.slice(0, 10)) : (dealer.lastVisitDate || null),
      lastVisitPurpose: lastVisit?.purpose || null,
      lastReplyOutcome: lastReply?.outcome || dealer.lastReplyOutcome || 'No replies yet',
      lastReplyDate: lastReply ? (lastReply.completedAt?.slice(0, 10) || lastReply.createdAt?.slice(0, 10)) : null,
      openFollowUpsCount: openFollowUps.length,
      ordersThisMonth,
      openIssuesCount: openIssues.length,
      health
    };
  }, [dealer, tasks, escalations]);
}

