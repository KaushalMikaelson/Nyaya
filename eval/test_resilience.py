"""
eval/test_resilience.py
──────────────────────────────────────────────────────────────
Failure-injection tests for Nyaay RAG resilience:
  1. Cohere API failure -> fallback to hybrid candidates
  2. Redis failure -> fail-open without search crash
  3. Retry with exponential backoff & jitter
  4. System health degradation detection
──────────────────────────────────────────────────────────────
"""

import sys
import os
import unittest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "rag")))

from resilience import retry_with_backoff, safe_call
from health import get_system_health


class TestResilienceMechanisms(unittest.TestCase):

    def test_retry_with_backoff_eventual_success(self):
        """Function that fails twice then succeeds should return result."""
        call_count = 0

        @retry_with_backoff(max_retries=3, base_delay=0.01, jitter=False)
        def flaky_service():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ConnectionError("Transient network failure")
            return "recovered_data"

        result = flaky_service()
        self.assertEqual(result, "recovered_data")
        self.assertEqual(call_count, 3)

    def test_retry_with_backoff_exhausted_fallback(self):
        """When all retries fail, should execute the fallback function."""
        @retry_with_backoff(
            max_retries=2,
            base_delay=0.01,
            jitter=False,
            fallback_fn=lambda *args, **kwargs: "fallback_result"
        )
        def always_failing_service():
            raise TimeoutError("Dead backend")

        result = always_failing_service()
        self.assertEqual(result, "fallback_result")

    def test_safe_call_suppresses_exception(self):
        """safe_call catches exceptions and returns the fallback default."""
        def buggy():
            return 1 / 0

        res = safe_call(buggy, default=42)
        self.assertEqual(res, 42)

    @patch("rag.retrieval.cohere_client")
    def test_cohere_failure_graceful_degradation(self, mock_cohere):
        """If Cohere raises an API error, retrieval should degrade gracefully to top-N hybrid candidates."""
        from rag.retrieval import rerank_candidates

        mock_cohere.rerank.side_effect = Exception("Cohere 503 Service Unavailable")

        mock_candidates = [
            {"id": "doc1", "content": "Law text 1", "rrf_score": 0.8},
            {"id": "doc2", "content": "Law text 2", "rrf_score": 0.6},
            {"id": "doc3", "content": "Law text 3", "rrf_score": 0.4},
        ]

        # Should NOT raise exception, should return top_n candidates
        reranked = rerank_candidates("murder punishment", mock_candidates, top_n=2)
        self.assertEqual(len(reranked), 2)
        self.assertEqual(reranked[0]["id"], "doc1")
        self.assertEqual(reranked[1]["id"], "doc2")

    @patch("rag.cache.get_redis_client")
    def test_cache_failure_fail_open(self, mock_redis_getter):
        """If Redis raises a connection error, get_cached returns None and set_cached returns False."""
        mock_client = MagicMock()
        mock_client.get.side_effect = Exception("Redis connection refused")
        mock_client.setex.side_effect = Exception("Redis connection refused")
        mock_redis_getter.return_value = mock_client

        from rag.cache import get_cached, set_cached

        # Fail open on get
        cached = get_cached("test query")
        self.assertIsNone(cached)

        # Fail open on set
        stored = set_cached("test query", {"res": 1})
        self.assertFalse(stored)

    @patch("rag.health.check_postgres")
    @patch("rag.health.check_redis")
    @patch("rag.health.check_cohere")
    @patch("rag.health.check_groq")
    def test_health_degraded_when_redis_down(self, mock_gq, mock_ch, mock_rd, mock_pg):
        """Postgres ok + Redis down => overall status 'degraded'."""
        mock_pg.return_value = {"status": "ok", "latency_ms": 4.2}
        mock_rd.return_value = {"status": "error", "error": "Connection refused"}
        mock_ch.return_value = {"status": "ok"}
        mock_gq.return_value = {"status": "ok"}

        health = get_system_health()
        self.assertEqual(health["status"], "degraded")
        self.assertEqual(health["dependencies"]["redis"]["status"], "error")


if __name__ == "__main__":
    unittest.main()
