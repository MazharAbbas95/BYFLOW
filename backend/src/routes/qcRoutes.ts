import { Router, Response } from 'express';
import { prisma } from '../prisma/client';
import { requireAuth, requireTenant, requireShopRole } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { executeTransition } from '../services/stateMachine';

const router = Router();

// Shared QC Queue for a shop
router.get('/:shopId/qc-queue', requireAuth, requireTenant, requireShopRole(['QC_INSPECTOR', 'OWNER']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { shopId } = req.params;

    const queue = await prisma.booking.findMany({
      where: {
        shopId,
        status: { in: ['QC_PENDING', 'QC_IN_PROGRESS'] },
      },
      include: {
        vehicle: true,
        customer: true,
        technician: { select: { id: true, name: true } },
        qcInspector: { select: { id: true, name: true } },
        qcIssues: { orderBy: { createdAt: 'desc' } },
        estimates: {
          orderBy: { revision: 'desc' },
          take: 1,
          include: { lineItems: true },
        },
      },
      orderBy: { updatedAt: 'asc' },
    });

    res.json({ queue });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Pick a job from the QC Queue (Atomic Concurrency Lock)
router.post('/bookings/:bookingId/pick', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const user = req.user!;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }

    const membership = user.memberships.find((m) => m.shopId === booking.shopId);
    if (!membership && user.role !== 'OWNER') {
      res.status(403).json({ error: 'Tenant Access Denied.' });
      return;
    }

    if (membership?.role !== 'QC_INSPECTOR' && user.role !== 'OWNER') {
      res.status(403).json({ error: 'Only QC Inspectors can pick jobs from the QC queue.' });
      return;
    }

    // Atomic lock check: If already in QC_IN_PROGRESS with another inspector
    if (booking.status === 'QC_IN_PROGRESS' && booking.qcInspectorId && booking.qcInspectorId !== user.id) {
      res.status(409).json({ error: 'Job has already been claimed by another QC Inspector.' });
      return;
    }

    const updated = await executeTransition('QC_PICK_JOB', {
      bookingId,
      targetStatus: 'QC_IN_PROGRESS',
      userId: user.id,
      userName: user.name,
      userRole: membership?.role || 'QC_INSPECTOR',
      note: `Picked by QC Inspector ${user.name}`,
    });

    res.json({ success: true, booking: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Submit QC Pass or Fail
router.post('/bookings/:bookingId/review', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const { passed, checklistNotes, issueTitle, issueDescription } = req.body;
    const user = req.user!;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }

    const membership = user.memberships.find((m) => m.shopId === booking.shopId);
    if (!membership && user.role !== 'OWNER') {
      res.status(403).json({ error: 'Tenant Access Denied.' });
      return;
    }

    if (passed) {
      // Pass -> moves to READY_FOR_PICKUP
      const updated = await executeTransition('QC_PASS', {
        bookingId,
        targetStatus: 'READY_FOR_PICKUP',
        userId: user.id,
        userName: user.name,
        userRole: membership?.role || 'QC_INSPECTOR',
        note: `Quality control passed! Checklist completed. ${checklistNotes || ''}`,
      });
      res.json({ success: true, passed: true, booking: updated });
    } else {
      // Fail -> creates issue record and sends job back to technician in IN_REPAIR
      if (!issueTitle || !issueDescription) {
        res.status(400).json({ error: 'Issue Title and Description are required when reporting a QC failure.' });
        return;
      }

      const updated = await executeTransition('QC_FAIL', {
        bookingId,
        targetStatus: 'IN_REPAIR',
        userId: user.id,
        userName: user.name,
        userRole: membership?.role || 'QC_INSPECTOR',
        note: `QC Failed: ${issueTitle}. Returned to technician.`,
        qcIssue: {
          title: issueTitle,
          description: issueDescription,
        },
      });

      res.json({ success: true, passed: false, booking: updated });
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
