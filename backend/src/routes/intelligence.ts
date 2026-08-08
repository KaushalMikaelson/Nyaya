// @ts-nocheck
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';

import { getPythonRagUrl } from '../services/retrieval';

const router = Router();

router.use(authenticate);

router.post('/', async (req: AuthRequest, res): Promise<void> => {
  const { caseDetails } = req.body;
  if (!caseDetails) {
    res.status(400).json({ error: 'Case details are required' });
    return;
  }

  try {
    const dbUser = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!dbUser) return res.status(404).json({ error: 'User not found' });

    if (!dbUser.isPro && dbUser.queriesCount >= 10) {
      res.status(403).json({ error: 'FREE_LIMIT_REACHED', message: 'You have exhausted your free queries.' });
      return;
    }

    // Delegate to Python RAG /case-intelligence
    const pyUrl = getPythonRagUrl();
    const pyRes = await fetch(`${pyUrl}/case-intelligence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseDetails }),
    });

    if (!pyRes.ok) {
      const errText = await pyRes.text();
      console.error('[Intelligence] Python RAG error:', errText);
      res.status(502).json({ error: 'Case intelligence service failed', detail: errText });
      return;
    }

    const data: any = await pyRes.json();

    // Update query count
    if (dbUser && !dbUser.isPro) {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { queriesCount: { increment: 1 } },
      });
    }

    // Schedule follow-up notification
    try {
      const userEmail = req.user?.email || dbUser?.email || 'mock@nyaay.in';
      import('../workers/notifications').then(({ scheduleFollowUp }) => {
        scheduleFollowUp(dbUser.id, userEmail, caseDetails);
      });
    } catch (e) {
      console.error('Queue Dispatch Error:', e);
    }

    res.json(data);
  } catch (err) {
    console.error('Intelligence Error:', err);
    res.status(500).json({ error: 'Failed to process case intelligence' });
  }
});

export default router;
