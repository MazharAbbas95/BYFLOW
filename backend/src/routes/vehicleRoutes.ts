import { Router, Response } from 'express';
import { prisma } from '../prisma/client';

const router = Router();

// Public / Authenticated: Lookup vehicle service history by plate number
router.get('/:plate/history', async (req, res): Promise<void> => {
  try {
    const { plate } = req.params;
    const cleanPlate = plate.trim().toUpperCase();

    const vehicle = await prisma.vehicle.findFirst({
      where: { registrationPlate: cleanPlate },
      include: {
        customer: { select: { name: true, email: true, phone: true } },
        bookings: {
          include: {
            shop: { select: { name: true, city: true, phone: true } },
            estimates: {
              where: { status: { in: ['APPROVED', 'COMPLETED'] } },
              include: { lineItems: true },
              orderBy: { revision: 'desc' },
              take: 1,
            },
            qcIssues: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!vehicle) {
      res.status(404).json({ error: `No records found for vehicle registration ${cleanPlate}.` });
      return;
    }

    res.json({ vehicle });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
