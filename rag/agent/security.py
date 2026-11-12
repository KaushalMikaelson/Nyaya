"""
rag/agent/security.py
──────────────────────────────────────────────────────────────
Security and prompt injection defenses for Nyaay Research Agent.

1. Wraps retrieved legal text in explicit <document> XML boundaries.
2. Strips prompt injection attempts ("ignore previous instructions").
3. Sanitizes user input before passing to LLM.
──────────────────────────────────────────────────────────────
"""

import re
from typing import Dict, Any

INJECTION_PATTERNS = [
    r"(?i)ignore\s+(all\s+)?(previous|above)\s+instructions?",
    r"(?i)system\s*:\s*",
    r"(?i)assistant\s*:\s*",
    r"(?i)disregard\s+(all\s+)?prior\s+guidelines?",
    r"(?i)you\s+are\s+now\s+in\s+developer\s+mode",
    r"(?i)jailbreak",
]


def neutralize_document_tags(text: str) -> str:
    """
    Neutralize any '</document>' or '<document' XML tag delimiters inside the text
    to prevent document boundary breakout and prompt injection attacks.
    """
    if not text:
        return ""
    # Neutralize closing tag </document...> or </document
    escaped = re.sub(r'(?i)</\s*document', '&lt;/document', text)
    # Neutralize opening tag <document...> or <document
    escaped = re.sub(r'(?i)<\s*document', '&lt;document', escaped)
    return escaped


def sanitize_text(text: str) -> str:
    """Strip known prompt injection attempts and system role overrides (defense in depth)."""
    if not text:
        return ""
    sanitized = text
    for pattern in INJECTION_PATTERNS:
        sanitized = re.sub(pattern, "[BLOCKED_INJECTION]", sanitized)
    return sanitized.strip()


def wrap_document_boundary(doc_id: str, content: str, metadata: Dict[str, Any] = None) -> str:
    """
    Enclose retrieved document text in strict <document> XML boundaries.
    Neutralizes any nested or adversarial document tag delimiters before wrapping.
    """
    # 1. Structural boundary integrity: neutralize any adversarial document XML tags
    safe_content = neutralize_document_tags(content)
    # 2. Defense in depth: sanitize known prompt injection phrases
    clean_content = sanitize_text(safe_content)
    meta_str = ""
    if metadata:
        meta_str = f' act="{metadata.get("act", "")}" section="{metadata.get("section", "")}"'
    return f'<document id="{doc_id}"{meta_str}>\n{clean_content}\n</document>'

