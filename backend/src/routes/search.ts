import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { VoyageAIClient } from 'voyageai';
import { CohereClient } from 'cohere-ai';

const router = Router();

const voyageKey = process.env.VOYAGE_API_KEY;
const voyageClient = voyageKey ? new VoyageAIClient({ apiKey: voyageKey }) : null;

const cohereKey = process.env.COHERE_API_KEY;
const cohereClient = cohereKey ? new CohereClient({ token: cohereKey }) : null;

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
  return mA && mB ? dotproduct / (Math.sqrt(mA) * Math.sqrt(mB)) : 0;
}

function calculateBM25Scores(query: string, chunks: any[]) {
  const N = chunks.length;
  if (N === 0) return chunks;

  const avgdl = chunks.reduce((acc, c) => acc + c.content.split(/\s+/).length, 0) / N;
  const terms = query.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  
  const df: Record<string, number> = {};
  terms.forEach(t => {
      df[t] = chunks.filter(c => c.content.toLowerCase().includes(t)).length;
  });
  
  const idf = (t: string) => Math.log((N - (df[t] || 0) + 0.5) / ((df[t] || 0) + 0.5) + 1);
  const k1 = 1.2;
  const b = 0.75;
  
  return chunks.map(chunk => {
      const words = chunk.content.toLowerCase().split(/\s+/);
      const L = words.length || 1;
      let score = 0;
      terms.forEach(t => {
          const tf = words.filter((w: string) => w === t).length;
          if (tf > 0) {
            score += idf(t) * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (L / avgdl))));
          }
      });
      return { ...chunk, bm25Score: score };
  });
}

router.use(authenticate);

router.post('/', async (req: AuthRequest, res): Promise<void> => {
  const { query, filters } = req.body;
  if (!query) {
    res.status(400).json({ error: 'Query is required for search' });
    return;
  }

  try {
    // 1. Generate query embedding for vector search
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

    // 2. Prepare database constraints
    const whereClause: any = {};
    
    // Act filter
    if (filters?.act && filters.act !== 'All Acts') {
      whereClause.act = { shortName: filters.act };
    }
    
    // Since Category and Court aren't direct relations on chunks, we apply simple text filtering if explicitly requested
    const contentFilters: string[] = [];
    if (filters?.category && filters.category !== 'All Categories') {
      contentFilters.push(filters.category.toLowerCase().split(' ')[0]); // "Criminal Law" -> "criminal"
    }
    if (filters?.court && filters.court !== 'All Courts') {
      contentFilters.push(filters.court.toLowerCase().split(' ')[0]); // "Supreme Court" -> "supreme"
    }

    // Fetch initial dataset (could be optimized with raw SQL and pgvector in production)
    const allChunks = await prisma.legalChunk.findMany({
      where: whereClause,
      include: {
        act: true,
        section: true,
        clause: true,
      }
    });
    
    // Apply optional unstructured category/court filters
    let filteredChunks = allChunks;
    if (contentFilters.length > 0) {
      filteredChunks = allChunks.filter(c => {
        const txt = c.content.toLowerCase();
        return contentFilters.every(f => txt.includes(f));
      });
    }

    if (filteredChunks.length === 0) {
      res.json({ results: [] });
      return;
    }

    // 3. Compute vector scores and BM25 scores
    const scoredChunks = calculateBM25Scores(query, filteredChunks).map((chunk: any) => {
      let vectorScore = 0;
      if (chunk.embedding && chunk.embedding.length > 0) {
        vectorScore = cosineSimilarity(queryEmbedding, chunk.embedding);
      }
      return { ...chunk, vectorScore };
    });

    // Normalize scores
    const maxVector = Math.max(...scoredChunks.map(c => c.vectorScore), 1);
    const maxBm25 = Math.max(...scoredChunks.map(c => c.bm25Score), 1);

    scoredChunks.forEach((c: any) => {
      c.normVectorScore = c.vectorScore / maxVector;
      c.normBm25Score = c.bm25Score / maxBm25;
      c.hybridScore = (c.normVectorScore * 0.6) + (c.normBm25Score * 0.4);
    });

    // Sort by hybrid score and take top 20
    const top20 = scoredChunks.sort((a: any, b: any) => b.hybridScore - a.hybridScore).slice(0, 20);

    // 4. Cohere Re-ranking
    let finalResults = top20;
    
    if (cohereClient && process.env.COHERE_API_KEY && top20.length > 0) {
      try {
        const rerankRes = await cohereClient.rerank({
          model: 'rerank-english-v3.0',
          query: query,
          documents: top20.map(c => c.content),
          topN: 10,
        });
        
        finalResults = rerankRes.results.map(r => ({
          ...top20[r.index],
          score: r.relevanceScore
        }));
      } catch (e) {
        console.warn("Cohere reranking failed, falling back to hybrid scores:", e);
        // Fallback
        finalResults = top20.slice(0, 10).map((c: any) => ({ ...c, score: c.hybridScore }));
      }
    } else {
      // Fallback
      finalResults = top20.slice(0, 10).map((c: any) => ({ ...c, score: c.hybridScore }));
    }

    // Prepare response payload (strip large unstructured data)
    const payload = finalResults.map((c: any) => {
      const { embedding, bm25Score, vectorScore, normVectorScore, normBm25Score, hybridScore, ...rest } = c;
      return rest;
    });

    res.json({ results: payload });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
