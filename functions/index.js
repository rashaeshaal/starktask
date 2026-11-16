const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

/**
 * Helper to verify caller has HR / Executive leadership permissions
 */
async function verifyHRCaller(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called by an authenticated user.'
    );
  }

  const callerUid = context.auth.uid;
  const callerSnap = await db.collection('users').doc(callerUid).get();

  if (!callerSnap.exists) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Caller profile does not exist in corporate database.'
    );
  }

  const callerData = callerSnap.data();
  const callerRole = callerData.role || '';
  const callerDept = (callerData.department || '').toLowerCase();

  const isAuthorized = [
    'Executive Director',
    'Director Operations',
    'General Manager',
    'HR Manager',
    'Admin Manager',
    'HR & Admin Manager'
  ].includes(callerRole) || callerDept === 'hr_admin';

  if (!isAuthorized) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Access Denied: Only HR Manager, Admin Manager, Executive Director, and General Manager may perform this action.'
    );
  }

  return { callerUid, callerData };
}

/**
 * 1. createEmployee
 */
exports.createEmployee = functions.https.onCall(async (data, context) => {
  const { callerData } = await verifyHRCaller(context);

  const {
    employeeId,
    fullName,
    name,
    email,
    phone,
    department,
    designation,
    role,
    reportsTo,
    joiningDate,
    status = 'active',
    password,
    mustChangePassword = true
  } = data;

  const finalName = (fullName || name || '').trim();
  const finalEmail = (email || '').trim().toLowerCase();
  const finalEmpId = (employeeId || '').trim();

  if (!finalName) {
    throw new functions.https.HttpsError('invalid-argument', 'Employee full name is mandatory.');
  }
  if (!finalEmail || !finalEmail.includes('@')) {
    throw new functions.https.HttpsError('invalid-argument', 'A valid work email is mandatory.');
  }
  if (!password || password.length < 8) {
    throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 8 characters long.');
  }

  let createdAuthUser = null;

  try {
    createdAuthUser = await admin.auth().createUser({
      email: finalEmail,
      password: password,
      displayName: finalName,
      phoneNumber: phone && phone.startsWith('+') ? phone : undefined,
      disabled: status === 'inactive'
    });

    const newUid = createdAuthUser.uid;

    await admin.auth().setCustomUserClaims(newUid, {
      role: role || designation || 'Staff',
      department: department || 'operations',
      employeeId: finalEmpId
    });

    const userDocRef = db.collection('users').doc(newUid);
    const userProfile = {
      id: newUid,
      uid: newUid,
      employeeId: finalEmpId,
      name: finalName,
      fullName: finalName,
      email: finalEmail,
      phone: phone || '',
      department: department || 'operations',
      designation: designation || role || 'Staff',
      role: role || designation || 'Staff',
      reportsTo: reportsTo || null,
      joiningDate: joiningDate || new Date().toISOString().split('T')[0],
      status: status,
      employmentStatus: status,
      mustChangePassword: Boolean(mustChangePassword),
      createdBy: callerData.name || callerData.fullName || 'HR Manager',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await userDocRef.set(userProfile);

    return {
      success: true,
      uid: newUid,
      employeeId: finalEmpId,
      email: finalEmail
    };
  } catch (error) {
    if (createdAuthUser && createdAuthUser.uid) {
      try {
        await admin.auth().deleteUser(createdAuthUser.uid);
      } catch (rollbackErr) {
        console.error('Failed to rollback auth user:', rollbackErr);
      }
    }

    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'This work email is already in use by another user.');
    }
    if (error.code === 'auth/invalid-password') {
      throw new functions.https.HttpsError('invalid-argument', 'The provided password does not meet security requirements.');
    }

    throw new functions.https.HttpsError('internal', error.message || 'Failed to create corporate employee record.');
  }
});

/**
 * 2. resetEmployeePassword
 */
exports.resetEmployeePassword = functions.https.onCall(async (data, context) => {
  await verifyHRCaller(context);

  const { uid, newPassword, requirePasswordChange = true } = data;

  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'Target employee UID is required.');
  }
  if (!newPassword || newPassword.length < 8) {
    throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 8 characters long.');
  }

  try {
    await admin.auth().updateUser(uid, {
      password: newPassword
    });

    await db.collection('users').doc(uid).update({
      mustChangePassword: Boolean(requirePasswordChange),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message || 'Failed to reset employee password.');
  }
});

/**
 * 3. setEmployeeStatus
 */
exports.setEmployeeStatus = functions.https.onCall(async (data, context) => {
  await verifyHRCaller(context);

  const { uid, status } = data;

  if (!uid || !status) {
    throw new functions.https.HttpsError('invalid-argument', 'UID and status are required.');
  }

  const isInactive = status === 'inactive';

  try {
    await admin.auth().updateUser(uid, {
      disabled: isInactive
    });

    await db.collection('users').doc(uid).update({
      status: status,
      employmentStatus: status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message || 'Failed to update employee status.');
  }
});

/**
 * 4. onTaskWritten (Firestore Trigger)
 * Automatically maintains precomputed daily per-employee stats:
 * `dailyStats/{uid_date}`: { uid, date, assigned, completed, overdue, onTime, updatedAt }
 * Ensures performance analytics and heatmaps for 65+ employees remain lightning fast without client-side loops.
 */
exports.onTaskWritten = functions.firestore
  .document('tasks/{taskId}')
  .onWrite(async (change, context) => {
    const afterData = change.after.exists ? change.after.data() : null;
    const beforeData = change.before.exists ? change.before.data() : null;

    const task = afterData || beforeData;
    if (!task) return null;

    const uid = task.assignedToId || task.assignedTo;
    const date = task.taskDate || task.date || (task.deadlineDate ? task.deadlineDate.split('T')[0] : null);

    if (!uid || !date) return null;

    const statDocRef = db.collection('dailyStats').doc(`${uid}_${date}`);

    // Query all tasks for this employee on this date
    const tasksSnap = await db.collection('tasks')
      .where('assignedToId', '==', uid)
      .where('taskDate', '==', date)
      .get();

    let assigned = 0;
    let completed = 0;
    let overdue = 0;
    let onTime = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    tasksSnap.forEach(docSnap => {
      const t = docSnap.data();
      assigned++;
      const isDone = t.status === 'Completed';
      if (isDone) {
        completed++;
        if (!t.deadlineDate || t.lastUpdated <= t.deadlineDate || t.taskDate <= t.deadlineDate) {
          onTime++;
        }
      } else {
        if (t.deadlineDate && t.deadlineDate < todayStr) {
          overdue++;
        }
      }
    });

    return statDocRef.set({
      uid,
      date,
      assigned,
      completed,
      overdue,
      onTime,
      completionRate: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
      onTimeRate: completed > 0 ? Math.round((onTime / completed) * 100) : 100,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
