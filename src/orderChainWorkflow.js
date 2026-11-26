/**
 * STARK STEEL – Order-to-Dispatch Workflow Dependency & Rules Engine
 * Single Source of Truth for Order Stages, Dependencies, Status Transitions & Blockers
 */

export const BOOKING_STAGES = {
  BOOKED: 'Booked',
  ACCOUNTS_CLEARED: 'Accounts Cleared',
  PICKED: 'Picked',
  LOADING: 'Loading',
  DISPATCHED: 'Dispatched',
  DELIVERED: 'Delivered'
};

export const PAYMENT_STATES = {
  PENDING: 'Pending Token',
  HOLD: 'Payment Hold',
  CLEARED: 'Cleared'
};

export const ORDER_WORKFLOW_STEPS = [
  { id: 'step_1_booked', step: 1, name: 'Sales Booking', role: 'Sales', key: 'booked' },
  { id: 'step_2_accounts', step: 2, name: 'Accounts Verification', role: 'Accounts', key: 'accounts' },
  { id: 'step_3_warehouse', step: 3, name: 'Warehouse Picking & Staging', role: 'Warehouse', key: 'warehouse' },
  { id: 'step_4_dispatch', step: 4, name: 'Dispatch Clearance & Departure', role: 'Transportation', key: 'dispatch' },
  { id: 'step_5_delivered', step: 5, name: 'Dealer Delivery & POD Sign-Off', role: 'Delivery', key: 'delivered' }
];

/**
 * Checks whether an order workflow task is executable or locked by predecessor dependencies.
 * 
 * Hierarchy of Prerequisites:
 * 1. Accounts Verification: Always executable upon booking creation.
 * 2. Warehouse Picking/Staging: Requires Accounts to have CLEARED payment (not on hold, not pending).
 * 3. Transportation Dispatch: Requires Accounts CLEARED AND Warehouse picking/staging completed & approved.
 * 4. Final Delivery: Requires Dispatch confirmed.
 * 5. Final Completion: Requires signed POD evidence uploaded and reviewed/approved.
 */
