import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate } from '../middleware/auth';
import { loadUserTeams, RBACRequest } from '../middleware/documentAccess';
import { cleanErrorText, fetchPythonRag } from '../services/retrieval';

const router = Router();

router.use(authenticate);
router.use(loadUserTeams);

router.post('/', async (req: RBACRequest, res): Promise<void> => {
  const { query, filters = {} } = req.body;
  if (!query) {
    res.status(400).json({ error: 'Query is required for search' });
    return;
  }

  const t0 = Date.now();
  try {
    // Include user teamIds for pre-ranking RBAC filtering
    const searchFilters = {
      ...filters,
      teamIds: req.userTeamIds || []
    };

    // Delegate to Python RAG /search
    const pyRes = await fetchPythonRag('/search', {
      method: 'POST',
      body: JSON.stringify({ query, filters: searchFilters }),
    });

    if (!pyRes.ok) {
      const errText = await pyRes.text().catch(() => pyRes.statusText);
      const cleaned = cleanErrorText(errText, pyRes.status);
      console.error('[Search] Python RAG /search error:', cleaned);
      res.status(502).json({ error: 'Search service failed', detail: cleaned });
      return;
    }

    const data: any = await pyRes.json();
    const latencyMs = Date.now() - t0;

    // Asynchronously record search audit log
    const docIds = (data.results || []).map((r: any) => r.id).filter(Boolean);
    try {
      await (prisma as any).searchAuditLog.create({
        data: {
          userId: req.user?.userId || null,
          query,
          actFilter: searchFilters.act || null,
          returnedDocs: docIds,
          latencyMs,
        }
      });
    } catch (auditErr) {
      // Audit log failure is non-fatal
      console.warn('[Audit] Failed to record search audit log:', auditErr);
    }

    res.json(data);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
