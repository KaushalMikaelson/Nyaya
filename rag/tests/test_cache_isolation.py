"""
rag/tests/test_cache_isolation.py
──────────────────────────────────────────────────────────────
Tests for RBAC cache key isolation, deterministic normalization,
and preventing cross-tenant cache leakage between teams.
──────────────────────────────────────────────────────────────
"""

import sys
import os
import unittest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from cache import generate_cache_key, get_cached, set_cached, bump_cache_version, CACHE_VERSION


class TestCacheIsolation(unittest.TestCase):

    def test_different_teams_produce_different_keys(self):
        """The same query with teamIds=[A] and teamIds=[B] MUST produce different keys."""
        key_a = generate_cache_key("punishment for murder", team_ids=["team_A"])
        key_b = generate_cache_key("punishment for murder", team_ids=["team_B"])
        self.assertNotEqual(key_a, key_b, "Cache keys for different teams must be isolated!")

    def test_team_order_invariance(self):
        """The same teamIds in a different order must produce the identical key."""
        key_ab = generate_cache_key("anticipatory bail", team_ids=["team_A", "team_B"])
        key_ba = generate_cache_key("anticipatory bail", team_ids=["team_B", "team_A"])
        self.assertEqual(key_ab, key_ba, "Cache keys must be invariant to teamId ordering!")

    def test_query_normalization(self):
        """Whitespace and casing in query should normalize to identical key."""
        key1 = generate_cache_key("Article 21 Constitution")
        key2 = generate_cache_key("   article   21   constitution  ")
        self.assertEqual(key1, key2)

    def test_retrieval_parameters_affect_key(self):
        """Changes in top_k, rrf_k, vector, fts, or rerank must produce different keys."""
        base = generate_cache_key("theft", top_k=20, rrf_k=60, use_vector=True, use_fts=True, rerank=True)
        diff_top_k = generate_cache_key("theft", top_k=10, rrf_k=60, use_vector=True, use_fts=True, rerank=True)
        diff_rrf_k = generate_cache_key("theft", top_k=20, rrf_k=30, use_vector=True, use_fts=True, rerank=True)
        diff_vector = generate_cache_key("theft", top_k=20, rrf_k=60, use_vector=False, use_fts=True, rerank=True)
        diff_fts = generate_cache_key("theft", top_k=20, rrf_k=60, use_vector=True, use_fts=False, rerank=True)
        diff_rerank = generate_cache_key("theft", top_k=20, rrf_k=60, use_vector=True, use_fts=True, rerank=False)

        self.assertNotEqual(base, diff_top_k)
        self.assertNotEqual(base, diff_rrf_k)
        self.assertNotEqual(base, diff_vector)
        self.assertNotEqual(base, diff_fts)
        self.assertNotEqual(base, diff_rerank)

    def test_cache_version_bump_changes_key(self):
        """Bumping CACHE_VERSION must invalidate previous keys."""
        key_v1 = generate_cache_key("theft", cache_version="v1")
        key_v2 = generate_cache_key("theft", cache_version="v2")
        self.assertNotEqual(key_v1, key_v2)

    def test_team_isolation_integration(self):
        """
        Integration test: Team B must never receive Team A's cached search results.
        Uses an in-memory mock Redis store to simulate real get/set cycles.
        """
        mock_redis_store = {}

        mock_client = MagicMock()
        mock_client.get.side_effect = lambda k: mock_redis_store.get(k)
        def mock_setex(k, ttl, v):
            mock_redis_store[k] = v
            return True
        mock_client.setex.side_effect = mock_setex

        with patch("cache.get_redis_client", return_value=mock_client):
            query = "confidential contract clause"
            team_a_results = {
                "results": [
                    {"id": "doc_confidential_A", "content": "Team A Secret Merger Clause"}
                ]
            }

            # 1. Team A executes query and caches results
            saved = set_cached(
                query=query,
                payload=team_a_results,
                team_ids=["team_A"]
            )
            self.assertTrue(saved)

            # 2. Team B executes the exact same query
            team_b_cached = get_cached(
                query=query,
                team_ids=["team_B"]
            )
            # Team B must get a cache MISS (None), NOT Team A's results
            self.assertIsNone(team_b_cached, "Security breach: Team B received Team A's cached data!")

            # 3. Team A executes query again -> must get cache HIT with their results
            team_a_cached = get_cached(
                query=query,
                team_ids=["team_A"]
            )
            self.assertIsNotNone(team_a_cached)
            self.assertEqual(team_a_cached["results"][0]["id"], "doc_confidential_A")


if __name__ == "__main__":
    unittest.main()
