# Nyaay Retrieval Evaluation

This directory contains everything needed to evaluate and compare retrieval configurations.

## Directory Structure

```
eval/
├── config.py             # Central configuration (all experiment knobs)
├── metrics.py            # Retrieval metrics: recall@k, MRR, nDCG@k
├── test_metrics.py       # Unit tests for metrics (hand-computed examples)
├── runner.py             # CLI: evaluate retrieval configs on labeled queries
├── sweep.py              # CLI: parameter sweep over RRF k, top_k, rerank_n
├── validate_dataset.py   # Validates eval/data/queries.jsonl
├── data/
│   └── queries.jsonl     # Labeled queries (you write these!)
├── results/              # Auto-generated evaluation outputs
│   ├── *.json            # Full results with per-query metrics
│   └── *.md              # Summary tables
└── README.md             # This file
```

## Quick Start

### 1. Label your queries

Edit `eval/data/queries.jsonl`. Each line is a JSON object:
```json
{"id": "q001", "query": "What is the punishment for murder under BNS?", "relevant_doc_ids": ["chunk-id-1", "chunk-id-2"], "difficulty": "easy", "split": "dev"}
```

- Write at least 30 queries to start (target: 100)
- Split: 70 dev, 30 test. Tune only on dev.
- `relevant_doc_ids`: the LegalChunk UUIDs that correctly answer the query
- Find chunk IDs by running searches yourself and inspecting the results

### 2. Validate the dataset

```bash
python eval/validate_dataset.py            # With DB validation
python eval/validate_dataset.py --skip-db  # Without DB (structure only)
```

### 3. Run the evaluation

```bash
# Single config
python eval/runner.py --config bm25_only --split dev
python eval/runner.py --config semantic_only --split dev
python eval/runner.py --config hybrid_rrf --split dev
python eval/runner.py --config hybrid_rrf_rerank --split dev

# All configs at once
python eval/runner.py --all --split dev
```

### 4. Parameter sweep

```bash
# Sweep RRF k, top_k, rerank_n on hybrid_rrf_rerank
python eval/sweep.py --split dev

# Custom sweep ranges
python eval/sweep.py --split dev --rrf-k-values 20 40 60 80 --top-k-values 10 20 30 40
```

### 5. Run metric unit tests

```bash
python -m pytest eval/test_metrics.py -v
# Or without pytest:
python eval/test_metrics.py
```

## Metrics

| Metric | What it measures |
|--------|-----------------|
| **Recall@5** | Fraction of relevant docs in top-5 results |
| **Recall@10** | Fraction of relevant docs in top-10 results |
| **MRR** | 1/rank of the first relevant doc (higher = better) |
| **nDCG@10** | Normalized Discounted Cumulative Gain (rewards relevant docs at higher ranks) |
| **p50/p95 latency** | Median and 95th-percentile retrieval time in ms |

## Retrieval Configs

| Config | Vector | FTS | Rerank | Description |
|--------|--------|-----|--------|-------------|
| `bm25_only` | ✗ | ✓ | ✗ | Keyword search only |
| `semantic_only` | ✓ | ✗ | ✗ | Vector search only |
| `hybrid_rrf` | ✓ | ✓ | ✗ | BM25 + vector with RRF fusion |
| `hybrid_rrf_rerank` | ✓ | ✓ | ✓ | Hybrid RRF + Cohere reranking |

## Rules

1. **Never tune on the test split.** Use `--split dev` during development.
2. **Never auto-generate labels.** You label the correct documents yourself.
3. **Every number must be reproducible.** Results include git hash and timestamp.
4. **Config is centralized in `eval/config.py`.** No hard-coded values.
