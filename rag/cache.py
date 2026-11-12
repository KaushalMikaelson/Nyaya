"""
rag/cache.py
──────────────────────────────────────────────────────────────
Redis search-result cache with RBAC isolation and graceful fallback.

Key Design:
  nyaay:search:{sha256(canonical_query_json)}
  Canonical inputs include:
    - normalized query
    - sorted, deduplicated team_ids
    - act_filter
    - top_k
    - rrf_k
    - use_vector
    - use_fts
    - rerank flag
    - CACHE_VERSION constant
  TTL: default 3600 seconds (1 hour, configurable via NYAAY_CACHE_TTL)

Resilience:
  If Redis is down or times out, all methods fail open (return None / False).
  Search never crashes due to a caching failure.
──────────────────────────────────────────────────────────────
"""

import os
import json
import time
import hashlib
import logging
from typing import Optional, Any, Dict, List

logger = logging.getLogger("nyaay.cache")

try:
    import redis
    _REDIS_AVAILABLE = True
except ImportError:
    redis = None
    _REDIS_AVAILABLE = False

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
DEFAULT_CACHE_TTL = int(os.getenv("NYAAY_CACHE_TTL", "3600"))
CACHE_VERSION = os.getenv("NYAAY_CACHE_VERSION", "v1")

# Redis Circuit Breaker State (skip Redis for 30s after 3 consecutive failures)
_CB_FAIL_THRESHOLD = 3
_CB_COOLDOWN_SEC = 30.0
_consecutive_failures = 0
_circuit_open_until = 0.0

_client: Optional[Any] = None
_client_initialized = False


def is_circuit_open() -> bool:
    """Returns True if the circuit breaker is currently OPEN (skipping Redis)."""
    global _circuit_open_until, _consecutive_failures
    if _circuit_open_until > 0.0:
        if time.time() < _circuit_open_until:
            return True
        # Cooldown expired: transition to HALF-OPEN (allow a retry)
        logger.info("[CIRCUIT BREAKER] Redis cooldown expired. Entering HALF-OPEN state.")
        _circuit_open_until = 0.0
    return False


def record_redis_success():
    """Record a successful Redis operation and reset failure counters."""
    global _consecutive_failures, _circuit_open_until
    if _consecutive_failures > 0 or _circuit_open_until > 0.0:
        logger.info("[CIRCUIT BREAKER] Redis operation succeeded. Circuit is CLOSED.")
    _consecutive_failures = 0
    _circuit_open_until = 0.0


def record_redis_failure(exc: Exception):
    """Record a Redis operation failure and trip circuit breaker if threshold is met."""
    global _consecutive_failures, _circuit_open_until
    _consecutive_failures += 1
    logger.warning(
        f"[CIRCUIT BREAKER] Redis failure ({_consecutive_failures}/{_CB_FAIL_THRESHOLD}): {exc}"
    )
    if _consecutive_failures >= _CB_FAIL_THRESHOLD:
        _circuit_open_until = time.time() + _CB_COOLDOWN_SEC
        logger.error(
            f"[CIRCUIT BREAKER] 3 consecutive failures reached! Tripping circuit breaker: skipping Redis for {_CB_COOLDOWN_SEC}s."
        )


def reset_circuit_breaker():
    """Manual reset for testing or administration."""
    global _consecutive_failures, _circuit_open_until, _client_initialized, _client
    _consecutive_failures = 0
    _circuit_open_until = 0.0
    _client_initialized = False
    _client = None


def get_redis_client() -> Optional[Any]:
    """Lazy initialize and return Redis client with 250ms socket timeouts."""
    global _client, _client_initialized
    if not _REDIS_AVAILABLE:
        return None
    if is_circuit_open():
        return None
    if _client_initialized and _client is not None:
        return _client

    try:
        # Timeout lowered to 250ms (within 200-300ms requirement)
        _client = redis.Redis.from_url(
            REDIS_URL,
            socket_timeout=0.25,
            socket_connect_timeout=0.25,
            decode_responses=True,
        )
        _client.ping()
        record_redis_success()
        logger.info(f"Connected to Redis cache at {REDIS_URL} (timeout=250ms)")
    except Exception as e:
        record_redis_failure(e)
        logger.warning(f"Redis cache unavailable ({e}). Continuing with cache disabled.")
        _client = None

    _client_initialized = True
    return _client


def generate_cache_key(
    query: str,
    team_ids: Optional[List[str]] = None,
    act_filter: Optional[str] = None,
    top_k: int = 20,
    rrf_k: int = 60,
    use_vector: bool = True,
    use_fts: bool = True,
    rerank: bool = True,
    filters: Optional[Dict[str, Any]] = None,
    cache_version: Optional[str] = None,
) -> str:
    """
    Generate deterministic SHA-256 cache key derived from ALL inputs that affect search results:
      - normalized query
      - sorted, deduplicated team_ids
      - normalized act_filter
      - top_k
      - rrf_k
      - use_vector
      - use_fts
      - rerank
      - CACHE_VERSION
      - canonicalized extra filters (category, court)
    """
    norm_query = " ".join(query.strip().lower().split())

    # Extract team_ids from parameter or filters dict
    effective_team_ids = team_ids
    if effective_team_ids is None and filters:
        effective_team_ids = filters.get("teamIds") or filters.get("team_ids")
    
    if effective_team_ids:
        # Sort and deduplicate team IDs to prevent order-dependent cache misses
        norm_teams = sorted(list(set(str(t).strip() for t in effective_team_ids if str(t).strip())))
    else:
        norm_teams = []

    # Extract act_filter from parameter or filters dict
    effective_act = act_filter
    if effective_act is None and filters:
        effective_act = filters.get("act")
    if effective_act and effective_act.strip().lower() in {"all acts", "all", "none", ""}:
        effective_act = None
    norm_act = effective_act.strip() if effective_act else None

    # Extra filters (e.g. category, court) excluding teamIds and act
    extra_filters = {}
    if filters:
        for k, v in filters.items():
            if k not in {"teamIds", "team_ids", "act"}:
                extra_filters[k] = v

    canonical_dict = {
        "v": cache_version or CACHE_VERSION,
        "q": norm_query,
        "teams": norm_teams,
        "act": norm_act,
        "top_k": int(top_k),
        "rrf_k": int(rrf_k),
        "vec": bool(use_vector),
        "fts": bool(use_fts),
        "rrk": bool(rerank),
        "extra": extra_filters,
    }

    canonical_repr = json.dumps(canonical_dict, sort_keys=True, separators=(",", ":"))
    key_hash = hashlib.sha256(canonical_repr.encode("utf-8")).hexdigest()
    return f"nyaay:search:{key_hash}"


