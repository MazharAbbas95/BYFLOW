import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma/client';
import { requireAuth, requireTenant, requireShopRole } from '../middleware/auth';
import { AuthenticatedRequest, UserRole } from '../types';

const router = Router();

// Public: Get all shops for landing page directory
router.get('/', async (req, res): Promise<void> => {
  try {
    const { city, search } = req.query;

    const where: any = {};
    if (city && typeof city === 'string' && city !== 'All') {
      where.city = { contains: city };
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search } },
        { address: { contains: search } },
        { city: { contains: search } },
      ];
    }

    const shops = await prisma.shop.findMany({
      where,
      include: {
        services: { where: { isActive: true } },
        _count: {
          select: { bookings: true, members: true },
        },
      },
      orderBy: { rating: 'desc' },
    });

    res.json({ shops });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Public: Get single shop with services and available slots for a given date
router.get('/:shopId', async (req, res): Promise<void> => {
  try {
    const { shopId } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        services: { where: { isActive: true } },
      },
    });

    if (!shop) {
      res.status(404).json({ error: 'Shop not found' });
      return;
    }

    // Default slot hours: 09:00 to 17:00
    const standardHours = [
      '09:00 AM',
      '10:00 AM',
      '11:00 AM',
      '12:00 PM',
      '01:00 PM',
      '02:00 PM',
      '03:00 PM',
      '04:00 PM',
    ];

    let slotsAvailability = standardHours.map((time) => ({
      time,
      capacity: shop.slotCapacity,
      bookedCount: 0,
      isAvailable: true,
    }));

    if (date && typeof date === 'string') {
      // Find booked counts for this date
      const bookingsForDate = await prisma.booking.findMany({
        where: {
          shopId,
          bookingDate: date,
          status: { notIn: ['CANCELLED'] },
        },
        select: { bookingTime: true },
      });

      const countMap: Record<string, number> = {};
      bookingsForDate.forEach((b) => {
        countMap[b.bookingTime] = (countMap[b.bookingTime] || 0) + 1;
      });

      slotsAvailability = standardHours.map((time) => {
        const booked = countMap[time] || 0;
        return {
          time,
          capacity: shop.slotCapacity,
          bookedCount: booked,
          isAvailable: booked < shop.slotCapacity,
        };
      });
    }

    res.json({ shop, slots: slotsAvailability });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Owner: Create a new shop
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'OWNER') {
      res.status(403).json({ error: 'Only shop owners can create shops.' });
      return;
    }

    const { name, address, city, phone, workingHours, slotDuration, slotCapacity, logo } = req.body;
    if (!name || !address || !city || !phone) {
      res.status(400).json({ error: 'Name, address, city, and phone are required.' });
      return;
    }

    const shop = await prisma.shop.create({
      data: {
        name,
        address,
        city,
        phone,
        workingHours: workingHours || '09:00 - 18:00',
        slotDuration: slotDuration ? parseInt(slotDuration) : 60,
        slotCapacity: slotCapacity ? parseInt(slotCapacity) : 2,
        logo,
        ownerId: req.user.id,
      },
    });

    // Automatically create OWNER membership
    await prisma.shopMember.create({
      data: {
        shopId: shop.id,
        userId: req.user.id,
        role: 'OWNER',
      },
    });

    // Seed default standard services for this new shop
    const defaultServices = [
      { name: 'Oil & Filter Change', description: 'Engine oil drain and refill with genuine OEM oil filter', estimatedDuration: 45, basePrice: 5000 },
      { name: 'Brake Inspection & Service', description: 'Inspection of pads, discs, rotors, calipers and fluid flush', estimatedDuration: 60, basePrice: 4000 },
      { name: 'Check Engine Diagnostics', description: 'OBD-II scanner fault codes analysis and troubleshooting', estimatedDuration: 45, basePrice: 3500 },
      { name: 'Tire Rotation & Balancing', description: 'Four wheel balance and tire rotation for even wear', estimatedDuration: 45, basePrice: 3000 },
      { name: 'Suspension & Steering Overhaul', description: 'Complete multi-point suspension check and bushing renewal', estimatedDuration: 90, basePrice: 7500 },
      { name: 'AC Performance & Gas Recharge', description: 'Refrigerant vacuum leak test and gas refill', estimatedDuration: 60, basePrice: 4500 },
    ];

    for (const s of defaultServices) {
      await prisma.serviceCatalog.create({
        data: {
          shopId: shop.id,
          name: s.name,
          description: s.description,
          estimatedDuration: s.estimatedDuration,
          basePrice: s.basePrice,
        },
      });
    }

    res.status(201).json({ shop });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Owner: Update shop details
