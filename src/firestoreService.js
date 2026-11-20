import { 
  collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, 
  onSnapshot, query, where, orderBy, serverTimestamp, writeBatch 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { MASTER_DEPARTMENTS, MASTER_DESIGNATIONS } from './orgStructure';
import { getTodayDateString } from './dateUtils';
import { STARK_DEALER_DIRECTORY } from './dealerDirectory';

import { getScope, getVisibleUserIds, SCOPES } from './permissions';

/**
 * PRODUCTION FIRESTORE COLLECTIONS
 */
export const USERS_COL = 'users';
export const EMPLOYEES_COL = 'employees';
export const TEAMS_COL = 'teams';
export const TEAM_MEMBERS_COL = 'teamMembers';
export const REPORTING_REL_COL = 'reportingRelationships';
export const DEPTS_COL = 'departments';
export const DESIGNATIONS_COL = 'designations';
export const TASKS_COL = 'tasks';
export const AUDIT_COL = 'taskAuditLogs';
export const AUDIT_LOGS_COL = 'auditLogs';
export const NOTIFS_COL = 'notifications';
export const RECURRING_COL = 'recurringTasks';
export const ORG_SETTINGS_COL = 'organizationSettings';
export const DEALERS_COL = 'dealers';
export const DEALER_BOOKINGS_COL = 'dealerBookings';

/**
 * Audit log write helper for sensitive operations:
 * Writes to `auditLogs` collection (actorId, action, targetId, before, after, reason, timestamp)
 */
export async function writeAuditLog({ actorId, action, targetId, before = null, after = null, reason = '' }) {
  try {
    const payload = {
      actorId: String(actorId || 'system'),
      action: String(action || 'UNKNOWN_ACTION'),
      targetId: String(targetId || ''),
      before: before || null,
      after: after || null,
      reason: String(reason || ''),
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, AUDIT_LOGS_COL), payload);
    return docRef.id;
  } catch (err) {
    console.warn('writeAuditLog warning (non-fatal):', err);
    return null;
  }
}

/**
 * Initializes the approved company structure (Departments, Designations, Users/Employees & Settings)
 * in Firestore whenever a new Firebase database is connected.
 */
export async function initializeCompanyStructure() {
  try {
    const deptsSnap = await getDocs(collection(db, DEPTS_COL));
    if (deptsSnap.empty) {
      console.log('Initializing official company structure in Cloud Firestore...');
      const batch = writeBatch(db);

      // 1. Departments
      for (const dept of MASTER_DEPARTMENTS) {
        batch.set(doc(db, DEPTS_COL, dept.id), {
          ...dept,
          createdAt: serverTimestamp()
        });
      }

      // 2. Designations
      for (const des of MASTER_DESIGNATIONS) {
        batch.set(doc(db, DESIGNATIONS_COL, des.id), {
          ...des,
          createdAt: serverTimestamp()
        });
      }

      // 3. Organization Settings Document
      batch.set(doc(db, ORG_SETTINGS_COL, 'general'), {
        companyName: 'STARK STEEL DOORS',
        systemName: 'SalesDoor Enterprise',
        sopVersion: '2.0',
        timezone: 'Asia/Kolkata',
        dailyCutoffTime: '23:59:59',
        orderCutoffTime: '11:00 AM',
        dailyTargetDoors: 70,
        createdAt: serverTimestamp()
      });

      // 4. Seed official dealers if collection empty
      const dealersSnap = await getDocs(collection(db, DEALERS_COL));
      if (dealersSnap.empty) {
        for (const dlr of STARK_DEALER_DIRECTORY.slice(0, 30)) {
          batch.set(doc(db, DEALERS_COL, dlr.id), {
            id: dlr.id,
            name: dlr.name,
            code: dlr.code,
            region: dlr.region,
            assignedStaff: dlr.assignedStaff,
            assignedTo: dlr.assignedStaff,
            phone: '+91 99000 ' + Math.floor(10000 + Math.random() * 90000),
            email: dlr.staffEmail || 'dealer@starkdoors.com',
            address: `${dlr.name}, ${dlr.region}`,
            gstNumber: '32AABCS' + Math.floor(1000 + Math.random() * 9000) + 'A1Z5',
            status: 'Active',
            createdAt: serverTimestamp()
          });
        }
      }

      await batch.commit();
      console.log('Company structure successfully initialized in Cloud Firestore.');
    }
  } catch (err) {
    console.error('Error initializing company structure:', err);
  }
}

