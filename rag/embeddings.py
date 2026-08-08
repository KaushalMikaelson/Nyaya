"""
rag/embeddings.py
──────────────────────────────────────────────────────────────
Embedding engine using SentenceTransformers (all-MiniLM-L6-v2).
Outputs 384-dimensional normalized float vectors.
──────────────────────────────────────────────────────────────
"""

import math
from typing import List
from sentence_transformers import SentenceTransformer

_model: SentenceTransformer | None = None

def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        print("[MODEL] Loading Python SentenceTransformer model: sentence-transformers/all-MiniLM-L6-v2...")
        _model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        print("[OK] SentenceTransformer model loaded successfully.")
    return _model

def generate_mock_embedding(text: str, dim: int = 384) -> List[float]:
    """Fallback deterministic mock embedding if model fails to load."""
    seed = sum(ord(c) for c in text[:10])
    vec = [(math.sin(seed + i) + 1.0) / 2.0 for i in range(dim)]
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [round(x / norm, 6) for x in vec]

def embed_texts(texts: List[str], batch_size: int = 32) -> List[List[float]]:
    """Embed a list of texts into 384-dim normalized float vectors."""
    if not texts:
        return []
    try:
        model = get_model()
        embeddings = model.encode(texts, batch_size=batch_size, normalize_embeddings=True, show_progress_bar=False)
        return [e.tolist() for e in embeddings]
    except Exception as e:
        print(f"[WARN] SentenceTransformer embedding failed: {e}. Falling back to mock embeddings.")
        return [generate_mock_embedding(t) for t in texts]

def embed_query(query: str) -> List[float]:
    """Embed a single query string into a 384-dim normalized vector."""
    res = embed_texts([query])
    return res[0] if res else generate_mock_embedding(query)
