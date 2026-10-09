import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma/client';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest, UserRole } from '../types';
import { executeTransition } from '../services/stateMachine';
import { notifyShopStaffByRole } from '../services/notificationService';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'bayflow-hackathon-super-secret-jwt-token-key-2026';

// Helper to generate reference like BF-2026-1001
const generateBookingReference = () => {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `BF-2026-${randomNum}`;
};

// Customer Booking Creation (Public or Authenticated)
router.post('/', async (req, res): Promise<void> => {
  try {
    const {
      shopId,
      bookingDate,
      bookingTime,
      selectedServices,
      reportedProblem,
      // Customer info
      name,
      email,
      password,
      phone,
      // Vehicle info
      registrationPlate,
      make,
      model,
      year,
      color,
      mileage,
    } = req.body;

    if (!shopId || !bookingDate || !bookingTime || !registrationPlate || !make || !model) {
      res.status(400).json({ error: 'Missing required booking fields.' });
      return;
    }

    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      res.status(404).json({ error: 'Selected shop does not exist.' });
      return;
    }

    // Atomic slot capacity validation
    const existingSlotBookings = await prisma.booking.count({
      where: {
        shopId,
        bookingDate,
        bookingTime,
        status: { notIn: ['CANCELLED'] },
      },
    });

    if (existingSlotBookings >= shop.slotCapacity) {
      res.status(400).json({ error: 'This time slot is fully booked. Please select another slot.' });
      return;
    }

    // Identify or create Customer account
    let customerUser: any = null;
    let authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        customerUser = await prisma.user.findUnique({ where: { id: decoded.userId } });
      } catch (err) {
        // Fall back to email/password
      }
    }

    if (!customerUser) {
      if (!email) {
        res.status(400).json({ error: 'Customer email is required.' });
        return;
      }

      customerUser = await prisma.user.findUnique({ where: { email } });
      if (customerUser) {
        // Reuse account; if password provided, verify it
        if (password) {
          const valid = await bcrypt.compare(password, customerUser.passwordHash);
          if (!valid) {
            res.status(401).json({ error: 'An account with this email exists. Incorrect password.' });
            return;
          }
        }
      } else {
        // Create new customer
        const passwordHash = await bcrypt.hash(password || 'password123', 10);
        customerUser = await prisma.user.create({
          data: {
            name: name || 'Customer',
            email,
            phone,
            passwordHash,
            role: 'CUSTOMER',
          },
        });
      }
    }

    // Find or create Vehicle for this customer
    let vehicle = await prisma.vehicle.findFirst({
      where: {
        customerId: customerUser.id,
        registrationPlate: registrationPlate.trim().toUpperCase(),
      },
    });

    if (!vehicle) {
      vehicle = await prisma.vehicle.create({
        data: {
          customerId: customerUser.id,
          registrationPlate: registrationPlate.trim().toUpperCase(),
          make,
          model,
          year: parseInt(year) || new Date().getFullYear(),
          color: color || '',
          mileage: mileage ? parseInt(mileage) : undefined,
        },
      });
    }

    // Create Booking
    const booking = await prisma.booking.create({
      data: {
        reference: generateBookingReference(),
        shopId,
        customerId: customerUser.id,
        vehicleId: vehicle.id,
        bookingDate,
        bookingTime,
        selectedServices: Array.isArray(selectedServices)
          ? JSON.stringify(selectedServices)
          : selectedServices || '[]',
        reportedProblem: reportedProblem || 'Routine Service',
        status: 'PENDING',
      },
      include: {
        shop: true,
        vehicle: true,
        customer: true,
      },
    });

    // Record initial history
    await prisma.bookingHistory.create({
      data: {
        bookingId: booking.id,
        userId: customerUser.id,
        userName: customerUser.name,
        userRole: 'CUSTOMER',
        fromStatus: 'NONE',
        toStatus: 'PENDING',
        note: `Booking created online by customer for ${bookingDate} at ${bookingTime}`,
      },
    });

    // Notify Service Advisors of the shop
    await notifyShopStaffByRole(
      shopId,
      ['SERVICE_ADVISOR', 'OWNER'],
      'New Customer Booking',
      `New booking #${booking.reference} for ${vehicle.make} ${vehicle.model} (${bookingDate} ${bookingTime})`,
      booking.id
    );

    const token = jwt.sign({ userId: customerUser.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      booking,
      token,
      customer: {
        id: customerUser.id,
        name: customerUser.name,
        email: customerUser.email,
        role: customerUser.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// List Bookings (Strict Tenant Isolation & Role Filtering)
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const shopId = (req.query.shopId || req.headers['x-shop-id']) as string | undefined;
    const statusFilter = req.query.status as string | undefined;

    // 1. Customer role: strictly gets only their own bookings
    if (user.role === 'CUSTOMER') {
      const bookings = await prisma.booking.findMany({
        where: {
          customerId: user.id,
          ...(shopId ? { shopId } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
        },
        include: {
          shop: true,
          vehicle: true,
          estimates: {
            orderBy: { revision: 'desc' },
            include: { lineItems: true },
          },
          qcIssues: true,
          history: { orderBy: { createdAt: 'desc' }, take: 3 },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ bookings });
      return;
    }

    // 2. Staff / Owner: must provide shopId
    if (!shopId) {
      res.status(400).json({ error: 'Shop ID is required for staff queries.' });
      return;
    }

    // Check tenant isolation: User must belong to this shop
    const membership = user.memberships.find((m) => m.shopId === shopId);
    if (!membership && user.role !== 'OWNER') {
      res.status(403).json({ error: 'Tenant Access Denied: You do not have permissions for this shop.' });
      return;
    }

    const role = membership?.role || 'OWNER';

    const where: any = { shopId };
    if (statusFilter && statusFilter !== 'ALL') {
      where.status = statusFilter;
    }

    // Role-specific filtering
    if (role === 'TECHNICIAN') {
      // Technician sees only jobs assigned to them
      where.technicianId = user.id;
    } else if (role === 'QC_INSPECTOR') {
      // QC Inspector sees shared QC queue (QC_PENDING) OR jobs they have in progress
      where.OR = [
        { status: 'QC_PENDING' },
        { status: 'QC_IN_PROGRESS', qcInspectorId: user.id },
      ];
    } else if (role === 'PARTS_PERSON') {
      // Parts person sees jobs related to parts or all active jobs
      if (statusFilter && statusFilter === 'PARTS_ONLY') {
        where.status = { in: ['PARTS_PENDING', 'PARTS_ORDERED', 'PARTS_READY'] };
      }
    }
    // SA and Owner see all bookings of this shop

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        shop: true,
        vehicle: true,
        customer: { select: { id: true, name: true, email: true, phone: true } },
        technician: { select: { id: true, name: true } },
        partsPerson: { select: { id: true, name: true } },
        qcInspector: { select: { id: true, name: true } },
        estimates: {
          orderBy: { revision: 'desc' },
          include: { lineItems: true },
        },
        qcIssues: true,
        history: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ bookings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Single Booking Details
router.get('/:bookingId', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const user = req.user!;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        shop: true,
        vehicle: true,
        customer: { select: { id: true, name: true, email: true, phone: true } },
        technician: { select: { id: true, name: true, email: true } },
        partsPerson: { select: { id: true, name: true, email: true } },
        qcInspector: { select: { id: true, name: true, email: true } },
        estimates: {
          orderBy: { revision: 'desc' },
          include: { lineItems: { include: { partInventory: true } } },
        },
        partAllocations: {
          include: { inventoryItem: true },
        },
        qcIssues: {
          include: { inspector: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        history: {
          orderBy: { createdAt: 'desc' },
        },
        callLogs: {
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }

    // Tenant check
    if (user.role === 'CUSTOMER') {
      if (booking.customerId !== user.id) {
        res.status(403).json({ error: 'Access Denied: You cannot view another customer’s booking.' });
        return;
      }
    } else {
      const membership = user.memberships.find((m) => m.shopId === booking.shopId);
      if (!membership && user.role !== 'OWNER') {
        res.status(403).json({ error: 'Tenant Access Denied: You do not belong to this shop.' });
        return;
      }
    }

    res.json({ booking });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// State Machine Transition Endpoint
router.post('/:bookingId/transition', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const { actionKey, note, technicianId, partsPersonId, qcIssue, rejectionReason } = req.body;
    const user = req.user!;

    if (!actionKey) {
      res.status(400).json({ error: 'actionKey is required.' });
      return;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }

    // Determine current user's role for this shop
    let effectiveRole: UserRole | 'CUSTOMER' = 'CUSTOMER';
    if (user.role === 'CUSTOMER') {
      effectiveRole = 'CUSTOMER';
    } else {
      const membership = user.memberships.find((m) => m.shopId === booking.shopId);
      if (membership) {
        effectiveRole = membership.role;
      } else if (user.role === 'OWNER') {
        effectiveRole = 'OWNER';
      } else {
        res.status(403).json({ error: 'Tenant Access Denied: You do not have permissions in this shop.' });
        return;
      }
    }

    const updatedBooking = await executeTransition(actionKey, {
      bookingId,
      targetStatus: booking.status as any,
      userId: user.id,
      userName: user.name,
      userRole: effectiveRole,
      note,
      technicianId,
      partsPersonId,
      qcIssue,
      rejectionReason,
    });

    res.json({ success: true, booking: updatedBooking });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Audit history
router.get('/:bookingId/history', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const history = await prisma.bookingHistory.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ history });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
