import { prisma } from '../prisma/client';
import { BookingStatus, UserRole } from '../types';
import {
  createNotification,
  notifyShopStaffByRole,
  broadcastToShop,
  broadcastToUser,
} from './notificationService';

export interface TransitionContext {
  bookingId: string;
  targetStatus: BookingStatus;
  userId: string;
  userName: string;
  userRole: UserRole | 'CUSTOMER';
  note?: string;
  // Extra payloads depending on transition
  technicianId?: string;
  partsPersonId?: string;
  qcIssue?: { title: string; description: string };
  rejectionReason?: string;
}

// Rules definition
interface TransitionRule {
  from: BookingStatus[];
  to: BookingStatus;
  allowedRoles: (UserRole | 'CUSTOMER')[];
  validate?: (booking: any, context: TransitionContext) => Promise<string | null>;
  onTransition?: (booking: any, context: TransitionContext) => Promise<void>;
}

export const TRANSITION_RULES: Record<string, TransitionRule> = {
  CONFIRM: {
    from: ['PENDING'],
    to: 'CONFIRMED',
    allowedRoles: ['SERVICE_ADVISOR', 'OWNER'],
    async onTransition(booking) {
      await createNotification({
        userId: booking.customerId,
        title: 'Booking Confirmed',
        message: `Your booking #${booking.reference} has been confirmed by the shop.`,
        shopId: booking.shopId,
        bookingId: booking.id,
      });
    },
  },

  CANCEL: {
    from: ['PENDING', 'CONFIRMED', 'ASSIGNED', 'INSPECTING', 'ESTIMATE_REVIEW', 'AWAITING_CUSTOMER', 'ESTIMATE_APPROVED', 'ESTIMATE_REJECTED', 'PARTS_PENDING', 'PARTS_ORDERED', 'PARTS_READY'],
    to: 'CANCELLED',
    allowedRoles: ['CUSTOMER', 'SERVICE_ADVISOR', 'OWNER'],
    async validate(booking, context) {
      if (context.userRole === 'CUSTOMER' && booking.customerId !== context.userId) {
        return 'Customers can only cancel their own bookings.';
      }
      return null;
    },
    async onTransition(booking, context) {
      // Release any allocated parts back to inventory
      const allocations = await prisma.partAllocation.findMany({
        where: { bookingId: booking.id, status: 'ALLOCATED' },
      });

      for (const alloc of allocations) {
        await prisma.inventoryItem.update({
          where: { id: alloc.inventoryItemId },
          data: { quantityOnHand: { increment: alloc.quantity } },
        });
        await prisma.partAllocation.update({
          where: { id: alloc.id },
          data: { status: 'RELEASED', releasedAt: new Date() },
        });
      }

      await createNotification({
        userId: booking.customerId,
        title: 'Booking Cancelled',
        message: `Booking #${booking.reference} was cancelled. ${context.note || ''}`,
        shopId: booking.shopId,
        bookingId: booking.id,
      });
      await notifyShopStaffByRole(
        booking.shopId,
        ['SERVICE_ADVISOR', 'OWNER'],
        'Booking Cancelled',
        `Booking #${booking.reference} was cancelled by ${context.userName}.`,
        booking.id
      );
    },
  },

  ASSIGN_TECHNICIAN: {
    from: ['CONFIRMED', 'ASSIGNED'],
    to: 'ASSIGNED',
    allowedRoles: ['SERVICE_ADVISOR', 'OWNER'],
    async validate(_, context) {
      if (!context.technicianId) {
        return 'A technician must be selected.';
      }
      return null;
    },
    async onTransition(booking, context) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { technicianId: context.technicianId },
      });
      if (context.technicianId) {
        await createNotification({
          userId: context.technicianId,
          title: 'New Job Assigned',
          message: `You have been assigned to vehicle ${booking.vehicle.registrationPlate} (Booking #${booking.reference}).`,
          shopId: booking.shopId,
          bookingId: booking.id,
        });
      }
    },
  },

  START_INSPECTION: {
    from: ['ASSIGNED'],
    to: 'INSPECTING',
    allowedRoles: ['TECHNICIAN', 'SERVICE_ADVISOR', 'OWNER'],
    async validate(booking, context) {
      if (context.userRole === 'TECHNICIAN' && booking.technicianId !== context.userId) {
        return 'Only the technician assigned to this job can start inspection.';
      }
      return null;
    },
  },

  SUBMIT_ESTIMATE: {
    from: ['INSPECTING', 'ESTIMATE_REJECTED'],
    to: 'ESTIMATE_REVIEW',
    allowedRoles: ['TECHNICIAN', 'SERVICE_ADVISOR', 'OWNER'],
    async validate(booking, context) {
      if (context.userRole === 'TECHNICIAN' && booking.technicianId !== context.userId) {
        return 'Only the assigned technician can submit the estimate.';
      }
      // Ensure estimate exists
      const estimate = await prisma.estimate.findFirst({
        where: { bookingId: booking.id },
      });
      if (!estimate) {
        return 'Cannot submit to SA without adding estimate line items or labor cost.';
      }
      return null;
    },
    async onTransition(booking) {
      await notifyShopStaffByRole(
        booking.shopId,
        ['SERVICE_ADVISOR', 'OWNER'],
        'Estimate Submitted for Review',
        `Technician submitted estimate for #${booking.reference} (${booking.vehicle.make} ${booking.vehicle.model}).`,
        booking.id
      );
    },
  },

  SEND_TO_CUSTOMER: {
    from: ['ESTIMATE_REVIEW'],
    to: 'AWAITING_CUSTOMER',
    allowedRoles: ['SERVICE_ADVISOR', 'OWNER'],
    async onTransition(booking) {
      const estimate = await prisma.estimate.findFirst({
        where: { bookingId: booking.id },
        orderBy: { revision: 'desc' },
      });
      await createNotification({
        userId: booking.customerId,
        title: 'Estimate Awaiting Your Approval',
        message: `An itemized estimate of PKR ${estimate?.totalCost.toLocaleString()} is ready for review.`,
        shopId: booking.shopId,
        bookingId: booking.id,
      });
    },
  },

  CUSTOMER_APPROVE_ESTIMATE: {
    from: ['AWAITING_CUSTOMER'],
    to: 'ESTIMATE_APPROVED',
    allowedRoles: ['CUSTOMER', 'SERVICE_ADVISOR', 'OWNER'],
    async validate(booking, context) {
      if (context.userRole === 'CUSTOMER' && booking.customerId !== context.userId) {
        return 'You can only approve estimates for your own bookings.';
      }
      return null;
    },
    async onTransition(booking) {
      await prisma.estimate.updateMany({
        where: { bookingId: booking.id },
        data: { status: 'APPROVED', approvedAt: new Date() },
      });
      await notifyShopStaffByRole(
        booking.shopId,
        ['SERVICE_ADVISOR', 'OWNER'],
        'Estimate Approved by Customer',
        `Customer accepted estimate for #${booking.reference}. Ready to assign Parts Person.`,
        booking.id
      );
    },
  },

  CUSTOMER_REJECT_ESTIMATE: {
    from: ['AWAITING_CUSTOMER'],
    to: 'ESTIMATE_REJECTED',
    allowedRoles: ['CUSTOMER', 'SERVICE_ADVISOR', 'OWNER'],
    async validate(booking, context) {
      if (context.userRole === 'CUSTOMER' && booking.customerId !== context.userId) {
        return 'You can only reject estimates for your own bookings.';
      }
      return null;
    },
    async onTransition(booking, context) {
      await prisma.estimate.updateMany({
        where: { bookingId: booking.id },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectionReason: context.rejectionReason || context.note || 'Rejected by customer',
        },
      });
      await notifyShopStaffByRole(
        booking.shopId,
        ['SERVICE_ADVISOR', 'OWNER'],
        'Estimate Declined by Customer',
        `Customer declined estimate for #${booking.reference}. Reason: ${context.note || 'None given'}.`,
        booking.id
      );
    },
  },

  ASSIGN_PARTS_PERSON: {
    from: ['ESTIMATE_APPROVED'],
    to: 'PARTS_PENDING',
    allowedRoles: ['SERVICE_ADVISOR', 'OWNER'],
    async onTransition(booking, context) {
      if (context.partsPersonId) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { partsPersonId: context.partsPersonId },
        });
        await createNotification({
          userId: context.partsPersonId,
          title: 'Parts Requested',
          message: `Check inventory and allocate parts for booking #${booking.reference}.`,
          shopId: booking.shopId,
          bookingId: booking.id,
        });
      } else {
        await notifyShopStaffByRole(
          booking.shopId,
          ['PARTS_PERSON', 'OWNER'],
          'Parts Requested for Booking',
          `Check inventory and allocate parts for #${booking.reference}.`,
          booking.id
        );
      }
    },
  },

  ORDER_PARTS: {
    from: ['PARTS_PENDING'],
    to: 'PARTS_ORDERED',
    allowedRoles: ['PARTS_PERSON', 'OWNER'],
    async onTransition(booking) {
      await notifyShopStaffByRole(
        booking.shopId,
        ['SERVICE_ADVISOR', 'OWNER'],
        'Parts Ordered',
        `Parts ordered for #${booking.reference}. Awaiting supplier delivery.`,
        booking.id
      );
    },
  },

  PARTS_ARRIVED: {
    from: ['PARTS_ORDERED', 'PARTS_PENDING', 'ESTIMATE_APPROVED'],
    to: 'PARTS_READY',
    allowedRoles: ['PARTS_PERSON', 'OWNER'],
    async onTransition(booking) {
      if (booking.technicianId) {
        await createNotification({
          userId: booking.technicianId,
          title: 'Parts Ready for Repair',
          message: `All parts are ready for booking #${booking.reference}.`,
          shopId: booking.shopId,
          bookingId: booking.id,
        });
      }
    },
  },

  ALLOCATE_AND_START_REPAIR: {
    from: ['PARTS_READY', 'PARTS_PENDING', 'PARTS_ORDERED', 'ESTIMATE_APPROVED'],
    to: 'IN_REPAIR',
    allowedRoles: ['PARTS_PERSON', 'TECHNICIAN', 'SERVICE_ADVISOR', 'OWNER'],
    async onTransition(booking) {
      if (booking.technicianId) {
        await createNotification({
          userId: booking.technicianId,
          title: 'Job In Repair',
          message: `Parts allocated. You may now perform repair on #${booking.reference}.`,
          shopId: booking.shopId,
          bookingId: booking.id,
        });
      }
    },
  },

  SEND_TO_QC: {
    from: ['IN_REPAIR'],
    to: 'QC_PENDING',
    allowedRoles: ['TECHNICIAN', 'SERVICE_ADVISOR', 'OWNER'],
    async validate(booking, context) {
      if (context.userRole === 'TECHNICIAN' && booking.technicianId !== context.userId) {
        return 'Only the assigned technician can submit the repair to QC.';
      }
      return null;
    },
    async onTransition(booking) {
      await notifyShopStaffByRole(
        booking.shopId,
        ['QC_INSPECTOR', 'OWNER'],
        'New Job in QC Queue',
        `Vehicle ${booking.vehicle.registrationPlate} (#${booking.reference}) is ready for inspection.`,
        booking.id
      );
    },
  },

  QC_PICK_JOB: {
    from: ['QC_PENDING'],
    to: 'QC_IN_PROGRESS',
    allowedRoles: ['QC_INSPECTOR', 'OWNER'],
    async validate(booking, context) {
      // Atomic concurrency lock: If already locked by someone else
      if (booking.qcInspectorId && booking.qcInspectorId !== context.userId && booking.status === 'QC_IN_PROGRESS') {
        return 'This inspection has already been locked by another QC inspector.';
      }
      return null;
    },
    async onTransition(booking, context) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { qcInspectorId: context.userId },
      });
    },
  },

  QC_PASS: {
    from: ['QC_IN_PROGRESS'],
    to: 'READY_FOR_PICKUP',
    allowedRoles: ['QC_INSPECTOR', 'OWNER'],
    async validate(booking, context) {
      if (context.userRole === 'QC_INSPECTOR' && booking.qcInspectorId !== context.userId) {
        return 'Only the QC Inspector who picked this job can pass it.';
      }
      return null;
    },
    async onTransition(booking) {
      await notifyShopStaffByRole(
        booking.shopId,
        ['SERVICE_ADVISOR', 'OWNER'],
        'QC Inspection Passed',
        `QC passed for vehicle ${booking.vehicle.registrationPlate}. Ready for customer pickup notification.`,
        booking.id
      );
    },
  },

  QC_FAIL: {
    from: ['QC_IN_PROGRESS'],
    to: 'IN_REPAIR',
    allowedRoles: ['QC_INSPECTOR', 'OWNER'],
    async validate(booking, context) {
      if (context.userRole === 'QC_INSPECTOR' && booking.qcInspectorId !== context.userId) {
        return 'Only the QC Inspector who picked this job can report a failure.';
      }
      if (!context.qcIssue?.title || !context.qcIssue?.description) {
        return 'A failure issue title and description must be provided.';
      }
      return null;
    },
    async onTransition(booking, context) {
      // Record QC Issue
      if (context.qcIssue) {
        await prisma.qcIssue.create({
          data: {
            bookingId: booking.id,
            inspectorId: context.userId,
            title: context.qcIssue.title,
            description: context.qcIssue.description,
            status: 'OPEN',
          },
        });
      }

      // Notify technician
      if (booking.technicianId) {
        await createNotification({
          userId: booking.technicianId,
          title: 'QC Inspection Failed - Action Required',
          message: `QC failed for #${booking.reference}: ${context.qcIssue?.title}. Fix the issue and resubmit.`,
          shopId: booking.shopId,
          bookingId: booking.id,
        });
      }
    },
  },

  NOTIFY_READY_FOR_PICKUP: {
    from: ['READY_FOR_PICKUP'],
    to: 'READY_FOR_PICKUP',
    allowedRoles: ['SERVICE_ADVISOR', 'OWNER'],
    async onTransition(booking) {
      await createNotification({
        userId: booking.customerId,
        title: 'Vehicle Ready for Pick-up!',
        message: `Good news! Your ${booking.vehicle.make} ${booking.vehicle.model} (${booking.vehicle.registrationPlate}) is repaired and ready for pickup at the shop.`,
        shopId: booking.shopId,
        bookingId: booking.id,
      });
    },
  },

  COMPLETE_BOOKING: {
    from: ['READY_FOR_PICKUP'],
    to: 'COMPLETED',
    allowedRoles: ['CUSTOMER', 'SERVICE_ADVISOR', 'OWNER'],
    async onTransition(booking) {
      await createNotification({
        userId: booking.customerId,
        title: 'Booking Completed',
        message: `Thank you for choosing us! Booking #${booking.reference} has been completed.`,
        shopId: booking.shopId,
        bookingId: booking.id,
      });
    },
  },
};

