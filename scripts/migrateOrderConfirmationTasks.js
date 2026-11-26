// scripts/migrateOrderConfirmationTasks.js
// Migration script: Maps legacy 'Order confirmation' tasks to 'ORDER TAKEN' without losing order counts

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'mock-key',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'stark-task-dev',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateOrderConfirmationTasks() {
  console.log('--- STARTING ORDER CONFIRMATION TO ORDER TAKEN MIGRATION ---');
  try {
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, where('taskType', '==', 'Order confirmation'));
    const snapshot = await getDocs(q);

    console.log(`Found ${snapshot.size} legacy 'Order confirmation' tasks.`);

    if (snapshot.empty) {
      console.log('No legacy tasks to migrate. All tasks are up to date.');
      return;
    }

    const batch = writeBatch(db);
    let migratedCount = 0;

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const orderCount = Number(data.orderCount) || 1;

      batch.update(doc(db, 'tasks', docSnap.id), {
        taskType: 'ORDER TAKEN',
        orderCount,
        migratedFrom: 'Order confirmation',
        migratedAt: new Date().toISOString()
      });
      migratedCount++;
    });

    await batch.commit();
    console.log(`Successfully migrated ${migratedCount} tasks to 'ORDER TAKEN' with orderCount preserved.`);
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

migrateOrderConfirmationTasks();