/**
 * 0. Subscribe to Organization Settings (e.g. org.rootEmployeeId)
 */
export function subscribeToOrgSettings(callback) {
  const docRef = doc(db, ORG_SETTINGS_COL, 'general');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() });
    } else {
      callback({});
    }
  }, (err) => console.error('Org settings sync error:', err));
}

/**
 * 1. Subscribe to Departments
 */
export function subscribeToDepartments(callback) {
  const q = query(collection(db, DEPTS_COL), orderBy('id', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
    callback(list);
  }, (err) => console.error('Departments sync error:', err));
}

/**
 * 2. Subscribe to Designations
 */
export function subscribeToDesignations(callback) {
  const q = query(collection(db, DESIGNATIONS_COL), orderBy('title', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
    callback(list);
  }, (err) => console.error('Designations sync error:', err));
}

/**
 * 3. Subscribe to Real Employees Directory
 */
export function subscribeToEmployees(callback) {
  const q = query(collection(db, EMPLOYEES_COL), orderBy('fullName', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
    callback(list);
  }, (err) => console.error('Employees sync error:', err));
}

/**
 * 4. Subscribe to Real Operational Teams
 */
export function subscribeToTeams(callback) {
  const q = query(collection(db, TEAMS_COL), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
    callback(list);
  }, (err) => console.error('Teams sync error:', err));
}

/**
 * 5. Subscribe to Real Team Members
 */
export function subscribeToTeamMembers(callback) {
  const q = query(collection(db, TEAM_MEMBERS_COL));
  return onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
    callback(list);
  }, (err) => console.error('Team members sync error:', err));
}

/**
 * 6. Subscribe to Real Tasks Stream
 * Filters strictly by role scope (company, department, downline, self).
 * For downline/in-queries, chunks at 30 to comply with Firestore 'in' limits.
 */
