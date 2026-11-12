"""
rag/resilience.py
──────────────────────────────────────────────────────────────
Resilience utilities:
- Exponential backoff retry decorator with strict retryable error filtering
- Enforces total retry time cap (default 10s)
- Honors HTTP 429 Retry-After headers
- Strictly rejects retrying 400, 401, 403, 404 client errors
- Safe execution helpers
──────────────────────────────────────────────────────────────
"""

import os
import time
import random
import logging
from functools import wraps
from typing import Callable, Any, Tuple, Type, Optional

logger = logging.getLogger("nyaay.resilience")

NON_RETRYABLE_STATUS_CODES = {400, 401, 403, 404}
RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}


def extract_status_code(exc: Exception) -> Optional[int]:
    """Extract HTTP status code from an exception if available."""
    # Attribute on exception directly (e.g. FastAPI HTTPException, requests status_code)
    if hasattr(exc, "status_code") and isinstance(exc.status_code, int):
        return exc.status_code
    if hasattr(exc, "code") and isinstance(exc.code, int):
        return exc.code

    # Attribute on response object (e.g. requests, httpx)
    response = getattr(exc, "response", None)
    if response is not None:
        if hasattr(response, "status_code") and isinstance(response.status_code, int):
            return response.status_code
        if hasattr(response, "status") and isinstance(response.status, int):
            return response.status

    return None


def extract_retry_after(exc: Exception) -> Optional[float]:
    """Extract Retry-After header duration in seconds if present on exception."""
    headers = None
    response = getattr(exc, "response", None)
    if response is not None and hasattr(response, "headers"):
        headers = response.headers
    elif hasattr(exc, "headers") and exc.headers:
        headers = exc.headers

    if headers:
        raw_val = headers.get("Retry-After") or headers.get("retry-after")
        if raw_val:
            try:
                return float(raw_val)
            except (ValueError, TypeError):
                pass
    return None


def is_retryable_error(exc: Exception) -> Tuple[bool, Optional[float]]:
    """
    Determines if an exception is retryable.
    Returns (is_retryable, retry_after_seconds).
    
    Retryable errors:
      - Timeouts (TimeoutError, socket.timeout)
      - Connection errors (ConnectionError, BrokenPipeError)
      - HTTP 429 (Rate Limit) -> respects Retry-After
      - HTTP 5xx (Server Error: 500, 502, 503, 504)
    
    Non-retryable:
      - HTTP 400, 401, 403, 404
      - Business logic / validation errors
    """
    status_code = extract_status_code(exc)

    if status_code is not None:
        if status_code in NON_RETRYABLE_STATUS_CODES:
            return False, None
        if status_code == 429:
            retry_after = extract_retry_after(exc)
            return True, retry_after
        if status_code in RETRYABLE_STATUS_CODES or (500 <= status_code < 600):
            return True, None
        # Other 4xx errors are not retryable
        if 400 <= status_code < 500:
            return False, None

    # Check exception types
    if isinstance(exc, (TimeoutError, ConnectionError, OSError)):
        return True, None

    # Check class name heuristics for common HTTP/network libraries
    exc_type_name = type(exc).__name__.lower()
    if any(k in exc_type_name for k in ["timeout", "connectionerror", "connecttimeout", "readtimeout"]):
        return True, None

    # Generic or unknown exceptions default to False to prevent infinite retry loops on logic bugs
    return False, None


def retry_with_backoff(
    max_retries: int = 3,
    base_delay: float = 0.5,
    max_delay: float = 5.0,
    total_timeout: float = 10.0,
    backoff_factor: float = 2.0,
    jitter: bool = True,
    fallback_fn: Optional[Callable[..., Any]] = None,
):
    """
    Decorator that retries a function upon retryable network/HTTP errors.
    
    Guarantees:
      - Only retries timeouts, connection errors, HTTP 429, and HTTP 5xx
      - Never retries 400/401/403/404
      - Enforces total retry time cap (default 10s)
      - Respects Retry-After header on 429 when present
    """
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            delay = base_delay
            last_exception = None
            start_time = time.time()

            for attempt in range(1, max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as exc:
                    last_exception = exc
                    elapsed = time.time() - start_time
                    retryable, retry_after = is_retryable_error(exc)

                    if not retryable:
                        logger.warning(
                            f"[RESILIENCE] Non-retryable error ({type(exc).__name__}: {exc}) in {func.__name__}. Aborting retry immediately."
                        )
                        raise exc

                    if attempt == max_retries:
                        logger.warning(
                            f"[RESILIENCE] Function {func.__name__} failed all {max_retries} attempts. Last error: {exc}"
                        )
                        break

                    # Determine sleep duration
                    if retry_after is not None and retry_after > 0:
                        sleep_time = retry_after
                    else:
                        sleep_time = min(delay, max_delay)
                        if jitter:
                            sleep_time *= (0.5 + random.random() * 0.5)

                    # Enforce total retry time cap
                    if elapsed + sleep_time >= total_timeout:
                        logger.warning(
                            f"[RESILIENCE] Total retry timeout ({total_timeout}s) exceeded ({elapsed + sleep_time:.2f}s). Aborting retry."
                        )
                        break

                    logger.info(
                        f"[RESILIENCE] Retry {attempt}/{max_retries} for {func.__name__} after {sleep_time:.2f}s (elapsed: {elapsed:.2f}s) due to: {exc}"
                    )
                    time.sleep(sleep_time)
                    delay *= backoff_factor

            if fallback_fn is not None:
                logger.info(f"[RESILIENCE] Executing fallback handler for {func.__name__}")
                return fallback_fn(*args, **kwargs)

            if last_exception:
                raise last_exception

        return wrapper
    return decorator


def safe_call(func: Callable[..., Any], default: Any = None, *args: Any, **kwargs: Any) -> Any:
    """Execute a callable safely, logging any exception and returning default value on failure."""
    try:
        return func(*args, **kwargs)
    except Exception as e:
        logger.warning(f"[RESILIENCE] Safe call for {getattr(func, '__name__', 'anonymous')} caught exception: {e}")
        return default


DEFAULT_GROQ_FALLBACK_MODELS = [
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "llama-3.3-70b-versatile",
]


def _is_model_not_found_error(exc: Exception) -> bool:
    status = getattr(exc, "status_code", None) or getattr(exc, "status", None)
    msg = str(exc).lower()
    return (
        status == 404
        or "model_not_found" in msg
        or "does not exist or you do not have access" in msg
    )


def groq_chat_completion(client: Any, model: Optional[str] = None, **kwargs: Any) -> Any:
    """
    Call Groq chat.completions.create with automatic fallback when a configured
    model returns 404 model_not_found on the current API key.
    """
    raw_candidates = [
        model,
        os.getenv("GROQ_MODEL"),
        os.getenv("GROQ_FAST_MODEL"),
        *DEFAULT_GROQ_FALLBACK_MODELS,
    ]
    candidates: list[str] = []
    for c in raw_candidates:
        if c and c.strip() and c.strip() not in candidates:
            candidates.append(c.strip())

    last_exc: Optional[Exception] = None
    for candidate in candidates:
        try:
            return client.chat.completions.create(model=candidate, **kwargs)
        except Exception as exc:
            last_exc = exc
            if _is_model_not_found_error(exc):
                logger.warning(f"[RESILIENCE] Groq model '{candidate}' unavailable (404). Trying fallback...")
                continue
            raise

    if last_exc:
        raise last_exc
    raise RuntimeError("No Groq models available")