def get_cached(
    query: str,
    team_ids: Optional[List[str]] = None,
    act_filter: Optional[str] = None,
    top_k: int = 20,
    rrf_k: int = 60,
    use_vector: bool = True,
    use_fts: bool = True,
    rerank: bool = True,
    filters: Optional[Dict[str, Any]] = None,
    config: Optional[Dict[str, Any]] = None,
) -> Optional[Any]:
    """Retrieve cached search result. Returns None on cache miss or Redis error."""
    if is_circuit_open():
        return None
    client = get_redis_client()
    if client is None:
        return None

    if config:
        top_k = config.get("top_k", top_k)
        rrf_k = config.get("rrf_k", rrf_k)
        use_vector = config.get("use_vector", use_vector)
        use_fts = config.get("use_fts", use_fts)
        rerank = config.get("rerank", rerank)

    key = generate_cache_key(
        query=query,
        team_ids=team_ids,
        act_filter=act_filter,
        top_k=top_k,
        rrf_k=rrf_k,
        use_vector=use_vector,
        use_fts=use_fts,
        rerank=rerank,
        filters=filters,
    )
    try:
        raw_val = client.get(key)
        record_redis_success()
        if raw_val:
            return json.loads(raw_val)
    except Exception as e:
        record_redis_failure(e)
        logger.warning(f"Cache get error for key {key}: {e}")
        return None

    return None


def set_cached(
    query: str,
    payload: Any,
    team_ids: Optional[List[str]] = None,
    act_filter: Optional[str] = None,
    top_k: int = 20,
    rrf_k: int = 60,
    use_vector: bool = True,
    use_fts: bool = True,
    rerank: bool = True,
    filters: Optional[Dict[str, Any]] = None,
    config: Optional[Dict[str, Any]] = None,
    ttl: Optional[int] = None,
) -> bool:
    """Store search result into cache with TTL. Returns True on success, False otherwise."""
    if is_circuit_open():
        return False
    client = get_redis_client()
    if client is None:
        return False

    if config:
        top_k = config.get("top_k", top_k)
        rrf_k = config.get("rrf_k", rrf_k)
        use_vector = config.get("use_vector", use_vector)
        use_fts = config.get("use_fts", use_fts)
        rerank = config.get("rerank", rerank)

    key = generate_cache_key(
        query=query,
        team_ids=team_ids,
        act_filter=act_filter,
        top_k=top_k,
        rrf_k=rrf_k,
        use_vector=use_vector,
        use_fts=use_fts,
        rerank=rerank,
        filters=filters,
    )
    expiry = ttl if ttl is not None else DEFAULT_CACHE_TTL
    try:
        serialized = json.dumps(payload, default=str)
        client.setex(key, expiry, serialized)
        record_redis_success()
        return True
    except Exception as e:
        record_redis_failure(e)
        logger.warning(f"Cache set error for key {key}: {e}")
        return False


def clear_cache(pattern: str = "nyaay:search:*") -> int:
    """Clear cached entries matching pattern. Returns count of deleted keys."""
    if is_circuit_open():
        return 0
    client = get_redis_client()
    if client is None:
        return 0

    try:
        keys = list(client.scan_iter(match=pattern, count=100))
        if keys:
            count = client.delete(*keys)
            record_redis_success()
            return count
        record_redis_success()
        return 0
    except Exception as e:
        record_redis_failure(e)
        logger.warning(f"Cache clear error: {e}")
        return 0


def bump_cache_version() -> str:
    """Increment CACHE_VERSION in memory and return new version string."""
    global CACHE_VERSION
    try:
        if CACHE_VERSION.startswith("v") and CACHE_VERSION[1:].isdigit():
            CACHE_VERSION = f"v{int(CACHE_VERSION[1:]) + 1}"
        else:
            CACHE_VERSION = f"v{int(time.time())}"
    except Exception:
        CACHE_VERSION = f"v{int(time.time())}"
    logger.info(f"CACHE_VERSION bumped to {CACHE_VERSION}")
    return CACHE_VERSION


def flush_search_cache(pattern: str = "nyaay:search:*") -> int:
    """Flush search cache entries matching pattern."""
    return clear_cache(pattern)


def invalidate_search_cache() -> Dict[str, Any]:
    """Bumps cache version and flushes search cache."""
    new_version = bump_cache_version()
    deleted = flush_search_cache()
    logger.info(f"Invalidated search cache: version={new_version}, deleted_keys={deleted}")
    return {"version": new_version, "deleted_keys": deleted}
