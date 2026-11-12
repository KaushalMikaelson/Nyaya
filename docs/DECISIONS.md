# Design Decisions — Nyaay

This document records non-obvious design choices and their rationale.
Update it whenever you make a tradeoff worth explaining in an interview.

---

## Phase 1: Evaluation Harness

### Why RRF constant k = 60?
The Reciprocal Rank Fusion score formula is `1 / (k + rank)`.
- `k = 60` is the value from the original Cormack et al. (2009) paper.
- Lower k (e.g., 30) amplifies differences between top ranks — good when one retrieval
  method is much better than the other.
- Higher k (e.g., 90) flattens rank differences — good when both methods contribute
  roughly equally.
- We sweep k ∈ {30, 60, 90} in `eval/sweep.py` and pick the best on the dev split.

### Why separate bm25_only and semantic_only baselines?
You cannot claim hybrid is better unless you measure each leg independently.
Without baselines, you're just reporting numbers in a vacuum. The eval harness
runs all four configs on the same query set so the comparison is apples-to-apples.

### Why hand-labeled queries instead of auto-generated?
If the AI labels its own test set, it's evaluating itself. The metrics become
circular and meaningless. You (Kaushal) label the correct documents. The agent
can draft candidate queries, but the gold labels must come from a human.

### Retrieval refactor: backward-compatible parameters
`hybrid_search()` got new parameters (`rrf_k`, `use_vector`, `use_fts`) but all
default to the original behavior. No existing caller is affected. This was
deliberately done as additive-only so we don't risk breaking the working pipeline.

---

## Phase 2: Observability & Caching

### Why deterministic SHA-256 cache keys?
Cache keys are formatted as `nyaay:search:{sha256(canonical_query_json)}`.
- Queries are normalized (`lower()` and `strip()`).
- Filters and configuration parameters are canonicalized into sorted JSON keys (`sort_keys=True`).
- This prevents subtle cache misses due to whitespace or JSON key ordering differences.
- Prefix `nyaay:search:` namespacing allows atomic pattern invalidation (`clear_cache()`) during document re-ingestion.

### Fail-open cache resilience
If Redis goes down or experiences socket timeouts (set to 1.0s max):
- Cache lookup returns `None` and search proceeds directly to PostgreSQL/pgvector.
- Cache save returns `False` and logs a warning without throwing an uncaught exception.
- Core search and RAG functionality must **never** crash due to a caching layer failure.

### Stage-by-stage tracing vs external tracing frameworks
Instead of heavy APM agents (e.g. OpenTelemetry / Datadog) that require complex collector infrastructure:
- We built a zero-dependency `RequestTracer` context manager.
- Captures granular latency (embed, hybrid_search, rerank, generate), token usage, and cache status per request.
- Exposes `X-Cache` and `X-Request-Id` HTTP response headers for instant verification during load testing and client debugging.

---

## Phase 3: Reliability & Graceful Degradation

### Dependency Fallback Hierarchy
In a production legal system, partial service is vastly superior to a 500 error:
1. **Cohere Rerank down**: Fall back to pure hybrid RRF candidates. Return results with `degraded: true`.
2. **Groq LLM rate-limited/down**: Return retrieved source passages directly without hallucinating.
3. **Redis down**: Fail open. Bypass cache, log warning, serve directly from DB.
4. **PostgreSQL connection hiccup**: Exponential retry with jitter (3 attempts, connect timeout = 5s).

### Idempotent Ingestion vs Destructive Reset
The original pipeline executed `DELETE FROM "LegalChunk";` unconditionally on every ingestion run.
- If ingestion interrupted halfway (e.g. at chunk 4,000 of 8,166), all progress was destroyed.
- We modified `ingest_legal_pdfs.py` and `generate_embeddings.py` to be idempotent by default:
  - Check existing sections using `NOT IN (SELECT DISTINCT "sectionId" FROM "LegalChunk")`.
  - Added explicit `--clean` flag for deliberate resets.
  - Wrap per-file PDF parsing in `try/except` with disk logging to `ingestion_failures.jsonl` so a single corrupted PDF cannot abort the entire batch.

---

## Phase 4: Autonomous Research Agent

### Direct Tool-Using Loop vs LangChain / CrewAI Frameworks
We opted for a direct tool calling loop directly over the Groq API instead of large agentic frameworks:
- Complete transparency: every prompt, token count, tool dispatch, and error is under direct inspection.
- Low latency & minimal overhead: avoids multi-layer framework abstractions.
- Hard safety boundaries: enforced maximum 8 steps and $0.10 cost cap per investigation.

### Claim & Quote Verification Pass
Hallucination in legal research carries severe risks.
- The agent emits structured claims with `source_doc_id` and verbatim `quote`.
- Before the final payload is returned to the user, an automated substring verification pass runs `verify_quote(doc_id, quote)`.
- If the quote does not exist verbatim in the statute, `verified` is set to `False`, alerting the user and scoring lower confidence.

---

## Phase 5: RBAC & Pre-filtering Tradeoffs

### Pre-filtering vs Post-filtering in Vector Search
When documents are partitioned across law firm teams:
- **Post-filtering** (retrieving top-K globally and then dropping unauthorized documents) leaks document existence and can result in 0 returned results if the top-K happen to belong to other teams.
- **Pre-filtering** (applying the `WHERE` clause containing `team_ids` before pgvector and BM25 ranking) guarantees security and ensures all returned slots belong to permitted documents.
- **ANN Recall Tradeoff**: Restrictive pre-filters on HNSW indexes can prune search graphs early. To preserve high recall, retrieval increases the candidate pool (`top_k * 2`) when restrictive filters are active.


