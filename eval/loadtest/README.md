# Nyaay Load & Concurrency Testing

This directory provides Locust load tests to evaluate system latency, throughput (RPS), and cache efficacy under concurrent load.

---

## Prerequisites

Ensure dependencies are installed:
```bash
pip install locust redis
```

Ensure the Python RAG service is running:
```bash
uvicorn main:app --app-dir rag --port 8000 --reload
```

---

## Running Load Tests

### 1. Headless Stress Test (50 Concurrent Users)
```bash
locust -f eval/loadtest/locustfile.py \
  --host http://localhost:8000 \
  --users 50 \
  --spawn-rate 10 \
  --run-time 2m \
  --headless \
  --csv eval/results/loadtest_50users
```

### 2. Interactive Web UI
```bash
locust -f eval/loadtest/locustfile.py --host http://localhost:8000
```
Then open [http://localhost:8089](http://localhost:8089) in your browser.

---

## Scenarios Tested

| Endpoint | Weight | Description |
|---|---|---|
| `/search` | 50% | General legal queries (hits Redis cache on repeat queries) |
| `/search?no_cache=true` | 20% | Force-bypasses cache to measure worst-case compute load |
| `/hybrid-search` | 20% | Raw Postgres pgvector + BM25 RRF retrieval |
| `/chat-rag` | 10% | Full pipeline with Groq LLM generation |

---

## Key Metrics to Record for Resume / Interview
- **Peak Throughput (Requests per Second)**
- **p50 and p95 Latency on Cached vs Uncached Queries**
- **Error Rate under 50 Concurrent Users** (target: < 0.1%)
