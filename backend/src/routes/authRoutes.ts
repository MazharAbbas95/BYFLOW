import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma/client';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest, UserRole } from '../types';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'bayflow-hackathon-super-secret-jwt-token-key-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const generateToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Owner registration
router.post('/register-owner', async (req, res): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: 'User with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        phone,
        role: 'OWNER',
      },
    });

    const token = generateToken(user.id);
    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        memberships: [],
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error during registration.' });
  }
});

// Universal login for Owner, Staff, and Customer
router.post('/login', async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { isActive: true },
          include: { shop: true },
        },
        ownedShops: true,
      },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = generateToken(user.id);
    const memberships = [
      ...user.memberships.map((m) => ({
        shopId: m.shopId,
        role: m.role as UserRole,
        shopName: m.shop.name,
      })),
      ...user.ownedShops
        .filter((s) => !user.memberships.some((m) => m.shopId === s.id))
        .map((s) => ({
          shopId: s.id,
          role: 'OWNER' as UserRole,
          shopName: s.name,
        })),
    ];

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        memberships,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error during login.' });
  }
});

// Quick demo switch endpoint for judges and testers
router.post('/demo-switch', async (req, res): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required for demo switch.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { isActive: true },
          include: { shop: true },
        },
        ownedShops: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: `Demo account '${email}' not found. Run seed script first.` });
      return;
    }

    const token = generateToken(user.id);
    const memberships = [
      ...user.memberships.map((m) => ({
        shopId: m.shopId,
        role: m.role as UserRole,
        shopName: m.shop.name,
      })),
      ...user.ownedShops
        .filter((s) => !user.memberships.some((m) => m.shopId === s.id))
        .map((s) => ({
          shopId: s.id,
          role: 'OWNER' as UserRole,
          shopName: s.name,
        })),
    ];

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        memberships,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Current user profile
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({ user: req.user });
});

export default router;
