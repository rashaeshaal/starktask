import { 
  collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, 
  onSnapshot, query, where, orderBy, serverTimestamp, writeBatch 
} from 'firebase/firestore';
import { db } from './firebase';
import { MASTER_DEPARTMENTS, MASTER_DESIGNATIONS } from './orgStructure';
import { getTodayDateString } from './dateUtils';

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
export const NOTIFS_COL = 'notifications';
export const RECURRING_COL = 'recurringTasks';
export const ORG_SETTINGS_COL = 'organizationSettings';

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
        initializedAt: serverTimestamp(),
        initialized: true
      });

      await batch.commit();
      console.log('Company structure successfully initialized in Cloud Firestore.');
    }
  } catch (err) {
    console.error('Error during company structure initialization:', err);
  }
}

/**
 * Listen to live departments
 */
export function subscribeToDepartments(callback) {
  return onSnapshot(collection(db, DEPTS_COL), (snap) => {
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    callback(list);
  }, (err) => console.warn('Departments listen error:', err));
}

/**
 * Listen to live designations
 */
export function subscribeToDesignations(callback) {
  return onSnapshot(collection(db, DESIGNATIONS_COL), (snap) => {
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    callback(list);
  }, (err) => console.warn('Designations listen error:', err));
}

/**
 * Listen to real employees / users in Firestore
 */
export function subscribeToEmployees(callback) {
  return onSnapshot(collection(db, USERS_COL), (snap) => {
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    callback(list);
  }, (err) => console.warn('Employees listen error:', err));
}

/**
 * Add or update employee in Firestore
 */
export async function saveEmployeeProfile(employeeData, adminUser) {
  const docId = employeeData.id || `emp_${Date.now()}`;
  const docRef = doc(db, USERS_COL, docId);

  const payload = {
    ...employeeData,
    id: docId,
    updatedAt: serverTimestamp(),
  };

  if (!employeeData.id) {
    payload.createdAt = serverTimestamp();
    payload.createdBy = adminUser ? adminUser.id : 'system';
  }

  await setDoc(docRef, payload, { merge: true });
  return docId;
}

/**
 * Subscribe to tasks with role-based filtering
 * General Manager & Executive Director see 100% of all company tasks live.
 */
export function subscribeToTasks(currentUser, callback) {
  if (!currentUser) return () => {};

  const tasksRef = collection(db, TASKS_COL);
  let q = tasksRef;

  const isCompanyLeadership = ['Director Operations', 'General Manager', 'Executive Director'].includes(currentUser.role);

  if (isCompanyLeadership) {
    q = query(tasksRef, orderBy('createdAt', 'desc'));
  } else if (['HR Manager', 'Admin Manager', 'Accounts Manager', 'Warehouse In-charge', 
               'Transport Manager', 'Service Manager', 'CSO', 'Brand Manager', 'IT Head'].includes(currentUser.role)) {
    q = query(tasksRef, where('departmentId', '==', currentUser.department));
  } else {
    // Frontline employees: query where assignedToId matches or assigneeIds contains their ID
    q = query(tasksRef, where('assigneeIds', 'array-contains', currentUser.id));
  }

  return onSnapshot(q, (snapshot) => {
    const taskList = [];
    snapshot.forEach(docSnap => {
      taskList.push({ id: docSnap.id, ...docSnap.data() });
    });
    callback(taskList);
  }, (error) => {
    console.error('Error listening to tasks:', error);
  });
}

/**
 * Create a new task in Firestore with immutable audit entry
 */
export async function createFirestoreTask(taskData, creatorUser) {
  const todayStr = getTodayDateString();
  const timeNow = new Date().toLocaleTimeString();

  const auditEntry = {
    id: `log-${Date.now()}`,
    action: 'CREATED',
    performedById: creatorUser.id,
    performedByName: `${creatorUser.fullName || creatorUser.name} (${creatorUser.role})`,
    timestamp: `${todayStr} ${timeNow}`,
    details: `Task created and assigned to ${taskData.assignedToName}`
  };

  const payload = {
    ...taskData,
    createdAt: `${todayStr} ${timeNow}`,
    lastUpdated: `${todayStr} ${timeNow}`,
    auditLogs: [auditEntry],
    serverTimestamp: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, TASKS_COL), payload);

  // Trigger in-app notification to assignee
  if (taskData.assignedToId) {
    await addDoc(collection(db, NOTIFS_COL), {
      recipientId: taskData.assignedToId,
      title: 'New Task Assigned',
      message: `${creatorUser.fullName || creatorUser.name} assigned you: ${taskData.title}`,
      timestamp: `Today at ${timeNow}`,
      read: false,
      taskId: docRef.id,
      createdAt: serverTimestamp()
    });
  }

  return docRef.id;
}

/**
 * Update an existing task in Firestore
 * Enforces SalesDoor Pro daily dealer call locking rule.
 */
