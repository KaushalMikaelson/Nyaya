import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../prisma';

// Rate limits per tier (requests per window)
const RATE_LIMITS: Record<string, { rpm: number; daily: number }> = {
  FREE:       { rpm: 5,   daily: 100 },
  BASIC:      { rpm: 20,  daily: 1000 },
  PRO:        { rpm: 60,  daily: 10000 },
  ENTERPRISE: { rpm: 200, daily: 100000 }
};

/**
 * Middleware: enforce plan-tier API token quota.
 * Increments apiTokensUsed on each call; resets on new billing period.
 * Call this AFTER `authenticate`.
 */
export const planLimiter = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    let subscription = await prisma.subscription.findUnique({
      where: { userId: req.user.userId }
    });

    // Auto-provision FREE subscription on first touch
    if (!subscription) {
      subscription = await prisma.subscription.create({
        data: {
          userId: req.user.userId,
          tier: 'FREE',
          status: 'ACTIVE',
          apiTokensLimit: RATE_LIMITS.FREE.daily,
          apiTokensUsed: 0,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      });
    }

    // Reset counter if billing period has rolled over
    if (subscription.currentPeriodEnd && subscription.currentPeriodEnd < new Date()) {
      subscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          apiTokensUsed: 0,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });
    }

    // Check quota
    if (subscription.apiTokensUsed >= subscription.apiTokensLimit) {
      const tierName = subscription.tier;
      const nextTier = tierName === 'FREE' ? 'BASIC' : tierName === 'BASIC' ? 'PRO' : 'ENTERPRISE';
      return res.status(429).json({
        error: 'API quota exceeded for your current plan.',
        tier: tierName,
        used: subscription.apiTokensUsed,
        limit: subscription.apiTokensLimit,
        upgrade: nextTier !== 'ENTERPRISE' ? `Upgrade to ${nextTier} for higher limits` : 'Contact us for custom limits'
      });
    }

    // Increment usage
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { apiTokensUsed: { increment: 1 } }
    });

    // Expose subscription info downstream
    (req as any).subscription = subscription;

    next();
  } catch (err) {
    console.error('[planLimiter]', err);
    next(); // fail open — don't break requests on limiter errors
  }
};