export function checkOrderTaskDependency(task, allTasks = [], booking = null) {
  if (!task) return { isLocked: false };

  // Non-order linked tasks are never locked by order dependencies
  const isOrderTask = task.isLinkedSalesWork || 
                      task.taskCategory === 'stark_door_order' || 
                      task.taskType === 'Payment verification' ||
                      Boolean(task.sourceBookingId) || 
                      Boolean(task.bookingId);
  if (!isOrderTask) {
    return { isLocked: false };
  }

  const bookingStatus = booking?.status || '';
  const isHold = booking?.paymentStatus === 'Payment Hold' || 
                 booking?.accountsClearance === 'Payment Hold' ||
                 bookingStatus === 'Payment Hold' ||
                 task.paymentStatus === 'Payment Hold';

  // 1. PAYMENT VERIFICATION (Accounts)
  if (task.taskType === 'Payment verification' || (task.title && task.title.toLowerCase().includes('payment token'))) {
    return { isLocked: false }; // Never locked, must be accessible by Accounts
  }

  // 2. WAREHOUSE TASKS (Picking, packing, staging)
  const isWarehouse = (task.department || task.departmentId || '').toLowerCase() === 'warehouse' ||
                      (task.title && task.title.toLowerCase().includes('warehouse picking'));
  if (isWarehouse) {
    if (isHold) {
      return {
        isLocked: true,
        reason: 'Payment is currently on Payment Hold by Accounts. Warehouse picking is blocked.',
        prerequisiteDept: 'Accounts',
        prerequisiteName: 'Advance Payment Clearance',
        prerequisiteStatus: 'Payment Hold'
      };
    }
    const isPaymentCleared = bookingStatus === BOOKING_STAGES.ACCOUNTS_CLEARED || 
                            bookingStatus === BOOKING_STAGES.PICKED ||
                            bookingStatus === BOOKING_STAGES.LOADING ||
                            bookingStatus === BOOKING_STAGES.DISPATCHED ||
                            bookingStatus === BOOKING_STAGES.DELIVERED ||
                            booking?.paymentStatus === 'Cleared';
    if (!isPaymentCleared) {
      return {
        isLocked: true,
        reason: 'Warehouse picking is waiting for Accounts payment token verification.',
        prerequisiteDept: 'Accounts',
        prerequisiteName: 'Advance Payment Clearance',
        prerequisiteStatus: 'Pending Verification'
      };
    }
    return { isLocked: false };
  }

  // 3. TRANSPORTATION DISPATCH & ROUTING TASKS
  const isTransportation = (task.department || task.departmentId || '').toLowerCase() === 'transportation' ||
                           (task.title && task.title.toLowerCase().includes('dispatch route'));
  if (isTransportation) {
    if (isHold) {
      return {
        isLocked: true,
        reason: 'Order is on Payment Hold. Transport dispatch is prohibited.',
        prerequisiteDept: 'Accounts',
        prerequisiteName: 'Advance Payment Clearance',
        prerequisiteStatus: 'Payment Hold'
      };
    }
    const isPaymentCleared = booking?.paymentStatus === 'Cleared' || 
                            bookingStatus === BOOKING_STAGES.ACCOUNTS_CLEARED ||
                            bookingStatus === BOOKING_STAGES.PICKED ||
                            bookingStatus === BOOKING_STAGES.LOADING ||
                            bookingStatus === BOOKING_STAGES.DISPATCHED ||
                            bookingStatus === BOOKING_STAGES.DELIVERED;
    if (!isPaymentCleared) {
      return {
        isLocked: true,
        reason: 'Dispatch is waiting for Accounts advance payment verification.',
        prerequisiteDept: 'Accounts',
        prerequisiteName: 'Advance Payment Clearance',
        prerequisiteStatus: 'Pending Verification'
      };
    }

    // Must verify Warehouse Picking predecessor is completed & approved
    const bookingId = task.sourceBookingId || task.bookingId;
    const warehousePredecessor = allTasks.find(t => 
      (t.sourceBookingId === bookingId || t.bookingId === bookingId) &&
      (t.department === 'warehouse' || t.departmentId === 'warehouse')
    );

    if (warehousePredecessor) {
      const isWhDone = warehousePredecessor.status === 'Completed' || warehousePredecessor.approvalStatus === 'approved';
      if (!isWhDone) {
        return {
          isLocked: true,
          reason: 'Dispatch clearance requires Warehouse picking & staging completion.',
          prerequisiteDept: 'Warehouse',
          prerequisiteName: 'Door Picking & Staging',
          prerequisiteStatus: warehousePredecessor.status || 'In Progress'
        };
      }
    } else if (bookingStatus === BOOKING_STAGES.BOOKED) {
      return {
        isLocked: true,
        reason: 'Dispatch clearance is waiting for Warehouse preparation.',
        prerequisiteDept: 'Warehouse',
        prerequisiteName: 'Door Picking & Staging',
        prerequisiteStatus: 'Pending'
      };
    }

    return { isLocked: false };
  }

  return { isLocked: false };
}

/**
 * Derives the visual workflow progress timeline for a booking based on real database records.
 */