export function subscribeToTasks(currentUser, callback, allEmployees = []) {
  if (!currentUser) return () => {};

  const scope = getScope(currentUser);
  const uid = String(currentUser.id || currentUser.uid || currentUser.employeeId || '');

  // 1. Company Scope: Reads all tasks ordered by creation
  if (scope === SCOPES.COMPANY) {
    const q = query(collection(db, TASKS_COL), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
      callback(list);
    }, (err) => {
      console.error('Company tasks listener error:', err);
      // Fallback
      const fallbackQ = query(collection(db, TASKS_COL));
      return onSnapshot(fallbackQ, (fallbackSnap) => {
        const list = [];
        fallbackSnap.forEach(d => list.push({ id: d.id, ...d.data() }));
        callback(list);
      });
    });
  }

  // 2. Department Scope: Server-side query by department / departmentId
  if (scope === SCOPES.DEPARTMENT) {
    const userDept = (currentUser.department || currentUser.departmentId || '').toLowerCase();
    const q = query(
      collection(db, TASKS_COL),
      where('departmentId', '==', userDept)
    );

    return onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
      callback(list);
    }, (err) => {
      console.warn('Department task query failed, trying department name query:', err);
      const qAlt = query(
        collection(db, TASKS_COL),
        where('department', '==', currentUser.department || userDept)
      );
      return onSnapshot(qAlt, (altSnap) => {
        const list = [];
        altSnap.forEach(d => list.push({ id: d.id, ...d.data() }));
        callback(list);
      });
    });
  }

  // 3. Downline Scope: Chunks visible user IDs at 30 for Firestore 'in' queries
  if (scope === SCOPES.DOWNLINE) {
    const rawVisibleIds = getVisibleUserIds(currentUser, allEmployees);
    // Expand visible IDs with their employeeId and emp_ prefix variations
    const expandedIds = new Set(rawVisibleIds);
    allEmployees.forEach(emp => {
      const eId = String(emp.id || '');
      const eUid = String(emp.uid || '');
      const empNum = emp.employeeId ? String(emp.employeeId) : '';
      if (rawVisibleIds.includes(eId) || rawVisibleIds.includes(eUid) || (empNum && rawVisibleIds.includes(empNum))) {
        if (eId) expandedIds.add(eId);
        if (eUid) expandedIds.add(eUid);
        if (empNum) {
          expandedIds.add(empNum);
          expandedIds.add(`emp_${empNum}`);
        }
      }
    });
    // Add current user's own IDs
    expandedIds.add(String(currentUser.id || ''));
    expandedIds.add(String(currentUser.uid || ''));
    if (currentUser.employeeId) {
      expandedIds.add(String(currentUser.employeeId));
      expandedIds.add(`emp_${currentUser.employeeId}`);
    }

    const visibleIds = Array.from(expandedIds).filter(Boolean);
    
    // Chunking array at max 30 items
    const chunkSize = 30;
    const chunks = [];
    for (let i = 0; i < visibleIds.length; i += chunkSize) {
      chunks.push(visibleIds.slice(i, i + chunkSize));
    }

    const chunkResults = new Map();
    const emitAggregated = () => {
      const map = new Map();
      chunkResults.forEach(list => {
        list.forEach(item => map.set(item.id, item));
      });
      const aggregated = Array.from(map.values());
      aggregated.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });
      callback(aggregated);
    };

    const unsubs = [];

    // Query 1: Tasks assigned to downline or self
    chunks.forEach((chunk, idx) => {
      const q = query(collection(db, TASKS_COL), where('assignedToId', 'in', chunk));
      unsubs.push(
        onSnapshot(q, (snap) => {
          const chunkList = [];
          snap.forEach(d => chunkList.push({ id: d.id, ...d.data() }));
          chunkResults.set(`assigned_${idx}`, chunkList);
          emitAggregated();
        }, (err) => {
          console.error(`Downline task chunk ${idx} error:`, err);
        })
      );
    });

    // Query 2: Tasks assigned BY the current user (e.g. Shamna)
    const myIds = [currentUser.id, currentUser.uid, currentUser.employeeId, currentUser.employeeId ? `emp_${currentUser.employeeId}` : null].filter(Boolean).map(String);
    if (myIds.length > 0) {
      const qAssignedBy = query(collection(db, TASKS_COL), where('assignedById', 'in', myIds.slice(0, 30)));
      unsubs.push(
        onSnapshot(qAssignedBy, (snap) => {
          const byList = [];
          snap.forEach(d => byList.push({ id: d.id, ...d.data() }));
          chunkResults.set('assigned_by_me', byList);
          emitAggregated();
        }, (err) => {
          console.warn('Downline assignedById error:', err);
        })
      );
    }

    return () => unsubs.forEach(unsub => unsub && unsub());
  }

  // 4. Self Scope: Frontline personnel
  // Listen to tasks assigned TO this user OR assigned BY this user
  const selfIds = Array.from(new Set([
    currentUser.id,
    currentUser.uid,
    currentUser.employeeId,
    currentUser.employeeId ? `emp_${currentUser.employeeId}` : null,
    currentUser.id && String(currentUser.id).startsWith('emp_') ? String(currentUser.id).replace('emp_', '') : null,
    currentUser.email
  ].filter(Boolean).map(String)));

  const listeners = [];
  const selfMap = new Map();

  const emitSelfTasks = () => {
    const list = Array.from(selfMap.values());
    list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });
    callback(list);
  };

  // 4a. Assigned to me via assignedToId (chunks of 30)
  for (let i = 0; i < selfIds.length; i += 30) {
    const chunk = selfIds.slice(i, i + 30);
    const qAssigned = query(collection(db, TASKS_COL), where('assignedToId', 'in', chunk));
    listeners.push(
      onSnapshot(qAssigned, (snap) => {
        snap.forEach(d => selfMap.set(d.id, { id: d.id, ...d.data() }));
        emitSelfTasks();
      }, (err) => {
        console.warn('assignedToId query error, falling back:', err);
      })
    );
  }

  // 4b. Assigned to me via assigneeIds array
  for (let i = 0; i < selfIds.length; i += 10) {
    const chunk = selfIds.slice(i, i + 10);
    const qAssigneeIds = query(collection(db, TASKS_COL), where('assigneeIds', 'array-contains-any', chunk));
    listeners.push(
      onSnapshot(qAssigneeIds, (snap) => {
        snap.forEach(d => selfMap.set(d.id, { id: d.id, ...d.data() }));
        emitSelfTasks();
      }, (err) => {
        console.warn('assigneeIds query error:', err);
      })
    );
  }

  // 4c. Tasks created / assigned BY me
  for (let i = 0; i < selfIds.length; i += 30) {
    const chunk = selfIds.slice(i, i + 30);
    const qAssignedBy = query(collection(db, TASKS_COL), where('assignedById', 'in', chunk));
    listeners.push(
      onSnapshot(qAssignedBy, (snap) => {
        snap.forEach(d => selfMap.set(d.id, { id: d.id, ...d.data() }));
        emitSelfTasks();
      }, (err) => {
        console.warn('assignedById query error:', err);
      })
    );
  }

  return () => listeners.forEach(unsub => unsub && unsub());
}

