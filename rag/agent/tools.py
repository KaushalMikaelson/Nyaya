"""
rag/agent/tools.py
──────────────────────────────────────────────────────────────
Tool execution implementations and OpenAI/Groq function calling
definitions for the Nyaay Research Agent.
──────────────────────────────────────────────────────────────
"""

import re
import sys
import os
from typing import Dict, Any, List, Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from retrieval import hybrid_search, rerank_candidates, get_db_connection
from embeddings import embed_query
from agent.security import wrap_document_boundary


def tool_search_cases(query: str, act_filter: Optional[str] = None, top_k: int = 5) -> Dict[str, Any]:
    """Execute hybrid search & rerank to find relevant statutory sections."""
    query_emb = embed_query(query)
    candidates = hybrid_search(
        query=query,
        query_embedding=query_emb,
        act_short_name=act_filter,
        top_k=min(20, max(5, top_k * 2))
    )
    reranked = rerank_candidates(query, candidates, top_n=top_k)

    results = []
    for c in reranked:
        act_meta = c.get("act") or {}
        sec_meta = c.get("section") or {}
        meta_dict = {
            "act": act_meta.get("shortName") or act_meta.get("title") or "Unknown",
            "section": sec_meta.get("number") or "N/A",
            "section_title": sec_meta.get("title") or ""
        }
        results.append({
            "doc_id": c.get("id"),
            "score": c.get("score") or c.get("rrf_score"),
            "metadata": meta_dict,
            "bounded_content": wrap_document_boundary(c.get("id"), c.get("content", ""), meta_dict)
        })

    return {"count": len(results), "documents": results}


def tool_get_document(doc_id: str) -> Dict[str, Any]:
    """Fetch full document section content by chunk ID."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute('''
                SELECT lc.id, lc.content,
                       a."shortName" as act_short_name, a.title as act_title, a.year as act_year,
                       s.number as section_number, s.title as section_title, s.content as full_section_content
                FROM "LegalChunk" lc
                LEFT JOIN "Act" a ON a.id = lc."actId"
                LEFT JOIN "Section" s ON s.id = lc."sectionId"
                WHERE lc.id = %s;
            ''', (doc_id,))
            row = cur.fetchone()
            if not row:
                return {"error": f"Document {doc_id} not found."}

            meta = {
                "act": row.get("act_short_name") or row.get("act_title"),
                "year": row.get("act_year"),
                "section": row.get("section_number"),
                "section_title": row.get("section_title"),
            }
            content = row.get("full_section_content") or row.get("content") or ""
            return {
                "doc_id": doc_id,
                "metadata": meta,
                "bounded_content": wrap_document_boundary(doc_id, content, meta)
            }
    finally:
        conn.close()


def tool_get_citations(doc_id: str) -> Dict[str, Any]:
    """Extract statutory cross-references (Sections, Articles, Acts) from a document."""
    doc = tool_get_document(doc_id)
    if "error" in doc:
        return doc

    content = doc.get("bounded_content", "")
    citations = set()

    # Find Section references
    sec_matches = re.findall(r'(?i)\bsection\s+(\d+[A-Z]?(?:\(\d+\))*)', content)
    for m in sec_matches:
        citations.add(f"Section {m}")

    # Find Article references
    art_matches = re.findall(r'(?i)\barticle\s+(\d+[A-Z]?(?:\(\d+\))*)', content)
    for m in art_matches:
        citations.add(f"Article {m}")

    # Find Act references
    act_matches = re.findall(r'\b(?:Bharatiya Nyaya Sanhita|Bharatiya Nagarik Suraksha Sanhita|Constitution of India|Code of Civil Procedure|Indian Contract Act)\b', content, re.IGNORECASE)
    for m in act_matches:
        citations.add(m.title())

    return {
        "doc_id": doc_id,
        "citations": sorted(list(citations))
    }


import difflib

def normalize_legal_text(text: str) -> str:
    r"""
    Normalize text for robust statutory quote matching across realistic PDF-extraction artifacts:
      - Remove soft hyphens (\xad, \u00ad)
      - Fix line-break hyphenation (e.g. 'punish-\n ment' -> 'punishment')
      - Normalize unicode curly quotes and backticks (“ ” ‘ ’ ` ' -> ' or ")
      - Normalize unicode dashes (— – − -> -)
      - Collapse whitespace (\s+ -> single space)
      - Casefold for case-insensitive matching
    """
    if not text:
        return ""
    # 1. Remove soft hyphens
    t = text.replace('\xad', '').replace('\u00ad', '')
    # 2. Fix line-break hyphenation: word- \n word -> wordword
    t = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', t)
    # 3. Normalize unicode quotes
    t = re.sub(r'[\u201c\u201d\u201e\u201f\u00ab\u00bb]', '"', t)
    t = re.sub(r'[\u2018\u2019\u201a\u201b\u2032`]', "'", t)
    # 4. Normalize unicode dashes
    t = re.sub(r'[\u2013\u2014\u2015\u2212]', '-', t)
    # 5. Collapse whitespace and line breaks
    t = re.sub(r'\s+', ' ', t).strip()
    # 6. Casefold
    return t.casefold()


