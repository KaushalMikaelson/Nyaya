// @ts-nocheck
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

// ─────────────────────────────────────────
// VALIDATION SCHEMAS
// ─────────────────────────────────────────

const CreateCaseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  caseNumber: z.string().optional(),
  caseType: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'CLOSED', 'APPEALED']).default('OPEN'),
  court: z.string().optional(),
  courtLevel: z.string().optional(),
  courtState: z.string().optional(),
  benchType: z.string().optional(),
  judgeName: z.string().optional(),
  opponentName: z.string().optional(),
  opponentCounsel: z.string().optional(),
  filedAt: z.string().optional(),
  limitationDate: z.string().optional(),
  factSummary: z.string().max(3000).optional(),
  reliefSought: z.string().optional(),
  actsInvolved: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  firmId: z.string().uuid().optional(),
});

const UpdateCaseSchema = CreateCaseSchema.partial();

const AnalyzeCaseSchema = z.object({
  factSummary: z.string().min(20, 'Please provide at least 20 characters of facts'),
  caseType: z.string().optional(),
  actsInvolved: z.array(z.string()).optional(),
  reliefSought: z.string().optional(),
});

// ─────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────

function generateCaseId(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `NYA-${year}-${rand}`;
}

// ─────────────────────────────────────────
// CREATE CASE
// ─────────────────────────────────────────

router.post('/', async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateCaseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', issues: parsed.error.flatten().fieldErrors });
    return;
  }

  const {
    title, description, caseNumber, caseType, priority, status,
    court, courtLevel, courtState, benchType, judgeName,
    opponentName, opponentCounsel,
    filedAt, limitationDate,
    factSummary, reliefSought, actsInvolved, tags,
    firmId,
  } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const payload: any = {
      title,
      description,
      caseNumber: caseNumber || generateCaseId(),
      caseType,
      priority,
      status,
      court,
      courtLevel,
      courtState,
      benchType,
      judgeName,
      opponentName,
      opponentCounsel,
      filedAt: filedAt ? new Date(filedAt) : null,
      limitationDate: limitationDate ? new Date(limitationDate) : null,
      factSummary,
      reliefSought,
      actsInvolved: actsInvolved ?? [],
      tags: tags ?? [],
    };

    if (user.role === 'LAWYER') {
      payload.primaryCounselId = user.id;
      if (firmId) {
        const isMember = await prisma.firmMember.findUnique({
          where: { firmId_userId: { firmId, userId: user.id } },
        });
        if (isMember) payload.firmId = firmId;
      }
    } else {
      payload.clientId = user.id;
    }

    const newCase = await prisma.case.create({ data: payload });

    // Opening timeline event
    await prisma.caseTimeline.create({
      data: {
        caseId: newCase.id,
        title: 'Case Opened',
        description: `Matter "${title}" initialized on Nyaya.`,
        date: new Date(),
      },
    });

    // Notification (non-blocking)
    try {
      const { dispatchNotification } = require('../workers/notifications');
      await dispatchNotification(
        user.id,
        'New Case Initialized',
        `Your case "${title}" has been successfully opened.`,
        ['in-app', 'email'],
        { email: user.email, type: 'info' }
      );
    } catch { /* silent */ }

    res.status(201).json(newCase);
  } catch (err: any) {
    console.error('[cases/create]', err);
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'A case with this case number already exists.' });
    } else {
      res.status(500).json({ error: 'Failed to create case' });
    }
  }
});

// ─────────────────────────────────────────
// LIST CASES (with filters)
// ─────────────────────────────────────────

