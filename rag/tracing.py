"""
rag/tracing.py
──────────────────────────────────────────────────────────────
Lightweight per-stage tracing for Nyaay RAG requests.

Tracks:
  - Latency per stage (embed, retrieval, rerank, generation)
  - Candidate counts into & out of each stage
  - Token counts and estimated inference cost
  - Cache hit/miss status and cache keys
──────────────────────────────────────────────────────────────
"""

import time
import uuid
import logging
from typing import Dict, Any, Optional
from contextlib import contextmanager

logger = logging.getLogger("nyaay.tracing")


class RequestTracer:
    """Collects stage-by-stage execution metrics for a single request."""

    def __init__(self, query: str, request_id: Optional[str] = None):
        self.request_id = request_id or str(uuid.uuid4())
        self.query = query
        self.start_time = time.perf_counter()
        self.stages: Dict[str, Dict[str, Any]] = {}
        self.cache_info: Dict[str, Any] = {"hit": False, "key": None}
        self.metadata: Dict[str, Any] = {}

    @contextmanager
    def stage(self, name: str, **initial_meta):
        """Context manager to measure latency and record metadata for a pipeline stage."""
        stage_data: Dict[str, Any] = dict(initial_meta)
        t0 = time.perf_counter()
        try:
            yield stage_data
        finally:
            elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
            stage_data["latency_ms"] = elapsed_ms
            self.stages[name] = stage_data

    def record_cache(self, hit: bool, key: Optional[str] = None):
        """Record cache check outcome."""
        self.cache_info = {"hit": hit, "key": key}

    def to_dict(self) -> Dict[str, Any]:
        """Produce standard summary dictionary."""
        total_latency_ms = round((time.perf_counter() - self.start_time) * 1000, 2)
        summary = {
            "request_id": self.request_id,
            "query": self.query,
            "stages": self.stages,
            "cache": self.cache_info,
            "total_latency_ms": total_latency_ms,
        }
        if self.metadata:
            summary["metadata"] = self.metadata
        return summary

    def log_summary(self):
        """Log request trace as structured JSON string."""
        summary = self.to_dict()
        logger.info(f"[TRACE] {summary}")
        return summary
