import {
  getConfiguredPythonRagUrl,
  isLocalRagUrl,
  ensureLocalRagRunning,
} from './localRagSupervisor';

export function cleanErrorText(rawText: string, status?: number): string {
  if (!rawText) return status ? `HTTP ${status}` : 'Unknown error';
  const trimmed = rawText.trim();
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<head') || trimmed.includes('<body')) {
    return status
      ? `HTTP ${status}: Microservice returned an HTML error page (service may be waking up or temporarily unavailable).`
      : 'Microservice returned an HTML error page (service may be waking up or temporarily unavailable).';
  }
  return trimmed.length > 300 ? `${trimmed.substring(0, 300)}...` : trimmed;
}

export function getPythonRagUrl(): string {
  return getConfiguredPythonRagUrl();
}

export function getInternalRagHeaders(): Record<string, string> {
  const token = (process.env.RAG_INTERNAL_TOKEN || 'nyaay_internal_rag_secret').trim();
  return {
    'Content-Type': 'application/json',
    'X-Internal-Token': token,
  };
}

/**
 * Calls the Python RAG microservice with internal auth headers.
 * If targeting a local instance (127.0.0.1/localhost) that is not yet reachable,
 * automatically starts or waits for the local Python RAG process and retries once.
 */
export async function fetchPythonRag(endpointPath: string, init: RequestInit = {}): Promise<Response> {
  const pyUrl = getPythonRagUrl();
  const normalizedPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  const targetUrl = `${pyUrl}${normalizedPath}`;
  const headers = {
    ...getInternalRagHeaders(),
    ...(init.headers as Record<string, string> | undefined),
  };

  try {
    return await fetch(targetUrl, { ...init, headers });
  } catch (err) {
    if (isLocalRagUrl(pyUrl)) {
      const started = await ensureLocalRagRunning();
      if (started) {
        return await fetch(targetUrl, { ...init, headers });
      }
    }
    throw err;
  }
}

export async function hybridSearch(query: string, queryEmbedding: number[], topK = 15) {
  const res = await fetchPythonRag('/hybrid-search', {
    method: 'POST',
    body: JSON.stringify({ query, topK }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Python RAG /hybrid-search returned ${res.status}: ${cleanErrorText(errText, res.status)}`);
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
  const res = await fetchPythonRag('/rerank', {
    method: 'POST',
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
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Python RAG /rerank returned ${res.status}: ${cleanErrorText(errText, res.status)}`);
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
