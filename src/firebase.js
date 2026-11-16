import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration (supports .env variables with hardcoded fallbacks)
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB_Sjfj6UBSqQHee5P1Dpf-ZKXHE8falUs",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "starktask-e74ac.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "starktask-e74ac",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "starktask-e74ac.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "203687528050",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:203687528050:web:cea8c5928e805731d364eb",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-Z67GBN7VYZ"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore, Authentication, Storage, and Functions
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Callable Cloud Function triggers
export const apiCreateEmployee = httpsCallable(functions, 'createEmployee');
export const apiResetEmployeePassword = httpsCallable(functions, 'resetEmployeePassword');
export const apiSetEmployeeStatus = httpsCallable(functions, 'setEmployeeStatus');

// Initialize Analytics conditionally (only in browser environments where supported)
export let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}

export default app;
