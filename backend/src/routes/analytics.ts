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
      AND: [
        { judgeName: { not: null } },
        { judgeName: { not: '' } },
      ]
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

// GET /api/analytics/dashboard
router.get('/dashboard', async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    
    // Determine filters for case
    let caseWhere: any = {};
    if (userRole === 'CITIZEN') {
      caseWhere = { clientId: userId };
    } else if (userRole === 'LAWYER') {
      caseWhere = { OR: [{ primaryCounselId: userId }] };
    } else {
      caseWhere = { OR: [{ clientId: userId }, { primaryCounselId: userId }] };
    }

    const [cases, documents, aiQueries] = await Promise.all([
      prisma.case.findMany({
        where: caseWhere,
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: { hearings: { orderBy: { date: 'asc' }, take: 1 } }
      }),
      prisma.userDocument.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      prisma.conversation.findMany({
        where: { userId },
        include: { _count: { select: { messages: true } } }
      })
    ]);

    // Format metrics
    const activeCasesCount = await prisma.case.count({ where: { ...caseWhere, status: { not: 'CLOSED' } } });
    const documentsCount = await prisma.userDocument.count({ where: { userId, deletedAt: null } });
    const totalAiQueries = aiQueries.reduce((acc, curr) => acc + curr._count.messages, 0);

    // Get upcoming hearings
    const today = new Date();
    const upcomingHearingsCount = cases.reduce((acc, curr) => {
      if (curr.hearings && curr.hearings.length > 0 && curr.hearings[0].date >= today) {
        return acc + 1;
      }
      return acc;
    }, 0);

    // Format cases
    const formattedCases = cases.map(c => {
      const dateVal = c.filedAt ? c.filedAt : c.createdAt;
      return {
        id: c.caseNumber || c.id.substring(0, 8),
        title: c.title,
        category: c.caseType || 'General',
        status: c.status,
        date: dateVal.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
        color: c.status === 'OPEN' ? '#3b82f6' : c.status === 'IN_PROGRESS' ? '#d4af37' : '#a1a1aa',
        bg: c.status === 'OPEN' ? 'rgba(59,130,246,0.12)' : c.status === 'IN_PROGRESS' ? 'rgba(212,175,55,0.12)' : 'rgba(161,161,170,0.12)'
      };
    });

    // Format lawyers (just fetch some verified lawyers)
    const lawyers = await prisma.lawyerProfile.findMany({
      where: { verificationStatus: 'VERIFIED' },
      take: 3,
      include: { user: true }
    });
    const formattedLawyers = lawyers.map(l => ({
      name: `Adv. ${l.fullName || l.user.email.split('@')[0]}`,
      type: l.specializations[0] || 'General Practice',
      rating: "4.8", // Mock rating as it's not in schema
      initials: (l.fullName || l.user.email).substring(0, 2).toUpperCase()
    }));

    // Recent activity (mix of recent cases and documents)
    const recentActivity: any[] = [];
    documents.forEach(d => {
      recentActivity.push({ label: `${d.originalName || d.title} analyzed by AI`, time: d.createdAt, type: 'doc', id: d.id });
    });
    cases.forEach(c => {
      recentActivity.push({ label: `Case ${c.title} updated`, time: c.updatedAt, type: 'case', id: c.id });
    });
    recentActivity.sort((a, b) => b.time.getTime() - a.time.getTime());
    
    const timeAgo = (date: Date) => {
      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      let interval = seconds / 31536000;
      if (interval > 1) return Math.floor(interval) + " years ago";
      interval = seconds / 2592000;
      if (interval > 1) return Math.floor(interval) + " months ago";
      interval = seconds / 86400;
      if (interval > 1) return Math.floor(interval) + " days ago";
      interval = seconds / 3600;
      if (interval > 1) return Math.floor(interval) + " hours ago";
      interval = seconds / 60;
      if (interval > 1) return Math.floor(interval) + " minutes ago";
      return "Just now";
    };

    const formattedActivity = recentActivity.slice(0, 5).map(a => ({
      label: a.label,
      time: timeAgo(a.time),
      type: a.type,
      id: a.id
    }));

    res.json({
      metrics: [
        { label: "Active Matters", value: activeCasesCount },
        { label: "Saved Documents", value: documentsCount },
        { label: "AI Queries Used", value: totalAiQueries },
        { label: "Upcoming Hearings", value: upcomingHearingsCount }
      ],
      cases: formattedCases,
      activity: formattedActivity,
      lawyers: formattedLawyers
    });
  } catch (err: any) {
    console.error('[Dashboard]', err?.message || err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