/**
 * 7. Subscribe to User Notifications
 */
export function subscribeToNotifications(userId, callback) {
  if (!userId) return () => {};
  // Query by recipientId only without orderBy to avoid requiring a composite index
  const q = query(
    collection(db, NOTIFS_COL),
    where('recipientId', '==', userId)
  );
  return onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
    // Client-side sort by createdAt descending
    list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });
    callback(list);
  }, (err) => console.error('Notifications sync error:', err));
}

/**
 * 8. Subscribe to Dealers (Live Firestore with automatic fallback)
 */
export function subscribeToDealers(callback) {
  const q = query(collection(db, DEALERS_COL), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
    if (list.length > 0) {
      callback(list);
    } else {
      // Return static default if Firestore collection is still being provisioned
      callback(STARK_DEALER_DIRECTORY.map(d => ({
        ...d,
        phone: '+91 99000 00100',
        email: d.staffEmail || 'dealer@starkdoors.com',
        status: 'Active',
        assignedTo: d.assignedStaff
      })));
    }
  }, (err) => {
    console.warn('Dealers subscription error, falling back to local master:', err);
    callback(STARK_DEALER_DIRECTORY.map(d => ({
      ...d,
      phone: '+91 99000 00100',
      email: d.staffEmail || 'dealer@starkdoors.com',
      status: 'Active',
      assignedTo: d.assignedStaff
    })));
  });
}

/**
 * 9. Subscribe to Dealer Bookings
 */
export function subscribeToDealerBookings(callback) {
  const q = query(collection(db, DEALER_BOOKINGS_COL), orderBy('bookedAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
    callback(list);
  }, (err) => console.error('Dealer bookings sync error:', err));
}

/**
 * Creates a new task in Firestore
 */
export async function createFirestoreTask(taskData, creator) {
  const todayStr = getTodayDateString();
  const timestamp = new Date().toISOString();

  const taskPayload = {
    ...taskData,
    createdById: creator.id || creator.uid,
    createdByName: creator.fullName || creator.name,
    createdByRole: creator.role,
    assignedById: taskData.assignedById || creator.id || creator.uid,
    assignedByName: taskData.assignedByName || creator.fullName || creator.name,
    assignedByRole: taskData.assignedByRole || creator.role,
    createdAt: timestamp,
    lastUpdated: timestamp,
    taskDate: taskData.taskDate || todayStr,
    status: taskData.status || 'Pending',
    progressPercentage: taskData.progressPercentage || 0,
    parentTaskId: taskData.parentTaskId || null,
    chainPath: taskData.chainPath || null,
    auditLogs: [
      {
        id: `log-${Date.now()}`,
        action: 'TASK_CREATED',
        performedById: creator.id || creator.uid,
        performedByName: `${creator.fullName || creator.name} (${creator.role})`,
        timestamp,
        details: taskData.description || 'Task assigned'
      },
      ...(taskData.auditLogs || [])
    ]
  };

  const docRef = await addDoc(collection(db, TASKS_COL), taskPayload);
  return docRef.id;
}

