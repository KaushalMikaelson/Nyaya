import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';

const router = Router();
router.use(authenticate);

// ----------------------------------------------------
// CREATE CASE
// ----------------------------------------------------
router.post('/', async (req: AuthRequest, res): Promise<void> => {
  const { title, description, caseNumber, court, judgeName, status, firmId } = req.body;

  if (!title) {
    res.status(400).json({ error: 'Case title is required' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const payload: any = {
      title,
      description,
      caseNumber,
      court,
      judgeName,
      status: status || 'OPEN'
    };

    // If a lawyer attempts to create a case, they act as primaryCounsel
    if (user.role === 'LAWYER') {
      payload.primaryCounselId = user.id;
    } else {
      payload.clientId = user.id;
    }

    // Assign to firm if provided
    if (firmId && user.role === 'LAWYER') {
      const isMember = await prisma.firmMember.findUnique({
        where: { firmId_userId: { firmId, userId: user.id } }
      });
      if (isMember) {
        payload.firmId = firmId;
      }
    }

    const newCase = await prisma.case.create({
      data: payload
    });

    // Create opening timeline event
    await prisma.caseTimeline.create({
      data: {
        caseId: newCase.id,
        title: 'Case Opened',
        description: `Case ${title} initialized on Nyaya.`,
        date: new Date()
      }
    });

    res.status(201).json(newCase);
  } catch (err) {
    console.error('Error creating case:', err);
    res.status(500).json({ error: 'Failed to create case' });
  }
});

// ----------------------------------------------------
// LIST USER CASES (Both Client & Counsel / Firm)
// ----------------------------------------------------
router.get('/', async (req: AuthRequest, res): Promise<void> => {
  try {
    const userRole = req.user!.role;
    const userId = req.user!.userId;
    
    let cases = [];

    if (userRole === 'CITIZEN') {
      cases = await prisma.case.findMany({
        where: { clientId: userId },
        orderBy: { updatedAt: 'desc' }
      });
    } else if (userRole === 'LAWYER') {
      // Find direct counsel cases and firm cases
      const firmMemberships = await prisma.firmMember.findMany({ where: { userId } });
      const firmIds = firmMemberships.map(fm => fm.firmId);

      cases = await prisma.case.findMany({
        where: {
          OR: [
            { primaryCounselId: userId },
            { firmId: { in: firmIds } }
          ]
        },
        orderBy: { updatedAt: 'desc' }
      });
    } else {
      cases = await prisma.case.findMany({
        where: { OR: [{ clientId: userId }, { primaryCounselId: userId }] },
        orderBy: { updatedAt: 'desc' }
      });
    }

    res.json(cases);
  } catch (err) {
    console.error('Error fetching cases:', err);
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

// ----------------------------------------------------
// GET CASE DETAILS
// ----------------------------------------------------
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
        firm: true
      }
    });

    if (!c) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }

    // Optional: access check here

    res.json(c);
  } catch (err) {
    console.error('Error fetching case:', err);
    res.status(500).json({ error: 'Failed to fetch case details' });
  }
});

// ----------------------------------------------------
// ADD HEARING
// ----------------------------------------------------
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
        nextHearingDate: nextHearingDate ? new Date(nextHearingDate) : null
      }
    });

    // Auto-update timeline
    await prisma.caseTimeline.create({
      data: {
        caseId,
        title: 'Hearing Scheduled',
        description: `Hearing for purpose: ${purpose}`,
        date: new Date(date)
      }
    });

    res.status(201).json(hearing);
  } catch (err) {
    console.error('Error adding hearing:', err);
    res.status(500).json({ error: 'Failed to add hearing' });
  }
});

// ----------------------------------------------------
// ADD TIMELINE EVENT
// ----------------------------------------------------
router.post('/:id/timeline', async (req: AuthRequest, res): Promise<void> => {
  const caseId = String(req.params.id);
  const { title, description, date } = req.body;

  if (!title) {
    res.status(400).json({ error: 'Title is required for timeline events' });
    return;
  }

  try {
    const event = await prisma.caseTimeline.create({
      data: {
        caseId,
        title,
        description,
        date: date ? new Date(date) : new Date()
      }
    });
    res.status(201).json(event);
  } catch (err) {
    console.error('Error adding timeline event:', err);
    res.status(500).json({ error: 'Failed to add timeline event' });
  }
});

// ----------------------------------------------------
// FIRMS MANAGEMENT (Simple entry points)
// ----------------------------------------------------
router.post('/firms', async (req: AuthRequest, res): Promise<void> => {
  const { name, description } = req.body;
  if (!name) { res.status(400).json({ error: 'Firm name required' }); return; }

  try {
    const firm = await prisma.firm.create({
      data: { name, description }
    });
    
    // Auto-add creator as OWNER
    await prisma.firmMember.create({
      data: {
        firmId: firm.id,
        userId: req.user!.userId,
        role: 'OWNER'
      }
    });
    
    res.status(201).json(firm);
  } catch (err) {
    console.error('Error creating firm:', err);
    res.status(500).json({ error: 'Failed to create firm' });
  }
});

export default router;
