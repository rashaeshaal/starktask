// functions/precomputeFieldSalesDailyStats.js
// Cloud Function for precomputing field-sales aggregates and dealer activity metrics

const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

/**
 * Scheduled Cloud Function running daily at 00:05 (Asia/Kolkata timezone)
 * Computes dealer activity history, open issues, and pre-populates `dailyStats/{uid_date}`.
 */
exports.precomputeFieldSalesDailyStats = functions.pubsub
  .schedule('5 0 * * *')
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    console.log(`Starting precomputeFieldSalesDailyStats for date: ${today}`);

    try {
      const tasksSnap = await db.collection('tasks').get();
      const dealersSnap = await db.collection('dealers').get();

      const userStatsMap = new Map();
      const dealerStatsMap = new Map();

      tasksSnap.forEach(docSnap => {
        const task = docSnap.data();
        const assignee = task.assignedToId || task.assignedTo;
        const dealerId = task.dealerId;
        const isDone = task.status === 'Completed' || task.status === 'completed';

        if (assignee) {
          if (!userStatsMap.has(assignee)) {
            userStatsMap.set(assignee, { visits: 0, orders: 0, replies: 0, total: 0 });
          }
          const uStats = userStatsMap.get(assignee);
          uStats.total += 1;
          if (isDone) {
            if (task.taskType === 'DEALER VISIT') uStats.visits += 1;
            if (task.taskType === 'ORDER TAKEN' || task.taskType === 'Order confirmation') {
              uStats.orders += Number(task.orderCount) || 1;
            }
            if (task.taskType === 'DEALER REPLY') uStats.replies += 1;
          }
        }

        if (dealerId) {
          if (!dealerStatsMap.has(dealerId)) {
            dealerStatsMap.set(dealerId, { lastVisit: null, ordersTotal: 0 });
          }
          const dStats = dealerStatsMap.get(dealerId);
          if (task.taskType === 'DEALER VISIT' && isDone) {
            const comp = task.completedAt || task.taskDate;
            if (!dStats.lastVisit || comp > dStats.lastVisit) dStats.lastVisit = comp;
          }
          if ((task.taskType === 'ORDER TAKEN' || task.taskType === 'Order confirmation') && isDone) {
            dStats.ordersTotal += Number(task.orderCount) || 1;
          }
        }
      });

      // Write user daily stats
      const batch = db.batch();
      userStatsMap.forEach((stats, uid) => {
        const statRef = db.collection('dailyStats').doc(`${uid}_${today}`);
        batch.set(statRef, {
          uid,
          date: today,
          ...stats,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      });

      await batch.commit();
      console.log(`Successfully updated dailyStats for ${userStatsMap.size} sales staff.`);
      return null;
    } catch (err) {
      console.error('precomputeFieldSalesDailyStats failed:', err);
      return null;
    }
  });