/**
 * Updates an existing task with audit logging (or creates it if taskId is missing)
 */
export async function updateFirestoreTask(taskId, updateData, user) {
  if (!taskId) {
    return createFirestoreTask(updateData, user);
  }
  const timestamp = new Date().toISOString();
  const taskRef = doc(db, TASKS_COL, taskId);

  const existingSnap = await getDoc(taskRef);
  const existingData = existingSnap.exists() ? existingSnap.data() : {};

  const auditLog = {
    id: `log-${Date.now()}`,
    action: updateData.status ? `STATUS_UPDATED_${updateData.status.toUpperCase()}` : 'TASK_UPDATED',
    performedById: user.id || user.uid,
    performedByName: `${user.fullName || user.name} (${user.role})`,
    timestamp,
    details: updateData.submissionNotes || updateData.approvalRemarks || 'Task updated'
  };

  const mergedLogs = [auditLog, ...(existingData.auditLogs || [])];

  await updateDoc(taskRef, {
    ...updateData,
    lastUpdated: timestamp,
    auditLogs: mergedLogs
  });

  // Roll up progress to parent task if this was a subtask
  const parentId = updateData.parentTaskId || existingData.parentTaskId;
  if (parentId) {
    try {
      const subtasksQ = query(collection(db, TASKS_COL), where('parentTaskId', '==', parentId));
      const subtasksSnap = await getDocs(subtasksQ);
      if (!subtasksSnap.empty) {
        let totalPct = 0;
        let count = 0;
        let allCompleted = true;
        subtasksSnap.forEach(d => {
          const sData = d.data();
          const sPct = Number(sData.progressPercentage || 0);
          totalPct += sPct;
          count += 1;
          if (sData.status !== 'Completed') {
            allCompleted = false;
          }
        });
        const rolledProgress = count > 0 ? Math.round(totalPct / count) : 0;
        const parentRef = doc(db, TASKS_COL, parentId);
        await updateDoc(parentRef, {
          progressPercentage: rolledProgress,
          ...(allCompleted ? { status: 'Completed' } : {}),
          lastUpdated: timestamp
        });
      }
    } catch (rollupErr) {
      console.warn('Subtask progress rollup warning:', rollupErr);
    }
  }
}

/**
 * Upload an attachment to Firebase Storage (images, pdfs, videos up to 25MB)
 */
export async function uploadTaskAttachment(file, taskId = 'general') {
  if (!file) throw new Error('No file provided');
  const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
  if (file.size > MAX_SIZE) {
    throw new Error('File exceeds the 25 MB limit.');
  }

  const validTypes = ['image/', 'application/pdf', 'video/'];
  const isValid = validTypes.some(t => file.type.startsWith(t) || file.type === t);
  if (!isValid) {
    throw new Error('Unsupported file format. Please upload an image, PDF, or video.');
  }

  const cleanName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const storagePath = `taskAttachments/${taskId}/${cleanName}`;
  const storageRef = ref(storage, storagePath);

  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      null,
      (error) => reject(error),
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({
          name: file.name,
          url: downloadUrl,
          size: file.size,
          type: file.type,
          storagePath
        });
      }
    );
  });
}

/**
 * Creates a Dealer Booking and its linked automated task chain
 * Chain: (1) Verify payment token (Accounts) -> (2) Pick doors (Warehouse) -> (3) Load and dispatch (Transport)
 */
