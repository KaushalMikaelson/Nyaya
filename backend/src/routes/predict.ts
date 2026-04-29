import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';
import Groq from 'groq-sdk';

const router = Router();
const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

router.use(authenticate);

// POST /api/predict — AI Case Duration Prediction
router.post('/', async (req: AuthRequest, res): Promise<void> => {
  const { caseType, court, jurisdiction, complexity, facts } = req.body;

  if (!caseType || !court) {
    res.status(400).json({ error: 'Case type and court are required' });
    return;
  }

  try {
    // Pull anonymised historical data from our own case table for context
    const historicalCases = await prisma.case.findMany({
      take: 30,
      select: {
        status: true,
        court: true,
        filedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { hearings: true, timeline: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const closedCases = historicalCases.filter(c => c.status === 'CLOSED');
    const avgHearings =
      historicalCases.reduce((s, c) => s + c._count.hearings, 0) /
      Math.max(historicalCases.length, 1);
    const avgDaysOpen =
      historicalCases.reduce((s, c) => {
        const from = c.filedAt ? new Date(c.filedAt) : new Date(c.createdAt);
        const to = c.status === 'CLOSED' ? new Date(c.updatedAt) : new Date();
        return s + Math.max(0, (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      }, 0) / Math.max(historicalCases.length, 1);

    const systemPrompt = `You are an expert Indian judicial analytics system specialising in case outcome prediction.
Analyse the provided case parameters and output a duration forecast grounded in real Indian court statistics.

OUTPUT: Only a valid JSON object — no markdown, no prose — matching this schema exactly:
{
  "estimatedDurationMonths": <integer>,
  "estimatedDurationRange": "<e.g. '18–36 months'>",
  "confidence": <integer 1-100>,
  "verdict": "<one-sentence plain-English summary of the prediction>",
  "factors": [
    { "factor": "<name>", "impact": "<positive|negative|neutral>", "description": "<≤20 words>" }
  ],
  "courtBacklogRisk": "<low|medium|high>",
  "fastTrackEligible": <boolean>,
  "fastTrackReason": "<one sentence if eligible, else null>",
  "keyMilestones": [
    { "milestone": "<name>", "estimatedMonthsFromFiling": <integer> }
  ],
  "recommendation": "<one actionable strategic tip for the litigant>"
}

Indian court benchmarks (use as primary source):
• District Court — Civil: 3–7 yrs  |  Criminal: 2–5 yrs
• High Court: 4–9 yrs
• Supreme Court: 5–12 yrs
• Fast-Track Court: 6–18 months
• Consumer Forum (DCDRC): 6–18 months
• NCDRC: 1–3 yrs
• Labour / Industrial Tribunal: 1–4 yrs
• Family Court: 1–3 yrs
• Motor Accident Claims Tribunal: 2–5 yrs
• Debt Recovery Tribunal: 2–4 yrs`;

    const userPrompt = `Predict duration for:
Case Type: ${caseType}
Court: ${court}
Jurisdiction / State: ${jurisdiction || 'Not specified'}
Complexity: ${complexity || 'Medium'}
Key Facts: ${facts || 'Standard matter'}

Platform historical context:
• ${historicalCases.length} cases tracked on Nyaya
• Average hearings per case: ${avgHearings.toFixed(1)}
• Average days a case stays open: ${avgDaysOpen.toFixed(0)}
• Closed cases ratio: ${historicalCases.length > 0 ? ((closedCases.length / historicalCases.length) * 100).toFixed(0) : 0}%`;

    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1200,
      temperature: 0.15,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    let raw = completion.choices[0]?.message?.content || '{}';
    raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const prediction = JSON.parse(raw);

    res.json({
      prediction,
      meta: {
        historicalCasesAnalysed: historicalCases.length,
        avgHearings: parseFloat(avgHearings.toFixed(1)),
        avgDaysOpen: parseFloat(avgDaysOpen.toFixed(0)),
      },
    });
  } catch (err: any) {
    console.error('[Predict] Error:', err?.message || err);
    res.status(500).json({ error: 'Failed to generate case duration prediction' });
  }
});

export default router;
