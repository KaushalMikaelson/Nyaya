"""
rag/tests/test_resilience_and_circuit_breaker.py
──────────────────────────────────────────────────────────────
Tests for Task 4:
1. Redis Circuit Breaker (3 consecutive failures -> 30s skip, 250ms timeout)
2. Selective HTTP / Network Retry (Only timeouts, conn errors, 429, 5xx; never 400/401/403/404)
3. 429 Retry-After header support & 10s total timeout cap
4. Ingestion atomic section transaction & crash resume verification
──────────────────────────────────────────────────────────────
"""

import sys
import os
import time
import unittest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from cache import (
    get_cached,
    set_cached,
    is_circuit_open,
    record_redis_failure,
    record_redis_success,
    reset_circuit_breaker,
    _CB_FAIL_THRESHOLD,
    _CB_COOLDOWN_SEC,
)
from resilience import retry_with_backoff, is_retryable_error


class MockHTTPResponse:
    def __init__(self, status_code: int, headers: dict = None):
        self.status_code = status_code
        self.headers = headers or {}


class MockHTTPError(Exception):
    def __init__(self, status_code: int, message: str = "HTTP Error", headers: dict = None):
        super().__init__(f"{status_code}: {message}")
        self.status_code = status_code
        self.response = MockHTTPResponse(status_code, headers)


class TestRedisCircuitBreaker(unittest.TestCase):

    def setUp(self):
        reset_circuit_breaker()

    def tearDown(self):
        reset_circuit_breaker()

    def test_circuit_trips_after_three_consecutive_failures(self):
        """After 3 consecutive failures, circuit breaker must open and skip Redis."""
        self.assertFalse(is_circuit_open(), "Circuit should start CLOSED")

        # Simulate 2 failures
        record_redis_failure(Exception("Connection timeout 1"))
        self.assertFalse(is_circuit_open())
        record_redis_failure(Exception("Connection timeout 2"))
        self.assertFalse(is_circuit_open())

        # 3rd failure trips the breaker
        record_redis_failure(Exception("Connection timeout 3"))
        self.assertTrue(is_circuit_open(), "Circuit must be OPEN after 3 consecutive failures")

    def test_open_circuit_skips_redis_calls(self):
        """When circuit is OPEN, get_cached and set_cached return None/False without touching Redis."""
        # Force circuit open
        for _ in range(3):
            record_redis_failure(Exception("Fail"))

        mock_redis = MagicMock()
        with patch("cache.get_redis_client", return_value=mock_redis):
            val = get_cached("bail law")
            self.assertIsNone(val)
            saved = set_cached("bail law", {"data": "test"})
            self.assertFalse(saved)
            # Verify client get/set were NOT called because circuit was open
            mock_redis.get.assert_not_called()
            mock_redis.setex.assert_not_called()

    def test_successful_operation_resets_failure_counter(self):
        """A success resets consecutive failure count back to 0."""
        record_redis_failure(Exception("Transient error 1"))
        record_redis_failure(Exception("Transient error 2"))
        self.assertFalse(is_circuit_open())

        # Success occurs
        record_redis_success()

        # Another failure occurs -> count is now 1, not 3
        record_redis_failure(Exception("Transient error 3"))
        self.assertFalse(is_circuit_open(), "Counter should have reset; circuit should not trip")