def compute_near_miss_similarity(quote: str, source: str) -> float:
    """
    Compute best match similarity ratio (0.0 to 1.0) using sliding window sequence matching
    over normalized source text.
    """
    if not quote or not source:
        return 0.0
    q_len = len(quote)
    if len(source) <= q_len:
        return difflib.SequenceMatcher(None, quote, source).ratio()

    best_ratio = 0.0
    step = max(1, q_len // 4)
    for i in range(0, len(source) - q_len + 1, step):
        window = source[i : i + q_len]
        r = difflib.SequenceMatcher(None, quote, window).ratio()
        if r > best_ratio:
            best_ratio = r
            if best_ratio >= 0.98:
                break
    return round(best_ratio, 3)


def tool_verify_quote(doc_id: str, quote: str) -> Dict[str, Any]:
    """
    Verify that a quoted claim exists in the source document.
    Returns match_type ("exact" or "normalized" or None) and similarity_score for near-misses.

    Limitation: verify_quote confirms a quote exists in the statute, not that the
    claim is correctly supported by it. Substantive legal correctness requires legal review.
    """
    doc = tool_get_document(doc_id)
    if "error" in doc:
        return {
            "verified": False,
            "error": doc["error"],
            "match_type": None,
            "similarity_score": 0.0,
            "doc_id": doc_id,
            "quote": quote,
            "match_snippet": None
        }

    raw_doc = doc.get("bounded_content", "")

    # Check 1: Exact verbatim substring match
    if quote in raw_doc:
        return {
            "doc_id": doc_id,
            "quote": quote,
            "verified": True,
            "match_type": "exact",
            "similarity_score": 1.0,
            "match_snippet": quote
        }

    # Check 2: Normalized match (whitespace, quotes, dashes, soft hyphens, line breaks, casefold)
    norm_quote = normalize_legal_text(quote)
    norm_doc = normalize_legal_text(raw_doc)

    if norm_quote in norm_doc:
        return {
            "doc_id": doc_id,
            "quote": quote,
            "verified": True,
            "match_type": "normalized",
            "similarity_score": 1.0,
            "match_snippet": quote
        }

    # Near-miss similarity calculation
    similarity = compute_near_miss_similarity(norm_quote, norm_doc)
    return {
        "doc_id": doc_id,
        "quote": quote,
        "verified": False,
        "match_type": None,
        "similarity_score": similarity,
        "match_snippet": None
    }


AGENT_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "search_cases",
            "description": "Searches Indian legal statutes and sections using hybrid semantic and keyword retrieval.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query explaining the legal question or topic."
                    },
                    "act_filter": {
                        "type": "string",
                        "description": "Optional Act code to filter by (e.g. 'BNS', 'BNSS', 'Constitution', 'CPC')."
                    },
                    "top_k": {
                        "type": "integer",
                        "description": "Number of top results to return (default 5)."
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_document",
            "description": "Retrieves the full text and metadata of a specific statutory document or section.",
            "parameters": {
                "type": "object",
                "properties": {
                    "doc_id": {
                        "type": "string",
                        "description": "The unique document ID returned by search_cases."
                    }
                },
                "required": ["doc_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_citations",
            "description": "Extracts statutory cross-references (mentioned Sections, Articles, Acts) from a document.",
            "parameters": {
                "type": "object",
                "properties": {
                    "doc_id": {
                        "type": "string",
                        "description": "The unique document ID to extract citations from."
                    }
                },
                "required": ["doc_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "verify_quote",
            "description": "Verifies that a quote cited in support of a claim is found verbatim in the source document.",
            "parameters": {
                "type": "object",
                "properties": {
                    "doc_id": {
                        "type": "string",
                        "description": "The document ID containing the quote."
                    },
                    "quote": {
                        "type": "string",
                        "description": "The exact verbatim quote to check."
                    }
                },
                "required": ["doc_id", "quote"]
            }
        }
    }
]

TOOL_DISPATCHER = {
    "search_cases": tool_search_cases,
    "get_document": tool_get_document,
    "get_citations": tool_get_citations,
    "verify_quote": tool_verify_quote,
}
