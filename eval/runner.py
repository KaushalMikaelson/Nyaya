"""
eval/runner.py
──────────────────────────────────────────────────────────────
Evaluation runner for Nyaay's retrieval pipeline.

Runs retrieval configs (bm25_only, semantic_only, hybrid_rrf, hybrid_rrf_rerank)
against labeled queries and reports recall@5, recall@10, MRR, nDCG@10, and latency.

Usage:
  python eval/runner.py --config hybrid_rrf_rerank --split dev
  python eval/runner.py --all --split dev
  python eval/runner.py --all --split test   # Only for final reporting!

Output:
  eval/results/<timestamp>_<git_hash>.json
  eval/results/<timestamp>_<git_hash>.md
──────────────────────────────────────────────────────────────
"""

import argparse
import json
import os
import sys
import time
import subprocess
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

# Add project paths
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "rag"))
sys.path.insert(0, os.path.dirname(__file__))

from config import (
    RETRIEVAL_CONFIGS, RRF_K, TOP_K, RERANK_TOP_N, RERANK_CANDIDATES,
    DATA_DIR, RESULTS_DIR, QUERIES_FILE,
)
from metrics import compute_all_metrics, aggregate_metrics


def get_git_hash() -> str:
    """Get short git commit hash, or 'unknown' if not in a git repo."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, cwd=os.path.dirname(__file__)
        )
        return result.stdout.strip() or "unknown"
    except Exception:
        return "unknown"


def load_queries(filepath: str, split: Optional[str] = None) -> List[dict]:
    """Load queries from JSONL, optionally filtering by split."""
    queries = []
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            entry = json.loads(line)
            if split and entry.get("split") != split:
                continue
            # Skip queries with no labels
            if not entry.get("relevant_doc_ids"):
                continue
            queries.append(entry)
    return queries


def run_retrieval(
    query: str,
    config_name: str,
    config: dict,
    rrf_k: int = RRF_K,
    top_k: int = TOP_K,
    rerank_top_n: int = RERANK_TOP_N,
    rerank_candidates: int = RERANK_CANDIDATES,
) -> tuple[List[str], float]:
    """
    Run a single retrieval query with the given config.

    Returns:
        Tuple of (list of retrieved doc IDs, latency in ms)
    """
    from embeddings import embed_query
    from retrieval import hybrid_search, rerank_candidates as rerank_fn

    use_vector = config.get("use_vector", True)
    use_fts = config.get("use_fts", True)
    do_rerank = config.get("rerank", False)

    # Generate embedding only if needed
    query_embedding = embed_query(query) if use_vector else None

    start = time.perf_counter()

    # Run hybrid search with config flags
    candidates = hybrid_search(
        query=query,
        query_embedding=query_embedding,
        top_k=top_k,
        rrf_k=rrf_k,
        use_vector=use_vector,
        use_fts=use_fts,
    )

    # Optionally rerank
    if do_rerank and candidates:
        top_candidates = candidates[:rerank_candidates]
        candidates = rerank_fn(query, top_candidates, top_n=rerank_top_n)

    elapsed_ms = (time.perf_counter() - start) * 1000

    retrieved_ids = [c["id"] for c in candidates]
    return retrieved_ids, elapsed_ms


def evaluate_config(
    config_name: str,
    config: dict,
    queries: List[dict],
    rrf_k: int = RRF_K,
    top_k: int = TOP_K,
    rerank_top_n: int = RERANK_TOP_N,
) -> dict:
    """
    Evaluate a single retrieval config on a set of queries.

    Returns:
        Dict with aggregated metrics and per-query details.
    """
    per_query = []
    latencies = []

    for q in queries:
        retrieved_ids, latency_ms = run_retrieval(
            query=q["query"],
            config_name=config_name,
            config=config,
            rrf_k=rrf_k,
            top_k=top_k,
            rerank_top_n=rerank_top_n,
        )

        metrics = compute_all_metrics(retrieved_ids, q["relevant_doc_ids"])
        metrics["query_id"] = q["id"]
        metrics["latency_ms"] = round(latency_ms, 2)
        metrics["retrieved_count"] = len(retrieved_ids)
        per_query.append(metrics)
        latencies.append(latency_ms)

    # Aggregate
    agg = aggregate_metrics(per_query)

    # Latency stats
    latencies.sort()
    n = len(latencies)
    agg["latency_p50_ms"] = round(latencies[n // 2], 2) if n > 0 else 0.0
    agg["latency_p95_ms"] = round(latencies[int(n * 0.95)], 2) if n > 0 else 0.0
    agg["latency_mean_ms"] = round(sum(latencies) / n, 2) if n > 0 else 0.0

    return {
        "config_name": config_name,
        "config": config,
        "params": {"rrf_k": rrf_k, "top_k": top_k, "rerank_top_n": rerank_top_n},
        "num_queries": len(queries),
        "aggregated": agg,
        "per_query": per_query,
    }


def format_results_table(results: List[dict]) -> str:
    """Format results as a markdown table."""
    lines = [
        "| Config | Recall@5 | Recall@10 | MRR | nDCG@10 | p50 (ms) | p95 (ms) | Queries |",
        "|--------|----------|-----------|-----|---------|----------|----------|---------|",
    ]
    for r in results:
        a = r["aggregated"]
        lines.append(
            f"| {r['config_name']} "
            f"| {a['recall_at_5']:.4f} "
            f"| {a['recall_at_10']:.4f} "
            f"| {a['mrr']:.4f} "
            f"| {a['ndcg_at_10']:.4f} "
            f"| {a['latency_p50_ms']:.0f} "
            f"| {a['latency_p95_ms']:.0f} "
            f"| {r['num_queries']} |"
        )
    return "\n".join(lines)


def save_results(results: List[dict], split: str, git_hash: str):
    """Save results to JSON and markdown files."""
    os.makedirs(RESULTS_DIR, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S")
    base_name = f"{timestamp}_{git_hash}_{split}"

    # JSON output
    json_path = os.path.join(RESULTS_DIR, f"{base_name}.json")
    output = {
        "timestamp": timestamp,
        "git_commit": git_hash,
        "split": split,
        "results": results,
    }
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    # Markdown output
    md_path = os.path.join(RESULTS_DIR, f"{base_name}.md")
    table = format_results_table(results)
    md_content = f"""# Retrieval Evaluation Results