router.get('/', async (req: AuthRequest, res): Promise<void> => {
  const userId = req.user!.userId;
  const userRole = req.user!.role;
  const { status, caseType, priority, search } = req.query;

  const filters: any = {};
  if (status) filters.status = String(status);
  if (caseType) filters.caseType = String(caseType);
  if (priority) filters.priority = String(priority);
  if (search) {
    filters.OR = [
      { title: { contains: String(search), mode: 'insensitive' } },
      { caseNumber: { contains: String(search), mode: 'insensitive' } },
      { court: { contains: String(search), mode: 'insensitive' } },
    ];
  }

  try {
    let whereClause: any = filters;

    if (userRole === 'CITIZEN') {
      whereClause = { ...filters, clientId: userId };
    } else if (userRole === 'LAWYER') {
      const firmMemberships = await prisma.firmMember.findMany({ where: { userId } });
      const firmIds = firmMemberships.map((fm) => fm.firmId);
      whereClause = {
        ...filters,
        OR: [
          { primaryCounselId: userId },
          { firmId: { in: firmIds } },
        ],
      };
    } else {
      whereClause = {
        ...filters,
        OR: [{ clientId: userId }, { primaryCounselId: userId }],
      };
    }

    const cases = await prisma.case.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        caseNumber: true,
        caseType: true,
        priority: true,
        status: true,
        court: true,
        courtLevel: true,
        judgeName: true,
        opponentName: true,
        filedAt: true,
        limitationDate: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { hearings: true, documents: true } },
      },
    });

    res.json(cases);
  } catch (err) {
    console.error('[cases/list]', err);
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

// ─────────────────────────────────────────
// GET CASE DETAILS
// ─────────────────────────────────────────

router.get('/:id', async (req: AuthRequest, res): Promise<void> => {
  const caseId = String(req.params.id);
  try {
    const c = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        hearings: { orderBy: { date: 'desc' } },
        timeline: { orderBy: { date: 'desc' } },
        documents: { orderBy: { createdAt: 'desc' } },
        client: { select: { id: true, email: true, citizenProfile: true } },
        primaryCounsel: { select: { id: true, email: true, lawyerProfile: true } },
        firm: true,
      },
    });

    if (!c) { res.status(404).json({ error: 'Case not found' }); return; }
    res.json(c);
  } catch (err) {
    console.error('[cases/get]', err);
    res.status(500).json({ error: 'Failed to fetch case details' });
  }
});

// ─────────────────────────────────────────
// UPDATE CASE
// ─────────────────────────────────────────

router.patch('/:id', async (req: AuthRequest, res): Promise<void> => {
  const caseId = String(req.params.id);
  const parsed = UpdateCaseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', issues: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const existing = await prisma.case.findUnique({ where: { id: caseId } });
    if (!existing) { res.status(404).json({ error: 'Case not found' }); return; }

    const data: any = { ...parsed.data };
    if (data.filedAt) data.filedAt = new Date(data.filedAt);
    if (data.limitationDate) data.limitationDate = new Date(data.limitationDate);

    const updated = await prisma.case.update({ where: { id: caseId }, data });
    res.json(updated);
  } catch (err) {
    console.error('[cases/update]', err);
    res.status(500).json({ error: 'Failed to update case' });
  }
});

// ─────────────────────────────────────────
// AI CASE ANALYSIS (RAG-powered)
// ─────────────────────────────────────────

router.post('/analyze', async (req: AuthRequest, res): Promise<void> => {
  const parsed = AnalyzeCaseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', issues: parsed.error.flatten().fieldErrors });
    return;
  }

  const { factSummary, caseType, actsInvolved, reliefSought } = parsed.data;

  try {
    // 1. Try to find relevant legal chunks via text search (fallback if no embeddings)
    const searchTerms = [factSummary.slice(0, 200), ...(actsInvolved ?? [])].join(' ');

    const relevantChunks = await prisma.$queryRaw<Array<{ content: string; id: string }>>`
      SELECT id, content
      FROM "LegalChunk"
      WHERE to_tsvector('english', content) @@ plainto_tsquery('english', ${searchTerms})
      LIMIT 6
    `;

    const context = relevantChunks.length > 0
      ? relevantChunks.map((c) => c.content).join('\n\n---\n\n')
      : 'No specific legal provisions retrieved. Providing general analysis.';

    // 2. Build structured prompt
    const systemPrompt = `You are Nyaya, an expert Indian legal assistant. Analyze the following case facts and provide structured legal analysis in JSON format.`;

    const userPrompt = `
Case Type: ${caseType || 'Not specified'}
Acts Mentioned: ${actsInvolved?.join(', ') || 'None specified'}
Relief Sought: ${reliefSought || 'Not specified'}

FACTS:
${factSummary}

RETRIEVED LEGAL CONTEXT:
${context}

Respond with a valid JSON object with these exact keys:
{
  "summary": "2-3 sentence case summary",
  "relevantActs": [{ "act": "Act name", "section": "Section", "relevance": "Why relevant" }],
  "legalInsights": ["insight 1", "insight 2", "insight 3"],
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "riskReason": "Explanation of risk",
  "suggestedRemedies": ["remedy 1", "remedy 2"],
  "limitationWarning": "Statute of limitations note if applicable"
}`;

    // 3. Call Groq LLM
    const { default: Groq } = await import('groq-sdk');
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const rawJson = completion.choices[0]?.message?.content || '{}';
    let analysis;
    try {
      analysis = JSON.parse(rawJson);
    } catch {
      analysis = { summary: rawJson, relevantActs: [], legalInsights: [], riskLevel: 'MEDIUM' };
    }

    // 4. Cache analysis if caseId provided
    const { caseId } = req.body;
    if (caseId) {
      await prisma.case.update({
        where: { id: caseId },
        data: { aiAnalysis: rawJson, aiAnalyzedAt: new Date() },
      });
    }

    res.json({
      analysis,
      chunksRetrieved: relevantChunks.length,
      retrievedContext: relevantChunks.slice(0, 2).map((c) => c.content.slice(0, 200)),
    });
  } catch (err) {
    console.error('[cases/analyze]', err);
    res.status(500).json({ error: 'AI analysis failed. Please try again.' });
  }
});

