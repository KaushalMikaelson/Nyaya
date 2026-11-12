# Empirical Evaluation & Benchmark Results

**Date**: 2026-10-25  
**System**: Nyaay Legal RAG Platform (FastAPI + PostgreSQL pgvector 0.8.0 + FastEmbed ONNX all-MiniLM-L6-v2 + Cohere Rerank)  
**Corpus Size**: 8,166 LegalChunks across 17 Indian Central Acts  

---

## 1. Ground Truth Dataset & Labeling Methodology

- **Dataset File**: [`eval/data/queries.jsonl`](file:///e:/Projects/Nyaya/eval/data/queries.jsonl)
- **Total Queries**: 7 queries (5 in `dev` split, 2 in `test` split)
- **Labeling Methodology**:
  Ground truth relevance was labeled using statutory ground truth mapping via [`eval/bootstrap_labels.py`](file:///e:/Projects/Nyaya/eval/bootstrap_labels.py). Each legal inquiry is formulated around specific Indian statutory provisions (e.g., *Section 103 BNS* for murder penalty, *Article 21 Constitution* for life and liberty, *Section 318 BNS* for cheating). 
  Ground truth document IDs (`relevant_doc_ids`) were programmatically derived by joining `Act`, `Section`, and `LegalChunk` tables in PostgreSQL, selecting the active chunk IDs belonging to the statutory sections that directly answer the query.

---

## 2. Retrieval Pipeline Comparison (All 4 Configs)

**Command Run**:
```bash
python -X utf8 eval/runner.py --all --split dev
```
**Dataset Size**: 5 labeled queries (`dev` split)

| Configuration | Description | Recall@5 | Recall@10 | MRR | nDCG@10 | Latency p50 | Latency p95 | Queries |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `bm25_only` | Keyword search only (Postgres FTS / `websearch_to_tsquery`) | 0.1333 | 0.1333 | 0.1667 | 0.1061 | 3,407 ms | 3,856 ms | 5 |
| `semantic_only` | Vector search only (pgvector cosine distance) | 0.2000 | 0.2000 | 0.2667 | 0.1654 | 3,467 ms | 5,182 ms | 5 |
| `hybrid_rrf` | Hybrid BM25 + vector fused with Reciprocal Rank Fusion ($k=60$) | 0.2000 | 0.2000 | 0.2667 | 0.1654 | 4,468 ms | 5,004 ms | 5 |
| `hybrid_rrf_rerank` | Hybrid RRF + Cohere cross-encoder reranking | 0.1333 | 0.1333 | 0.2400 | 0.1302 | 5,186 ms | 5,804 ms | 5 |

*Artifact Output*: `eval/results/2026-10-25T13-33-46_04ed4e9_dev.json`

---

## 3. Parameter Sweep ($k \in \{30, 60, 90\}$)

**Command Run**:
```bash
python -X utf8 eval/sweep.py --split dev --rrf-k-values 30 60 90 --top-k-values 20 --rerank-top-n-values 8
```
**Dataset Size**: 5 labeled queries (`dev` split)  
**Base Pipeline**: `hybrid_rrf_rerank` (Candidate Pool = 20, Rerank Top-N = 8)

| RRF Constant ($k$) | Candidate Pool (`top_k`) | Rerank Top-N | Recall@10 | MRR | nDCG@10 | Latency p50 |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **30** | 20 | 8 | 0.1333 | 0.2400 | 0.1302 | 4,123 ms |
| **60** | 20 | 8 | 0.1333 | 0.2400 | 0.1302 | 4,055 ms |
| **90** | 20 | 8 | 0.1333 | 0.2400 | 0.1302 | 4,596 ms |

*Artifact Output*: `eval/results/sweep_2026-10-25T13-35-37_04ed4e9_dev.json`

---

## 4. Redis Cache Latency Benchmark

**Command Run**:
```bash
python -X utf8 eval/benchmark_cache.py --mode all --split dev
```
**Dataset Size**: 5 queries (`dev` split)

| Mode | Cache Hit Rate (%) | Latency p50 (ms) | Latency p95 (ms) | Mean Latency (ms) | Total Time (s) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `off` (Bypass `?no_cache=true`) | 0.0% | 6,998.01 ms | 9,961.20 ms | 7,496.14 ms | 37.49 s |
| `cold` (Cold Cache) | 0.0% | 7,677.23 ms | 8,713.29 ms | 7,540.43 ms | 37.71 s |
| `warm` (Pre-warmed Run) | 0.0% | 8,003.64 ms | 11,282.71 ms | 8,562.65 ms | 42.82 s |

*Note on Cache Environment*:  
During this benchmark, the local Redis server was offline (connection refused on `localhost:6379`). The circuit breaker tripped after 3 consecutive connection failures and gracefully failed open, routing all requests to live search without crash or unhandled error.

*Artifact Output*: `eval/results/cache_benchmark_20261025T190926.json`

---

## 5. Autonomous Legal Research Agent Evaluation

**Command Run**:
```bash
python -X utf8 eval/agent/runner.py --split dev --model openai/gpt-oss-120b
```
**Dataset**: [`eval/agent/tasks.jsonl`](file:///e:/Projects/Nyaya/eval/agent/tasks.jsonl)  
**Total Tasks**: 5 tasks (`dev` split)

| Metric | Result |
| :--- | :--- |
| **Number of Tasks** | 5 |
| **Task Success Rate** | 20.0% (1 / 5 completed successfully) |
| **Quote-Verified Rate** | 100.0% (all cited claims with verbatim quotes verified against statute) |
| **Average Steps Taken** | 7.0 steps |
| **Average Latency** | 175.89 s |
| **Average Cost per Task** | $0.0171 USD |
| **Mean Citation Accuracy** | 20.0% |

*Artifact Output*: `eval/agent/traces/agent_eval_20261025T192659.json`

---

## 6. Limitations

1. **Dataset Size**: The current evaluation suite uses a small evaluation dataset (5 development queries and 2 test queries in `queries.jsonl`, and 5 tasks in `tasks.jsonl`). Metrics should be interpreted as directional verification of pipeline correctness rather than statistical population estimates.
2. **Local Redis Offline**: The Redis cache benchmark was performed in an environment without an active local Redis daemon on port 6379. This successfully validated the circuit breaker's fail-open design, but real-world cache hit latency (typically <50ms) requires an active Redis instance.
3. **Groq Free-Tier Rate Limits**: During agent evaluation with large multi-step context on `openai/gpt-oss-120b`, tasks 001 and 005 encountered Groq TPM (tokens per minute) rate limits (8,000 TPM limit on free tier, where accumulated context exceeded 8,000 tokens at step 6). Upgrading to a paid or higher-tier Groq quota is required for zero-interruption multi-turn agent runs.
4. **Verification Scope**: As documented in the agent architecture, `verify_quote` verifies verbatim statutory presence of cited text in retrieved chunks, but does not substitute for substantive legal reasoning regarding whether the statute applies to the factual scenario.
