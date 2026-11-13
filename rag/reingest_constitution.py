"""Script to selectively re-ingest Constitution of India articles into PostgreSQL
without touching any of the other 16 Acts.
"""

import os
import sys
from pathlib import Path
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
from dotenv import load_dotenv
import pypdf

# Ensure rag directory is on path
RAG_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(RAG_DIR))

from ingest_legal_pdfs import parse_constitution

load_dotenv("backend/.env")
DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    print("[ERROR] DATABASE_URL not set in backend/.env")
    sys.exit(1)

PDF_PATH = "backend/data/constitution_of_india_2024.pdf"
if not os.path.exists(PDF_PATH):
    print(f"[ERROR] {PDF_PATH} does not exist")
    sys.exit(1)

print(f"[1/4] Parsing {PDF_PATH}...")
reader = pypdf.PdfReader(PDF_PATH)
articles = parse_constitution(reader)
print(f"      Parsed {len(articles)} genuine Constitution articles.")

# Verify Article 21
art21 = next((a for a in articles if a["number"] == "21"), None)
if not art21 or "Protection of life and personal liberty" not in art21["title"]:
    print(f"[ERROR] Article 21 verification failed: {art21}")
    sys.exit(1)
print(f"      Verified Article 21: Title='{art21['title']}', Content preview='{art21['content'][:100]}...'")

print("[2/4] Connecting to PostgreSQL...")
conn = psycopg2.connect(DB_URL)
conn.autocommit = False

try:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute('SELECT id FROM "Act" WHERE "shortName" = %s;', ("Constitution",))
        row = cur.fetchone()
        if not row:
            print("[ERROR] Constitution Act not found in database!")
            conn.rollback()
            sys.exit(1)
        act_id = row["id"]
        print(f"      Found Constitution Act ID: {act_id}")

        print("[3/4] Replacing corrupted Constitution chunks and sections...")
        cur.execute('DELETE FROM "LegalChunk" WHERE "actId" = %s;', (act_id,))
        deleted_chunks = cur.rowcount
        print(f"      Deleted {deleted_chunks} old Constitution chunks.")

        cur.execute('DELETE FROM "Section" WHERE "actId" = %s;', (act_id,))
        deleted_sections = cur.rowcount
        print(f"      Deleted {deleted_sections} old corrupted Constitution sections.")

        records = [
            (act_id, a["number"], a["title"], a["content"])
            for a in articles
        ]
        execute_values(
            cur,
            '''
            INSERT INTO "Section" ("id", "actId", "number", "title", "content", "updatedAt")
            VALUES %s;
            ''',
            records,
            template='(gen_random_uuid(), %s, %s, %s, %s, NOW())',
            page_size=200
        )
        print(f"      Inserted {len(records)} clean Constitution sections.")

    conn.commit()
    print("[SUCCESS] Constitution sections cleanly replaced in database!")
except Exception as e:
    conn.rollback()
    print(f"[ERROR] Transaction failed, rolled back: {e}")
    sys.exit(1)
finally:
    conn.close()

