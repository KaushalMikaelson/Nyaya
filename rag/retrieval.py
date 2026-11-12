"""
rag/retrieval.py
──────────────────────────────────────────────────────────────
Hybrid Retrieval (pgvector + Postgres FTS via RRF) & Cohere Reranking.
──────────────────────────────────────────────────────────────
"""

import os
import re
import time
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
RAG_VECTOR_SEARCH = os.getenv("RAG_VECTOR_SEARCH", "true").strip().lower() not in {"0", "false", "no", "off"}

cohere_client: Optional[cohere.Client] = None
if COHERE_API_KEY:
    try:
        cohere_client = cohere.Client(api_key=COHERE_API_KEY)
    except Exception as err:
        print(f"[WARN] Cohere client initialization warning: {err}")

def get_db_connection(max_retries: int = 3):
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is missing!")
    for attempt in range(1, max_retries + 1):
        try:
            return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor, connect_timeout=5)
        except Exception as e:
            if attempt == max_retries:
                raise
            time.sleep(attempt * 0.5)

def hybrid_search(
    query: str,
    query_embedding: Optional[List[float]] = None,
    act_short_name: Optional[str] = None,
    top_k: int = 20,
    rrf_k: int = 60,
    use_vector: bool = True,
    use_fts: bool = True,
    team_ids: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Executes a Reciprocal Rank Fusion (RRF) search over LegalChunk table in PostgreSQL.
    Combines vector search (pgvector <=>), keyword search (websearch_to_tsquery),
    and exact section/article number matching.

    Args:
        rrf_k:      RRF constant (default 60). Score = 1/(rrf_k + rank).
        use_vector: If False, skip the vector search leg (BM25-only mode).
        use_fts:    If False, skip the keyword search leg (semantic-only mode).
    """
    query_clean = re.sub(r'[^a-zA-Z0-9 ]', ' ', query).strip()
    query_str = ' '.join(query_clean.split()) or query.strip()[:200] or "law"
    # Honor use_vector flag: disable vector even if embedding is provided
    vector_str = (
        f"[{','.join(map(str, query_embedding))}]"
        if query_embedding and RAG_VECTOR_SEARCH and use_vector
        else None
    )
    like_terms = [f"%{term}%" for term in query_str.split()[:5] if len(term) >= 3]

    # Extract explicit Section or Article numbers (e.g. "Section 103", "Sec 103", "Article 21", "103")
    sec_matches = re.findall(r'(?:section|sec|article|art|§)\.?\s*(\d+[A-Z]?)', query, re.IGNORECASE)
    explicit_sec_num = sec_matches[0] if sec_matches else None

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # ── RBAC / Team Pre-Filtering ─────────────────────────────
            team_clause = ""
            perm_act_ids = []
            perm_section_ids = []
            act_id = None
            is_small_perm_team = False

            if team_ids:
                cur.execute("""
                    SELECT "actId", "sectionId"
                    FROM "DocumentPermission"
                    WHERE "teamId" = ANY(%s) AND "canRead" = true;
                """, (team_ids,))
                perms = cur.fetchall()
                if not perms:
                    # User belongs to teams, but none have read permissions
                    return []

                perm_act_ids = [p["actId"] for p in perms if p.get("actId")]
                perm_section_ids = [p["sectionId"] for p in perms if p.get("sectionId")]

                # Fallback to exact candidate search if permitted scope is small (<= 100 sections)
                # to prevent HNSW ANN graph traversal from pruning sparse nodes prematurely.
                if not perm_act_ids and len(perm_section_ids) <= 100:
                    is_small_perm_team = True

            if act_short_name and act_short_name != 'All Acts':
                cur.execute('SELECT id FROM "Act" WHERE "shortName" = %s LIMIT 1;', (act_short_name,))
                act_row = cur.fetchone()
                if act_row:
                    act_id = act_row['id']
                    if team_ids and perm_act_ids and act_id not in perm_act_ids and not perm_section_ids:
                        return []

            if is_small_perm_team:
                # EXACT CANDIDATE SEARCH FALLBACK:
                # Pre-filter permitted chunks via MATERIALIZED CTE so pgvector evaluates exact
                # cosine distance directly on the small candidate pool (<= 100 rows), guaranteeing 100% recall.
                if vector_str and use_fts:
                    sql = f"""
                    WITH permitted_chunks AS MATERIALIZED (
                        SELECT id, content, "actId", "sectionId", "clauseId", embedding, fts
                        FROM "LegalChunk"
                        WHERE "sectionId" = ANY(%s)
                    ),
                    vector_search AS (
                        SELECT id, content, "actId", "sectionId", "clauseId",
                               ROW_NUMBER() OVER(ORDER BY embedding <=> CAST(%s AS vector)) as rnk
                        FROM permitted_chunks
                        WHERE embedding IS NOT NULL
                        ORDER BY embedding <=> CAST(%s AS vector)
                        LIMIT 30
                    ),
                    keyword_search AS (
                        SELECT id, content, "actId", "sectionId", "clauseId",
                               ROW_NUMBER() OVER(ORDER BY ts_rank_cd(fts, websearch_to_tsquery('english', %s)) DESC) as rnk
                        FROM permitted_chunks
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
                        (COALESCE(1.0 / ({rrf_k} + v.rnk), 0.0) + COALESCE(1.0 / ({rrf_k} + k.rnk), 0.0)) as rrf_score
                    FROM vector_search v
                    FULL OUTER JOIN keyword_search k ON v.id = k.id
                    ORDER BY rrf_score DESC
                    LIMIT %s;
                    """
                    query_params = (perm_section_ids, vector_str, vector_str, query_str, query_str, query_str, top_k)
                elif vector_str and not use_fts:
                    sql = """
                    WITH permitted_chunks AS MATERIALIZED (
                        SELECT id, content, "actId", "sectionId", "clauseId", embedding
                        FROM "LegalChunk"
                        WHERE "sectionId" = ANY(%s)
                    )
                    SELECT id, content, "actId" as act_id, "sectionId" as section_id, "clauseId" as clause_id,
                           (1.0 - (embedding <=> CAST(%s AS vector))) as rrf_score
                    FROM permitted_chunks
                    WHERE embedding IS NOT NULL
                    ORDER BY embedding <=> CAST(%s AS vector)
                    LIMIT %s;
                    """
                    query_params = (perm_section_ids, vector_str, vector_str, top_k)
                else:
                    sql = """
                    WITH permitted_chunks AS MATERIALIZED (
                        SELECT id, content, "actId", "sectionId", "clauseId", fts, content
                        FROM "LegalChunk"
                        WHERE "sectionId" = ANY(%s)
                    )
                    SELECT id, content, "actId", "sectionId", "clauseId",
                           ts_rank_cd(COALESCE(fts, to_tsvector('english', content)), websearch_to_tsquery('english', %s)) as rrf_score
                    FROM permitted_chunks
                    WHERE COALESCE(fts, to_tsvector('english', content)) @@ websearch_to_tsquery('english', %s)
                    ORDER BY rrf_score DESC
                    LIMIT %s;
                    """
                    query_params = (perm_section_ids, query_str, query_str, top_k)
            else:
                # Standard or Large-Scope Filtered Search:
                # Optimize pgvector HNSW index scan parameters if permissions are active
                if team_ids:
                    try:
                        cur.execute("SET LOCAL hnsw.ef_search = 150;")
                        cur.execute("SET LOCAL hnsw.iterative_scan = relaxed_order;")
                    except Exception:
                        pass

                # Build filter predicate
                filter_clauses = []
                base_params = []
                if act_id:
                    filter_clauses.append('"actId" = %s')
                    base_params.append(act_id)
                elif perm_act_ids and perm_section_ids:
                    filter_clauses.append('("actId" = ANY(%s) OR "sectionId" = ANY(%s))')
                    base_params.extend([perm_act_ids, perm_section_ids])
                elif perm_act_ids:
                    filter_clauses.append('"actId" = ANY(%s)')
                    base_params.append(perm_act_ids)
                elif perm_section_ids:
                    filter_clauses.append('"sectionId" = ANY(%s)')
                    base_params.append(perm_section_ids)

                where_filter = f"WHERE {' AND '.join(filter_clauses)}" if filter_clauses else ""
                and_filter = f"AND {' AND '.join(filter_clauses)}" if filter_clauses else ""

                if vector_str and use_fts:
                    sql = f"""
                    WITH vector_search AS (
                      SELECT id, content, "actId", "sectionId", "clauseId",
                             ROW_NUMBER() OVER(ORDER BY embedding <=> CAST(%s AS vector)) as rnk
                      FROM "LegalChunk"
                      {where_filter}
                      ORDER BY embedding <=> CAST(%s AS vector)
                      LIMIT 30
                    ),
                    keyword_search AS (
                      SELECT id, content, "actId", "sectionId", "clauseId",
                             ROW_NUMBER() OVER(ORDER BY ts_rank_cd(fts, websearch_to_tsquery('english', %s)) DESC) as rnk
                      FROM "LegalChunk"
                      WHERE fts @@ websearch_to_tsquery('english', %s) {and_filter}
                      ORDER BY ts_rank_cd(fts, websearch_to_tsquery('english', %s)) DESC
                      LIMIT 30
                    )
                    SELECT 
                      COALESCE(v.id, k.id) as id,
                      COALESCE(v.content, k.content) as content,
                      COALESCE(v."actId", k."actId") as act_id,
                      COALESCE(v."sectionId", k."sectionId") as section_id,
                      COALESCE(v."clauseId", k."clauseId") as clause_id,
                      (COALESCE(1.0 / ({rrf_k} + v.rnk), 0.0) + COALESCE(1.0 / ({rrf_k} + k.rnk), 0.0)) as rrf_score
                    FROM vector_search v
                    FULL OUTER JOIN keyword_search k ON v.id = k.id
                    ORDER BY rrf_score DESC
                    LIMIT %s;
                    """
                    query_params = tuple([vector_str] + base_params + [vector_str, query_str, query_str] + base_params + [query_str, top_k])
                elif vector_str and not use_fts:
                    sql = f"""
                    SELECT id, content, "actId" as act_id, "sectionId" as section_id, "clauseId" as clause_id,
                           (1.0 - (embedding <=> CAST(%s AS vector))) as rrf_score
                    FROM "LegalChunk"
                    {where_filter}
                    ORDER BY embedding <=> CAST(%s AS vector)
                    LIMIT %s;
                    """
                    query_params = tuple([vector_str] + base_params + [vector_str, top_k])
                else:
                    sql = f"""
                    SELECT id, content, "actId", "sectionId", "clauseId",
                           ts_rank_cd(COALESCE(fts, to_tsvector('english', content)), websearch_to_tsquery('english', %s)) as rrf_score
                    FROM "LegalChunk"
                    WHERE COALESCE(fts, to_tsvector('english', content)) @@ websearch_to_tsquery('english', %s) {and_filter}
                    ORDER BY rrf_score DESC
                    LIMIT %s;
                    """
                    query_params = tuple([query_str, query_str] + base_params + [top_k])

            cur.execute(sql, query_params)
            rows = cur.fetchall()

            if not rows and not vector_str and like_terms:
                like_predicate = " OR ".join(["content ILIKE %s"] * len(like_terms))
                like_params: list[Any] = []
                like_params.extend(like_terms)
                if act_id:
                    like_predicate = f"({like_predicate}) AND \"actId\" = %s"
                    like_params.append(act_id)
                like_params.append(top_k)
                cur.execute(f"""
                    SELECT id, content, "actId", "sectionId", "clauseId", 0.01 as rrf_score
                    FROM "LegalChunk"
                    WHERE {like_predicate}
                    ORDER BY "createdAt" DESC
                    LIMIT %s;
                """, tuple(like_params))
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
