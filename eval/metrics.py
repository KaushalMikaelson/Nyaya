"""
eval/metrics.py
──────────────────────────────────────────────────────────────
Retrieval evaluation metrics implemented from scratch.
No sklearn or third-party ML libraries.

Metrics:
  - recall_at_k:  fraction of relevant documents found in top-k results
  - mrr:          Mean Reciprocal Rank of the first relevant document
  - ndcg_at_k:    Normalized Discounted Cumulative Gain at k
──────────────────────────────────────────────────────────────
"""

import math
from typing import List


def recall_at_k(retrieved_ids: List[str], relevant_ids: List[str], k: int) -> float:
    """
    Recall@k: fraction of relevant documents that appear in the top-k retrieved results.

    Args:
        retrieved_ids: Ordered list of document IDs returned by the retrieval system.
        relevant_ids:  List of ground-truth relevant document IDs.
        k:             Cutoff rank.

    Returns:
        Float in [0.0, 1.0]. Returns 0.0 if relevant_ids is empty.
    """
    if not relevant_ids:
        return 0.0
    top_k = set(retrieved_ids[:k])
    relevant_set = set(relevant_ids)
    hits = top_k & relevant_set
    return len(hits) / len(relevant_set)


def mrr(retrieved_ids: List[str], relevant_ids: List[str]) -> float:
    """
    Mean Reciprocal Rank: 1 / rank of the first relevant document.

    Args:
        retrieved_ids: Ordered list of retrieved document IDs.
        relevant_ids:  List of ground-truth relevant document IDs.

    Returns:
        Float in [0.0, 1.0]. Returns 0.0 if no relevant document is found.
    """
    if not relevant_ids:
        return 0.0
    relevant_set = set(relevant_ids)
    for rank, doc_id in enumerate(retrieved_ids, start=1):
        if doc_id in relevant_set:
            return 1.0 / rank
    return 0.0


def dcg_at_k(retrieved_ids: List[str], relevant_ids: List[str], k: int) -> float:
    """
    Discounted Cumulative Gain at k.
    Uses binary relevance: 1 if document is relevant, 0 otherwise.

    DCG@k = sum_{i=1}^{k} rel_i / log2(i + 1)
    """
    relevant_set = set(relevant_ids)
    score = 0.0
    for i, doc_id in enumerate(retrieved_ids[:k]):
        if doc_id in relevant_set:
            # Binary relevance: rel_i = 1
            score += 1.0 / math.log2(i + 2)  # i+2 because i is 0-indexed, log2(1+1)=1 for rank 1
    return score


def ideal_dcg_at_k(relevant_ids: List[str], k: int) -> float:
    """
    Ideal DCG at k: assumes all relevant documents appear at the top ranks.
    """
    n_relevant = min(len(relevant_ids), k)
    score = 0.0
    for i in range(n_relevant):
        score += 1.0 / math.log2(i + 2)
    return score


def ndcg_at_k(retrieved_ids: List[str], relevant_ids: List[str], k: int) -> float:
    """
    Normalized Discounted Cumulative Gain at k.

    nDCG@k = DCG@k / IDCG@k

    Args:
        retrieved_ids: Ordered list of retrieved document IDs.
        relevant_ids:  List of ground-truth relevant document IDs.
        k:             Cutoff rank.

    Returns:
        Float in [0.0, 1.0]. Returns 0.0 if relevant_ids is empty or IDCG is 0.
    """
    if not relevant_ids:
        return 0.0
    idcg = ideal_dcg_at_k(relevant_ids, k)
    if idcg == 0.0:
        return 0.0
    dcg = dcg_at_k(retrieved_ids, relevant_ids, k)
    return dcg / idcg


def compute_all_metrics(retrieved_ids: List[str], relevant_ids: List[str]) -> dict:
    """
    Compute all standard retrieval metrics for a single query.

    Returns:
        Dict with keys: recall_at_5, recall_at_10, mrr, ndcg_at_10
    """
    return {
        "recall_at_5": recall_at_k(retrieved_ids, relevant_ids, 5),
        "recall_at_10": recall_at_k(retrieved_ids, relevant_ids, 10),
        "mrr": mrr(retrieved_ids, relevant_ids),
        "ndcg_at_10": ndcg_at_k(retrieved_ids, relevant_ids, 10),
    }


def aggregate_metrics(per_query_metrics: List[dict]) -> dict:
    """
    Average metrics across all queries.

    Args:
        per_query_metrics: List of dicts from compute_all_metrics().

    Returns:
        Dict with mean values for each metric.
    """
    if not per_query_metrics:
        return {"recall_at_5": 0.0, "recall_at_10": 0.0, "mrr": 0.0, "ndcg_at_10": 0.0}

    keys = ["recall_at_5", "recall_at_10", "mrr", "ndcg_at_10"]
    n = len(per_query_metrics)
    return {k: sum(m[k] for m in per_query_metrics) / n for k in keys}


def bootstrap_confidence_interval(
    values: List[float],
    n_resamples: int = 1000,
    confidence_level: float = 0.95,
    seed: int = 42
) -> tuple[float, float, float]:
    """
    Computes an empirical bootstrap confidence interval using percentiles.

    Args:
        values: List of per-query metric values (e.g. recall_at_10 for each query).
        n_resamples: Number of bootstrap resamples (default: 1000).
        confidence_level: Confidence level (default: 0.95 for 95% CI).
        seed: Random seed for deterministic reproducibility.

    Returns:
        (sample_mean, ci_lower, ci_upper)
    """
    if not values:
        return 0.0, 0.0, 0.0

    import random
    n = len(values)
    rng = random.Random(seed)
    bootstrap_means = []

    for _ in range(n_resamples):
        sample = [values[rng.randrange(n)] for _ in range(n)]
        bootstrap_means.append(sum(sample) / n)

    bootstrap_means.sort()
    alpha = 1.0 - confidence_level
    lower_idx = int(math.floor(alpha / 2.0 * n_resamples))
    upper_idx = int(math.ceil((1.0 - alpha / 2.0) * n_resamples)) - 1
    lower_idx = max(0, min(lower_idx, n_resamples - 1))
    upper_idx = max(0, min(upper_idx, n_resamples - 1))

    mean = sum(values) / n
    return round(mean, 4), round(bootstrap_means[lower_idx], 4), round(bootstrap_means[upper_idx], 4)
