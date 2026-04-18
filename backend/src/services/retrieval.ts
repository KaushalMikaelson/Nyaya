import { prisma } from '../prisma';
import { CohereClient } from 'cohere-ai';

const cohereKey = process.env.COHERE_API_KEY;
const cohereClient = cohereKey ? new CohereClient({ token: cohereKey }) : null;

export async function hybridSearch(query: string, queryEmbedding: number[], topK = 15) {
  // Sanitize query for websearch_to_tsquery
  const queryStr = query.replace(/[^a-zA-Z0-9 ]/g, '');

  const results: any[] = await prisma.$queryRaw`
    WITH vector_search AS (
      SELECT id, content, "actId", "sectionId", "clauseId",
             ROW_NUMBER() OVER(ORDER BY embedding <=> ${queryEmbedding}::vector) as rnk
      FROM "LegalChunk"
      ORDER BY embedding <=> ${queryEmbedding}::vector
      LIMIT 30
    ),
    keyword_search AS (
      SELECT id, content, "actId", "sectionId", "clauseId",
             ROW_NUMBER() OVER(ORDER BY ts_rank_cd(fts, websearch_to_tsquery('english', ${queryStr})) DESC) as rnk
      FROM "LegalChunk"
      WHERE fts @@ websearch_to_tsquery('english', ${queryStr})
      ORDER BY ts_rank_cd(fts, websearch_to_tsquery('english', ${queryStr})) DESC
      LIMIT 30
    )
    SELECT 
      COALESCE(v.id, k.id) as id,
      COALESCE(v.content, k.content) as content,
      COALESCE(v."actId", k."actId") as actId,
      COALESCE(v."sectionId", k."sectionId") as sectionId,
      COALESCE(v."clauseId", k."clauseId") as clauseId,
      (COALESCE(1.0 / (60 + v.rnk), 0.0) + COALESCE(1.0 / (60 + k.rnk), 0.0)) as rrf_score
    FROM vector_search v
    FULL OUTER JOIN keyword_search k ON v.id = k.id
    ORDER BY rrf_score DESC
    LIMIT ${topK};
  `;

  // Hydrate with Act / Section context
  const chunkIds = results.map(r => r.id);
  const hydratedChunks = await prisma.legalChunk.findMany({
    where: { id: { in: chunkIds } },
    include: { act: true, section: true }
  });

  // Map the results back to preserve the RRF score order
  return results.map(r => {
    const chunkData = hydratedChunks.find(c => c.id === r.id);
    return {
      chunk: chunkData || r,
      score: r.rrf_score
    };
  });
}

export async function rerankCandidates(query: string, candidates: any[], limit = 5) {
  if (!cohereClient || candidates.length === 0) {
    return candidates.slice(0, limit);
  }

  const documents = candidates.map(c => c.chunk.content);

  try {
    const reranked = await cohereClient.rerank({
      model: 'rerank-english-v3.0',
      query: query,
      documents: documents,
      topN: limit,
      returnDocuments: false
    });

    return reranked.results.map(res => candidates[res.index]);
  } catch (error) {
    console.error("Cohere rerank failed, falling back to basic hybrid top-K:", error);
    return candidates.slice(0, limit);
  }
}
