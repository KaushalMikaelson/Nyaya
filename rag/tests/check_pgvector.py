import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

env_paths = [
    os.path.join(os.path.dirname(__file__), "..", "..", "backend", ".env"),
    os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
    os.path.join(os.path.dirname(__file__), "..", ".env"),
]
for p in env_paths:
    if os.path.exists(p):
        load_dotenv(p)

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("NO_DATABASE_URL")
    sys.exit(0)

try:
    conn = psycopg2.connect(db_url, cursor_factory=RealDictCursor, connect_timeout=5)
    with conn.cursor() as cur:
        cur.execute("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';")
        ext = cur.fetchone()
        print(f"pgvector extension: {ext}")
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
        tables = [r["table_name"] for r in cur.fetchall()]
        print(f"Tables in public schema: {tables}")
        cur.execute("""
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'LegalChunk';
        """)
        indexes = cur.fetchall()
        for idx in indexes:
            print(f"Index: {idx['indexname']} -> {idx['indexdef']}")
    conn.close()
except Exception as e:
    print(f"DB Error: {e}")
