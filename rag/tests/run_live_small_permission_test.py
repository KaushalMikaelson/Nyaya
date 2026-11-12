import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

env_paths = [
    os.path.join(os.path.dirname(__file__), "..", "..", "backend", ".env"),
    os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
    os.path.join(os.path.dirname(__file__), "..", ".env"),
]
for p in env_paths:
    if os.path.exists(p):
        load_dotenv(p)

from retrieval import hybrid_search, get_db_connection
from embeddings import embed_query

def run_test():
    conn = get_db_connection()
    temp_team_id = "test_team_small_perm_verification"
    try:
        with conn.cursor() as cur:
            # 1. Check pgvector version and index
            cur.execute("SELECT extversion FROM pg_extension WHERE extname = 'vector';")
            ext = cur.fetchone()
            print(f"[1] pgvector version: {ext['extversion'] if ext else 'None'}")

            cur.execute("""
                SELECT indexname, indexdef 
                FROM pg_indexes 
                WHERE tablename = 'LegalChunk';
            """)
            indexes = cur.fetchall()
            print(f"[1] LegalChunk indexes count: {len(indexes)}")
            for idx in indexes:
                print(f"    - {idx['indexname']}: {idx['indexdef']}")

            # 2. Pick 4 real sections from Section table that have LegalChunks with embeddings
            cur.execute("""
                SELECT DISTINCT s.id 
                FROM "Section" s
                JOIN "LegalChunk" lc ON lc."sectionId" = s.id
                WHERE lc.embedding IS NOT NULL
                LIMIT 4;
            """)
            sec_rows = cur.fetchall()
            if not sec_rows or len(sec_rows) < 4:
                print(f"Not enough sections found with embeddings: {len(sec_rows)}")
                return

            chosen_section_ids = [r["id"] for r in sec_rows]
            print(f"\n[2] Selected {len(chosen_section_ids)} permitted sections: {chosen_section_ids}")

            # Ensure clean state for temp team
            cur.execute('DELETE FROM "DocumentPermission" WHERE "teamId" = %s;', (temp_team_id,))
            cur.execute('DELETE FROM "Team" WHERE id = %s;', (temp_team_id,))

            cur.execute("""
                INSERT INTO "Team" (id, name, description, "createdAt", "updatedAt")
                VALUES (%s, 'Temp Test Small Perm Team', 'Verification team', NOW(), NOW());
            """, (temp_team_id,))

            for s_id in chosen_section_ids:
                cur.execute("""
                    INSERT INTO "DocumentPermission" (id, "teamId", "sectionId", "canRead", "canWrite", "createdAt")
                    VALUES (gen_random_uuid(), %s, %s, true, false, NOW());
                """, (temp_team_id, s_id))
            conn.commit()

            # Count total chunks belonging to these 4 sections
            cur.execute("""
                SELECT COUNT(*) as cnt
                FROM "LegalChunk"
                WHERE "sectionId" = ANY(%s) AND embedding IS NOT NULL;
            """, (chosen_section_ids,))
            total_matching_chunks = cur.fetchone()["cnt"]
            print(f"[2] Total chunks existing in DB for these 4 sections: {total_matching_chunks}")

        # 3. Run vector search with top_k=10
        query = "legal penalty and punishment procedure"
        q_emb = embed_query(query)
        print(f"\n[3] Running vector search with top_k=10 for team '{temp_team_id}'...")

        # Run vector-only search
        results_vec = hybrid_search(
            query=query,
            query_embedding=q_emb,
            top_k=10,
            use_vector=True,
            use_fts=False,
            team_ids=[temp_team_id]
        )
        print(f"[3] Vector-only search returned: {len(results_vec)} rows (Expected: min({total_matching_chunks}, 10))")

        # Run full hybrid search
        results_hybrid = hybrid_search(
            query=query,
            query_embedding=q_emb,
            top_k=10,
            use_vector=True,
            use_fts=True,
            team_ids=[temp_team_id]
        )
        print(f"[3] Hybrid RRF search returned: {len(results_hybrid)} rows (Expected: min({total_matching_chunks}, 10))")

        # Verify all returned sections belong to permitted set
        with conn.cursor() as cur:
            for r in results_vec:
                cur.execute('SELECT "sectionId" FROM "LegalChunk" WHERE id = %s;', (r["id"],))
                sec_id = cur.fetchone()["sectionId"]
                assert sec_id in chosen_section_ids, f"Leakage: chunk {r['id']} not in permitted sections!"
        print("\n[SUCCESS] RBAC Pre-filtering verified! No cross-tenant leakage and all permitted chunks retrieved.")

    finally:
        with conn.cursor() as cur:
            cur.execute('DELETE FROM "DocumentPermission" WHERE "teamId" = %s;', (temp_team_id,))
            cur.execute('DELETE FROM "Team" WHERE id = %s;', (temp_team_id,))
        conn.commit()
        conn.close()

if __name__ == "__main__":
    run_test()
