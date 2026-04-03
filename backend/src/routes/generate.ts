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

// Mock fallback
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
  const { prompt, docType, partyA, partyB, specifics } = req.body;
  if (!prompt) {
    res.status(400).json({ error: 'Prompt is required' });
    return;
  }

  try {
    // 1. Monetization check (treat as query or separate?) We'll treat as a doc generation.
    const dbUser = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!dbUser) return res.status(404).json({ error: 'User not found' });
    
    // We'll enforce a generous limit or use the query/docs limit. We'll use docsCount limit.
    if (!dbUser.isPro && dbUser.queriesCount >= 10) {
      res.status(403).json({ error: 'FREE_LIMIT_REACHED', message: 'You have exhausted your free usages.' });
      return;
    }

    // 2. Generate Embedding for precise RAG intent extraction
    const combinedIntent = `${docType} involving ${partyA} and ${partyB}. Concerns: ${specifics}. Goal: ${prompt}`;
    let queryEmbedding: number[] = [];
    
    if (voyageClient) {
      try {
        const response = await voyageClient.embed({ input: [combinedIntent], model: "voyage-law-2" });
        queryEmbedding = response.data?.[0]?.embedding || generateMockEmbedding(combinedIntent);
      } catch (err) {
        queryEmbedding = generateMockEmbedding(combinedIntent);
      }
    } else {
      queryEmbedding = generateMockEmbedding(combinedIntent);
    }

    // 3. Vector Database Retrieval for Accurate Legal Scaffolding
    const allChunks = await prisma.legalChunk.findMany({
      include: {
        act: true,
        section: true
      }
    });

    const scoredChunks = allChunks.map((chunk: any) => {
      let score = 0;
      if (chunk.embedding && chunk.embedding.length > 0) {
        score = cosineSimilarity(queryEmbedding, chunk.embedding);
      }
      return { ...chunk, score };
    });

    scoredChunks.sort((a: any, b: any) => b.score - a.score);
    const topLaws = scoredChunks.slice(0, 4);

    const relevantContext = topLaws.map((c: any) => 
      `[Framework: ${c.act?.shortName || ''} Sec ${c.section?.number || ''}] Provision Data: ${c.content}`
    ).join('\n\n');

    // 4. Structuring Template + Context injected to AI
    const systemPrompt = `You are a Senior Legal Draftsman in the Indian Legal System. 
Your objective is to generate a highly professional, rigorous, and legally binding document based on the user's constraints.

**HYBRID TEMPLATE ENGINE RULES:**
1. Structure: Start with formal header (By RPAD / Speed Post etc if it's a notice), Parties Details, Subject Line, Salutation.
2. Recitals/Facts: Summarize the facts formally using legally precise language.
3. Legal Scaffolding (Crucial): Integrate the specific provisions provided in the retrieved laws. Quote or cite them where relevant.
4. Demands/Conclusion: Clear concise demand or settlement terms.
5. Sign-off: Formal signature block.

**RETRIEVED INDIAN LAWS FOR INTEGRATION:**
${relevantContext}

Only output the raw text of the document in Markdown format (use bolding, lists where necessary), do not include conversation chatter. Ensure it looks like a printable legal document.`;

    const userPrompt = `Generate a ${docType || 'Legal Document'}
Sender/Party A: ${partyA || '[Sender]'}
Receiver/Party B: ${partyB || '[Receiver]'}
Core Issues/Specifics: ${specifics || 'Not provided'}
General Instructions: ${prompt}`;

    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 3000,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    const generatedDoc = completion.choices[0]?.message?.content || "Failed to generate document";

    // Update query usages since they generated
    if (dbUser && !dbUser.isPro) {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { queriesCount: { increment: 1 } }
      });
    }

    res.json({ document: generatedDoc, sources: topLaws });
  } catch (err) {
    console.error('Generation Error:', err);
    res.status(500).json({ error: 'Failed to generate document' });
  }
});

export default router;
