import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { ACCESS_SECRET } from '../services/token.service';

// ─────────────────────────────────────────
// AUGMENTED REQUEST TYPE
// ─────────────────────────────────────────

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string | null;
    role: UserRole;
    isPro: boolean;
    isEmailVerified: boolean;
  };
}

// ─────────────────────────────────────────
// AUTHENTICATE — verify JWT access token
// ─────────────────────────────────────────

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as AuthRequest['user'];
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
  }
};

// ─────────────────────────────────────────
// REQUIRE ROLE(S) — role-based gate
// Use AFTER authenticate()
// ─────────────────────────────────────────

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: This route requires one of [${roles.join(', ')}] role.`,
      });
      return;
    }
    next();
  };
};

// ─────────────────────────────────────────
// REQUIRE EMAIL VERIFIED
// ─────────────────────────────────────────

export const requireEmailVerified = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.isEmailVerified) {
    res.status(403).json({
      error: 'Email not verified. Please verify your email to continue.',
      code: 'EMAIL_NOT_VERIFIED',
    });
    return;
  }
  next();
};

// ─────────────────────────────────────────
// ROLE SHORTHAND GUARDS
// ─────────────────────────────────────────

/** Only CITIZEN */
export const citizenOnly = [
  authenticate,
  requireRole(UserRole.CITIZEN),
];

/** Only LAWYER */
export const lawyerOnly = [
  authenticate,
  requireRole(UserRole.LAWYER),
];

/** Only JUDGE */
export const judgeOnly = [
  authenticate,
  requireRole(UserRole.JUDGE),
];

/** Only ADMIN */
export const adminOnly = [
  authenticate,
  requireRole(UserRole.ADMIN),
];

/** LAWYER or JUDGE or ADMIN */
export const professionalOnly = [
  authenticate,
  requireRole(UserRole.LAWYER, UserRole.JUDGE, UserRole.ADMIN),
];

/** Any authenticated user */
export const authOnly = [authenticate];
