// @ts-nocheck
import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { VoyageAIClient } from 'voyageai';

const router = Router();
const voyageKey = process.env.VOYAGE_API_KEY;
const voyageClient = voyageKey ? new VoyageAIClient({ apiKey: voyageKey }) : null;

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
  return dotproduct / (Math.sqrt(mA) * Math.sqrt(mB));
}

router.use(authenticate);

router.post('/', async (req: AuthRequest, res): Promise<void> => {
  const { query, filters } = req.body;
  if (!query) {
    res.status(400).json({ error: 'Query is required for search' });
    return;
  }

  try {
    let queryEmbedding: number[] = [];
    if (voyageClient) {
      try {
        const response = await voyageClient.embed({ input: [query], model: "voyage-law-2" });
        queryEmbedding = response.data?.[0]?.embedding || generateMockEmbedding(query);
      } catch (err) {
        queryEmbedding = generateMockEmbedding(query);
      }
    } else {
      queryEmbedding = generateMockEmbedding(query);
    }

    // Prepare constraints
    const whereClause: any = {};
    if (filters?.act && filters.act !== 'All Acts') {
      whereClause.act = { shortName: filters.act };
    }

    // Fetch chunks with relations
    const allChunks = await prisma.legalChunk.findMany({
      where: whereClause,
      include: {
        act: true,
        section: true,
        clause: true,
      }
    });

    const queryWords = query.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);

    const scoredChunks = allChunks.map((chunk: any) => {
      // Vector Score
      let vectorScore = 0;
      if (chunk.embedding && chunk.embedding.length > 0) {
        vectorScore = cosineSimilarity(queryEmbedding, chunk.embedding);
      }

      // Keyword match
      let keywordScore = 0;
      const lowerContent = chunk.content.toLowerCase();
      queryWords.forEach((w: string) => {
        if (lowerContent.includes(w)) keywordScore += 0.2;
      });

      // Simple Hybrid Score
      const hybridScore = (vectorScore * 0.7) + (keywordScore * 0.3);
      return { ...chunk, score: hybridScore };
    });

    scoredChunks.sort((a: any, b: any) => b.score - a.score);
    const topResults = scoredChunks.slice(0, 10).map((c: any) => {
      const { embedding, score, ...rest } = c;
      return rest;
    });

    res.json({ results: topResults });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