**Split**: {split}  
**Git Commit**: {git_hash}  
**Timestamp**: {timestamp}  
**Queries**: {results[0]['num_queries'] if results else 0}

## Results

{table}

## Parameters

| Parameter | Value |
|-----------|-------|
| RRF k | {results[0]['params']['rrf_k'] if results else RRF_K} |
| Top-K | {results[0]['params']['top_k'] if results else TOP_K} |
| Rerank Top-N | {results[0]['params']['rerank_top_n'] if results else RERANK_TOP_N} |
"""
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)

    print(f"\n  Results saved to:")
    print(f"    JSON: {json_path}")
    print(f"    Markdown: {md_path}")

    return json_path, md_path


def main():
    parser = argparse.ArgumentParser(description="Nyaay Retrieval Evaluation Runner")
    parser.add_argument(
        "--config", type=str, choices=list(RETRIEVAL_CONFIGS.keys()),
        help="Run a single retrieval config"
    )
    parser.add_argument("--all", action="store_true", help="Run all retrieval configs")
    parser.add_argument(
        "--split", type=str, default="dev", choices=["dev", "test"],
        help="Dataset split to evaluate on (default: dev)"
    )
    parser.add_argument("--rrf-k", type=int, default=RRF_K, help=f"RRF constant (default: {RRF_K})")
    parser.add_argument("--top-k", type=int, default=TOP_K, help=f"Top-K candidates (default: {TOP_K})")
    parser.add_argument("--rerank-top-n", type=int, default=RERANK_TOP_N, help=f"Rerank top-N (default: {RERANK_TOP_N})")
    parser.add_argument("--queries-file", type=str, default=QUERIES_FILE, help="Path to queries JSONL file")
    args = parser.parse_args()

    if not args.config and not args.all:
        parser.error("Specify --config <name> or --all")

    if args.split == "test":
        print("\n  ⚠ WARNING: Running on test split. Only do this for final reporting!")
        print("  Tune on dev split only.\n")

    # Load queries
    queries = load_queries(args.queries_file, split=args.split)
    if not queries:
        print(f"\n  ✗ No labeled queries found for split '{args.split}' in {args.queries_file}")
        print("  Make sure queries have non-empty relevant_doc_ids.")
        print("  💡 Tip: Run 'python eval/bootstrap_labels.py' to automatically populate chunk IDs from your database.")
        sys.exit(1)

    print(f"\n  Loaded {len(queries)} labeled queries (split={args.split})")

    git_hash = get_git_hash()
    print(f"  Git commit: {git_hash}")

    # Determine configs to run
    if args.all:
        configs_to_run = list(RETRIEVAL_CONFIGS.items())
    else:
        configs_to_run = [(args.config, RETRIEVAL_CONFIGS[args.config])]

    # Run evaluations
    all_results = []
    for config_name, config in configs_to_run:
        print(f"\n  ── Evaluating: {config_name} ──")
        print(f"     {config.get('description', '')}")

        result = evaluate_config(
            config_name=config_name,
            config=config,
            queries=queries,
            rrf_k=args.rrf_k,
            top_k=args.top_k,
            rerank_top_n=args.rerank_top_n,
        )
        all_results.append(result)

        a = result["aggregated"]
        print(f"     Recall@5:  {a['recall_at_5']:.4f}")
        print(f"     Recall@10: {a['recall_at_10']:.4f}")
        print(f"     MRR:       {a['mrr']:.4f}")
        print(f"     nDCG@10:   {a['ndcg_at_10']:.4f}")
        print(f"     Latency:   p50={a['latency_p50_ms']:.0f}ms  p95={a['latency_p95_ms']:.0f}ms")

    # Print summary table
    print(f"\n{'='*80}")
    print(format_results_table(all_results))

    # Save
    save_results(all_results, args.split, git_hash)


if __name__ == "__main__":
    main()
