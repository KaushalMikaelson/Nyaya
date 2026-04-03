// @ts-nocheck
import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';
import Groq from 'groq-sdk';
import { VoyageAIClient } from 'voyageai';

const router = Router();
const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY });
const voyageKey = process.env.VOYAGE_API_KEY;
const voyageClient = voyageKey ? new VoyageAIClient({ apiKey: voyageKey }) : null;

// Mock Embedding fallback
function generateMockEmbedding(text: string) {
  const vec = new Array(1024).fill(0);
  const seed = Array.from(text.substring(0, 10)).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  for (let i = 0; i < 1024; i++) {
    vec[i] = (Math.sin(seed + i) + 1) / 2;
  }
  return vec;
}

function cosineSimilarity(A: number[], B: number[]) {
  let dotproduct = 0, mA = 0, mB = 0;
  for (let i = 0; i < A.length; i++) {
    dotproduct += (A[i] * B[i]);
    mA += (A[i] * A[i]);
    mB += (B[i] * B[i]);
  }
  if (mA === 0 || mB === 0) return 0;
  return dotproduct / (Math.sqrt(mA) * Math.sqrt(mB));
}

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

    // Embed case detail to map against the laws
    let queryEmbedding: number[] = [];
    if (voyageClient) {
      try {
        const response = await voyageClient.embed({ input: [caseDetails], model: "voyage-law-2" });
        queryEmbedding = response.data?.[0]?.embedding || generateMockEmbedding(caseDetails);
      } catch (err) {
        queryEmbedding = generateMockEmbedding(caseDetails);
      }
    } else {
      queryEmbedding = generateMockEmbedding(caseDetails);
    }

    // Law Retrieval
    const allChunks = await prisma.legalChunk.findMany({ include: { act: true, section: true } });
    const scoredChunks = allChunks.map((chunk: any) => {
      let score = 0;
      if (chunk.embedding && chunk.embedding.length > 0) {
        score = cosineSimilarity(queryEmbedding, chunk.embedding);
      }
      return { ...chunk, score };
    });

    scoredChunks.sort((a: any, b: any) => b.score - a.score);
    const topLaws = scoredChunks.slice(0, 5);

    const relevantContext = topLaws.map((c: any) => 
      `[Framework: ${c.act?.shortName || ''} Sec ${c.section?.number || ''}] ${c.content}`
    ).join('\n\n');

    // AI Generation mapped to structured JSON output
    const systemPrompt = `You are Nyaay's Core Case Intelligence Engine. 
The user is providing an informal situation or case conflict. 
Analyze the situation strictly based on the extracted Indian Laws provided.
You MUST output your response strictly as a valid JSON object without any markdown wrapping (no \`\`\`json) with exactly the following schema:
{
  "understanding": "A short 2-3 sentence logical summary of the legal issue at hand.",
  "violatedRights": ["List of laws broken or rights violated"],
  "legalPath": ["Step 1: issue notice...", "Step 2: wait 14 days...", "Step 3: file civil suit..."],
  "documents": ["List the exact legal documents needed, e.g. Legal Notice, Civil Suit for Injunction"],
  "courtInfo": "A brief string noting the relevant court jurisdiction or tribunal format to approach."
}

*** RELEVANT EXTRACTED INDIAN LAWS ***
${relevantContext}
`;

    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2000,
      temperature: 0.2, // Low temperature for high JSON structure determinism
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Case Details: ${caseDetails}` }
      ]
    });

    let roughOutput = completion.choices[0]?.message?.content || "{}";
    
    // Safety JSON stripping
    roughOutput = roughOutput.replace(/```json/g, '').replace(/```/g, '').trim();
    const struct = JSON.parse(roughOutput);

    // Update query logic
    if (dbUser && !dbUser.isPro) {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { queriesCount: { increment: 1 } }
      });
    }

    // Notifications integration
    try {
       const userEmail = req.user?.email || dbUser?.email || "mock@nyaay.in";
       // Dispatch a scheduled reminder 3 days from now (mocked to 5s in worker logic)
       import('../workers/notifications').then(({ scheduleFollowUp }) => {
         scheduleFollowUp(dbUser.id, userEmail, caseDetails);
       });
    } catch (e) {
       console.error("Queue Dispatch Error:", e);
    }

    res.json({
      intelligence: struct,
      mappedLaws: topLaws.map((l: any) => ({
        act: l.act?.shortName,
        section: l.section?.number,
        content: l.content
      }))
    });

  } catch (err) {
    console.error('Intelligence Error:', err);
    res.status(500).json({ error: 'Failed to process case intelligence' });
  }
});

export default router;
