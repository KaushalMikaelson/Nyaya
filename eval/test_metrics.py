"""
eval/test_metrics.py
──────────────────────────────────────────────────────────────
Unit tests for retrieval metrics using hand-computed examples.
Run with: python -m pytest eval/test_metrics.py -v
──────────────────────────────────────────────────────────────
"""

import math
import sys
import os

# Ensure eval/ is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from metrics import recall_at_k, mrr, ndcg_at_k, dcg_at_k, compute_all_metrics, aggregate_metrics


# ─── recall_at_k ─────────────────────────────────────────────────────────────

def test_recall_at_k_perfect():
    """All relevant docs in top-k → recall = 1.0"""
    retrieved = ["d1", "d2", "d3", "d4", "d5"]
    relevant = ["d1", "d3"]
    assert recall_at_k(retrieved, relevant, 5) == 1.0


def test_recall_at_k_partial():
    """Only 1 of 2 relevant docs in top-3 → recall = 0.5"""
    retrieved = ["d1", "d4", "d5", "d2", "d3"]
    relevant = ["d1", "d3"]
    assert recall_at_k(retrieved, relevant, 3) == 0.5


def test_recall_at_k_none():
    """No relevant docs in top-k → recall = 0.0"""
    retrieved = ["d4", "d5", "d6"]
    relevant = ["d1", "d2"]
    assert recall_at_k(retrieved, relevant, 3) == 0.0


def test_recall_at_k_empty_relevant():
    """Empty relevant set → recall = 0.0 (avoid division by zero)"""
    retrieved = ["d1", "d2"]
    assert recall_at_k(retrieved, [], 5) == 0.0


def test_recall_at_k_k_larger_than_retrieved():
    """k > len(retrieved) — should still work correctly"""
    retrieved = ["d1", "d2"]
    relevant = ["d1", "d3"]
    # d1 is found, d3 is not → 1/2 = 0.5
    assert recall_at_k(retrieved, relevant, 10) == 0.5


# ─── mrr ─────────────────────────────────────────────────────────────────────

def test_mrr_first_position():
    """First relevant doc at rank 1 → MRR = 1.0"""
    retrieved = ["d1", "d2", "d3"]
    relevant = ["d1"]
    assert mrr(retrieved, relevant) == 1.0


def test_mrr_second_position():
    """First relevant doc at rank 2 → MRR = 0.5"""
    retrieved = ["d4", "d1", "d3"]
    relevant = ["d1", "d3"]
    assert mrr(retrieved, relevant) == 0.5


def test_mrr_third_position():
    """First relevant doc at rank 3 → MRR = 1/3"""
    retrieved = ["d4", "d5", "d1"]
    relevant = ["d1"]
    assert abs(mrr(retrieved, relevant) - 1.0 / 3.0) < 1e-9


def test_mrr_no_relevant():
    """No relevant doc found → MRR = 0.0"""
    retrieved = ["d4", "d5", "d6"]
    relevant = ["d1"]
    assert mrr(retrieved, relevant) == 0.0


def test_mrr_empty_relevant():
    """Empty relevant set → MRR = 0.0"""
    retrieved = ["d1", "d2"]
    assert mrr(retrieved, []) == 0.0


# ─── ndcg_at_k ───────────────────────────────────────────────────────────────

def test_ndcg_perfect_ranking():
    """All relevant docs at top → nDCG = 1.0"""
    retrieved = ["d1", "d2", "d3", "d4", "d5"]
    relevant = ["d1", "d2"]
    assert abs(ndcg_at_k(retrieved, relevant, 5) - 1.0) < 1e-9


