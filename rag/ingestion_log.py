"""
rag/ingestion_log.py
──────────────────────────────────────────────────────────────
Structured per-document error logging during PDF extraction
and chunk embedding ingestion.
──────────────────────────────────────────────────────────────
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, List

LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "logs")
FAILURES_FILE = os.path.join(LOG_DIR, "ingestion_failures.jsonl")

logger = logging.getLogger("nyaay.ingestion")


def record_ingestion_failure(filename: str, stage: str, error: Exception, metadata: Dict[str, Any] = None):
    """Record a failed ingestion attempt to disk for later retry."""
    os.makedirs(LOG_DIR, exist_ok=True)
    entry = {
        "timestamp": datetime.now().isoformat(),
        "filename": filename,
        "stage": stage,
        "error_type": type(error).__name__,
        "error_message": str(error),
        "metadata": metadata or {},
    }
    with open(FAILURES_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")
    logger.error(f"[INGESTION_FAIL] {filename} in {stage}: {error}")


def get_failed_ingestions() -> List[Dict[str, Any]]:
    """Retrieve all logged ingestion failures."""
    if not os.path.exists(FAILURES_FILE):
        return []
    failures = []
    with open(FAILURES_FILE, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                failures.append(json.loads(line.strip()))
    return failures
