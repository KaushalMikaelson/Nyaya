import { prisma } from '../prisma';

const PYTHON_RAG_URL = process.env.PYTHON_RAG_URL || 'http://127.0.0.1:8000';

export async function hybridSearch(query: string, queryEmbedding: number[], topK = 15) {
  const res = await fetch(`${PYTHON_RAG_URL}/hybrid-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, topK }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Python RAG /hybrid-search returned ${res.status}: ${errText}`);
  }

  const data: any = await res.json();
  if (!Array.isArray(data.results)) {
    throw new Error('Python RAG /hybrid-search: unexpected response shape');
  }

  return data.results.map((r: any) => ({
    chunk: {
      id: r.id,
      content: r.content,
      act: r.act,
      section: r.section,
      clause: r.clause,
    },
    score: r.rrf_score,
  }));
}

export async function rerankCandidates(query: string, candidates: any[], limit = 5) {
  const res = await fetch(`${PYTHON_RAG_URL}/rerank`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      candidates: candidates.map(c => ({
        id: c.chunk?.id || c.id,
        content: c.chunk?.content || c.content,
        act: c.chunk?.act || c.act,
        section: c.chunk?.section || c.section,
      })),
      topN: limit,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Python RAG /rerank returned ${res.status}: ${errText}`);
  }

  const data: any = await res.json();
  if (!Array.isArray(data.results)) {
    throw new Error('Python RAG /rerank: unexpected response shape');
  }

  return data.results.map((r: any) => ({
    chunk: {
      id: r.id,
      content: r.content,
      act: r.act,
      section: r.section,
    },
    score: r.score,
  }));
}