export function deriveBookingTimeline(booking, allTasks = []) {
  if (!booking) return [];

  const bId = booking.id;
  const linkedTasks = allTasks.filter(t => t.sourceBookingId === bId || t.bookingId === bId);

  const payTask = linkedTasks.find(t => t.taskType === 'Payment verification' || (t.title && t.title.toLowerCase().includes('payment')));
  const whTask = linkedTasks.find(t => (t.department === 'warehouse' || t.departmentId === 'warehouse'));
  const trTask = linkedTasks.find(t => (t.department === 'transportation' || t.departmentId === 'transportation'));

  const isHold = booking.status === 'Payment Hold' || booking.paymentStatus === 'Payment Hold';
  const isPayCleared = booking.paymentStatus === 'Cleared' || booking.status === 'Accounts Cleared' || 
                       booking.status === 'Picked' || booking.status === 'Loading' || 
                       booking.status === 'Dispatched' || booking.status === 'Delivered';

  const isWhCompleted = whTask?.status === 'Completed' || booking.status === 'Picked' || 
                        booking.status === 'Loading' || booking.status === 'Dispatched' || 
                        booking.status === 'Delivered';

  const isDispatched = booking.status === 'Dispatched' || booking.status === 'Delivered' || Boolean(booking.driverName) || Boolean(booking.assignedDriverId) || trTask?.isDispatched;
  const isTrSubmitted = trTask?.status === 'Pending Review' || trTask?.status === 'Waiting for Sign-Off' || trTask?.status === 'Completed' || trTask?.isDeliveryCompleted;
  const isDelivered = booking.status === 'Delivered' || (trTask && (trTask.status === 'Completed' || trTask.approvalStatus === 'approved'));

  return [
    {
      id: 'step_1_booked',
      title: 'Sales Booking',
      dept: 'Sales',
      status: 'completed',
      actor: booking.assignedTo || 'Sales Desk',
      timestamp: booking.bookedAt || booking.bookingDate,
      notes: 'Initial booking logged.'
    },
    {
      id: 'step_2_accounts',
      title: 'Payment Verification',
      dept: 'Accounts',
      status: isHold ? 'hold' : isPayCleared ? 'completed' : 'pending',
      actor: payTask?.clearedByName || payTask?.heldByName || payTask?.assignedToName || 'Accounts Desk',
      timestamp: payTask?.clearedAt || payTask?.heldAt || null,
      notes: isHold ? (booking.holdReason || payTask?.holdReason || 'Placed on Payment Hold') : isPayCleared ? 'Payment token verified and cleared' : 'Awaiting payment token verification',
      task: payTask
    },
    {
      id: 'step_3_warehouse',
      title: 'Warehouse Picking',
      dept: 'Warehouse',
      status: isHold ? 'blocked' : isWhCompleted ? 'completed' : isPayCleared ? 'in_progress' : 'waiting',
      actor: whTask?.assignedToName || 'Warehouse Desk',
      timestamp: whTask?.approvedAt || whTask?.completedAt || null,
      notes: isWhCompleted ? 'Doors picked and staged' : isPayCleared ? 'Picking in progress' : 'Waiting for payment clearance',
      task: whTask
    },
    {
      id: 'step_4_dispatch',
      title: 'Dispatch & Transport',
      dept: 'Transportation',
      status: isHold ? 'blocked' : isDispatched ? 'completed' : isWhCompleted ? 'in_progress' : 'waiting',
      actor: trTask?.assignedToName || 'Transport Manager',
      timestamp: booking.dispatchedAt || null,
      notes: isDispatched ? 'Vehicle departed for dealer showroom' : isWhCompleted ? 'Staged for dispatch' : 'Waiting for warehouse picking',
      task: trTask
    },
    {
      id: 'step_5_delivered',
      title: 'Dealer Delivery & POD',
      dept: 'Transportation',
      status: isDelivered ? 'completed' : isTrSubmitted ? 'completed' : isDispatched ? 'in_progress' : 'waiting',
      actor: trTask?.driverName || booking.driverName || 'Driver',
      timestamp: booking.deliveredAt || trTask?.submittedAt || null,
      notes: isDelivered 
        ? 'Signed Proof of Delivery (POD) verified & signed off' 
        : isTrSubmitted 
        ? 'Delivered to dealer · Submitted for coordinator sign-off' 
        : isDispatched 
        ? 'In transit to dealer' 
        : 'Awaiting dispatch',
      task: trTask
    }
  ];
}