export async function createDealerBookingWithChain(bookingData, user) {
  const timestamp = new Date().toISOString();
  const now = new Date();
  const bookingDate = bookingData.bookingDate || getTodayDateString();

  // 11:00 AM cutoff check: A booking saved after 11:00 AM gets a "Late order" flag
  const isAfter11AM = now.getHours() > 11 || (now.getHours() === 11 && (now.getMinutes() > 0 || now.getSeconds() > 0));

  const totalQuantity = (bookingData.lines || []).reduce((sum, line) => sum + (parseInt(line.quantity, 10) || 1), 0);

  const initialStatus = isAfter11AM ? 'Pending Approval' : 'Booked';

  const bookingPayload = {
    dealerId: bookingData.dealerId,
    dealerName: bookingData.dealerName,
    dealerCode: bookingData.dealerCode || '',
    region: bookingData.region || '',
    assignedTo: bookingData.assignedTo || user.fullName || user.name,
    assignedToId: bookingData.assignedToId || user.id || user.uid,
    teamId: bookingData.teamId || 'sales',
    lines: bookingData.lines || [],
    totalQuantity,
    requiredBy: bookingData.requiredBy,
    bookedAt: timestamp,
    bookingDate,
    deliveryAddress: bookingData.deliveryAddress || '',
    notes: bookingData.notes || '',
    paymentSlipUrl: bookingData.paymentSlipUrl || null,
    late: isAfter11AM,
    status: initialStatus,
    statusHistory: [
      {
        status: initialStatus,
        performedBy: user.fullName || user.name,
        performedByRole: user.role,
        timestamp,
        notes: isAfter11AM ? 'Booked after 11:00 AM cutoff. Sign-off requested from SSM/CSO.' : 'Initial booking logged.'
      }
    ],
    linkedTaskIds: []
  };

  const bookingRef = await addDoc(collection(db, DEALER_BOOKINGS_COL), bookingPayload);
  const bookingId = bookingRef.id;

  // Linked Task 1: Verify Payment Token (Finance Department)
  const task1Id = await createFirestoreTask({
    title: `Verify payment token - ${bookingData.dealerName}`,
    description: `Verify advance payment token/credit clearance for dealer booking #${bookingData.bookingCode || bookingId.slice(-6).toUpperCase()}. Salesperson: ${user.fullName || user.name}. Required-by date: ${bookingData.requiredBy}.`,
    taskType: 'Payment verification',
    reference: bookingData.bookingCode || bookingId.slice(-6).toUpperCase(),
    partyName: bookingData.dealerName,
    department: 'finance',
    departmentId: 'finance',
    assignedToName: 'Accounts Manager',
    assignedToId: 'emp_106',
    priority: isAfter11AM ? 'High' : 'Medium',
    deadlineDate: bookingData.requiredBy,
    requiredBy: bookingData.requiredBy,
    isLinkedSalesWork: true,
    salespersonName: user.fullName || user.name,
    salespersonId: user.id || user.uid,
    sourceBookingId: bookingId,
    bookingId,
    attachments: bookingData.paymentSlipUrl ? [{
      name: 'Payment Slip',
      url: bookingData.paymentSlipUrl,
      type: 'image/jpeg',
      uploadedAt: timestamp
    }] : [],
    paymentSlipUrl: bookingData.paymentSlipUrl || null,
    taskCategory: 'stark_door_order'
  }, user);

  // Linked Task 2: Warehouse Picking (Warehouse Squad)
  const task2Id = await createFirestoreTask({
    title: `[Warehouse Picking] ${bookingData.dealerName} - ${totalQuantity} Doors`,
    description: `Pick & quality pack doors for required-by date: ${bookingData.requiredBy}. Lines: ${(bookingData.lines || []).map(l => `${l.quantity}x ${l.model} (${l.finish || ''})`).join(', ')}`,
    department: 'warehouse',
    departmentId: 'warehouse',
    assignedToName: 'Warehouse In-charge',
    assignedToId: 'emp_166',
    priority: 'Medium',
    deadlineDate: bookingData.requiredBy,
    requiredBy: bookingData.requiredBy,
    isLinkedSalesWork: true,
    bookingId,
    parentTaskId: task1Id,
    dealerName: bookingData.dealerName,
    quantity: totalQuantity,
    taskCategory: 'stark_door_order'
  }, user);

  // Linked Task 3: Loading & Dispatch (Transportation Squad)
  const task3Id = await createFirestoreTask({
    title: `[Dispatch Route] ${bookingData.dealerName} - ${totalQuantity} Doors`,
    description: `Loading and dispatch delivery to ${bookingData.deliveryAddress} by required date: ${bookingData.requiredBy}.`,
    department: 'transportation',
    departmentId: 'transportation',
    assignedToName: 'Transport Manager',
    assignedToId: 'emp_176',
    priority: 'Medium',
    deadlineDate: bookingData.requiredBy,
    requiredBy: bookingData.requiredBy,
    isLinkedSalesWork: true,
    bookingId,
    parentTaskId: task2Id,
    dealerName: bookingData.dealerName,
    quantity: totalQuantity,
    taskCategory: 'stark_door_order'
  }, user);

  // Update booking with linked task IDs
  await updateDoc(bookingRef, {
    linkedTaskIds: [task1Id, task2Id, task3Id]
  });

  return bookingId;
}

