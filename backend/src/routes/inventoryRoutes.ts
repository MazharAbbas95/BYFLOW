import { Router, Response } from 'express';
import { prisma } from '../prisma/client';
import { requireAuth, requireTenant, requireShopRole } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { executeTransition } from '../services/stateMachine';

const router = Router();

// Get shop inventory catalog
router.get('/:shopId/inventory', requireAuth, requireTenant, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { shopId } = req.params;
    const inventory = await prisma.inventoryItem.findMany({
      where: { shopId },
      orderBy: { name: 'asc' },
    });
    res.json({ inventory });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add new inventory item (Parts Person or Owner)
router.post('/:shopId/inventory', requireAuth, requireTenant, requireShopRole(['PARTS_PERSON', 'OWNER']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { shopId } = req.params;
    const { sku, name, quantityOnHand, reorderLevel, costPrice, sellPrice, category } = req.body;

    if (!sku || !name) {
      res.status(400).json({ error: 'SKU and Name are required.' });
      return;
    }

    const item = await prisma.inventoryItem.create({
      data: {
        shopId,
        sku: sku.trim().toUpperCase(),
        name,
        quantityOnHand: parseInt(quantityOnHand) || 0,
        reorderLevel: parseInt(reorderLevel) || 5,
        costPrice: parseFloat(costPrice) || 0,
        sellPrice: parseFloat(sellPrice) || 0,
        category: category || 'General',
      },
    });

    res.status(201).json({ item });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update inventory item quantity / details
router.put('/:shopId/inventory/:itemId', requireAuth, requireTenant, requireShopRole(['PARTS_PERSON', 'OWNER']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    const { name, quantityOnHand, reorderLevel, costPrice, sellPrice, category } = req.body;

    const item = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        ...(name && { name }),
        ...(quantityOnHand !== undefined && { quantityOnHand: parseInt(quantityOnHand) }),
        ...(reorderLevel !== undefined && { reorderLevel: parseInt(reorderLevel) }),
        ...(costPrice !== undefined && { costPrice: parseFloat(costPrice) }),
        ...(sellPrice !== undefined && { sellPrice: parseFloat(sellPrice) }),
        ...(category && { category }),
      },
    });

    res.json({ item });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

import { matchInventoryItem, recheckAndAdvanceWorkOrdersAwaitingParts } from '../services/inventoryMatcher';

// Jobs awaiting parts with stock comparison
router.get('/:shopId/jobs-awaiting-parts', requireAuth, requireTenant, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { shopId } = req.params;

    const bookings = await prisma.booking.findMany({
      where: {
        shopId,
        status: { in: ['PARTS_PENDING', 'PARTS_ORDERED', 'PARTS_READY'] },
      },
      include: {
        vehicle: true,
        customer: true,
        technician: true,
        estimates: {
          orderBy: { revision: 'desc' },
          take: 1,
          include: { lineItems: true },
        },
        partAllocations: true,
      },
    });

    // Fetch all inventory items for this shop to compute availability
    const inventory = await prisma.inventoryItem.findMany({ where: { shopId } });
    const invMap = new Map(inventory.map((i) => [i.id, i]));

    const jobsWithStockComparison = await Promise.all(
      bookings.map(async (b) => {
        const latestEst = b.estimates[0];
        const items = latestEst?.lineItems || [];

        let allInStock = items.length > 0;
        const partsBreakdown = await Promise.all(
          items.map(async (line) => {
            let invItem = line.partInventoryId ? invMap.get(line.partInventoryId) : null;
            if (!invItem) {
              invItem = matchInventoryItem(line.partName, line.partInventoryId, inventory);
              if (invItem) {
                // Permanently heal the line item reference in the DB
                await prisma.estimateLineItem.update({
                  where: { id: line.id },
                  data: { partInventoryId: invItem.id, partName: invItem.name },
                }).catch(() => {});
              }
            }

            const onHand = invItem ? invItem.quantityOnHand : 0;
            const shortage = Math.max(0, line.quantity - onHand);
            if (shortage > 0) {
              allInStock = false;
            }

            return {
              id: line.id,
              partName: invItem?.name || line.partName,
              quantityNeeded: line.quantity,
              quantityOnHand: onHand,
              shortage,
              inventoryItemId: invItem?.id || null,
              unitCost: line.unitCost || (invItem?.sellPrice || invItem?.costPrice || 0),
            };
          })
        );

        // If all items are in stock and booking is in PARTS_PENDING or PARTS_ORDERED,
        // auto-advance to PARTS_READY so technicians and parts person are not blocked
        let currentStatus = b.status;
        if (allInStock && (b.status === 'PARTS_PENDING' || b.status === 'PARTS_ORDERED')) {
          try {
            await prisma.booking.update({
              where: { id: b.id },
              data: { status: 'PARTS_READY' },
            });
            await prisma.bookingHistory.create({
              data: {
                bookingId: b.id,
                userId: req.user?.id || null,
                userName: 'BayFlow Inventory Engine',
                userRole: 'PARTS_PERSON',
                fromStatus: b.status,
                toStatus: 'PARTS_READY',
                note: 'Verified 100% available on shelf. Work order updated to PARTS_READY.',
              },
            });
            currentStatus = 'PARTS_READY';
          } catch (err: any) {
            console.error('Failed to update booking status to PARTS_READY:', err.message);
          }
        }

        return {
          ...b,
          status: currentStatus,
          partsBreakdown,
          allInStock,
        };
      })
    );

    res.json({ jobs: jobsWithStockComparison });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create Purchase Order
router.post('/:shopId/purchase-orders', requireAuth, requireTenant, requireShopRole(['PARTS_PERSON', 'OWNER']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { shopId } = req.params;
    const { supplierName, bookingId, notes, items } = req.body;
    const user = req.user!;

    if (!supplierName || !items || items.length === 0) {
      res.status(400).json({ error: 'Supplier name and at least one item are required.' });
      return;
    }

    const randomPo = Math.floor(1000 + Math.random() * 9000);
    const poNumber = `PO-${randomPo}`;

    const po = await prisma.purchaseOrder.create({
      data: {
        shopId,
        poNumber,
        supplierName,
        bookingId: bookingId || null,
        createdById: user.id,
        notes: notes || '',
        status: 'ORDERED',
        items: {
          create: items.map((i: any) => ({
            inventoryItemId: i.inventoryItemId,
            quantityOrdered: parseInt(i.quantityOrdered) || 1,
            quantityReceived: 0,
            unitCost: parseFloat(i.unitCost) || 0,
          })),
        },
      },
      include: {
        items: { include: { inventoryItem: true } },
      },
    });

    // If linked to a booking that is currently in PARTS_PENDING, transition it to PARTS_ORDERED
    if (bookingId) {
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (booking && booking.status === 'PARTS_PENDING') {
        const membership = user.memberships.find((m) => m.shopId === shopId);
        await executeTransition('ORDER_PARTS', {
          bookingId,
          targetStatus: 'PARTS_ORDERED',
          userId: user.id,
          userName: user.name,
          userRole: membership?.role || 'PARTS_PERSON',
          note: `Created Purchase Order ${poNumber} for missing parts`,
        });
      }
    }

    res.status(201).json({ purchaseOrder: po });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List Purchase Orders
router.get('/:shopId/purchase-orders', requireAuth, requireTenant, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { shopId } = req.params;
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: { shopId },
      include: {
        items: { include: { inventoryItem: true } },
        createdBy: { select: { id: true, name: true } },
        booking: { include: { vehicle: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ purchaseOrders });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Receive Purchase Order (Partial or Full)
router.post('/:shopId/purchase-orders/:poId/receive', requireAuth, requireTenant, requireShopRole(['PARTS_PERSON', 'OWNER']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { poId } = req.params;
    const { receivedItems } = req.body; // array of { itemId: string, quantityReceivedNow: number }
    const user = req.user!;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: true, booking: true },
    });

    if (!po) {
      res.status(404).json({ error: 'Purchase Order not found.' });
      return;
    }

    // Process receiving
    for (const rec of receivedItems || []) {
      const item = po.items.find((i) => i.id === rec.itemId);
      if (item && rec.quantityReceivedNow > 0) {
        const newReceived = item.quantityReceived + rec.quantityReceivedNow;

        await prisma.purchaseOrderItem.update({
          where: { id: item.id },
          data: { quantityReceived: newReceived },
        });

        // Increase inventory stock
        await prisma.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { quantityOnHand: { increment: rec.quantityReceivedNow } },
        });
      }
    }

    // Reload PO items to check if fully or partially received
    const updatedPo = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: { include: { inventoryItem: true } }, booking: true },
    });

    let allReceived = true;
    let anyReceived = false;

    updatedPo?.items.forEach((item) => {
      if (item.quantityReceived >= item.quantityOrdered) {
        anyReceived = true;
      } else {
        allReceived = false;
        if (item.quantityReceived > 0) anyReceived = true;
      }
    });

    const newStatus = allReceived ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : 'ORDERED';

    await prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status: newStatus },
    });

    // Check and auto-advance ALL work orders awaiting parts in this shop whose shortages are now fulfilled!
    const membership = user.memberships.find((m) => m.shopId === po.shopId);
    const advanceResult = await recheckAndAdvanceWorkOrdersAwaitingParts(
      po.shopId,
      `Inbound PO delivery received (${po.poNumber}). All required parts are now in stock! Work order updated to PARTS_READY.`,
      { id: user.id, name: user.name, role: membership?.role || 'PARTS_PERSON' }
    );

    res.json({
      success: true,
      purchaseOrder: updatedPo,
      status: newStatus,
      resolvedJobsCount: advanceResult.updatedCount,
      resolvedJobs: advanceResult.updatedBookings,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Allocate parts to booking (stock deducted, moves to IN_REPAIR)
router.post('/bookings/:bookingId/allocate-parts', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const user = req.user!;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        estimates: {
          orderBy: { revision: 'desc' },
          take: 1,
          include: { lineItems: true },
        },
      },
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

    const effectiveRole = membership?.role || 'TECHNICIAN';

    // Validate booking is in a state where repair can start
    const allocatableStatuses = ['PARTS_READY', 'PARTS_PENDING', 'PARTS_ORDERED', 'ESTIMATE_APPROVED'];
    if (!allocatableStatuses.includes(booking.status)) {
      res.status(400).json({ error: `Cannot start repair from status: ${booking.status}. Job must be PARTS_READY or ESTIMATE_APPROVED.` });
      return;
    }

    const latestEst = booking.estimates[0];
    const lineItems = latestEst?.lineItems || [];

    // Only deduct stock if there are parts line items
    if (lineItems.length > 0) {
      for (const item of lineItems) {
        // Find inventory item
        let invItem = item.partInventoryId
          ? await prisma.inventoryItem.findUnique({ where: { id: item.partInventoryId } })
          : await prisma.inventoryItem.findFirst({
              where: { shopId: booking.shopId, name: { equals: item.partName } },
            });

        if (!invItem) {
          // Auto create inventory item if not exists
          invItem = await prisma.inventoryItem.create({
            data: {
              shopId: booking.shopId,
              sku: `PART-${Math.floor(100 + Math.random() * 900)}`,
              name: item.partName,
              quantityOnHand: item.quantity,
              costPrice: item.unitCost,
              sellPrice: item.unitCost,
            },
          });
        }

        // Deduct stock
        await prisma.inventoryItem.update({
          where: { id: invItem.id },
          data: { quantityOnHand: { decrement: item.quantity } },
        });

        // Record allocation
        await prisma.partAllocation.create({
          data: {
            bookingId: booking.id,
            inventoryItemId: invItem.id,
            quantity: item.quantity,
            status: 'ALLOCATED',
          },
        });
      }
    }

    // Transition state to IN_REPAIR
    const updated = await executeTransition('ALLOCATE_AND_START_REPAIR', {
      bookingId,
      targetStatus: 'IN_REPAIR',
      userId: user.id,
      userName: user.name,
      userRole: effectiveRole,
      note: lineItems.length > 0
        ? `Parts allocated (${lineItems.length} items), stock deducted. Repair started by ${user.name}.`
        : `Labour-only job — no parts to deduct. Repair started by ${user.name}.`,
    });

    res.json({ success: true, booking: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