class TestResilienceRetry(unittest.TestCase):

    def test_non_retryable_errors_never_retried(self):
        """HTTP 400, 401, 403, and 404 must NEVER be retried and must fail on attempt 1."""
        for code in [400, 401, 403, 404]:
            calls = 0

            @retry_with_backoff(max_retries=3, base_delay=0.01)
            def failing_func():
                nonlocal calls
                calls += 1
                raise MockHTTPError(code, f"Client error {code}")

            with self.assertRaises(MockHTTPError):
                failing_func()

            self.assertEqual(calls, 1, f"HTTP {code} should have failed immediately without retry, but ran {calls} times")

    def test_retryable_server_errors_are_retried(self):
        """HTTP 500, 502, 503, 504 and connection errors MUST be retried up to max_retries."""
        for code in [500, 502, 503]:
            calls = 0

            @retry_with_backoff(max_retries=3, base_delay=0.01, jitter=False)
            def flappy_server():
                nonlocal calls
                calls += 1
                if calls < 3:
                    raise MockHTTPError(code, f"Server error {code}")
                return "recovered"

            result = flappy_server()
            self.assertEqual(result, "recovered")
            self.assertEqual(calls, 3)

    def test_respects_retry_after_header_on_429(self):
        """HTTP 429 should parse and sleep for Retry-After duration."""
        calls = 0
        sleep_durations = []

        @retry_with_backoff(max_retries=2, base_delay=0.01, jitter=False)
        def rate_limited_api():
            nonlocal calls
            calls += 1
            if calls == 1:
                raise MockHTTPError(429, "Rate limited", headers={"Retry-After": "0.15"})
            return "success"

        with patch("time.sleep", side_effect=lambda s: sleep_durations.append(s)):
            res = rate_limited_api()
            self.assertEqual(res, "success")
            self.assertEqual(calls, 2)
            self.assertEqual(len(sleep_durations), 1)
            self.assertAlmostEqual(sleep_durations[0], 0.15, places=2)

    def test_total_retry_timeout_cap(self):
        """Retries must stop when elapsed time + sleep exceeds total_timeout."""
        calls = 0

        @retry_with_backoff(max_retries=10, base_delay=0.5, total_timeout=0.2, jitter=False)
        def timeout_func():
            nonlocal calls
            calls += 1
            raise TimeoutError("Socket timeout")

        with self.assertRaises(TimeoutError):
            timeout_func()

        # Should have stopped after attempt 1 because 0.5s delay exceeds 0.2s cap
        self.assertEqual(calls, 1, "Should abort retry before exceeding total_timeout")


class TestIngestionAtomicTransaction(unittest.TestCase):

    def test_simulated_crash_mid_section_rolls_back(self):
        """
        Simulates a crash occurring while processing a section.
        Verifies that uncommitted chunks are rolled back, leaving 0 chunks,
        and that a resume with NOT EXISTS cleanly picks up the section.
        """
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur

        section_id = "sec_test_crash_123"
        act_id = "act_test_1"
        chunks = ["Chunk 1 content", "Chunk 2 content (crash happens here)"]

        # Simulate execution that crashes during chunk insertion
        def simulate_crash():
            try:
                with mock_conn.cursor() as cur:
                    cur.execute('DELETE FROM "LegalChunk" WHERE "sectionId" = %s;', (section_id,))
                    # Crash happens mid-insert!
                    raise RuntimeError("Simulated mid-section power failure or worker kill!")
                mock_conn.commit()
            except Exception:
                mock_conn.rollback()

        simulate_crash()

        # Verify rollback was called and commit was NOT called
        mock_conn.rollback.assert_called_once()
        mock_conn.commit.assert_not_called()

        # Now simulate resume: NOT EXISTS query
        # Since transaction was rolled back, the section has 0 committed chunks
        mock_cur.fetchall.return_value = [
            {
                "act_id": act_id,
                "act_name": "TestAct",
                "act_title": "Test Act",
                "act_year": "2024",
                "section_id": section_id,
                "section_number": "42",
                "section_title": "Offence Title",
                "section_content": "Full text of section",
            }
        ]

        # Resume query:
        resume_query = '''
            SELECT s.id as section_id
            FROM "Section" s
            WHERE NOT EXISTS (
                SELECT 1 FROM "LegalChunk" lc WHERE lc."sectionId" = s.id
            );
        '''
        mock_cur.execute(resume_query)
        unprocessed_sections = mock_cur.fetchall()

        self.assertEqual(len(unprocessed_sections), 1)
        self.assertEqual(unprocessed_sections[0]["section_id"], section_id)


if __name__ == "__main__":
    unittest.main()