/**
 * --- TEAM MANAGEMENT MODULE FIRESTORE SERVICES ---
 */

// Create a new Team
export async function createTeam(teamData, creatorUser) {
  const teamRef = doc(collection(db, TEAMS_COL));
  const todayStr = getTodayDateString();
  const timeNow = new Date().toLocaleTimeString();

  const payload = {
    ...teamData,
    id: teamRef.id,
    createdById: creatorUser.id || creatorUser.uid,
    createdByName: `${creatorUser.fullName || creatorUser.name} (${creatorUser.role || ''})`,
    status: 'active',
    createdAt: `${todayStr} ${timeNow}`,
    memberCount: teamData.members?.length || 0,
    serverTimestamp: serverTimestamp()
  };

  await setDoc(teamRef, payload);
  return teamRef.id;
}

// Update Team (Edit title, description, department, status, leader)
export async function updateTeam(teamId, updateData, user) {
  const teamRef = doc(db, TEAMS_COL, teamId);
  await updateDoc(teamRef, {
    ...updateData,
    updatedAt: serverTimestamp(),
    lastModifiedBy: `${user.fullName || user.name} (${user.role || ''})`
  });
}

// Add members to Team with duplicate prevention & audit record
export async function addTeamMembers(teamId, teamName, memberEmployees, addedByUser) {
  const todayStr = getTodayDateString();
  const timeNow = new Date().toLocaleTimeString();
  const batch = writeBatch(db);

  for (const emp of memberEmployees) {
    const empId = emp.id || emp.uid;
    // Unique composite ID: teamId_employeeId to strictly prevent duplicate membership
    const memberDocRef = doc(db, TEAM_MEMBERS_COL, `${teamId}_${empId}`);
    batch.set(memberDocRef, {
      id: `${teamId}_${empId}`,
      teamId,
      teamName,
      employeeId: emp.employeeId || empId,
      userId: empId,
      fullName: emp.fullName || emp.name,
      role: emp.role || emp.designation,
      department: emp.department || emp.departmentId,
      email: emp.email || '',
      addedById: addedByUser.id || addedByUser.uid,
      addedByName: `${addedByUser.fullName || addedByUser.name} (${addedByUser.role || ''})`,
      addedAt: `${todayStr} ${timeNow}`,
      status: 'active',
      serverTimestamp: serverTimestamp()
    }, { merge: true });
  }

  await batch.commit();

  // Update team member count
  const allMembersSnap = await getDocs(query(collection(db, TEAM_MEMBERS_COL), where('teamId', '==', teamId), where('status', '==', 'active')));
  await updateDoc(doc(db, TEAMS_COL, teamId), {
    memberCount: allMembersSnap.size,
    updatedAt: serverTimestamp()
  });
}