def test_ndcg_hand_computed():
    """
    Hand-computed example:
    retrieved = [d3, d1, d4, d2]  (d1 and d2 are relevant)
    k = 4

    DCG@4:
      rank 1 (d3): not relevant → 0
      rank 2 (d1): relevant → 1/log2(3) ≈ 0.6309
      rank 3 (d4): not relevant → 0
      rank 4 (d2): relevant → 1/log2(5) ≈ 0.4307

    DCG = 0.6309 + 0.4307 = 1.0616

    IDCG@4 (both relevant at top):
      rank 1: 1/log2(2) = 1.0
      rank 2: 1/log2(3) ≈ 0.6309

    IDCG = 1.6309

    nDCG = 1.0616 / 1.6309 ≈ 0.6510
    """
    retrieved = ["d3", "d1", "d4", "d2"]
    relevant = ["d1", "d2"]

    expected_dcg = 1.0 / math.log2(3) + 1.0 / math.log2(5)
    expected_idcg = 1.0 / math.log2(2) + 1.0 / math.log2(3)
    expected_ndcg = expected_dcg / expected_idcg

    result = ndcg_at_k(retrieved, relevant, 4)
    assert abs(result - expected_ndcg) < 1e-6, f"Expected {expected_ndcg}, got {result}"


def test_ndcg_no_relevant_found():
    """No relevant docs in results → nDCG = 0.0"""
    retrieved = ["d3", "d4", "d5"]
    relevant = ["d1", "d2"]
    assert ndcg_at_k(retrieved, relevant, 3) == 0.0


def test_ndcg_empty_relevant():
    """Empty relevant set → nDCG = 0.0"""
    retrieved = ["d1", "d2"]
    assert ndcg_at_k(retrieved, [], 5) == 0.0


def test_ndcg_single_relevant_at_rank1():
    """
    Single relevant doc at rank 1:
    DCG = 1/log2(2) = 1.0
    IDCG = 1/log2(2) = 1.0
    nDCG = 1.0
    """
    retrieved = ["d1", "d2", "d3"]
    relevant = ["d1"]
    assert abs(ndcg_at_k(retrieved, relevant, 3) - 1.0) < 1e-9


# ─── compute_all_metrics ────────────────────────────────────────────────────

def test_compute_all_metrics():
    """Smoke test: returns all expected keys"""
    retrieved = ["d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9", "d10"]
    relevant = ["d1", "d5"]
    result = compute_all_metrics(retrieved, relevant)
    assert set(result.keys()) == {"recall_at_5", "recall_at_10", "mrr", "ndcg_at_10"}
    assert result["recall_at_5"] == 1.0  # both d1 and d5 in top-5
    assert result["recall_at_10"] == 1.0
    assert result["mrr"] == 1.0  # d1 at rank 1


# ─── aggregate_metrics ──────────────────────────────────────────────────────

def test_aggregate_metrics():
    """Average of two query results"""
    m1 = {"recall_at_5": 1.0, "recall_at_10": 1.0, "mrr": 1.0, "ndcg_at_10": 1.0}
    m2 = {"recall_at_5": 0.0, "recall_at_10": 0.5, "mrr": 0.5, "ndcg_at_10": 0.5}
    result = aggregate_metrics([m1, m2])
    assert result["recall_at_5"] == 0.5
    assert result["recall_at_10"] == 0.75
    assert result["mrr"] == 0.75
    assert result["ndcg_at_10"] == 0.75


def test_aggregate_metrics_empty():
    """Empty list → all zeros"""
    result = aggregate_metrics([])
    assert all(v == 0.0 for v in result.values())


def test_bootstrap_confidence_interval():
    """Verify bootstrap confidence interval calculation with 1000 resamples."""
    from metrics import bootstrap_confidence_interval
    values = [0.8, 0.9, 0.85, 0.95, 0.75, 0.88, 0.92, 0.84]
    mean, lower, upper = bootstrap_confidence_interval(values, n_resamples=1000, seed=42)
    assert round(mean, 2) == 0.86
    assert lower <= mean <= upper
    assert 0.78 <= lower <= 0.85
    assert 0.87 <= upper <= 0.95


if __name__ == "__main__":
    # Simple test runner if pytest is not installed
    import traceback
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    passed = 0
    failed = 0
    for t in tests:
        try:
            t()
            print(f"  ✓ {t.__name__}")
            passed += 1
        except Exception as e:
            print(f"  ✗ {t.__name__}: {e}")
            traceback.print_exc()
            failed += 1
    print(f"\n{passed} passed, {failed} failed out of {passed + failed} tests")
    if failed > 0:
        sys.exit(1)
