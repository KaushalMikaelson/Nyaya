"""
eval/config.py
──────────────────────────────────────────────────────────────
Central configuration for all retrieval experiments.
Every tunable parameter lives here so experiments are reproducible.
──────────────────────────────────────────────────────────────
"""

import os

# ─── Retrieval configurations to compare ─────────────────────────────────────

RETRIEVAL_CONFIGS = {
    "bm25_only": {
        "use_vector": False,
        "use_fts": True,
        "rerank": False,
        "description": "Keyword search only (Postgres FTS / BM25-style)",
    },
    "semantic_only": {
        "use_vector": True,
        "use_fts": False,
        "rerank": False,
        "description": "Vector search only (pgvector cosine distance)",
    },
    "hybrid_rrf": {
        "use_vector": True,
        "use_fts": True,
        "rerank": False,
        "description": "Hybrid BM25 + vector fused with Reciprocal Rank Fusion",
    },
    "hybrid_rrf_rerank": {
        "use_vector": True,
        "use_fts": True,
        "rerank": True,
        "description": "Hybrid RRF + Cohere cross-encoder reranking",
    },
}

# ─── Default retrieval parameters ────────────────────────────────────────────

RRF_K = 60              # RRF constant: score = 1 / (k + rank)
TOP_K = 20              # Number of candidates from each retrieval leg
RERANK_TOP_N = 8        # Number of results after Cohere reranking
RERANK_CANDIDATES = 15  # Number of candidates fed to the reranker

# ─── Chunking parameters ─────────────────────────────────────────────────────

CHUNK_SIZE = 600         # Characters per chunk
CHUNK_OVERLAP = 100      # Overlap between chunks

# ─── Model names ─────────────────────────────────────────────────────────────

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIM = 384
RERANK_MODEL = "rerank-english-v3.0"

# ─── Sweep ranges (for eval/sweep.py) ────────────────────────────────────────

SWEEP_RRF_K = [30, 60, 90]
SWEEP_TOP_K = [10, 20, 30]
SWEEP_RERANK_TOP_N = [5, 8, 10]

# ─── Paths ────────────────────────────────────────────────────────────────────

EVAL_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(EVAL_DIR, "data")
RESULTS_DIR = os.path.join(EVAL_DIR, "results")
QUERIES_FILE = os.path.join(DATA_DIR, "queries.jsonl")
