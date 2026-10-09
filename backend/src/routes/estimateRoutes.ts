import { Router, Response } from 'express';
import { prisma } from '../prisma/client';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest, UserRole } from '../types';

const router = Router();

// Save or Update Estimate (Technician or SA)
router.post('/:bookingId', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const { laborCost, lineItems, notes } = req.body;
    const user = req.user!;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { estimates: { orderBy: { revision: 'desc' } } },
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }

    // Tenant and role check
    const membership = user.memberships.find((m) => m.shopId === booking.shopId);
    const role = membership?.role || (user.role === 'OWNER' ? 'OWNER' : null);

    if (!role || !['TECHNICIAN', 'SERVICE_ADVISOR', 'OWNER'].includes(role)) {
      res.status(403).json({ error: 'Only Technicians, Service Advisors, or Owners can create estimates.' });
      return;
    }

    if (role === 'TECHNICIAN' && booking.technicianId !== user.id) {
      res.status(403).json({ error: 'Only the assigned technician can create an estimate for this booking.' });
      return;
    }

    const parsedLabor = parseFloat(laborCost) || 0;
    let partsCost = 0;

    const items = (lineItems || []).map((item: any) => {
      const qty = parseInt(item.quantity) || 1;
      const unit = parseFloat(item.unitCost) || 0;
      const total = qty * unit;
      partsCost += total;
      return {
        partName: item.partName || 'Custom Part',
        partInventoryId: item.partInventoryId || null,
        quantity: qty,
        unitCost: unit,
        totalCost: total,
      };
    });

    const totalCost = parsedLabor + partsCost;

    const latestEstimate = booking.estimates[0];
    let revision = 1;

    // If SA is editing an already created estimate, bump revision
    if (latestEstimate) {
      if (role === 'SERVICE_ADVISOR' || role === 'OWNER') {
        revision = latestEstimate.revision + 1;
      } else {
        revision = latestEstimate.revision;
      }
    }

    const estimate = await prisma.estimate.create({
      data: {
        bookingId,
        revision,
        laborCost: parsedLabor,
        partsCost,
        totalCost,
        notes: notes || '',
        submittedById: role === 'TECHNICIAN' ? user.id : latestEstimate?.submittedById || user.id,
        reviewedById: role === 'SERVICE_ADVISOR' || role === 'OWNER' ? user.id : null,
        status: 'DRAFT',
        lineItems: {
          create: items,
        },
      },
      include: {
        lineItems: true,
      },
    });

    res.json({ estimate });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get latest estimate for a booking
router.get('/:bookingId', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const estimates = await prisma.estimate.findMany({
      where: { bookingId },
      include: {
        lineItems: {
          include: { partInventory: true },
        },
      },
      orderBy: { revision: 'desc' },
    });

    res.json({ estimates, latest: estimates[0] || null });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
