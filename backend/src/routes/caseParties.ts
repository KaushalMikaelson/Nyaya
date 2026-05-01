// @ts-nocheck
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';
import { z } from 'zod';

const router = Router({ mergeParams: true });
router.use(authenticate);

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function maskAadhaar(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 12) throw new Error('Aadhaar must be 12 digits');
  return `XXXX XXXX ${digits.slice(-4)}`;
}

const PARTY_TYPES = [
  'PLAINTIFF', 'PETITIONER', 'DEFENDANT', 'RESPONDENT',
  'WITNESS', 'INTERVENER', 'CO_PETITIONER', 'CO_DEFENDANT', 'OTHER',
] as const;

const PartySchema = z.object({
  partyType: z.enum(PARTY_TYPES),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  dateOfBirth: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number')
    .optional()
    .or(z.literal('')),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits').optional().or(z.literal('')),
  aadhaarRaw: z
    .string()
    .regex(/^\d{12}$/, 'Aadhaar must be 12 digits')
    .optional()
    .or(z.literal('')),
  aadhaarConsent: z.boolean().optional(),
});

const AdvocateSchema = z.object({
  fullName: z.string().min(2),
  enrollmentNo: z.string().optional(),
  barCouncilState: z.string().optional(),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number')
    .optional()
    .or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  represents: z.enum(['PLAINTIFF', 'DEFENDANT', 'BOTH']).default('PLAINTIFF'),
});

// ─────────────────────────────────────────
// PARTIES
// ─────────────────────────────────────────

// POST /api/cases/:id/parties
router.post('/parties', async (req: AuthRequest, res): Promise<void> => {
  const caseId = String(req.params.id);
  const parsed = PartySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', issues: parsed.error.flatten().fieldErrors });
    return;
  }

  const { aadhaarRaw, aadhaarConsent, dateOfBirth, ...rest } = parsed.data;

  try {
    const exists = await prisma.case.findUnique({ where: { id: caseId } });
    if (!exists) { res.status(404).json({ error: 'Case not found' }); return; }

    const data: any = {
      caseId,
      ...rest,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
    };

    // Aadhaar — mask before storing, require consent
    if (aadhaarRaw && aadhaarRaw.length === 12) {
      if (!aadhaarConsent) {
        res.status(400).json({ error: 'Aadhaar consent is required to store Aadhaar number.' });
        return;
      }
      data.aadhaarMasked = maskAadhaar(aadhaarRaw);
      data.aadhaarConsentAt = new Date();
    }

    const party = await prisma.caseParty.create({ data });
    res.status(201).json(party);
  } catch (err) {
    console.error('[parties/create]', err);
    res.status(500).json({ error: 'Failed to add party' });
  }
});

// GET /api/cases/:id/parties
router.get('/parties', async (req: AuthRequest, res): Promise<void> => {
  const caseId = String(req.params.id);
  try {
    const parties = await prisma.caseParty.findMany({
      where: { caseId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(parties);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch parties' });
  }
});

// PATCH /api/cases/:id/parties/:pid
router.patch('/parties/:pid', async (req: AuthRequest, res): Promise<void> => {
  const pid = String(req.params.pid);
  const parsed = PartySchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', issues: parsed.error.flatten().fieldErrors });
    return;
  }

  const { aadhaarRaw, aadhaarConsent, dateOfBirth, ...rest } = parsed.data;
  const data: any = { ...rest };
  if (dateOfBirth) data.dateOfBirth = new Date(dateOfBirth);
  if (aadhaarRaw && aadhaarRaw.length === 12 && aadhaarConsent) {
    data.aadhaarMasked = maskAadhaar(aadhaarRaw);
    data.aadhaarConsentAt = new Date();
  }

  try {
    const updated = await prisma.caseParty.update({ where: { id: pid }, data });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update party' });
  }
});

// DELETE /api/cases/:id/parties/:pid
router.delete('/parties/:pid', async (req: AuthRequest, res): Promise<void> => {
  const pid = String(req.params.pid);
  try {
    await prisma.caseParty.delete({ where: { id: pid } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove party' });
  }
});

// ─────────────────────────────────────────
// ADVOCATES
// ─────────────────────────────────────────

// POST /api/cases/:id/advocates
router.post('/advocates', async (req: AuthRequest, res): Promise<void> => {
  const caseId = String(req.params.id);
  const parsed = AdvocateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', issues: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const exists = await prisma.case.findUnique({ where: { id: caseId } });
    if (!exists) { res.status(404).json({ error: 'Case not found' }); return; }

    const advocate = await prisma.caseAdvocate.create({
      data: { caseId, ...parsed.data },
    });
    res.status(201).json(advocate);
  } catch (err) {
    console.error('[advocates/create]', err);
    res.status(500).json({ error: 'Failed to add advocate' });
  }
});

// GET /api/cases/:id/advocates
router.get('/advocates', async (req: AuthRequest, res): Promise<void> => {
  const caseId = String(req.params.id);
  try {
    const advocates = await prisma.caseAdvocate.findMany({
      where: { caseId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(advocates);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch advocates' });
  }
});

// PATCH /api/cases/:id/advocates/:aid
router.patch('/advocates/:aid', async (req: AuthRequest, res): Promise<void> => {
  const aid = String(req.params.aid);
  const parsed = AdvocateSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', issues: parsed.error.flatten().fieldErrors });
    return;
  }
  try {
    const updated = await prisma.caseAdvocate.update({ where: { id: aid }, data: parsed.data });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update advocate' });
  }
});

// DELETE /api/cases/:id/advocates/:aid
router.delete('/advocates/:aid', async (req: AuthRequest, res): Promise<void> => {
  const aid = String(req.params.aid);
  try {
    await prisma.caseAdvocate.delete({ where: { id: aid } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove advocate' });
  }
});

export default router;
