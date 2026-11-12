"""
rag/tests/test_trust_boundary.py
──────────────────────────────────────────────────────────────
Tests for internal trust boundary:
  - Reject requests lacking valid X-Internal-Token (403 Forbidden)
  - Verify teamIds cannot be passed without internal token
  - Allow /health probe without internal token
──────────────────────────────────────────────────────────────
"""

import sys
import os
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app, RAG_INTERNAL_TOKEN


class TestTrustBoundary(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    def test_health_endpoint_accessible_without_token(self):
        """Liveness probe /health must remain accessible for container orchestrators."""
        resp = self.client.get("/health")
        self.assertEqual(resp.status_code, 200)

    def test_search_rejected_without_token(self):
        """POST /search without X-Internal-Token must be rejected with 403."""
        resp = self.client.post("/search", json={"query": "theft under BNS"})
        self.assertEqual(resp.status_code, 403)
        self.assertIn("Forbidden", resp.json().get("detail", ""))

    def test_search_rejected_with_invalid_token(self):
        """POST /search with wrong token must be rejected with 403."""
        resp = self.client.post(
            "/search",
            headers={"X-Internal-Token": "wrong_attacker_token"},
            json={"query": "theft under BNS"}
        )
        self.assertEqual(resp.status_code, 403)

    def test_team_ids_rejected_without_token(self):
        """Passing teamIds without internal token must get 403."""
        resp = self.client.post(
            "/search",
            json={"query": "confidential case", "filters": {"teamIds": ["team_secret"]}}
        )
        self.assertEqual(resp.status_code, 403)

    @patch("main.get_cached", return_value={"results": []})
    def test_search_accepted_with_valid_token(self, mock_cache):
        """POST /search with valid X-Internal-Token succeeds."""
        resp = self.client.post(
            "/search",
            headers={"X-Internal-Token": RAG_INTERNAL_TOKEN},
            json={"query": "theft under BNS"}
        )
        self.assertEqual(resp.status_code, 200)

    def test_hybrid_search_rejected_without_token(self):
        """POST /hybrid-search without X-Internal-Token must be rejected with 403."""
        resp = self.client.post("/hybrid-search", json={"query": "murder punishment"})
        self.assertEqual(resp.status_code, 403)

    def test_research_agent_rejected_without_token(self):
        """POST /research without X-Internal-Token must be rejected with 403."""
        resp = self.client.post("/research", json={"query": "remedies under Article 32"})
        self.assertEqual(resp.status_code, 403)


if __name__ == "__main__":
    unittest.main()
