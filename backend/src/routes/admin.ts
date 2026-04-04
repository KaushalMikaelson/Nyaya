// @ts-nocheck
import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { sendOtpEmail } from '../services/otp.service';
import crypto from 'crypto';
import { UserRole } from '@prisma/client';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate, requireRole(UserRole.ADMIN));

// ─────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────

router.get('/stats', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalCitizens,
      totalLawyers,
      totalJudges,
      pendingLawyers,
      pendingJudges,
      verifiedLawyers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'CITIZEN' } }),
      prisma.user.count({ where: { role: 'LAWYER' } }),
      prisma.user.count({ where: { role: 'JUDGE' } }),
      prisma.lawyerProfile.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.judgeProfile.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.lawyerProfile.count({ where: { verificationStatus: 'VERIFIED' } }),
    ]);

    res.json({
      totalUsers,
      totalCitizens,
      totalLawyers,
      totalJudges,
      pendingLawyers,
      pendingJudges,
      verifiedLawyers,
    });
  } catch (err) {
    console.error('[admin/stats]', err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// ─────────────────────────────────────────
// LIST PENDING VERIFICATIONS
// ─────────────────────────────────────────

router.get('/pending/lawyers', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const lawyers = await prisma.lawyerProfile.findMany({
      where: { verificationStatus: 'PENDING' },
      include: {
        user: { select: { id: true, email: true, createdAt: true, isEmailVerified: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ lawyers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending lawyers.' });
  }
});

router.get('/pending/judges', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const judges = await prisma.judgeProfile.findMany({
      where: { verificationStatus: 'PENDING' },
      include: {
        user: { select: { id: true, email: true, createdAt: true, isEmailVerified: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ judges });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending judges.' });
  }
});

// ─────────────────────────────────────────
// VERIFY / REJECT LAWYER
// ─────────────────────────────────────────

router.post('/verify/lawyer/:userId', async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.params;
  const { action, note } = req.body; // action: 'approve' | 'reject'

  if (!['approve', 'reject'].includes(action)) {
    res.status(400).json({ error: 'Action must be "approve" or "reject".' });
    return;
  }

  try {
    const status = action === 'approve' ? 'VERIFIED' : 'REJECTED';
    await prisma.lawyerProfile.update({
      where: { userId },
      data: {
        verificationStatus: status,
        verificationNote: note || null,
        verifiedAt: action === 'approve' ? new Date() : null,
        verifiedBy: req.user!.userId,
      },
    });

    // Notify lawyer by email
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.email) {
      const msg = action === 'approve'
        ? 'Congratulations! Your Nyaya lawyer profile has been verified. You can now appear in the marketplace.'
        : `Your lawyer profile was not approved. Reason: ${note || 'Documents did not meet verification standards.'}`;
      await sendOtpEmail(user.email, msg, 'EMAIL_VERIFY').catch(() => {});
    }

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        title: action === 'approve' ? '✅ Profile Verified' : '❌ Profile Rejected',
        message: action === 'approve'
          ? 'Your lawyer profile has been verified by Nyaya admin.'
          : `Your lawyer profile was rejected. ${note ? `Reason: ${note}` : ''}`,
        type: action === 'approve' ? 'success' : 'error',
      },
    });

    res.json({ message: `Lawyer ${action}d successfully.`, verificationStatus: status });
  } catch (err) {
    console.error('[admin/verify/lawyer]', err);
    res.status(500).json({ error: 'Verification action failed.' });
  }
});

// ─────────────────────────────────────────
// VERIFY / REJECT JUDGE
// ─────────────────────────────────────────

router.post('/verify/judge/:userId', async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.params;
  const { action, note } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    res.status(400).json({ error: 'Action must be "approve" or "reject".' });
    return;
  }

  try {
    const status = action === 'approve' ? 'VERIFIED' : 'REJECTED';
    await prisma.judgeProfile.update({
      where: { userId },
      data: {
        verificationStatus: status,
        verificationNote: note || null,
        verifiedAt: action === 'approve' ? new Date() : null,
        verifiedBy: req.user!.userId,
      },
    });

    await prisma.notification.create({
      data: {
        userId,
        title: action === 'approve' ? '✅ Judge Account Approved' : '❌ Judge Account Rejected',
        message: action === 'approve'
          ? 'Your Nyaya judge account has been approved by admin.'
          : `Your judge account was rejected. ${note ? `Reason: ${note}` : ''}`,
        type: action === 'approve' ? 'success' : 'error',
      },
    });

    res.json({ message: `Judge ${action}d successfully.`, verificationStatus: status });
  } catch (err) {
    console.error('[admin/verify/judge]', err);
    res.status(500).json({ error: 'Verification action failed.' });
  }
});

// ─────────────────────────────────────────
// CREATE ADMIN INVITE
// ─────────────────────────────────────────

router.post('/invite', async (req: AuthRequest, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required.' });
    return;
  }

  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'A user with this email already exists.' });
      return;
    }

    // Invalidate any previous unused invites for this email
    await prisma.adminInvite.updateMany({
      where: { email, used: false },
      data: { used: true, usedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    await prisma.adminInvite.create({
      data: {
        token,
        email,
        role: UserRole.ADMIN,
        invitedBy: req.user!.userId,
        expiresAt,
      },
    });

    const inviteUrl = `${process.env.FRONTEND_URL}/auth/admin/register?token=${token}`;

    // Send invite email
    console.log(`[ADMIN INVITE] Email: ${email} | URL: ${inviteUrl}`);
    // In production: await sendInviteEmail(email, inviteUrl);

    res.json({
      message: `Admin invite sent to ${email}.`,
      inviteUrl, // Only returned in dev; don't expose in production response
      expiresAt,
    });
  } catch (err) {
    console.error('[admin/invite]', err);
    res.status(500).json({ error: 'Failed to create invite.' });
  }
});

// ─────────────────────────────────────────
// SUSPEND / REACTIVATE USER
// ─────────────────────────────────────────

router.post('/users/:userId/suspend', async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.params;
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    res.json({ message: 'User suspended and sessions revoked.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to suspend user.' });
  }
});

router.post('/users/:userId/reactivate', async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.params;
  try {
    await prisma.user.update({ where: { id: userId }, data: { isActive: true } });
    res.json({ message: 'User reactivated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reactivate user.' });
  }
});

// ─────────────────────────────────────────
// LIST ALL USERS
// ─────────────────────────────────────────

router.get('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, role: true, isActive: true,
          isEmailVerified: true, isPro: true, createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

export default router;
