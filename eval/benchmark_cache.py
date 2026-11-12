"""
eval/benchmark_cache.py
──────────────────────────────────────────────────────────────
Replays queries from eval/data/queries.jsonl against the Nyaay
RAG service to measure the performance impact of Redis caching.

Modes:
  --mode off   : Bypasses cache on every request (?no_cache=true)
  --mode cold  : Clears cache first, then executes queries (cold cache)
  --mode warm  : Runs queries with pre-warmed cache (warm cache)

Metrics reported:
  - Cache Hit Rate (%)
  - Min, Mean, Median (p50), 95th Percentile (p95), Max latency (ms)
  - Total elapsed time
──────────────────────────────────────────────────────────────
"""

import os
import sys
import json
import time
import argparse
import statistics
import urllib.request
import urllib.error
from datetime import datetime
from typing import List, Dict, Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "rag"))

from config import DATA_DIR, RESULTS_DIR
from cache import clear_cache, get_redis_client


def load_queries(data_path: str, split: str = "dev") -> List[Dict[str, Any]]:
    """Load queries for the specified split."""
    queries = []
    if not os.path.exists(data_path):
        print(f"[ERROR] Queries file not found: {data_path}")
        return queries

    with open(data_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            item = json.loads(line)
            if split == "all" or item.get("split") == split:
                queries.append(item)
    return queries


def send_search_request(host: str, query: str, no_cache: bool = False) -> Dict[str, Any]:
    """Execute a search query over HTTP and measure round-trip latency."""
    url = f"{host.rstrip('/')}/search"
    if no_cache:
        url += "?no_cache=true"

    token = os.getenv("RAG_INTERNAL_TOKEN", "nyaay_internal_rag_secret")
    payload = json.dumps({"query": query}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "X-Internal-Token": token,
        },
        method="POST"
    )

    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            cache_header = resp.headers.get("X-Cache", "MISS")
            status = resp.status
            body = json.loads(resp.read().decode("utf-8"))
            return {
                "success": True,
                "latency_ms": elapsed_ms,
                "cache_hit": cache_header.upper() == "HIT",
                "result_count": len(body.get("results", [])),
                "status": status,
            }
    except Exception as e:
        elapsed_ms = (time.perf_counter() - t0) * 1000
        return {
            "success": False,
            "latency_ms": elapsed_ms,
            "cache_hit": False,
            "error": str(e),
        }


def run_benchmark(host: str, queries: List[Dict[str, Any]], mode: str) -> Dict[str, Any]:
    """Execute benchmark run for given mode."""
    print(f"\n🚀 Running Cache Benchmark [Mode: {mode.upper()}] with {len(queries)} queries...")

    no_cache = False
    if mode == "off":
        no_cache = True
    elif mode == "cold":
        print("🧹 Clearing Redis cache for cold-start test...")
        deleted = clear_cache()
        print(f"   Deleted {deleted} existing cache keys.")
    elif mode == "warm":
        print("🔥 Ensuring cache is pre-warmed...")
        # Warmup pass
        for q in queries:
            send_search_request(host, q["query"], no_cache=False)

    latencies = []
    hits = 0
    errors = 0

    t_start = time.perf_counter()
    for idx, item in enumerate(queries, 1):
        res = send_search_request(host, item["query"], no_cache=no_cache)
        if res["success"]:
            latencies.append(res["latency_ms"])
            if res["cache_hit"]:
                hits += 1
        else:
            errors += 1
            print(f"   [Query {idx} FAIL] {item['query'][:40]}...: {res.get('error')}")

    total_time_s = time.perf_counter() - t_start

    if not latencies:
        return {"error": "No successful queries executed"}

    sorted_latencies = sorted(latencies)
    n = len(sorted_latencies)
    p50_idx = int(0.50 * n)
    p95_idx = min(n - 1, int(0.95 * n))

    summary = {
        "mode": mode,
        "query_count": len(queries),
        "successful_requests": len(latencies),
        "errors": errors,
        "hit_count": hits,
        "hit_rate_pct": round((hits / len(queries)) * 100, 2),
        "total_elapsed_s": round(total_time_s, 2),
        "latency_min_ms": round(min(sorted_latencies), 2),
        "latency_mean_ms": round(statistics.mean(sorted_latencies), 2),
        "latency_p50_ms": round(sorted_latencies[p50_idx], 2),
        "latency_p95_ms": round(sorted_latencies[p95_idx], 2),
        "latency_max_ms": round(max(sorted_latencies), 2),
    }

    return summary


def main():
    parser = argparse.ArgumentParser(description="Nyaay Search Cache Benchmarking Tool")
    parser.add_argument("--mode", choices=["off", "cold", "warm", "all"], default="all",
                        help="Benchmark mode: off (no cache), cold, warm, or all (runs all 3 sequentially)")
    parser.add_argument("--host", default="http://localhost:8000", help="RAG service host (default: http://localhost:8000)")
    parser.add_argument("--split", default="dev", help="Dataset split to evaluate (dev, test, all)")
    args = parser.parse_args()

    data_file = os.path.join(DATA_DIR, "queries.jsonl")
    queries = load_queries(data_file, split=args.split)
    if not queries:
        print("[WARN] No queries loaded from queries.jsonl. Using standard fallback legal queries for benchmark.")
        queries = [
            {"query": "punishment for murder under BNS", "split": "dev"},
            {"query": "fundamental rights article 21 life liberty", "split": "dev"},
            {"query": "anticipatory bail conditions under BNSS", "split": "dev"},
            {"query": "cheating and dishonesty under BNS section 318", "split": "dev"},
            {"query": "right to constitutional remedies article 32", "split": "dev"},
        ]

    modes = ["off", "cold", "warm"] if args.mode == "all" else [args.mode]
    results = []

    for m in modes:
        res = run_benchmark(args.host, queries, m)
        results.append(res)
        time.sleep(1)

    print("\n" + "=" * 65)
    print("           NYAAY CACHE BENCHMARK RESULTS")
    print("=" * 65)
    print(f"{'Mode':<8} | {'Hit Rate':<10} | {'p50 (ms)':<10} | {'p95 (ms)':<10} | {'Mean (ms)':<10} | {'Total (s)':<8}")
    print("-" * 65)
    for r in results:
        if "error" in r:
            print(f"{r.get('mode', 'err'):<8} | ERROR: {r['error']}")
        else:
            print(f"{r['mode']:<8} | {r['hit_rate_pct']:>8.1f}% | {r['latency_p50_ms']:>10.2f} | {r['latency_p95_ms']:>10.2f} | {r['latency_mean_ms']:>10.2f} | {r['total_elapsed_s']:>8.2f}")
    print("=" * 65)

    timestamp = datetime.now().strftime("%Y%m%dT%H%M%S")
    out_json = os.path.join(RESULTS_DIR, f"cache_benchmark_{timestamp}.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump({"timestamp": timestamp, "results": results}, f, indent=2)
    print(f"\n📁 Saved benchmark results to: {out_json}")


if __name__ == "__main__":
    main()
