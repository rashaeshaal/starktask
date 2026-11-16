/**
 * Firebase Cloud Function: syncDownlineTree
 * 
 * Automatically recalculates and updates the `downline` array on user documents
 * whenever an employee's `reportsTo` or `reportingManagerId` is updated.
 * 
 * Deployment:
 * firebase deploy --only functions:syncDownlineTree
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Triggers on user document update or write.
 * Rebuilds the transitive downline closure for all managers in the hierarchy.
 */
exports.syncDownlineTree = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    const beforeData = change.before.exists ? change.before.data() : null;
    const afterData = change.after.exists ? change.after.data() : null;

    // Check if reportsTo changed
    const beforeManager = beforeData ? (beforeData.reportsTo || beforeData.reportingManagerId) : null;
    const afterManager = afterData ? (afterData.reportsTo || afterData.reportingManagerId) : null;

    if (beforeManager === afterManager && change.before.exists && change.after.exists) {
      return null;
    }

    console.log(`Recomputing downline tree after change on user ${context.params.userId}...`);

    try {
      // 1. Fetch all active users
      const usersSnap = await db.collection('users').get();
      const userMap = new Map();
      const parentToChildren = new Map();

      usersSnap.forEach(docSnap => {
        const u = { id: docSnap.id, ...docSnap.data() };
        userMap.set(docSnap.id, u);

        const mgrId = u.reportsTo || u.reportingManagerId;
        if (mgrId) {
          if (!parentToChildren.has(mgrId)) {
            parentToChildren.set(mgrId, []);
          }
          parentToChildren.get(mgrId).push(docSnap.id);
        }
      });

      // 2. Transitive Downline Helper (DFS)
      function getDownlineIds(managerId, visited = new Set()) {
        const result = new Set();
        const directChildren = parentToChildren.get(managerId) || [];

        for (const childId of directChildren) {
          if (!visited.has(childId)) {
            visited.add(childId);
            result.add(childId);
            const subtree = getDownlineIds(childId, visited);
            subtree.forEach(id => result.add(id));
          }
        }

        return Array.from(result);
      }

      // 3. Update in batches of 500
      let batch = db.batch();
      let count = 0;

      for (const [userId, userObj] of userMap.entries()) {
        const newDownline = getDownlineIds(userId);
        const currentDownline = userObj.downline || [];

        // Check if different
        const isDifferent = newDownline.length !== currentDownline.length ||
          !newDownline.every(id => currentDownline.includes(id));

        if (isDifferent) {
          const userRef = db.collection('users').doc(userId);
          batch.update(userRef, {
            downline: newDownline,
            downlineCount: newDownline.length,
            downlineUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          count++;

          if (count % 400 === 0) {
            await batch.commit();
            batch = db.batch();
          }
        }
      }

      if (count % 400 !== 0) {
        await batch.commit();
      }

      console.log(`Successfully synced downline tree for ${count} users.`);
      return true;
    } catch (err) {
      console.error('Error synchronizing downline tree:', err);
      return null;
    }
  });

