import { Router, Response } from 'express';
import { prisma } from '../prisma/client';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest, UserRole } from '../types';

import { matchInventoryItem } from '../services/inventoryMatcher';

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

    // Fetch shop inventory to auto-match and link line items
    const shopInventory = await prisma.inventoryItem.findMany({
      where: { shopId: booking.shopId },
    });

    const parsedLabor = parseFloat(laborCost) || 0;
    let partsCost = 0;

    const items = await Promise.all(
      (lineItems || []).map(async (item: any) => {
        const qty = parseInt(item.quantity) || 1;
        let matched = matchInventoryItem(item.partName, item.partInventoryId, shopInventory);

        // If not found in catalog, auto-create inventory item so it has a tracked SKU and inventoryItemId
        if (!matched && item.partName && item.partName.trim()) {
          const skuCode = `PART-${Math.floor(1000 + Math.random() * 9000)}`;
          matched = await prisma.inventoryItem.create({
            data: {
              shopId: booking.shopId,
              sku: skuCode,
              name: item.partName.trim(),
              quantityOnHand: 0, // 0 indicates needs ordering
              reorderLevel: 2,
              costPrice: parseFloat(item.unitCost) || 0,
              sellPrice: parseFloat(item.unitCost) || 0,
              category: 'General',
            },
          });
        }

        const unit = parseFloat(item.unitCost) || (matched ? matched.sellPrice || matched.costPrice : 0);
        const total = qty * unit;
        partsCost += total;

        return {
          partName: matched ? matched.name : (item.partName || 'Custom Part'),
          partInventoryId: matched ? matched.id : (item.partInventoryId || null),
          quantity: qty,
          unitCost: unit,
          totalCost: total,
        };
      })
    );

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
