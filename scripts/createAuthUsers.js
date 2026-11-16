import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { ENTERPRISE_EMPLOYEE_DIRECTORY } from "../src/employeeDirectory.js";

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
const auth = getAuth(app);

const DEFAULT_PASSWORD = "Password@123";

async function createAuthAccounts() {
  console.log(`Starting bulk creation of Auth accounts with default password: '${DEFAULT_PASSWORD}'...`);
  let created = 0;
  let skipped = 0;

  for (const emp of ENTERPRISE_EMPLOYEE_DIRECTORY) {
    if (!emp.email || !emp.email.includes("@")) continue;

    try {
      await createUserWithEmailAndPassword(auth, emp.email.trim(), DEFAULT_PASSWORD);
      created++;
      console.log(`✓ Created Auth user: ${emp.email} (${emp.fullName})`);
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        skipped++;
        console.log(`- Already exists: ${emp.email}`);
      } else {
        console.warn(`! Error for ${emp.email}:`, err.message);
      }
    }
  }

  console.log(`\n=================================================`);
  console.log(`Finished! Created: ${created}, Already existed: ${skipped}`);
  console.log(`All employees can now log in using password: '${DEFAULT_PASSWORD}'`);
  console.log(`=================================================`);
  process.exit(0);
}

createAuthAccounts().catch((err) => {
  console.error("Bulk auth creation failed:", err);
  process.exit(1);
});

