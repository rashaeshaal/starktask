import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc,
  writeBatch, 
  serverTimestamp 
} from "firebase/firestore";
import { MASTER_DEPARTMENTS, MASTER_DESIGNATIONS } from "../src/orgStructure.js";
import { ENTERPRISE_EMPLOYEE_DIRECTORY } from "../src/employeeDirectory.js";
import { STARK_DEALER_DIRECTORY } from "../src/dealerDirectory.js";

// NEW Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyB_Sjfj6UBSqQHee5P1Dpf-ZKXHE8falUs",
  authDomain: "starktask-e74ac.firebaseapp.com",
  projectId: "starktask-e74ac",
  storageBucket: "starktask-e74ac.firebasestorage.app",
  messagingSenderId: "203687528050",
  appId: "1:203687528050:web:cea8c5928e805731d364eb",
  measurementId: "G-Z67GBN7VYZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedData() {
  console.log("Starting direct seeding into starktask-e74ac Firestore...");

  // 1. Departments
  console.log("Writing departments...");
  for (const dept of MASTER_DEPARTMENTS) {
    await setDoc(doc(db, "departments", dept.id), {
      ...dept,
      createdAt: new Date().toISOString()
    });
  }
  console.log(`✓ Seeded ${MASTER_DEPARTMENTS.length} departments.`);

  // 2. Designations
  console.log("Writing designations...");
  for (const des of MASTER_DESIGNATIONS) {
    await setDoc(doc(db, "designations", des.id), {
      ...des,
      createdAt: new Date().toISOString()
    });
  }
  console.log(`✓ Seeded ${MASTER_DESIGNATIONS.length} designations.`);

  // 3. Organization Settings
  console.log("Writing organizationSettings...");
  await setDoc(doc(db, "organizationSettings", "general"), {
    companyName: "STARK STEEL DOORS",
    systemName: "SalesDoor Enterprise",
    sopVersion: "2.0",
    timezone: "Asia/Kolkata",
    orderCutoffTime: "11:00 AM",
    dailyTargetDoors: 70,
    dailyCutoffTime: "23:59:59",
    initializedAt: new Date().toISOString(),
    initialized: true
  });
  console.log("✓ Seeded organizationSettings.");

  // 4. Employees & Users
  console.log("Writing users & employees collections...");
  for (const emp of ENTERPRISE_EMPLOYEE_DIRECTORY) {
    const docId = emp.id || `emp_${emp.employeeId}`;
    const userData = {
      ...emp,
      id: docId,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, "users", docId), userData);
    await setDoc(doc(db, "employees", docId), userData);
  }
  console.log(`✓ Seeded ${ENTERPRISE_EMPLOYEE_DIRECTORY.length} verified employee records into 'users' and 'employees'.`);

  // 5. Dealers
  console.log("Writing dealers directory...");
  for (const dealer of STARK_DEALER_DIRECTORY) {
    await setDoc(doc(db, "dealers", dealer.id), {
      ...dealer,
      createdAt: new Date().toISOString()
    });
  }
  console.log(`✓ Seeded ${STARK_DEALER_DIRECTORY.length} dealers into 'dealers'.`);

  console.log("\n>>> ALL COLLECTIONS ARE CREATED IN FIRESTORE! <<<");
  process.exit(0);
}

seedData().catch(err => {
  console.error("Seeding error:", err);
  process.exit(1);
});