router.put('/:shopId', requireAuth, requireTenant, requireShopRole(['OWNER']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { shopId } = req.params;
    const { name, address, city, phone, workingHours, slotDuration, slotCapacity, logo } = req.body;

    const shop = await prisma.shop.update({
      where: { id: shopId },
      data: {
        ...(name && { name }),
        ...(address && { address }),
        ...(city && { city }),
        ...(phone && { phone }),
        ...(workingHours && { workingHours }),
        ...(slotDuration && { slotDuration: parseInt(slotDuration) }),
        ...(slotCapacity && { slotCapacity: parseInt(slotCapacity) }),
        ...(logo && { logo }),
      },
    });

    res.json({ shop });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Shop Members list
router.get('/:shopId/members', requireAuth, requireTenant, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { shopId } = req.params;
    const members = await prisma.shopMember.findMany({
      where: { shopId },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ members });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Owner: Add team member (create user or link existing)
router.post('/:shopId/members', requireAuth, requireTenant, requireShopRole(['OWNER']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { shopId } = req.params;
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !role) {
      res.status(400).json({ error: 'Name, email, and role are required.' });
      return;
    }

    const validRoles: UserRole[] = ['SERVICE_ADVISOR', 'TECHNICIAN', 'PARTS_PERSON', 'QC_INSPECTOR'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: `Invalid role. Allowed: ${validRoles.join(', ')}` });
      return;
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const passwordHash = await bcrypt.hash(password || 'password123', 10);
      user = await prisma.user.create({
        data: {
          name,
          email,
          phone,
          passwordHash,
          role: 'STAFF',
        },
      });
    }

    // Check if membership exists
    const existingMember = await prisma.shopMember.findUnique({
      where: {
        shopId_userId: {
          shopId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      const updated = await prisma.shopMember.update({
        where: { id: existingMember.id },
        data: { role, isActive: true },
        include: { user: true },
      });
      res.json({ member: updated });
      return;
    }

    const member = await prisma.shopMember.create({
      data: {
        shopId,
        userId: user.id,
        role,
      },
      include: { user: true },
    });

    res.status(201).json({ member });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Owner: Edit or deactivate team member
router.put('/:shopId/members/:memberId', requireAuth, requireTenant, requireShopRole(['OWNER']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { memberId } = req.params;
    const { role, isActive } = req.body;

    const member = await prisma.shopMember.update({
      where: { id: memberId },
      data: {
        ...(role && { role }),
        ...(typeof isActive === 'boolean' && { isActive }),
      },
      include: { user: true },
    });

    res.json({ member });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Service Catalog: Add service
router.post('/:shopId/services', requireAuth, requireTenant, requireShopRole(['OWNER']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { shopId } = req.params;
    const { name, description, estimatedDuration, basePrice } = req.body;

    if (!name || !description) {
      res.status(400).json({ error: 'Name and description are required.' });
      return;
    }

    const service = await prisma.serviceCatalog.create({
      data: {
        shopId,
        name,
        description,
        estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : 60,
        basePrice: basePrice ? parseFloat(basePrice) : 0,
      },
    });

    res.status(201).json({ service });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Service Catalog: Update service
router.put('/:shopId/services/:serviceId', requireAuth, requireTenant, requireShopRole(['OWNER']), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { serviceId } = req.params;
    const { name, description, estimatedDuration, basePrice, isActive } = req.body;

    const service = await prisma.serviceCatalog.update({
      where: { id: serviceId },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(estimatedDuration && { estimatedDuration: parseInt(estimatedDuration) }),
        ...(basePrice !== undefined && { basePrice: parseFloat(basePrice) }),
        ...(typeof isActive === 'boolean' && { isActive }),
      },
    });

    res.json({ service });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
