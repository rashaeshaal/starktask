import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  writeBatch, 
  serverTimestamp 
} from "firebase/firestore";
import { MASTER_DEPARTMENTS, MASTER_DESIGNATIONS } from "../src/orgStructure.js";
import { ENTERPRISE_EMPLOYEE_DIRECTORY } from "../src/employeeDirectory.js";
import { STARK_DEALER_DIRECTORY } from "../src/dealerDirectory.js";

// OLD Firebase Config (Counsellor Project)
const oldFirebaseConfig = {
  apiKey: "AIzaSyAenoNfxm6XyIWrad5hocYwKTlqO3roKa8",
  authDomain: "counsellor-7cb91.firebaseapp.com",
  projectId: "counsellor-7cb91",
  storageBucket: "counsellor-7cb91.firebasestorage.app",
  messagingSenderId: "730488533133",
  appId: "1:730488533133:web:460a308720d9ef2dfd32c4",
  measurementId: "G-BSHZWL5NNY"
};

// NEW Firebase Config (Stark Task Project)
const newFirebaseConfig = {
  apiKey: "AIzaSyB_Sjfj6UBSqQHee5P1Dpf-ZKXHE8falUs",
  authDomain: "starktask-e74ac.firebaseapp.com",
  projectId: "starktask-e74ac",
  storageBucket: "starktask-e74ac.firebasestorage.app",
  messagingSenderId: "203687528050",
  appId: "1:203687528050:web:cea8c5928e805731d364eb",
  measurementId: "G-Z67GBN7VYZ"
};

const oldApp = initializeApp(oldFirebaseConfig, "oldApp");
const newApp = initializeApp(newFirebaseConfig, "newApp");

const oldDb = getFirestore(oldApp);
const newDb = getFirestore(newApp);

const COLLECTIONS_TO_MIGRATE = [
  "users",
  "employees",
  "departments",
  "designations",
  "teams",
  "teamMembers",
  "tasks",
  "personal_todos",
  "organizationSettings",
  "recurringTasks",
  "taskAuditLogs",
  "notifications",
  "dealers"
];

async function migrateCollection(colName) {
  console.log(`\n--- Migrating collection: ${colName} ---`);
  try {
    const oldSnap = await getDocs(collection(oldDb, colName));
    console.log(`Found ${oldSnap.size} documents in old Firebase for '${colName}'.`);

    if (!oldSnap.empty) {
      let batch = writeBatch(newDb);
      let count = 0;
      let total = 0;

      for (const d of oldSnap.docs) {
        const data = d.data();
        batch.set(doc(newDb, colName, d.id), data, { merge: true });
        count++;
        total++;

        if (count === 450) {
          await batch.commit();
          console.log(`Committed chunk of ${count} records for '${colName}'...`);
          batch = writeBatch(newDb);
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }
      console.log(`Successfully migrated ${total} documents to new Firebase for '${colName}'.`);
      return total;
    }
    return 0;
  } catch (err) {
    console.warn(`Could not read '${colName}' from old project or it is empty:`, err.message);
    return 0;
  }
}

async function seedCompanyMasterData() {
  console.log("\n--- Seeding/Ensuring Full Stark Steel Master Data in New Firebase ---");

  // 1. Departments
  console.log("Seeding departments...");
  let batch = writeBatch(newDb);
  let opCount = 0;
  for (const dept of MASTER_DEPARTMENTS) {
    batch.set(doc(newDb, "departments", dept.id), {
      ...dept,
      updatedAt: serverTimestamp()
    }, { merge: true });
    opCount++;
  }
  await batch.commit();
  console.log(`Seeded ${opCount} departments.`);

  // 2. Designations
  console.log("Seeding designations...");
  batch = writeBatch(newDb);
  opCount = 0;
  for (const des of MASTER_DESIGNATIONS) {
    batch.set(doc(newDb, "designations", des.id), {
      ...des,
      updatedAt: serverTimestamp()
    }, { merge: true });
    opCount++;
  }
  await batch.commit();
  console.log(`Seeded ${opCount} designations.`);

  // 3. Users & Employees Collections (Master Directory)
  console.log("Seeding enterprise users & employees...");
  batch = writeBatch(newDb);
  let userCount = 0;
  for (const emp of ENTERPRISE_EMPLOYEE_DIRECTORY) {
    const docId = emp.id || `emp_${emp.employeeId}`;
    const userData = {
      ...emp,
      id: docId,
      updatedAt: serverTimestamp()
    };

    // Populate both 'users' and 'employees' collections for seamless compatibility
    batch.set(doc(newDb, "users", docId), userData, { merge: true });
    batch.set(doc(newDb, "employees", docId), userData, { merge: true });
    userCount++;

    if (userCount % 200 === 0) {
      await batch.commit();
      batch = writeBatch(newDb);
    }
  }
  await batch.commit();
  console.log(`Seeded ${userCount} verified users/employees into 'users' and 'employees' collections.`);

  // 4. Dealers Directory Collection
  console.log("Seeding dealers collection...");
  batch = writeBatch(newDb);
  let dealerCount = 0;
  for (const dealer of STARK_DEALER_DIRECTORY) {
    batch.set(doc(newDb, "dealers", dealer.id), {
      ...dealer,
      updatedAt: serverTimestamp()
    }, { merge: true });
    dealerCount++;

    if (dealerCount % 400 === 0) {
      await batch.commit();
      batch = writeBatch(newDb);
    }
  }
  await batch.commit();
  console.log(`Seeded ${dealerCount} dealers into 'dealers' collection.`);

  // 5. General Organization Settings
  await newDb.collection ? null : null;
  const settingsBatch = writeBatch(newDb);
  settingsBatch.set(doc(newDb, "organizationSettings", "general"), {
    companyName: "STARK STEEL DOORS",
    systemName: "SalesDoor Enterprise",
    sopVersion: "2.0",
    timezone: "Asia/Kolkata",
    orderCutoffTime: "11:00 AM",
    dailyTargetDoors: 70,
    dailyCutoffTime: "23:59:59",
    initializedAt: serverTimestamp(),
    initialized: true
  }, { merge: true });
  await settingsBatch.commit();
  console.log("Seeded 'organizationSettings/general' configuration.");
}

async function run() {
  console.log("=================================================");
  console.log("Starting Firebase Migration to starktask-e74ac...");
  console.log("=================================================");

  for (const col of COLLECTIONS_TO_MIGRATE) {
    await migrateCollection(col);
  }

  await seedCompanyMasterData();

  console.log("\n=================================================");
  console.log("✓ Firebase Migration and Collection Setup Complete!");
  console.log("=================================================\n");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
