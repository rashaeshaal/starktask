/**
 * SOP Task Generator Engine
 * Generates daily, weekly, and monthly recurring SOP tasks in Firestore.
 * Prevents duplicates by using deterministic composite date keys.
 */

import { collection, doc, getDoc, getDocs, setDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { SOP_TASK_TEMPLATES } from './sopTaskTemplates';
import { getTodayDateString } from './dateUtils';
import { TASKS_COL } from './firestoreService';

export async function generateDailySopTasks(employees = [], targetDateStr = null, triggeredByUser = null) {
  const dateStr = targetDateStr || getTodayDateString();
  const timeNow = new Date().toLocaleTimeString();

  // Read active templates
  const activeTemplates = SOP_TASK_TEMPLATES.filter(t => t.active);
  let createdCount = 0;
  let skippedCount = 0;

  for (const tpl of activeTemplates) {
    // Unique deterministic task ID for this template on this date: e.g. sop_2026-11-15_tpl_sales_order_collect
    const taskId = `sop_${dateStr}_${tpl.id}`;
    const taskRef = doc(db, TASKS_COL, taskId);

    try {
      const existingSnap = await getDoc(taskRef);
      if (existingSnap.exists()) {
        skippedCount++;
        continue; // Prevent duplicates
      }

      // Find best matching employee for target designation / department
      const matchingEmployee = employees.find(e => 
        e.role === tpl.targetDesignation || 
        e.department === tpl.departmentId ||
        e.departmentId === tpl.departmentId
      ) || employees[0];

      const initialAuditLog = {
        id: `log-${Date.now()}`,
        action: 'SOP_AUTOMATIC_GENERATION',
        performedById: triggeredByUser ? triggeredByUser.id : 'system_scheduler',
        performedByName: triggeredByUser ? `${triggeredByUser.fullName || triggeredByUser.name} (Manual Sync)` : 'SOP 2.0 Engine',
        timestamp: `${dateStr} ${timeNow}`,
        details: `Automatic generation of SOP task: "${tpl.title}" scheduled for ${dateStr}`
      };

      const taskPayload = {
        id: taskId,
        templateId: tpl.id,
        title: tpl.title,
        description: tpl.instructions,
        department: tpl.departmentId,
        departmentId: tpl.departmentId,
        departmentName: tpl.departmentName,
        taskCategory: 'sop_scheduled',
        taskType: 'sop_scheduled',
        priority: tpl.priority,
        status: 'Assigned',
        progressPercentage: 0,
        taskDate: dateStr,
        deadlineDate: dateStr,
        startTime: tpl.startTime,
        deadlineTime: tpl.deadlineTime,
        assignedToId: matchingEmployee ? matchingEmployee.id : null,
        assignedToName: matchingEmployee ? (matchingEmployee.fullName || matchingEmployee.name) : 'Unassigned Pool',
        assignedToRole: tpl.targetDesignation,
        assigneeIds: matchingEmployee ? [matchingEmployee.id] : [],
        approvalManagerId: null, // Will route to department head
        requiresApproval: tpl.requiresApproval,
        requiresEvidence: tpl.requiresEvidence,
        isRecurring: true,
        recurrenceType: tpl.scheduleType,
        checklist: tpl.checklist.map(item => ({ ...item, completed: false })),
        instructions: tpl.instructions,
        auditLogs: [initialAuditLog],
        createdAt: `${dateStr} ${timeNow}`,
        lastUpdated: `${dateStr} ${timeNow}`,
        serverTimestamp: serverTimestamp()
      };

      await setDoc(taskRef, taskPayload);
      createdCount++;
    } catch (err) {
      console.warn(`Error generating SOP task ${tpl.id}:`, err);
    }
  }

  return { createdCount, skippedCount, totalTemplates: activeTemplates.length, date: dateStr };
}

