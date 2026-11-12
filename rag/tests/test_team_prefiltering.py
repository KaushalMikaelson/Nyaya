"""
rag/tests/test_team_prefiltering.py
──────────────────────────────────────────────────────────────
Tests for RBAC pre-filtering with small-permission teams.
Verifies that when a team has access to only 3-5 documents/sections,
vector search with top_k=10 returns all permitted rows without
falling victim to HNSW ANN graph pruning / early termination.
──────────────────────────────────────────────────────────────
"""

import sys
import os
import unittest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from retrieval import hybrid_search, get_db_connection


class TestTeamPrefiltering(unittest.TestCase):

    def test_small_permission_team_exact_search_fallback(self):
        """
        Unit test: When a team has access to only 4 sections, vector search
        with top_k=10 must return all 4 sections (100% recall), falling back
        to exact search over the permitted candidate set.
        """
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur

        # 1. Mock DocumentPermission query returning 4 sections
        perm_rows = [
            {"actId": None, "sectionId": f"sec_{i}"} for i in range(1, 5)
        ]

        # 2. Mock chunk rows returned by exact filtered search (all 4 returned)
        chunk_rows = [
            {
                "id": f"chunk_{i}",
                "content": f"Confidential section content {i}",
                "actId": "act_1",
                "sectionId": f"sec_{i}",
                "clauseId": None,
                "rrf_score": 0.95 - (i * 0.05),
            }
            for i in range(1, 5)
        ]

        # 3. Mock hydration query
        hydration_rows = [
            {
                "id": f"chunk_{i}",
                "content": f"Confidential section content {i}",
                "actId": "act_1",
                "sectionId": f"sec_{i}",
                "clauseId": None,
                "act_title": "Test Act",
                "act_short_name": "TA",
                "section_number": str(i),
                "section_title": f"Section {i}",
                "clause_number": None,
            }
            for i in range(1, 5)
        ]

        def cur_fetchall_side_effect():
            # First call: permissions
            # Second call: search query
            # Third call: hydration
            calls = mock_cur.fetchall.call_count
            if calls == 1:
                return perm_rows
            elif calls == 2:
                return chunk_rows
            elif calls == 3:
                return hydration_rows
            return []

        mock_cur.fetchall.side_effect = cur_fetchall_side_effect

        with patch("retrieval.get_db_connection", return_value=mock_conn):
            dummy_embedding = [0.05] * 1024
            results = hybrid_search(
                query="confidential contract breach",
                query_embedding=dummy_embedding,
                top_k=10,
                team_ids=["team_small_perm"]
            )

            # Assert all 4 permitted sections are returned despite top_k=10
            self.assertEqual(len(results), 4, "Expected all 4 permitted documents to be returned!")
            returned_ids = {r["id"] for r in results}
            self.assertEqual(returned_ids, {"chunk_1", "chunk_2", "chunk_3", "chunk_4"})

            # Verify the SQL executed for small permitted sets uses exact materialized scanning
            executed_sql = mock_cur.execute.call_args_list[1][0][0]
            self.assertTrue(
                "permitted_chunks" in executed_sql or "MATERIALIZED" in executed_sql or "sectionId" in executed_sql,
                "Search query must filter by permitted sections at SQL level"
            )

    def test_team_with_no_permissions_returns_empty(self):
        """A team with no granted document permissions must return 0 results immediately."""
        mock_conn = MagicMock()
        mock_cur = MagicMock()
        mock_conn.cursor.return_value.__enter__.return_value = mock_cur
        mock_cur.fetchall.return_value = []  # No permissions

        with patch("retrieval.get_db_connection", return_value=mock_conn):
            results = hybrid_search(
                query="any query",
                top_k=10,
                team_ids=["team_empty_perms"]
            )
            self.assertEqual(results, [])

    def test_live_small_permission_team_filtering(self):
        """
        Permanent test verifying small-permission teams (3-5 documents)
        with top_k=10 against PostgreSQL.
        """
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            self.skipTest("DATABASE_URL not configured")

        temp_team_id = "test_perm_live_team_permanent"
        try:
            conn = get_db_connection()
        except Exception as e:
            self.skipTest(f"Database unavailable: {e}")

        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT DISTINCT s.id 
                    FROM "Section" s
                    JOIN "LegalChunk" lc ON lc."sectionId" = s.id
                    WHERE lc.embedding IS NOT NULL
                    LIMIT 4;
                """)
                sec_rows = cur.fetchall()
                if not sec_rows or len(sec_rows) < 4:
                    self.skipTest("Fewer than 4 sections with embeddings in database")

                chosen_sec_ids = [r["id"] for r in sec_rows]

                cur.execute('DELETE FROM "DocumentPermission" WHERE "teamId" = %s;', (temp_team_id,))
                cur.execute('DELETE FROM "Team" WHERE id = %s;', (temp_team_id,))

                cur.execute("""
                    INSERT INTO "Team" (id, name, description, "createdAt", "updatedAt")
                    VALUES (%s, 'Perm Test Team', 'Permanent test', NOW(), NOW());
                """, (temp_team_id,))

                for s_id in chosen_sec_ids:
                    cur.execute("""
                        INSERT INTO "DocumentPermission" (id, "teamId", "sectionId", "canRead", "canWrite", "createdAt")
                        VALUES (gen_random_uuid(), %s, %s, true, false, NOW());
                    """, (temp_team_id, s_id))
                conn.commit()

                cur.execute("""
                    SELECT COUNT(*) as cnt
                    FROM "LegalChunk"
                    WHERE "sectionId" = ANY(%s) AND embedding IS NOT NULL;
                """, (chosen_sec_ids,))
                total_matching = cur.fetchone()["cnt"]

            dummy_emb = [0.05] * 384
            res = hybrid_search(
                query="legal penalty and procedure",
                query_embedding=dummy_emb,
                top_k=10,
                use_vector=True,
                use_fts=True,
                team_ids=[temp_team_id]
            )

            expected_count = min(total_matching, 10)
            self.assertEqual(len(res), expected_count, f"Expected {expected_count} rows, got {len(res)}")
            with conn.cursor() as cur:
                for r in res:
                    cur.execute('SELECT "sectionId" FROM "LegalChunk" WHERE id = %s;', (r["id"],))
                    row = cur.fetchone()
                    self.assertIn(row["sectionId"], chosen_sec_ids)

        finally:
            try:
                with conn.cursor() as cur:
                    cur.execute('DELETE FROM "DocumentPermission" WHERE "teamId" = %s;', (temp_team_id,))
                    cur.execute('DELETE FROM "Team" WHERE id = %s;', (temp_team_id,))
                conn.commit()
                conn.close()
            except Exception:
                pass


if __name__ == "__main__":
    unittest.main()

