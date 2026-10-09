import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma/client';
import { AuthenticatedRequest, UserRole } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'bayflow-hackathon-super-secret-jwt-token-key-2026';

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required. No token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        memberships: {
          where: { isActive: true },
          include: { shop: true },
        },
        ownedShops: true,
      },
    });

    if (!user) {
      res.status(401).json({ error: 'User no longer exists.' });
      return;
    }

    const memberships = [
      ...user.memberships.map((m) => ({
        shopId: m.shopId,
        role: m.role as UserRole,
        shopName: m.shop.name,
      })),
      // Owner of shops automatically has OWNER role in owned shops if not already present
      ...user.ownedShops
        .filter((s) => !user.memberships.some((m) => m.shopId === s.id))
        .map((s) => ({
          shopId: s.id,
          role: 'OWNER' as UserRole,
          shopName: s.name,
        })),
    ];

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      memberships,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
};

/**
 * Middleware ensuring the authenticated user has access to the target shop (Tenant Isolation)
 */
export const requireTenant = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const shopId = (req.params.shopId || req.headers['x-shop-id'] || req.query.shopId) as string;

  if (!shopId) {
    res.status(400).json({ error: 'Shop ID (tenant) is required.' });
    return;
  }

  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  // Customers are global, but if accessing shop staff POS endpoints, must have a role
  const membership = req.user.memberships.find((m) => m.shopId === shopId);
  
  if (!membership) {
    // Check if user is the customer accessing only their own bookings
    if (req.user.role === 'CUSTOMER') {
      req.currentShopId = shopId;
      req.currentShopRole = 'CUSTOMER';
      next();
      return;
    }

    res.status(403).json({ 
      error: 'Tenant Access Denied: You do not have permissions for this shop.' 
    });
    return;
  }

  req.currentShopId = shopId;
  req.currentShopRole = membership.role;
  next();
};

/**
 * Middleware ensuring the user has one of the required roles in the current shop
 */
export const requireShopRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const currentRole = req.currentShopRole;

    // OWNER can do everything inside their shop
    if (currentRole === 'OWNER') {
      next();
      return;
    }

    if (!currentRole || !allowedRoles.includes(currentRole)) {
      res.status(403).json({
        error: `Permission Denied: Your role (${currentRole || 'none'}) is not permitted to perform this action. Required: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
};
