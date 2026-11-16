/**
 * Migration Script: migrateUserHierarchy.js
 * 
 * Inspects all users in Firestore `users` collection.
 * Ensures every user document contains:
 * - `role`: validated role
 * - `department`: validated department ID
 * - `reportsTo`: user ID of their reporting manager
 * 
 * Fills them in from existing enterprise directory, teams, and orgTree hierarchy.
 * Prints summary and lists any users that could not be mapped.
 * 
 * Usage:
 *   node scripts/migrateUserHierarchy.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { firebaseConfig } from '../src/firebase.js';
import { ENTERPRISE_EMPLOYEE_DIRECTORY } from '../src/employeeDirectory.js';
import { ORG_TREE, getParentRole, normalizeRole } from '../src/orgTree.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runMigration() {
  console.log('🚀 Starting user hierarchy migration on Firestore users collection...\n');

  const usersSnap = await getDocs(collection(db, 'users'));
  const teamsSnap = await getDocs(collection(db, 'teams'));
  const teamMembersSnap = await getDocs(collection(db, 'teamMembers'));

  const teams = [];
  teamsSnap.forEach(d => teams.push({ id: d.id, ...d.data() }));

  const teamMembers = [];
  teamMembersSnap.forEach(d => teamMembers.push({ id: d.id, ...d.data() }));

  const allUsers = [];
  usersSnap.forEach(d => allUsers.push({ id: d.id, ...d.data() }));

  console.log(`Found ${allUsers.length} total users in Firestore.`);
  console.log(`Found ${teams.length} teams and ${teamMembers.length} team membership records.\n`);

  let updatedCount = 0;
  let alreadyCompleteCount = 0;
  const unmappedUsers = [];

  for (const user of allUsers) {
    const userEmail = (user.email || '').toLowerCase().trim();
    const userRole = user.role || '';
    const userDept = user.department || user.departmentId || '';
    const userReportsTo = user.reportsTo || user.reportingManagerId || '';

    // Match with Enterprise Directory by email or employeeId
    const dirMatch = ENTERPRISE_EMPLOYEE_DIRECTORY.find(e => 
      (e.email && e.email.toLowerCase() === userEmail) ||
      (e.employeeId && e.employeeId === user.employeeId) ||
      (e.fullName && e.fullName.toLowerCase() === (user.fullName || user.name || '').toLowerCase())
    );

    let targetRole = userRole || dirMatch?.role || '';
    let targetDept = userDept || dirMatch?.department || '';
    let targetReportsTo = userReportsTo;

    // Normalize role if possible
    if (targetRole) {
      targetRole = normalizeRole(targetRole);
    }

    // Infer department if missing
    if (!targetDept && targetRole && ORG_TREE[targetRole]) {
      targetDept = ORG_TREE[targetRole].department;
    }

    // Infer reportsTo if missing
    if (!targetReportsTo) {
      // 1. From directory match reportingManagerId / reportingManagerName
      if (dirMatch?.reportingManagerId) {
        const mgrUser = allUsers.find(u => 
          u.employeeId === dirMatch.reportingManagerId || 
          u.id === dirMatch.reportingManagerId
        );
        if (mgrUser) targetReportsTo = mgrUser.id;
      }

      // 2. From team membership: if user is in a team, reportsTo is the team leader
      if (!targetReportsTo) {
        const userMembership = teamMembers.find(m => m.userId === user.id || m.employeeId === user.employeeId);
        if (userMembership) {
          const teamObj = teams.find(t => t.id === userMembership.teamId);
          if (teamObj?.leaderId && teamObj.leaderId !== user.id) {
            targetReportsTo = teamObj.leaderId;
          }
        }
      }

      // 3. From orgTree parent role
      if (!targetReportsTo && targetRole) {
        const parentRole = getParentRole(targetRole);
        if (parentRole) {
          // Find user with that parent role in same department
          const parentUser = allUsers.find(u => 
            normalizeRole(u.role) === parentRole && 
            (u.department === targetDept || parentRole === 'Director Operations' || parentRole === 'Executive Director')
          );
          if (parentUser) targetReportsTo = parentUser.id;
        }
      }
    }

    // Check if user has all required fields
    const needsUpdate = (
      user.role !== targetRole ||
      user.department !== targetDept ||
      user.reportsTo !== targetReportsTo
    );

    if (targetRole && targetDept) {
      if (needsUpdate) {
        try {
          await updateDoc(doc(db, 'users', user.id), {
            role: targetRole,
            department: targetDept,
            reportsTo: targetReportsTo || null
          });
          console.log(`✅ Updated ${user.fullName || user.name || user.email}: role="${targetRole}", dept="${targetDept}", reportsTo="${targetReportsTo || 'none'}"`);
          updatedCount++;
        } catch (err) {
          console.error(`❌ Failed to update user ${user.id}:`, err.message);
        }
      } else {
        alreadyCompleteCount++;
      }
    } else {
      unmappedUsers.push({
        id: user.id,
        email: user.email,
        name: user.fullName || user.name,
        role: user.role,
        department: user.department,
        reason: !targetRole ? 'Missing role' : 'Missing department'
      });
    }
  }

  console.log('\n================ MIGRATION REPORT ================');
  console.log(`Total users processed:   ${allUsers.length}`);
  console.log(`Successfully updated:    ${updatedCount}`);
  console.log(`Already up to date:      ${alreadyCompleteCount}`);
  console.log(`Unmapped users:          ${unmappedUsers.length}`);
  if (unmappedUsers.length > 0) {
    console.log('\n⚠️ Users that could not be mapped:');
    unmappedUsers.forEach(u => console.log(` - [${u.id}] ${u.name} (${u.email}): ${u.reason}`));
  }
  console.log('===================================================\n');
}

runMigration().catch(err => {
  console.error('Fatal error running migration:', err);
  process.exit(1);
});

