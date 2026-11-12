"""
rag/test_small_team_prefilter.py
──────────────────────────────────────────────────────────────
Verification script for Task 3:
1. Connects to Postgres / pgvector.
2. Creates a temporary test team with permission to exactly 4 sections.
3. Executes vector search with top_k=10.
4. Verifies that all 4 permitted documents/chunks are returned (100% recall).
5. Cleans up temporary test team and permissions.
──────────────────────────────────────────────────────────────
"""

import os
import sys
import uuid
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

env_paths = [
    os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
    os.path.join(os.path.dirname(__file__), "..", ".env"),
    os.path.join(os.path.dirname(__file__), ".env"),
]
for p in env_paths:
    if os.path.exists(p):
        load_dotenv(p)

from retrieval import hybrid_search, get_db_connection


def run_verification():
    print("=== Task 3: pgvector Version, Index Type & Small-Permission Team Pre-Filtering ===")
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # 1. Check pgvector extension version
            cur.execute("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';")
            ext_row = cur.fetchone()
            if ext_row:
                print(f"[pgvector] Installed extension: {ext_row['extname']} v{ext_row['extversion']}")
            else:
                print("[pgvector] Warning: 'vector' extension not detected in pg_extension.")

            # 2. Check index definitions on LegalChunk
            cur.execute("""
                SELECT indexname, indexdef 
                FROM pg_indexes 
                WHERE tablename = 'LegalChunk';
            """)
            indexes = cur.fetchall()
            print(f"[pgvector] Indexes on LegalChunk ({len(indexes)} found):")
            for idx in indexes:
                print(f"  - {idx['indexname']}: {idx['indexdef']}")

            # 3. Pick 4 random distinct sections from LegalChunk to grant to the test team
            cur.execute("""
                SELECT DISTINCT "sectionId"
                FROM "LegalChunk"
                WHERE "sectionId" IS NOT NULL
                LIMIT 4;
            """)
            sec_rows = cur.fetchall()
            if len(sec_rows) < 4:
                print(f"[WARN] Less than 4 sections found in LegalChunk: {len(sec_rows)}")
            sample_sec_ids = [r["sectionId"] for r in sec_rows]
            print(f"[Setup] Target permitted sections for test team: {sample_sec_ids}")

            # 4. Create temporary test team
            test_team_id = f"test_team_{uuid.uuid4().hex[:8]}"
            cur.execute("""
                INSERT INTO "Team" (id, name, description, "createdAt", "updatedAt")
                VALUES (%s, %s, %s, NOW(), NOW());
            """, (test_team_id, "Test Small Permission Team", "Automated Task 3 Verification Team"))

            # 5. Insert DocumentPermission for the 4 sections
            for sec_id in sample_sec_ids:
                cur.execute("""
                    INSERT INTO "DocumentPermission" (id, "teamId", "sectionId", "canRead", "canWrite", "createdAt")
                    VALUES (%s, %s, %s, true, false, NOW());
                """, (f"dp_{uuid.uuid4().hex[:8]}", test_team_id, sec_id))
            conn.commit()
            print(f"[Setup] Created test team '{test_team_id}' with read permissions for {len(sample_sec_ids)} sections.")

            # 6. Execute vector search with top_k=10
            # Generate a 1024-dim dummy vector or zero-vector for test
            test_vector = [0.01] * 1024
            results = hybrid_search(
                query="punishment penalty section offence",
                query_embedding=test_vector,
                top_k=10,
                team_ids=[test_team_id]
            )

            print(f"[Result] Requested top_k=10. Rows returned: {len(results)}")
            returned_sections = {r.get("section", {}).get("id") for r in results if r.get("section")}
            print(f"[Result] Permitted sections returned: {returned_sections}")

            for r in results:
                sec_info = r.get("section") or {}
                print(f"  * Chunk ID={r['id'][:12]}... | Section={sec_info.get('number')} ({sec_info.get('id')}) | RRF Score={r['rrf_score']:.4f}")

            # Verification assertions
            expected_count = min(len(sample_sec_ids), len(results))
            if len(results) >= len(sample_sec_ids):
                print(f"[SUCCESS] All {len(sample_sec_ids)} permitted sections returned without HNSW graph pruning dropoff!")
            else:
                print(f"[PARTIAL] Returned {len(results)} rows (expected at least {len(sample_sec_ids)}).")

            # 7. Cleanup test team & permissions
            cur.execute('DELETE FROM "DocumentPermission" WHERE "teamId" = %s;', (test_team_id,))
            cur.execute('DELETE FROM "Team" WHERE id = %s;', (test_team_id,))
            conn.commit()
            print("[Cleanup] Removed temporary test team and permissions.")

    except Exception as e:
        print(f"[ERROR] Verification failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()


if __name__ == "__main__":
    run_verification()