export async function updateFirestoreTask(taskId, updateData, currentUser) {
  const taskRef = doc(db, TASKS_COL, taskId);
  const taskSnap = await getDoc(taskRef);

  if (!taskSnap.exists()) {
    throw new Error('Task not found');
  }

  const existingTask = taskSnap.data();

  // Enforce SalesDoor Pro daily dealer call locking rule
  if (existingTask.taskType === 'dealer_call') {
    const todayStr = getTodayDateString();
    if (existingTask.taskDate && existingTask.taskDate < todayStr) {
      const isExec = ['Director Operations', 'General Manager', 'Executive Director'].includes(currentUser.role);
      if (!isExec) {
        throw new Error('Action Denied: Historical dealer call records are permanently locked after midnight.');
      }
    }
  }

  const todayStr = getTodayDateString();
  const timeNow = new Date().toLocaleTimeString();

  const auditEntry = {
    id: `log-${Date.now()}`,
    action: updateData.auditAction || 'STATUS_UPDATE',
    performedById: currentUser.id,
    performedByName: `${currentUser.fullName || currentUser.name} (${currentUser.role})`,
    timestamp: `${todayStr} ${timeNow}`,
    details: updateData.auditDetails || `Task updated to ${updateData.status || existingTask.status}`
  };

  const payload = {
    ...updateData,
    lastUpdated: `${todayStr} ${timeNow}`,
    auditLogs: [auditEntry, ...(existingTask.auditLogs || [])],
    updatedAt: serverTimestamp()
  };

  delete payload.auditAction;
  delete payload.auditDetails;

  await updateDoc(taskRef, payload);

  // If status is PENDING_REVIEW, notify approval manager
  if (updateData.status === 'Pending Review' && existingTask.approvalManagerId) {
    await addDoc(collection(db, NOTIFS_COL), {
      recipientId: existingTask.approvalManagerId,
      title: 'Task Submission for Review',
      message: `${currentUser.fullName || currentUser.name} submitted ${existingTask.title} for review.`,
      timestamp: `Today at ${timeNow}`,
      read: false,
      taskId: taskId,
      createdAt: serverTimestamp()
    });
  }
}

/**
 * Subscribe to notifications
 */
export function subscribeToNotifications(userId, callback) {
  if (!userId) return () => {};
  const notifRef = collection(db, NOTIFS_COL);
  const q = query(notifRef, where('recipientId', '==', userId));

  return onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
    callback(list);
  }, (err) => console.warn('Notifications listener error:', err));
}

/**
 * --- TEAM MANAGEMENT MODULE FIRESTORE SERVICES ---
 */

// Subscribe to teams
export function subscribeToTeams(callback) {
  return onSnapshot(collection(db, TEAMS_COL), (snapshot) => {
    const list = [];
    snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
    callback(list);
  }, (err) => console.warn('Teams listener error:', err));
}

// Subscribe to team members
export function subscribeToTeamMembers(callback) {
  return onSnapshot(collection(db, TEAM_MEMBERS_COL), (snapshot) => {
    const list = [];
    snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
    callback(list);
  }, (err) => console.warn('Team members listener error:', err));
}

// Create a new Team
export async function createTeam(teamData, creatorUser) {
  const teamRef = doc(collection(db, TEAMS_COL));
  const todayStr = getTodayDateString();
  const timeNow = new Date().toLocaleTimeString();

  const payload = {
    ...teamData,
    id: teamRef.id,
    createdById: creatorUser.id,
    createdByName: `${creatorUser.fullName || creatorUser.name} (${creatorUser.role})`,
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
    lastModifiedBy: `${user.fullName || user.name} (${user.role})`
  });
}

// Add members to Team with duplicate prevention & audit record
export async function addTeamMembers(teamId, teamName, memberEmployees, addedByUser) {
  const todayStr = getTodayDateString();
  const timeNow = new Date().toLocaleTimeString();
  const batch = writeBatch(db);

  for (const emp of memberEmployees) {
    // Unique composite ID: teamId_employeeId to strictly prevent duplicate membership
    const memberDocRef = doc(db, TEAM_MEMBERS_COL, `${teamId}_${emp.id}`);
    batch.set(memberDocRef, {
      id: `${teamId}_${emp.id}`,
      teamId,
      teamName,
      employeeId: emp.employeeId || emp.id,
      userId: emp.id,
      fullName: emp.fullName || emp.name,
      role: emp.role,
      department: emp.department || emp.departmentId,
      email: emp.email,
      addedById: addedByUser.id,
      addedByName: `${addedByUser.fullName || addedByUser.name} (${addedByUser.role})`,
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
  await removeTeamMember(fromTeamId, employee.id);
  await addTeamMembers(toTeamId, toTeamName, [employee], user);
}
