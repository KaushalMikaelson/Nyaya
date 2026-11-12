import os
import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))
db_url = os.getenv("DATABASE_URL")
if not db_url:
    raise ValueError("DATABASE_URL is missing")

conn = psycopg2.connect(db_url)
with conn.cursor() as cur:
    cur.execute("""
        CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
        RETURNS TRIGGER AS $$
        BEGIN
            RAISE EXCEPTION 'SearchAuditLog is an append-only audit table. UPDATE and DELETE are prohibited.';
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trg_prevent_audit_log_modification ON "SearchAuditLog";

        CREATE TRIGGER trg_prevent_audit_log_modification
        BEFORE UPDATE OR DELETE ON "SearchAuditLog"
        FOR EACH ROW
        EXECUTE FUNCTION prevent_audit_log_modification();
    """)
    conn.commit()
    print("[SUCCESS] Created append-only trigger on SearchAuditLog table in PostgreSQL!")

    # Test that UPDATE and DELETE are rejected
    cur.execute("""
        INSERT INTO "SearchAuditLog" (id, "userId", query, "actFilter", "returnedDocs", "latencyMs", "timestamp")
        VALUES (gen_random_uuid(), NULL, 'test audit query', NULL, ARRAY['doc1'], 45.0, NOW())
        RETURNING id;
    """)
    test_id = cur.fetchone()[0]
    conn.commit()
    print(f"[TEST] Inserted test audit log entry: {test_id}")

    try:
        cur.execute('UPDATE "SearchAuditLog" SET query = %s WHERE id = %s;', ('tampered', test_id))
        conn.commit()
        raise AssertionError("Security failure: UPDATE was permitted on append-only audit table!")
    except Exception as e:
        conn.rollback()
        print(f"[VERIFIED] UPDATE blocked by trigger: {e}")

    try:
        cur.execute('DELETE FROM "SearchAuditLog" WHERE id = %s;', (test_id,))
        conn.commit()
        raise AssertionError("Security failure: DELETE was permitted on append-only audit table!")
    except Exception as e:
        conn.rollback()
        print(f"[VERIFIED] DELETE blocked by trigger: {e}")

conn.close()