/**
 * Execute state transition with strict validation, role enforcement, and audit history
 */
export async function executeTransition(actionKey: string, context: TransitionContext) {
  const rule = TRANSITION_RULES[actionKey];
  if (!rule) {
    throw new Error(`Unknown state machine action: ${actionKey}`);
  }

  // Load booking with relations
  const booking = await prisma.booking.findUnique({
    where: { id: context.bookingId },
    include: {
      vehicle: true,
      shop: true,
      customer: true,
    },
  });

  if (!booking) {
    throw new Error('Booking not found.');
  }

  // Check from status
  if (!rule.from.includes(booking.status as BookingStatus)) {
    throw new Error(
      `Invalid transition: Cannot execute action '${actionKey}' from status '${booking.status}'. Allowed from: ${rule.from.join(', ')}`
    );
  }

  // Check role guard
  const hasRole =
    context.userRole === 'OWNER' ||
    rule.allowedRoles.includes(context.userRole);

  if (!hasRole) {
    throw new Error(
      `Permission Denied: Role '${context.userRole}' is not authorized to execute '${actionKey}'. Required roles: ${rule.allowedRoles.join(', ')}`
    );
  }

  // Custom validation hook
  if (rule.validate) {
    const errorMsg = await rule.validate(booking, context);
    if (errorMsg) {
      throw new Error(errorMsg);
    }
  }

  const fromStatus = booking.status;
  const toStatus = rule.to;

  // Execute transition side effects (e.g., updating technician, creating QC issues, releasing stock)
  if (rule.onTransition) {
    await rule.onTransition(booking, context);
  }

  // Update booking status
  const updatedBooking = await prisma.booking.update({
    where: { id: context.bookingId },
    data: {
      status: toStatus,
    },
    include: {
      vehicle: true,
      shop: true,
      customer: true,
      technician: { select: { id: true, name: true, email: true } },
      partsPerson: { select: { id: true, name: true, email: true } },
      qcInspector: { select: { id: true, name: true, email: true } },
      estimates: {
        include: { lineItems: true },
        orderBy: { revision: 'desc' },
      },
      history: {
        orderBy: { createdAt: 'desc' },
      },
      qcIssues: true,
      partAllocations: true,
    },
  });

  // Record audit history log
  await prisma.bookingHistory.create({
    data: {
      bookingId: booking.id,
      userId: context.userId,
      userName: context.userName,
      userRole: context.userRole,
      fromStatus,
      toStatus,
      note: context.note || `Transitioned via ${actionKey}`,
    },
  });

  // Broadcast state change to shop and customer
  broadcastToShop(booking.shopId, {
    type: 'BOOKING_UPDATED',
    booking: updatedBooking,
  });
  broadcastToUser(booking.customerId, {
    type: 'BOOKING_UPDATED',
    booking: updatedBooking,
  });

  return updatedBooking;
}
