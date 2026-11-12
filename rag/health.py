"""
rag/health.py
──────────────────────────────────────────────────────────────
Detailed dependency health check for Nyaay Microservice.
Evaluates Postgres, Redis, Cohere, and Groq status and latency.
──────────────────────────────────────────────────────────────
"""

import os
import time
import logging
from typing import Dict, Any

logger = logging.getLogger("nyaay.health")


def check_postgres() -> Dict[str, Any]:
    """Test PostgreSQL connectivity and measuring query latency."""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        return {"status": "error", "error": "DATABASE_URL not configured"}

    t0 = time.perf_counter()
    try:
        import psycopg2
        conn = psycopg2.connect(db_url, connect_timeout=3)
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
                cur.fetchone()
            latency_ms = round((time.perf_counter() - t0) * 1000, 2)
            return {"status": "ok", "latency_ms": latency_ms}
        finally:
            conn.close()
    except Exception as e:
        latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        return {"status": "error", "error": str(e), "latency_ms": latency_ms}


def check_redis() -> Dict[str, Any]:
    """Test Redis connectivity and ping latency."""
    t0 = time.perf_counter()
    try:
        from cache import get_redis_client
        client = get_redis_client()
        if client is None:
            return {"status": "error", "error": "Redis client unavailable or not installed"}
        client.ping()
        latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        return {"status": "ok", "latency_ms": latency_ms}
    except Exception as e:
        latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        return {"status": "error", "error": str(e), "latency_ms": latency_ms}


def check_cohere() -> Dict[str, Any]:
    """Verify Cohere API configuration."""
    api_key = os.getenv("COHERE_API_KEY")
    if not api_key:
        return {"status": "disabled", "message": "COHERE_API_KEY not configured"}
    return {"status": "ok", "configured": True}


def check_groq() -> Dict[str, Any]:
    """Verify Groq API configuration."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return {"status": "disabled", "message": "GROQ_API_KEY not configured"}
    return {"status": "ok", "configured": True}


def get_system_health() -> Dict[str, Any]:
    """Aggregate health status across all system components."""
    pg = check_postgres()
    rd = check_redis()
    ch = check_cohere()
    gq = check_groq()

    # Determine overall status:
    # Postgres is critical -> unhealthy if down
    # Redis / Cohere / Groq non-fatal -> degraded if down
    if pg.get("status") != "ok":
        overall = "unhealthy"
    elif rd.get("status") != "ok" or ch.get("status") == "error" or gq.get("status") == "error":
        overall = "degraded"
    else:
        overall = "ok"

    return {
        "status": overall,
        "dependencies": {
            "postgres": pg,
            "redis": rd,
            "cohere": ch,
            "groq": gq,
        }
    }
