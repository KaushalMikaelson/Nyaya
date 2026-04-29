import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import Groq from 'groq-sdk';

const router = Router();
const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

router.use(authenticate);

// Mock eCourts tracking endpoint (returns simulated data formatted by AI for UX)
router.post('/track', async (req: AuthRequest, res): Promise<void> => {
  const { caseNumber, court, year } = req.body;

  if (!caseNumber || !court || !year) {
    res.status(400).json({ error: 'caseNumber, court, and year are required' });
    return;
  }

  try {
    const groq = getGroq();
    
    const systemPrompt = `You are a legal data parser simulating the Indian eCourts API.
Generate a realistic JSON payload for a case being tracked.
DO NOT use markdown formatting (\`\`\`json). Output pure JSON only.

Schema:
{
  "cino": "string (unique 16-digit alphanumeric)",
  "filingNumber": "string",
  "registrationNumber": "string",
  "filingDate": "YYYY-MM-DD",
  "status": "string (e.g. Pending, Disposed)",
  "firstHearingDate": "YYYY-MM-DD",
  "nextHearingDate": "YYYY-MM-DD",
  "judge": "string (Indian judge name)",
  "petitioner": "string (Indian name)",
  "respondent": "string (Indian name)",
  "petitionerAdvocate": "string",
  "respondentAdvocate": "string",
  "act": "string (e.g. IPC, CrPC, NI Act)",
  "section": "string",
  "history": [
    { "date": "YYYY-MM-DD", "businessOnDate": "string", "hearingPurpose": "string", "nextDate": "YYYY-MM-DD", "presidingJudge": "string" }
  ]
}

Ensure the history has 2-4 entries leading up to the nextHearingDate.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 800,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate realistic mock eCourts data for Case No: ${caseNumber}, Court: ${court}, Year: ${year}` }
      ]
    });

    let raw = completion.choices[0]?.message?.content || '{}';
    raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    res.json(JSON.parse(raw));
  } catch (err: any) {
    console.error('[eCourts] Error:', err?.message || err);
    res.status(500).json({ error: 'Failed to fetch eCourts data' });
  }
});

export default router;
