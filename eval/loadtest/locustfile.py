"""
eval/loadtest/locustfile.py
──────────────────────────────────────────────────────────────
Locust load testing suite for Nyaay Legal RAG Microservice.

Simulates concurrent user load at:
  - 1 user (baseline latency profile)
  - 10 users (moderate concurrent workload)
  - 50 users (peak stress test)

Testing paths:
  1. /search (default mixed cache hits/misses)
  2. /search?no_cache=true (evaluates raw compute under load)
  3. /hybrid-search (retrieval layer load)
  4. /chat-rag (end-to-end generation latency)
──────────────────────────────────────────────────────────────
"""

import os
import json
import random
from locust import HttpUser, task, between

SAMPLE_QUERIES = [
    "What is the punishment for murder under BNS?",
    "Fundamental rights guaranteed under Article 21",
    "Bail provisions under Bharatiya Nagarik Suraksha Sanhita",
    "Right to constitutional remedies Article 32 Supreme Court",
    "Cheating and dishonestly inducing delivery of property",
    "Definition of theft under Bharatiya Nyaya Sanhita",
    "Freedom of speech and expression Article 19 restrictions",
    "Power of police to arrest without warrant under BNSS",
    "Right against self-incrimination Article 20(3)",
    "Defamation civil and criminal exceptions in India",
]

# Attempt to load actual dataset queries if present
QUERIES_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "queries.jsonl")
if os.path.exists(QUERIES_FILE):
    try:
        loaded = []
        with open(QUERIES_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    loaded.append(json.loads(line).get("query"))
        if loaded:
            SAMPLE_QUERIES = [q for q in loaded if q]
    except Exception:
        pass


class NyaaySearchUser(HttpUser):
    """Simulates a legal researcher browsing Acts and searching sections."""
    wait_time = between(1.0, 3.0)

    @task(5)
    def search_query(self):
        """Standard search query (benefits from cache on repeat queries)."""
        q = random.choice(SAMPLE_QUERIES)
        self.client.post(
            "/search",
            json={"query": q},
            name="/search (cached/mixed)",
            headers={"Content-Type": "application/json"}
        )

    @task(2)
    def uncached_search(self):
        """Uncached search (forces vector embed + Postgres hybrid + Cohere rerank)."""
        q = random.choice(SAMPLE_QUERIES)
        self.client.post(
            "/search?no_cache=true",
            json={"query": q},
            name="/search (uncached)",
            headers={"Content-Type": "application/json"}
        )

    @task(3)
    def hybrid_search_only(self):
        """Tests pure database hybrid retrieval throughput without reranking."""
        q = random.choice(SAMPLE_QUERIES)
        self.client.post(
            "/hybrid-search",
            json={"query": q, "topK": 20},
            name="/hybrid-search",
            headers={"Content-Type": "application/json"}
        )

    @task(1)
    def chat_rag_query(self):
        """End-to-end RAG query involving retrieval and Groq LLM generation."""
        q = random.choice(SAMPLE_QUERIES)
        self.client.post(
            "/chat-rag",
            json={"content": q, "language": "english"},
            name="/chat-rag",
            headers={"Content-Type": "application/json"}
        )
