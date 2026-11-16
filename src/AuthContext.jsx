import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { getEmployeeProfileByEmail } from './employeeDirectory';

const AuthContext = createContext(null);

export const USERS_COL = 'users';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null); // Firebase auth user
  const [userProfile, setUserProfile] = useState(null); // Validated employee profile
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Step 1: Look up directory definition by official email
        const directoryProfile = getEmployeeProfileByEmail(user.email);

        // Step 2: Attempt to retrieve from Firestore users collection
        try {
          const userDocRef = doc(db, USERS_COL, user.uid);
          const unsubProfile = onSnapshot(userDocRef, (snap) => {
            if (snap.exists()) {
              const firestoreData = snap.data();
              setUserProfile({
                id: user.uid,
                authUid: user.uid,
                ...directoryProfile, // Default verified reporting manager and department
                ...firestoreData, // Firestore overrides
                email: user.email
              });
            } else {
              // Create / establish profile from verified company directory
              const resolvedProfile = {
                id: user.uid,
                authUid: user.uid,
                email: user.email,
                fullName: directoryProfile?.fullName || user.displayName || user.email.split('@')[0],
                name: directoryProfile?.fullName || user.displayName || user.email.split('@')[0],
                role: directoryProfile?.role || 'Employee',
                department: directoryProfile?.department || 'operations',
                employeeId: directoryProfile?.employeeId || `EMP-${user.uid.slice(0, 6).toUpperCase()}`,
                reportingManagerId: directoryProfile?.reportingManagerId || null,
                reportingManagerName: directoryProfile?.reportingManagerName || 'General Manager',
                employmentStatus: 'active',
                permissions: directoryProfile?.permissions || ['view_own_tasks', 'update_own_tasks', 'submit_tasks']
              };

              // Persist to Firestore if permissions allow
              setDoc(userDocRef, { ...resolvedProfile, createdAt: serverTimestamp() }, { merge: true })
                .catch(() => {}); // Gracefully handled

              setUserProfile(resolvedProfile);
            }
            setLoading(false);
          }, (err) => {
            console.warn("Firestore user profile sync warning (falling back to verified directory):", err.message);
            // Fallback to verified directory without blocking auth
            if (directoryProfile) {
              setUserProfile({
                id: user.uid,
                authUid: user.uid,
                ...directoryProfile
              });
            } else {
              setUserProfile({
                id: user.uid,
                authUid: user.uid,
                email: user.email,
                fullName: user.email.split('@')[0],
                role: 'Employee',
                department: 'operations',
                employeeId: `EMP-${user.uid.slice(0, 6).toUpperCase()}`
              });
            }
            setLoading(false);
          });

          return () => unsubProfile();
        } catch (err) {
          console.warn("Error setting up user profile snapshot:", err);
          if (directoryProfile) {
            setUserProfile({ id: user.uid, authUid: user.uid, ...directoryProfile });
          }
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    return signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const register = async (email, password, additionalData = {}) => {
    const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const uid = res.user.uid;
    const directoryProfile = getEmployeeProfileByEmail(email);

    const profile = {
      id: uid,
      authUid: uid,
      email: res.user.email,
      fullName: additionalData.fullName || directoryProfile?.fullName || email.split('@')[0],
      name: additionalData.fullName || directoryProfile?.fullName || email.split('@')[0],
      role: additionalData.role || directoryProfile?.role || 'Executive Director',
      department: additionalData.department || directoryProfile?.department || 'management',
      employeeId: directoryProfile?.employeeId || `EMP-${uid.slice(0, 6).toUpperCase()}`,
      phone: additionalData.phone || directoryProfile?.phone || '',
      employmentStatus: 'active',
      createdAt: serverTimestamp(),
      ...additionalData
    };
    try {
      await setDoc(doc(db, USERS_COL, uid), profile, { merge: true });
    } catch (e) {
      console.warn("User doc registration write failed:", e);
    }
    return res;
  };

  const logout = async () => {
    return fbSignOut(auth);
  };

  const resetPassword = async (email) => {
    return sendPasswordResetEmail(auth, email.trim());
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      userProfile,
      loading,
      login,
      register,
      logout,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
