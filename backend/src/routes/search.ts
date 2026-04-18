import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { VoyageAIClient } from 'voyageai';
import { CohereClient } from 'cohere-ai';

import { Prisma } from '@prisma/client';

const router = Router();

const voyageKey = process.env.VOYAGE_API_KEY;
const voyageClient = voyageKey ? new VoyageAIClient({ apiKey: voyageKey }) : null;

const cohereKey = process.env.COHERE_API_KEY;
const cohereClient = cohereKey ? new CohereClient({ token: cohereKey }) : null;

function generateMockEmbedding(text: string) {
  const vec = new Array(1024).fill(0);
  const seed = Array.from(text.substring(0, 10)).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  for (let i = 0; i < 1024; i++) {
    vec[i] = ((Math.sin(seed + i) + 1) / 2).toFixed(6) as any;
  }
  return vec;
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

    let actFilter = Prisma.empty;
    if (filters?.act && filters.act !== 'All Acts') {
      const mappedAct = await prisma.act.findUnique({ where: { shortName: filters.act } });
      if (mappedAct) {
        actFilter = Prisma.sql`AND "actId" = ${mappedAct.id}`;
      }
    }

    const queryStr = query.replace(/[^a-zA-Z0-9 ]/g, ''); 

    // RRF Hybrid pgvector Search Query
    const results: any[] = await prisma.$queryRaw`
      WITH vector_search AS (
        SELECT id, content, "actId", "sectionId", "clauseId",
               ROW_NUMBER() OVER(ORDER BY embedding <=> ${queryEmbedding}::vector) as rnk
        FROM "LegalChunk"
        WHERE 1=1 ${actFilter}
        ORDER BY embedding <=> ${queryEmbedding}::vector
        LIMIT 30
      ),
      keyword_search AS (
        SELECT id, content, "actId", "sectionId", "clauseId",
               ROW_NUMBER() OVER(ORDER BY ts_rank_cd(fts, websearch_to_tsquery('english', ${queryStr})) DESC) as rnk
        FROM "LegalChunk"
        WHERE fts @@ websearch_to_tsquery('english', ${queryStr}) ${actFilter}
        ORDER BY ts_rank_cd(fts, websearch_to_tsquery('english', ${queryStr})) DESC
        LIMIT 30
      )
      SELECT 
        COALESCE(v.id, k.id) as id,
        COALESCE(v.content, k.content) as content,
        (COALESCE(1.0 / (60 + v.rnk), 0.0) + COALESCE(1.0 / (60 + k.rnk), 0.0)) as rrf_score
      FROM vector_search v
      FULL OUTER JOIN keyword_search k ON v.id = k.id
      ORDER BY rrf_score DESC
      LIMIT 20;
    `;

    if (results.length === 0) {
      res.json({ results: [] });
      return;
    }

    // Hydrate
    const chunkIds = results.map(r => r.id);
    const hydratedChunks = await prisma.legalChunk.findMany({
      where: { id: { in: chunkIds } },
      include: {
        act: true,
        section: true,
        clause: true,
      }
    });

    let scoredChunks = results.map(r => {
      const chunkData = hydratedChunks.find(c => c.id === r.id);
      return { ...chunkData, hybridScore: r.rrf_score };
    });

    // Sub-filtering (category / court basic matching since schema isn't fully categorized)
    const contentFilters: string[] = [];
    if (filters?.category && filters.category !== 'All Categories') contentFilters.push(filters.category.toLowerCase().split(' ')[0]); 
    if (filters?.court && filters.court !== 'All Courts') contentFilters.push(filters.court.toLowerCase().split(' ')[0]);

    if (contentFilters.length > 0) {
      scoredChunks = scoredChunks.filter(c => {
        const txt = c.content.toLowerCase();
        return contentFilters.every(f => txt.includes(f));
      });
    }

    let top20 = scoredChunks.slice(0, 15);

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
        finalResults = top20.slice(0, 10).map((c: any) => ({ ...c, score: c.hybridScore }));
      }
    } else {
      finalResults = top20.slice(0, 10).map((c: any) => ({ ...c, score: c.hybridScore }));
    }

    // Prepare response payload (strip large unstructured data)
    const payload = finalResults.map((c: any) => {
      const { embedding, fts, score, hybridScore, ...rest } = c;
      return { ...rest, score: score || hybridScore };
    });

    res.json({ results: payload });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
