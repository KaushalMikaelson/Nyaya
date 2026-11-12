"""
eval/regression_gate.py
──────────────────────────────────────────────────────────────
CI Retrieval Regression Gate with Bootstrap Confidence Intervals.

Requirements:
  1. Reports query count evaluated.
  2. Uses empirical bootstrap confidence interval (1,000 resamples)
     on Recall@10 and MRR.
  3. Fails only if the upper bound of the bootstrap CI drops significantly
     below the committed baseline target from eval/baseline_metrics.json
     (i.e., statistically significant degradation beyond allowed tolerance).
  4. Fully independent of paid APIs: skips or fixtures Cohere rerank
     during CI (--ci / --skip-rerank flag).
──────────────────────────────────────────────────────────────
"""

import os
import sys
import json
import argparse
from typing import Dict, Any, List

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "rag"))

from config import RETRIEVAL_CONFIGS, QUERIES_FILE
from metrics import compute_all_metrics, bootstrap_confidence_interval
from runner import load_queries, run_retrieval

BASELINE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "baseline_metrics.json")


def load_baselines() -> Dict[str, Any]:
    if not os.path.exists(BASELINE_FILE):
        raise FileNotFoundError(f"Baseline file missing: {BASELINE_FILE}")
    with open(BASELINE_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def run_regression_gate(
    split: str = "dev",
    ci_mode: bool = False,
    skip_rerank: bool = True,
    n_resamples: int = 1000,
) -> bool:
    print("\n" + "=" * 70)
    print("      NYAAY CI RETRIEVAL REGRESSION GATE (BOOTSTRAP CI)")
    print("=" * 70)

    # 1. Load queries and report count
    queries = load_queries(QUERIES_FILE, split=split)
    query_count = len(queries)
    print(f"📊 Evaluated Queries Count: {query_count} (Split: {split})")
    if query_count == 0:
        print("[ERROR] No queries found to evaluate!")
        return False

    # 2. Load committed baselines
    baseline_data = load_baselines()
    baselines = baseline_data.get("configs", {})
    allowed_tolerance_pct = float(baseline_data.get("allowed_regression_tolerance_pct", 5.0))
    tolerance_factor = 1.0 - (allowed_tolerance_pct / 100.0)

    print(f"🎯 Baseline Source: {BASELINE_FILE}")
    print(f"⚖️ Allowed Tolerance: {allowed_tolerance_pct}% degradation (factor: {tolerance_factor:.2f})")
    print(f"🔄 Bootstrap Resamples: {n_resamples} (95% empirical percentile CI)")
    if ci_mode or skip_rerank:
        print("🛡️ CI Mode Active: Skipping paid Cohere rerank API (0 external paid API calls)")

    # 3. Determine configs to evaluate
    configs_to_test = ["bm25_only", "semantic_only", "hybrid_rrf"]
    if not (ci_mode or skip_rerank):
        configs_to_test.append("hybrid_rrf_rerank")

    gate_passed = True
    summary_rows = []

    print("\nEvaluating retrieval configs...")
    for cfg_name in configs_to_test:
        cfg = RETRIEVAL_CONFIGS.get(cfg_name)
        if not cfg:
            continue

        per_query_recall10 = []
        per_query_mrr = []

        for q in queries:
            try:
                retrieved_ids, _ = run_retrieval(
                    query=q["query"],
                    config_name=cfg_name,
                    config=cfg,
                    top_k=20,
                    rrf_k=60,
                )
            except Exception as e:
                print(f"[WARN] Retrieval failed for query {q['id']} under {cfg_name}: {e}")
                retrieved_ids = []

            m = compute_all_metrics(retrieved_ids, q.get("relevant_doc_ids", []))
            per_query_recall10.append(m["recall_at_10"])
            per_query_mrr.append(m["mrr"])

        # Bootstrap confidence intervals
        r10_mean, r10_low, r10_high = bootstrap_confidence_interval(
            per_query_recall10, n_resamples=n_resamples
        )
        mrr_mean, mrr_low, mrr_high = bootstrap_confidence_interval(
            per_query_mrr, n_resamples=n_resamples
        )

        cfg_baseline = baselines.get(cfg_name, {})
        base_r10 = cfg_baseline.get("recall_at_10")
        base_mrr = cfg_baseline.get("mrr")

        # Significant degradation check:
        # Fails only if the upper bound of the bootstrap CI drops below the tolerated baseline.
        r10_failed = False
        mrr_failed = False

        if base_r10 is not None:
            r10_threshold = base_r10 * tolerance_factor
            if r10_high < r10_threshold:
                r10_failed = True
                gate_passed = False

        if base_mrr is not None:
            mrr_threshold = base_mrr * tolerance_factor
            if mrr_high < mrr_threshold:
                mrr_failed = True
                gate_passed = False

        summary_rows.append({
            "config": cfg_name,
            "metric": "Recall@10",
            "mean": r10_mean,
            "ci": f"[{r10_low:.4f}, {r10_high:.4f}]",
            "baseline": f"{base_r10:.4f}" if base_r10 is not None else "N/A",
            "status": "❌ FAIL (REGRESSION)" if r10_failed else "✅ PASS",
        })
        summary_rows.append({
            "config": cfg_name,
            "metric": "MRR",
            "mean": mrr_mean,
            "ci": f"[{mrr_low:.4f}, {mrr_high:.4f}]",
            "baseline": f"{base_mrr:.4f}" if base_mrr is not None else "N/A",
            "status": "❌ FAIL (REGRESSION)" if mrr_failed else "✅ PASS",
        })

    # Print Table
    print("\n" + "=" * 80)
    print(f"{'Config':<18} | {'Metric':<10} | {'Mean':<8} | {'95% Bootstrap CI':<18} | {'Baseline':<8} | {'Status'}")
    print("-" * 80)
    for row in summary_rows:
        print(f"{row['config']:<18} | {row['metric']:<10} | {row['mean']:<8.4f} | {row['ci']:<18} | {row['baseline']:<8} | {row['status']}")
    print("=" * 80)

    if gate_passed:
        print("\n🎉 CI REGRESSION GATE PASSED: All retrieval metrics are within statistical confidence bounds.\n")
    else:
        print("\n🚨 CI REGRESSION GATE FAILED: Statistically significant drop detected relative to baseline!\n")

    return gate_passed


def main():
    parser = argparse.ArgumentParser(description="Nyaay CI Retrieval Regression Gate")
    parser.add_argument("--split", default="dev", choices=["dev", "test", "all"])
    parser.add_argument("--ci", action="store_true", default=True, help="Run in CI mode (skip paid APIs)")
    parser.add_argument("--resamples", type=int, default=1000, help="Bootstrap iterations (default: 1000)")
    args = parser.parse_args()

    passed = run_regression_gate(
        split=args.split,
        ci_mode=args.ci,
        skip_rerank=True,
        n_resamples=args.resamples,
    )
    # Note: if running against development subset where baseline reflects larger full corpus,
    # exit 0 if user requested or exit with gate status.
    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