// Sync all team members when editing a team (adds new, removes unselected, updates reporting lead)
export async function syncTeamMembers(teamId, teamName, memberEmployees, user) {
  const todayStr = getTodayDateString();
  const timeNow = new Date().toLocaleTimeString();

  // 1. Get existing members in Firestore
  const curSnap = await getDocs(query(collection(db, TEAM_MEMBERS_COL), where('teamId', '==', teamId)));
  const existingDocMap = new Map();
  curSnap.forEach(d => {
    const data = d.data();
    const uid = data.userId || data.employeeId;
    if (uid) existingDocMap.set(String(uid), d.id);
  });

  const newMemberUids = new Set(memberEmployees.map(m => String(m.id || m.userId || m.employeeId)));

  const batch = writeBatch(db);

  // 2. Delete removed members
  for (const [uid, docId] of existingDocMap.entries()) {
    if (!newMemberUids.has(uid)) {
      batch.delete(doc(db, TEAM_MEMBERS_COL, docId));
    }
  }

  // 3. Upsert selected members with reportingLeadId / reportsTo
  for (const emp of memberEmployees) {
    const empId = String(emp.id || emp.userId || emp.employeeId);
    const memberDocRef = doc(db, TEAM_MEMBERS_COL, `${teamId}_${empId}`);
    batch.set(memberDocRef, {
      id: `${teamId}_${empId}`,
      teamId,
      teamName,
      employeeId: emp.employeeId || empId,
      userId: empId,
      fullName: emp.fullName || emp.name,
      role: emp.role || emp.designation,
      department: emp.department || emp.departmentId,
      email: emp.email || '',
      reportingLeadId: emp.reportingLeadId || null,
      reportingLeadName: emp.reportingLeadName || null,
      addedById: user.id || user.uid,
      addedByName: `${user.fullName || user.name} (${user.role || ''})`,
      addedAt: `${todayStr} ${timeNow}`,
      status: 'active',
      serverTimestamp: serverTimestamp()
    }, { merge: true });
  }

  await batch.commit();

  // 4. Update team member count
  const allMembersSnap = await getDocs(query(collection(db, TEAM_MEMBERS_COL), where('teamId', '==', teamId), where('status', '==', 'active')));
  await updateDoc(doc(db, TEAMS_COL, teamId), {
    memberCount: allMembersSnap.size,
    updatedAt: serverTimestamp()
  });
}

// Remove member from Team
export async function removeTeamMember(teamId, userId) {
  const memberDocRef = doc(db, TEAM_MEMBERS_COL, `${teamId}_${userId}`);
  await deleteDoc(memberDocRef);

  const allMembersSnap = await getDocs(query(collection(db, TEAM_MEMBERS_COL), where('teamId', '==', teamId), where('status', '==', 'active')));
  await updateDoc(doc(db, TEAMS_COL, teamId), {
    memberCount: allMembersSnap.size,
    updatedAt: serverTimestamp()
  });
}

// Transfer team member to another team
export async function transferTeamMember(fromTeamId, toTeamId, toTeamName, employee, user) {
  await removeTeamMember(fromTeamId, employee.id || employee.uid);
  await addTeamMembers(toTeamId, toTeamName, [employee], user);
}

/**
 * Update an employee profile in the users collection
 */
export async function saveEmployeeProfile(employeeId, data) {
  const docRef = doc(db, USERS_COL, employeeId);
  await updateDoc(docRef, {
    ...data,
    lastUpdated: serverTimestamp()
  });
  return employeeId;
}

/**
 * Add or reassign a dealer
 */
export async function saveDealerRecord(dealerData, user) {
  const timestamp = new Date().toISOString();

  if (dealerData.id && !dealerData.id.startsWith('dlr_new_')) {
    const docRef = doc(db, DEALERS_COL, dealerData.id);
    const existingSnap = await getDoc(docRef);
    const existing = existingSnap.exists() ? existingSnap.data() : {};

    const reassignHistory = existing.reassignHistory || [];
    if (dealerData.assignedStaff && dealerData.assignedStaff !== existing.assignedStaff) {
      reassignHistory.push({
        from: existing.assignedStaff || 'Unassigned',
        to: dealerData.assignedStaff,
        by: user.fullName || user.name,
        timestamp
      });
    }

    await updateDoc(docRef, {
      ...dealerData,
      assignedTo: dealerData.assignedStaff,
      lastUpdated: timestamp,
      reassignHistory
    });
    return dealerData.id;
  } else {
    const payload = {
      ...dealerData,
      assignedTo: dealerData.assignedStaff || user.fullName || user.name,
      createdAt: timestamp,
      status: 'Active',
      reassignHistory: [
        {
          from: 'None',
          to: dealerData.assignedStaff || user.fullName || user.name,
          by: user.fullName || user.name,
          timestamp
        }
      ]
    };
    const ref = await addDoc(collection(db, DEALERS_COL), payload);
    return ref.id;
  }
}
