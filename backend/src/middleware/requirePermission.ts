// @ts-nocheck
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../prisma';

// ─────────────────────────────────────────
// ADMIN PERMISSION CONSTANTS
// ─────────────────────────────────────────

export const PERMISSIONS = {
  VERIFY_LAWYERS: 'verify_lawyers',
  VERIFY_JUDGES: 'verify_judges',
  MANAGE_CONTENT: 'manage_content',
  MANAGE_USERS: 'manage_users',
  INVITE_ADMINS: 'invite_admins',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_PAYMENTS: 'manage_payments',
  SUPER_ADMIN: 'super_admin', // Bypasses all other permission checks
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// ─────────────────────────────────────────
// PERMISSION MIDDLEWARE
// Use AFTER authenticate() + requireRole(ADMIN)
// ─────────────────────────────────────────

/**
 * Check if the authenticated admin has ALL of the required permissions.
 * SUPER_ADMIN automatically passes all checks.
 */
export const requirePermission = (...perms: Permission[]) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    try {
      const adminProfile = await prisma.adminProfile.findUnique({
        where: { userId: req.user.userId },
        select: { permissions: true },
      });

      if (!adminProfile) {
        res.status(403).json({ error: 'Admin profile not found.' });
        return;
      }

      const adminPerms = adminProfile.permissions;

      // SUPER_ADMIN bypasses all checks
      if (adminPerms.includes(PERMISSIONS.SUPER_ADMIN)) {
        next();
        return;
      }

      const missing = perms.filter(p => !adminPerms.includes(p));
      if (missing.length > 0) {
        res.status(403).json({
          error: `Insufficient permissions. Missing: [${missing.join(', ')}].`,
          code: 'INSUFFICIENT_PERMISSIONS',
        });
        return;
      }

      next();
    } catch (err) {
      console.error('[requirePermission]', err);
      res.status(500).json({ error: 'Permission check failed.' });
    }
  };
};

/**
 * Check if admin has ANY of the given permissions (OR logic).
 */
export const requireAnyPermission = (...perms: Permission[]) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    try {
      const adminProfile = await prisma.adminProfile.findUnique({
        where: { userId: req.user.userId },
        select: { permissions: true },
      });

      if (!adminProfile) {
        res.status(403).json({ error: 'Admin profile not found.' });
        return;
      }

      const adminPerms = adminProfile.permissions;

      if (adminPerms.includes(PERMISSIONS.SUPER_ADMIN) || perms.some(p => adminPerms.includes(p))) {
        next();
        return;
      }

      res.status(403).json({
        error: `Forbidden. Required one of: [${perms.join(', ')}].`,
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    } catch (err) {
      console.error('[requireAnyPermission]', err);
      res.status(500).json({ error: 'Permission check failed.' });
    }
  };
};
