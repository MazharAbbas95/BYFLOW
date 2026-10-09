import { Router, Response } from 'express';
import { prisma } from '../prisma/client';
import { requireAuth, requireTenant, requireShopRole } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

// Single Shop Analytics
router.get('/shops/:shopId', requireAuth, requireTenant, requireShopRole(['OWNER', 'SERVICE_ADVISOR']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { shopId } = req.params;

    const totalBookings = await prisma.booking.count({ where: { shopId } });
    const completedBookings = await prisma.booking.count({ where: { shopId, status: 'COMPLETED' } });
    const pendingBookings = await prisma.booking.count({ where: { shopId, status: 'PENDING' } });
    const inRepairBookings = await prisma.booking.count({ where: { shopId, status: 'IN_REPAIR' } });
    const qcPendingBookings = await prisma.booking.count({ where: { shopId, status: 'QC_PENDING' } });

    // Completed estimates for revenue
    const completedBookingRecords = await prisma.booking.findMany({
      where: { shopId, status: 'COMPLETED' },
      include: { estimates: { orderBy: { revision: 'desc' }, take: 1 } },
    });

    const totalRevenue = completedBookingRecords.reduce((acc, b) => {
      return acc + (b.estimates[0]?.totalCost || 0);
    }, 0);

    // QC Statistics
    const totalQcIssues = await prisma.qcIssue.count({
      where: { booking: { shopId } },
    });

    const qcPasses = await prisma.bookingHistory.count({
      where: {
        booking: { shopId },
        toStatus: 'READY_FOR_PICKUP',
        fromStatus: 'QC_IN_PROGRESS',
      },
    });

    const qcFailRate = (totalQcIssues + qcPasses) > 0 
      ? Math.round((totalQcIssues / (totalQcIssues + qcPasses)) * 100) 
      : 0;

    // Inventory status
    const inventoryCount = await prisma.inventoryItem.count({ where: { shopId } });
    const lowStockItems = await prisma.inventoryItem.count({
      where: {
        shopId,
        quantityOnHand: { lte: 5 },
      },
    });

    res.json({
      analytics: {
        totalBookings,
        completedBookings,
        pendingBookings,
        inRepairBookings,
        qcPendingBookings,
        totalRevenue,
        qcIssuesCount: totalQcIssues,
        qcPassCount: qcPasses,
        qcFailRate: `${qcFailRate}%`,
        inventoryCount,
        lowStockItems,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Multi-shop Consolidated Analytics for Owner
router.get('/owner/overview', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (user.role !== 'OWNER') {
      res.status(403).json({ error: 'Only Owners can view consolidated analytics.' });
      return;
    }

    const ownedShops = await prisma.shop.findMany({
      where: { ownerId: user.id },
      include: {
        _count: {
          select: {
            bookings: true,
            members: true,
            inventory: true,
          },
        },
      },
    });

    const shopSummaries = await Promise.all(
      ownedShops.map(async (shop) => {
        const completed = await prisma.booking.findMany({
          where: { shopId: shop.id, status: 'COMPLETED' },
          include: { estimates: { orderBy: { revision: 'desc' }, take: 1 } },
        });

        const revenue = completed.reduce((sum, b) => sum + (b.estimates[0]?.totalCost || 0), 0);
        const activeBookings = await prisma.booking.count({
          where: {
            shopId: shop.id,
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
          },
        });

        return {
          id: shop.id,
          name: shop.name,
          city: shop.city,
          totalBookings: shop._count.bookings,
          activeBookings,
          completedBookings: completed.length,
          revenue,
          teamCount: shop._count.members,
          inventoryCount: shop._count.inventory,
        };
      })
    );

    const overallRevenue = shopSummaries.reduce((sum, s) => sum + s.revenue, 0);
    const overallBookings = shopSummaries.reduce((sum, s) => sum + s.totalBookings, 0);

    res.json({
      overallRevenue,
      overallBookings,
      shops: shopSummaries,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
