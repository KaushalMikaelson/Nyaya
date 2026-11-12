"""
eval/sweep.py
──────────────────────────────────────────────────────────────
Parameter sweep for Nyaay's retrieval pipeline.

Varies RRF k, candidate pool size (top_k), and rerank top_n,
writing one row per setting to eval/results/sweep_<timestamp>.json.

Usage:
  python eval/sweep.py --split dev
  python eval/sweep.py --split dev --config hybrid_rrf_rerank

Output:
  eval/results/sweep_<timestamp>_<git_hash>.json
  eval/results/sweep_<timestamp>_<git_hash>.md
──────────────────────────────────────────────────────────────
"""

import argparse
import json
import os
import sys
import subprocess
from datetime import datetime, timezone
from typing import List

# Add project paths
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "rag"))
sys.path.insert(0, os.path.dirname(__file__))

from config import (
    RETRIEVAL_CONFIGS, RESULTS_DIR, QUERIES_FILE,
    SWEEP_RRF_K, SWEEP_TOP_K, SWEEP_RERANK_TOP_N,
    RRF_K, TOP_K, RERANK_TOP_N,
)
from runner import load_queries, evaluate_config, get_git_hash


def main():
    parser = argparse.ArgumentParser(description="Nyaay Retrieval Parameter Sweep")
    parser.add_argument(
        "--split", type=str, default="dev", choices=["dev", "test"],
        help="Dataset split (default: dev)"
    )
    parser.add_argument(
        "--config", type=str, default="hybrid_rrf_rerank",
        choices=list(RETRIEVAL_CONFIGS.keys()),
        help="Config to sweep (default: hybrid_rrf_rerank)"
    )
    parser.add_argument("--queries-file", type=str, default=QUERIES_FILE)
    parser.add_argument(
        "--rrf-k-values", type=int, nargs="+", default=SWEEP_RRF_K,
        help=f"RRF k values to sweep (default: {SWEEP_RRF_K})"
    )
    parser.add_argument(
        "--top-k-values", type=int, nargs="+", default=SWEEP_TOP_K,
        help=f"Top-K values to sweep (default: {SWEEP_TOP_K})"
    )
    parser.add_argument(
        "--rerank-top-n-values", type=int, nargs="+", default=SWEEP_RERANK_TOP_N,
        help=f"Rerank top-N values to sweep (default: {SWEEP_RERANK_TOP_N})"
    )
    args = parser.parse_args()

    if args.split == "test":
        print("\n  ⚠ WARNING: Sweeping on test split is discouraged. Tune on dev only.\n")

    queries = load_queries(args.queries_file, split=args.split)
    if not queries:
        print(f"\n  ✗ No labeled queries for split '{args.split}'")
        sys.exit(1)

    print(f"\n  Loaded {len(queries)} queries (split={args.split})")

    config_name = args.config
    config = RETRIEVAL_CONFIGS[config_name]
    git_hash = get_git_hash()

    # Determine sweep parameters based on config
    do_rerank = config.get("rerank", False)
    rrf_k_values = args.rrf_k_values
    top_k_values = args.top_k_values
    rerank_top_n_values = args.rerank_top_n_values if do_rerank else [RERANK_TOP_N]

    total_combos = len(rrf_k_values) * len(top_k_values) * len(rerank_top_n_values)
    print(f"  Config: {config_name}")
    print(f"  Sweep: {total_combos} combinations")
    print(f"    RRF k:        {rrf_k_values}")
    print(f"    Top-K:        {top_k_values}")
    if do_rerank:
        print(f"    Rerank Top-N: {rerank_top_n_values}")
    print()

    sweep_results = []
    combo_idx = 0

    for rrf_k in rrf_k_values:
        for top_k in top_k_values:
            for rerank_top_n in rerank_top_n_values:
                combo_idx += 1
                label = f"rrf_k={rrf_k}, top_k={top_k}"
                if do_rerank:
                    label += f", rerank_n={rerank_top_n}"

                print(f"  [{combo_idx}/{total_combos}] {label}...", end="", flush=True)

                result = evaluate_config(
                    config_name=config_name,
                    config=config,
                    queries=queries,
                    rrf_k=rrf_k,
                    top_k=top_k,
                    rerank_top_n=rerank_top_n,
                )

                a = result["aggregated"]
                print(
                    f" recall@10={a['recall_at_10']:.4f}"
                    f"  MRR={a['mrr']:.4f}"
                    f"  nDCG@10={a['ndcg_at_10']:.4f}"
                    f"  p50={a['latency_p50_ms']:.0f}ms"
                )

                sweep_results.append({
                    "rrf_k": rrf_k,
                    "top_k": top_k,
                    "rerank_top_n": rerank_top_n,
                    **result["aggregated"],
                })

    # Save results
    os.makedirs(RESULTS_DIR, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S")
    base_name = f"sweep_{timestamp}_{git_hash}_{args.split}"

    # JSON
    json_path = os.path.join(RESULTS_DIR, f"{base_name}.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": timestamp,
            "git_commit": git_hash,
            "split": args.split,
            "config_name": config_name,
            "sweep_results": sweep_results,
        }, f, indent=2)

    # Markdown table
    md_path = os.path.join(RESULTS_DIR, f"{base_name}.md")
    lines = [
        f"# Parameter Sweep: {config_name}\n",
        f"**Split**: {args.split} | **Git**: {git_hash} | **Time**: {timestamp}\n",
        "| RRF k | Top-K | Rerank N | Recall@5 | Recall@10 | MRR | nDCG@10 | p50 ms | p95 ms |",
        "|-------|-------|----------|----------|-----------|-----|---------|--------|--------|",
    ]
    for r in sweep_results:
        lines.append(
            f"| {r['rrf_k']} | {r['top_k']} | {r['rerank_top_n']} "
            f"| {r['recall_at_5']:.4f} | {r['recall_at_10']:.4f} "
            f"| {r['mrr']:.4f} | {r['ndcg_at_10']:.4f} "
            f"| {r['latency_p50_ms']:.0f} | {r['latency_p95_ms']:.0f} |"
        )

    # Find best
    best = max(sweep_results, key=lambda x: x["recall_at_10"])
    lines.append(f"\n**Best by Recall@10**: rrf_k={best['rrf_k']}, top_k={best['top_k']}, rerank_n={best['rerank_top_n']} → Recall@10={best['recall_at_10']:.4f}")

    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"\n  Results saved to:")
    print(f"    JSON: {json_path}")
    print(f"    Markdown: {md_path}")

    print(f"\n  Best config by Recall@10:")
    print(f"    rrf_k={best['rrf_k']}, top_k={best['top_k']}, rerank_n={best['rerank_top_n']}")
    print(f"    Recall@10={best['recall_at_10']:.4f}  MRR={best['mrr']:.4f}  nDCG@10={best['ndcg_at_10']:.4f}")


if __name__ == "__main__":
    main()
