"""
eval/agent/runner.py
──────────────────────────────────────────────────────────────
Evaluation runner for Nyaay Research Agent.

Evaluates:
  - Task completion success rate
  - Citation accuracy (% of expected sections cited)
  - Claim quote verification rate (% of claims verified verbatim)
  - Mean steps, latency, and inference cost ($)
Saves detailed JSON traces to eval/agent/traces/
──────────────────────────────────────────────────────────────
"""

import os
import sys
import json
import time
import argparse
import statistics
from datetime import datetime
from typing import List, Dict, Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "rag")))

from agent.agent import LegalResearchAgent

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TASKS_FILE = os.path.join(BASE_DIR, "tasks.jsonl")
TRACES_DIR = os.path.join(BASE_DIR, "traces")


def load_tasks(filepath: str, split: str = "dev") -> List[Dict[str, Any]]:
    tasks = []
    if not os.path.exists(filepath):
        print(f"[ERROR] Tasks file not found: {filepath}")
        return tasks

    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                item = json.loads(line)
                if split == "all" or item.get("split") == split:
                    tasks.append(item)
    return tasks


def run_agent_eval(tasks: List[Dict[str, Any]], model: str = None) -> Dict[str, Any]:
    os.makedirs(TRACES_DIR, exist_ok=True)
    agent = LegalResearchAgent(model=model)

    print(f"\n🤖 Running Agent Evaluation on {len(tasks)} tasks...")
    traces = []
    successes = 0
    total_steps = []
    latencies = []
    costs = []
    citation_accuracies = []
    verification_rates = []

    for idx, t in enumerate(tasks, 1):
        task_id = t.get("id", f"t{idx}")
        query = t.get("task")
        expected_act = t.get("expected_act")
        expected_sections = [str(s) for s in t.get("expected_sections", [])]

        print(f"\n[{idx}/{len(tasks)}] Task {task_id}: {query[:50]}...")
        t0 = time.perf_counter()
        try:
            result = agent.run(query=query)
            elapsed_s = time.perf_counter() - t0

            # Evaluate citation accuracy
            found_sections = []
            for c in result.citations:
                sec = str(c.get("section", ""))
                if sec:
                    found_sections.append(sec)

            hits = sum(1 for exp in expected_sections if any(exp in f for f in found_sections))
            acc = hits / len(expected_sections) if expected_sections else 1.0

            # Evaluate verification rate
            claims = result.claims
            verified_count = sum(1 for c in claims if c.verified)
            ver_rate = verified_count / len(claims) if claims else 1.0

            # Success threshold: confidence >= 50 and non-empty answer
            is_success = result.confidence >= 50 and len(result.answer) > 50 and (acc > 0 or not expected_sections)

            if is_success:
                successes += 1

            total_steps.append(result.steps_taken)
            latencies.append(elapsed_s)
            costs.append(result.cost_est_usd)
            citation_accuracies.append(acc)
            verification_rates.append(ver_rate)

            trace_data = {
                "task_id": task_id,
                "task": query,
                "success": is_success,
                "result": result.model_dump(),
                "elapsed_seconds": round(elapsed_s, 2),
                "citation_accuracy": round(acc, 2),
                "quote_verification_rate": round(ver_rate, 2),
            }
            traces.append(trace_data)
            print(f"    Status: {'✅ SUCCESS' if is_success else '❌ FAIL'} | Steps: {result.steps_taken} | CitationAcc: {acc * 100:.0f}% | Cost: ${result.cost_est_usd:.4f}")

        except Exception as e:
            elapsed_s = time.perf_counter() - t0
            print(f"    Error: {e}")
            traces.append({
                "task_id": task_id,
                "task": query,
                "success": False,
                "error": str(e),
                "elapsed_seconds": round(elapsed_s, 2)
            })

    timestamp = datetime.now().strftime("%Y%m%dT%H%M%S")
    summary = {
        "timestamp": timestamp,
        "total_tasks": len(tasks),
        "success_rate_pct": round((successes / len(tasks)) * 100, 2) if tasks else 0,
        "mean_steps": round(statistics.mean(total_steps), 2) if total_steps else 0,
        "mean_latency_s": round(statistics.mean(latencies), 2) if latencies else 0,
        "mean_cost_usd": round(statistics.mean(costs), 4) if costs else 0,
        "mean_citation_accuracy_pct": round(statistics.mean(citation_accuracies) * 100, 2) if citation_accuracies else 0,
        "mean_verification_rate_pct": round(statistics.mean(verification_rates) * 100, 2) if verification_rates else 0,
    }

    # Save trace run
    out_file = os.path.join(TRACES_DIR, f"agent_eval_{timestamp}.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump({"summary": summary, "traces": traces}, f, indent=2)

    print("\n" + "=" * 60)
    print("             AGENT EVALUATION SUMMARY")
    print("=" * 60)
    print(f"Success Rate:        {summary['success_rate_pct']}%")
    print(f"Mean Citation Acc:   {summary['mean_citation_accuracy_pct']}%")
    print(f"Mean Quote Ver Rate: {summary['mean_verification_rate_pct']}%")
    print(f"Mean Steps:          {summary['mean_steps']}")
    print(f"Mean Latency:        {summary['mean_latency_s']}s")
    print(f"Mean Cost:           ${summary['mean_cost_usd']}")
    print(f"Saved Trace:         {out_file}")
    print("=" * 60)

    return summary


def main():
    parser = argparse.ArgumentParser(description="Nyaay Agent Evaluation Runner")
    parser.add_argument("--tasks", default=TASKS_FILE, help="Path to tasks.jsonl")
    parser.add_argument("--split", default="dev", help="Task split (dev, test, all)")
    parser.add_argument("--model", default=None, help="Groq model override")
    args = parser.parse_args()

    tasks = load_tasks(args.tasks, split=args.split)
    if not tasks:
        print("[ERROR] No tasks loaded.")
        return

    run_agent_eval(tasks, model=args.model)


if __name__ == "__main__":
    main()