// ─────────────────────────────────────────
// ADD HEARING
// ─────────────────────────────────────────

router.post('/:id/hearings', async (req: AuthRequest, res): Promise<void> => {
  const caseId = String(req.params.id);
  const { date, purpose, summary, nextHearingDate } = req.body;

  if (!date || !purpose) {
    res.status(400).json({ error: 'Hearing date and purpose are required.' });
    return;
  }

  try {
    const hearing = await prisma.hearing.create({
      data: {
        caseId,
        date: new Date(date),
        purpose,
        summary,
        nextHearingDate: nextHearingDate ? new Date(nextHearingDate) : null,
      },
    });

    await prisma.caseTimeline.create({
      data: {
        caseId,
        title: 'Hearing Scheduled',
        description: `Hearing purpose: ${purpose}`,
        date: new Date(date),
      },
    });

    const caseDoc = await prisma.case.findUnique({ where: { id: caseId }, include: { client: true } });
    if (caseDoc?.client) {
      try {
        const { dispatchNotification } = require('../workers/notifications');
        await dispatchNotification(
          caseDoc.client.id,
          'Hearing Scheduled',
          `A hearing has been scheduled for "${caseDoc.title}" on ${new Date(date).toLocaleDateString('en-IN')}.`,
          ['in-app', 'email'],
          { email: caseDoc.client.email, type: 'alert' }
        );
      } catch { /* silent */ }
    }

    res.status(201).json(hearing);
  } catch (err) {
    console.error('[cases/hearings]', err);
    res.status(500).json({ error: 'Failed to add hearing' });
  }
});

// ─────────────────────────────────────────
// ADD TIMELINE EVENT
// ─────────────────────────────────────────

router.post('/:id/timeline', async (req: AuthRequest, res): Promise<void> => {
  const caseId = String(req.params.id);
  const { title, description, date } = req.body;
  if (!title) { res.status(400).json({ error: 'Title is required for timeline events' }); return; }

  try {
    const event = await prisma.caseTimeline.create({
      data: { caseId, title, description, date: date ? new Date(date) : new Date() },
    });
    res.status(201).json(event);
  } catch (err) {
    console.error('[cases/timeline]', err);
    res.status(500).json({ error: 'Failed to add timeline event' });
  }
});

// ─────────────────────────────────────────
// FIRMS MANAGEMENT
// ─────────────────────────────────────────

router.post('/firms', async (req: AuthRequest, res): Promise<void> => {
  const { name, description } = req.body;
  if (!name) { res.status(400).json({ error: 'Firm name required' }); return; }

  try {
    const firm = await prisma.firm.create({ data: { name, description } });
    await prisma.firmMember.create({
      data: { firmId: firm.id, userId: req.user!.userId, role: 'OWNER' },
    });
    res.status(201).json(firm);
  } catch (err) {
    console.error('[cases/firms]', err);
    res.status(500).json({ error: 'Failed to create firm' });
  }
});

export default router;
