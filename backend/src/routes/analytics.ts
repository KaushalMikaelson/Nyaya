import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';

const router = Router();
router.use(authenticate);

// GET /api/analytics/judge-workload
router.get('/judge-workload', async (req: AuthRequest, res): Promise<void> => {
  try {
    const { judgeName } = req.query;

    const casesQuery: any = {
      judgeName: { not: null, not: '' }
    };

    if (judgeName) {
      casesQuery.judgeName = { contains: String(judgeName), mode: 'insensitive' };
    }

    const assignedCases = await prisma.case.findMany({
      where: casesQuery,
      select: {
        id: true,
        judgeName: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        filedAt: true,
        _count: { select: { hearings: true } }
      }
    });

    if (assignedCases.length === 0) {
      // Return a simulated structured response if no real cases match (demo purposes)
      res.json({
        judgeName: judgeName || 'Hon. Justice Demo',
        pendingCases: Math.floor(Math.random() * 200) + 50,
        closedCases: Math.floor(Math.random() * 100) + 20,
        averageDisposalDays: Math.floor(Math.random() * 500) + 150,
        backlogTrend: 'Increasing',
        hearingsPerCase: (Math.random() * 4 + 2).toFixed(1),
        isMockData: true
      });
      return;
    }

    // Aggregate real data
    const judges: Record<string, any> = {};

    assignedCases.forEach(c => {
      const name = c.judgeName!;
      if (!judges[name]) {
        judges[name] = {
          name,
          pendingCases: 0,
          closedCases: 0,
          totalDisposalDays: 0,
          totalHearings: 0
        };
      }

      judges[name].totalHearings += c._count.hearings;

      if (c.status === 'CLOSED') {
        judges[name].closedCases++;
        const from = c.filedAt ? new Date(c.filedAt) : new Date(c.createdAt);
        const to = new Date(c.updatedAt);
        judges[name].totalDisposalDays += Math.max(0, (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        judges[name].pendingCases++;
      }
    });

    const results = Object.values(judges).map(j => ({
      judgeName: j.name,
      pendingCases: j.pendingCases,
      closedCases: j.closedCases,
      averageDisposalDays: j.closedCases > 0 ? Math.round(j.totalDisposalDays / j.closedCases) : 0,
      hearingsPerCase: (j.totalHearings / Math.max(1, j.pendingCases + j.closedCases)).toFixed(1),
      backlogTrend: j.pendingCases > j.closedCases ? 'Increasing' : 'Decreasing',
      isMockData: false
    }));

    res.json(judgeName ? results[0] : results);
  } catch (err: any) {
    console.error('[Analytics] Error:', err?.message || err);
    res.status(500).json({ error: 'Failed to fetch judge analytics' });
  }
});

export default router;
