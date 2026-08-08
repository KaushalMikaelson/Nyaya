import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const PYTHON_RAG_URL = process.env.PYTHON_RAG_URL || 'http://127.0.0.1:8000';

router.use(authenticate);

router.post('/', async (req: AuthRequest, res): Promise<void> => {
  const { query, filters } = req.body;
  if (!query) {
    res.status(400).json({ error: 'Query is required for search' });
    return;
  }

  try {
    // Delegate entirely to Python RAG /search
    const pyRes = await fetch(`${PYTHON_RAG_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, filters }),
    });

    if (!pyRes.ok) {
      const errText = await pyRes.text();
      console.error('[Search] Python RAG /search error:', errText);
      res.status(502).json({ error: 'Search service failed', detail: errText });
      return;
    }

    const data: any = await pyRes.json();
    res.json(data);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
