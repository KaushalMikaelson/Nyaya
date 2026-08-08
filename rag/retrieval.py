"""
rag/retrieval.py
──────────────────────────────────────────────────────────────
Hybrid Retrieval (pgvector + Postgres FTS via RRF) & Cohere Reranking.
──────────────────────────────────────────────────────────────
"""

import os
import re
from typing import List, Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
import cohere
from dotenv import load_dotenv

env_paths = [
    os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
    os.path.join(os.path.dirname(__file__), "..", ".env"),
    os.path.join(os.path.dirname(__file__), ".env"),
]
for p in env_paths:
    if os.path.exists(p):
        load_dotenv(p)

DATABASE_URL = os.getenv("DATABASE_URL")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")

cohere_client: Optional[cohere.Client] = None
if COHERE_API_KEY:
    try:
        cohere_client = cohere.Client(api_key=COHERE_API_KEY)
    except Exception as err:
        print(f"[WARN] Cohere client initialization warning: {err}")

def get_db_connection():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is missing!")
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def hybrid_search(
    query: str,
    query_embedding: List[float],
    act_short_name: Optional[str] = None,
    top_k: int = 20
) -> List[Dict[str, Any]]:
    """
    Executes a Reciprocal Rank Fusion (RRF) search over LegalChunk table in PostgreSQL.
    Combines vector search (pgvector <=>), keyword search (websearch_to_tsquery),
    and exact section/article number matching.
    """
    query_clean = re.sub(r'[^a-zA-Z0-9 ]', ' ', query).strip()
    query_str = ' '.join(query_clean.split()) or query.strip()[:200] or "law"
    vector_str = f"[{','.join(map(str, query_embedding))}]"

    # Extract explicit Section or Article numbers (e.g. "Section 103", "Sec 103", "Article 21", "103")
    sec_matches = re.findall(r'(?:section|sec|article|art|§)\.?\s*(\d+[A-Z]?)', query, re.IGNORECASE)
    explicit_sec_num = sec_matches[0] if sec_matches else None

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            act_id = None
            if act_short_name and act_short_name != 'All Acts':
                cur.execute('SELECT id FROM "Act" WHERE "shortName" = %s LIMIT 1;', (act_short_name,))
                act_row = cur.fetchone()
                if act_row:
                    act_id = act_row['id']

            if act_id:
                sql = """
                WITH vector_search AS (
                  SELECT id, content, "actId", "sectionId", "clauseId",
                         ROW_NUMBER() OVER(ORDER BY embedding <=> CAST(%s AS vector)) as rnk
                  FROM "LegalChunk"
                  WHERE "actId" = %s
                  ORDER BY embedding <=> CAST(%s AS vector)
                  LIMIT 30
                ),
                keyword_search AS (
                  SELECT id, content, "actId", "sectionId", "clauseId",
                         ROW_NUMBER() OVER(ORDER BY ts_rank_cd(fts, websearch_to_tsquery('english', %s)) DESC) as rnk
                  FROM "LegalChunk"
                  WHERE fts @@ websearch_to_tsquery('english', %s) AND "actId" = %s
                  ORDER BY ts_rank_cd(fts, websearch_to_tsquery('english', %s)) DESC
                  LIMIT 30
                )
                SELECT 
                  COALESCE(v.id, k.id) as id,
                  COALESCE(v.content, k.content) as content,
                  COALESCE(v."actId", k."actId") as act_id,
                  COALESCE(v."sectionId", k."sectionId") as section_id,
                  COALESCE(v."clauseId", k."clauseId") as clause_id,
                  (COALESCE(1.0 / (60 + v.rnk), 0.0) + COALESCE(1.0 / (60 + k.rnk), 0.0)) as rrf_score
                FROM vector_search v
                FULL OUTER JOIN keyword_search k ON v.id = k.id
                ORDER BY rrf_score DESC
                LIMIT %s;
                """
                query_params = (vector_str, act_id, vector_str, query_str, query_str, act_id, query_str, top_k)
            else:
                sql = """
                WITH vector_search AS (
                  SELECT id, content, "actId", "sectionId", "clauseId",
                         ROW_NUMBER() OVER(ORDER BY embedding <=> CAST(%s AS vector)) as rnk
                  FROM "LegalChunk"
                  ORDER BY embedding <=> CAST(%s AS vector)
                  LIMIT 30
                ),
                keyword_search AS (
                  SELECT id, content, "actId", "sectionId", "clauseId",
                         ROW_NUMBER() OVER(ORDER BY ts_rank_cd(fts, websearch_to_tsquery('english', %s)) DESC) as rnk
                  FROM "LegalChunk"
                  WHERE fts @@ websearch_to_tsquery('english', %s)
                  ORDER BY ts_rank_cd(fts, websearch_to_tsquery('english', %s)) DESC
                  LIMIT 30
                )
                SELECT 
                  COALESCE(v.id, k.id) as id,
                  COALESCE(v.content, k.content) as content,
                  COALESCE(v."actId", k."actId") as act_id,
                  COALESCE(v."sectionId", k."sectionId") as section_id,
                  COALESCE(v."clauseId", k."clauseId") as clause_id,
                  (COALESCE(1.0 / (60 + v.rnk), 0.0) + COALESCE(1.0 / (60 + k.rnk), 0.0)) as rrf_score
                FROM vector_search v
                FULL OUTER JOIN keyword_search k ON v.id = k.id
                ORDER BY rrf_score DESC
                LIMIT %s;
                """
                query_params = (vector_str, vector_str, query_str, query_str, query_str, top_k)

            cur.execute(sql, query_params)
            rows = cur.fetchall()

            # Exact section match query if explicit section number was extracted
            exact_rows = []
            if explicit_sec_num:
                if act_id:
                    sec_sql = """
                    SELECT c.id, c.content, c."actId", c."sectionId", c."clauseId", 0.5 as rrf_score
                    FROM "LegalChunk" c
                    JOIN "Section" s ON c."sectionId" = s.id
                    WHERE s.number = %s AND c."actId" = %s
                    ORDER BY c.id
                    LIMIT 5;
                    """
                    cur.execute(sec_sql, (explicit_sec_num, act_id))
                else:
                    sec_sql = """
                    SELECT c.id, c.content, c."actId", c."sectionId", c."clauseId", 0.5 as rrf_score
                    FROM "LegalChunk" c
                    JOIN "Section" s ON c."sectionId" = s.id
                    WHERE s.number = %s
                    ORDER BY c.id
                    LIMIT 5;
                    """
                    cur.execute(sec_sql, (explicit_sec_num,))
                exact_rows = cur.fetchall()

            # Merge exact section match rows at top if not already present
            existing_ids = {r['id'] for r in rows}
            merged_rows = []
            for er in exact_rows:
                if er['id'] not in existing_ids:
                    merged_rows.append(er)
                    existing_ids.add(er['id'])
            merged_rows.extend(rows)
            rows = merged_rows[:top_k]

            if not rows:
                return []

            # Hydrate metadata (Act, Section, Clause)
            chunk_ids = [r['id'] for r in rows]
            cur.execute("""
                SELECT 
                    c.id, c.content, c."actId", c."sectionId", c."clauseId",
                    a."title" as act_title, a."shortName" as act_short_name,
                    s."number" as section_number, s."title" as section_title,
                    cl."number" as clause_number
                FROM "LegalChunk" c
                LEFT JOIN "Act" a ON c."actId" = a.id
                LEFT JOIN "Section" s ON c."sectionId" = s.id
                LEFT JOIN "Clause" cl ON c."clauseId" = cl.id
                WHERE c.id IN %s;
            """, (tuple(chunk_ids),))
            hydrated = {h['id']: h for h in cur.fetchall()}

            results = []
            for r in rows:
                meta = hydrated.get(r['id'], {})
                results.append({
                    "id": r['id'],
                    "content": r['content'],
                    "rrf_score": float(r['rrf_score']),
                    "act": {
                        "id": meta.get("actId"),
                        "title": meta.get("act_title"),
                        "shortName": meta.get("act_short_name")
                    } if meta.get("act_short_name") else None,
                    "section": {
                        "id": meta.get("sectionId"),
                        "number": meta.get("section_number"),
                        "title": meta.get("section_title")
                    } if meta.get("section_number") else None,
                    "clause": {
                        "id": meta.get("clauseId"),
                        "number": meta.get("clause_number")
                    } if meta.get("clause_number") else None,
                })

            return results
    finally:
        conn.close()

def rerank_candidates(
    query: str,
    candidates: List[Dict[str, Any]],
    top_n: int = 8
) -> List[Dict[str, Any]]:
    """Reranks candidate legal chunks using Cohere Rerank API."""
    if not candidates:
        return []
    if not cohere_client or not COHERE_API_KEY:
        return candidates[:top_n]

    documents = [c.get("content", "") for c in candidates]
    try:
        res = cohere_client.rerank(
            model="rerank-english-v3.0",
            query=query,
            documents=documents,
            top_n=top_n
        )
        reranked = []
        for r in res.results:
            cand = dict(candidates[r.index])
            cand["score"] = float(r.relevance_score)
            reranked.append(cand)
        return reranked
    except Exception as err:
        print(f"[WARN] Cohere rerank error: {err}. Falling back to top-N hybrid candidates.")
        return candidates[:top_n]
