"""
rag/generate_embeddings.py
──────────────────────────────────────────────────────────────
Python Embedding Pipeline using SentenceTransformers (all-MiniLM-L6-v2).
Splits Act sections/clauses with rich metadata headers (Act, Year, Section, Title),
computes 384-dim normalized vector embeddings, and populates LegalChunk table in PostgreSQL (pgvector).
──────────────────────────────────────────────────────────────
"""

import os
import sys
import time
import argparse
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter
from embeddings import embed_texts

env_paths = [
    os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
    os.path.join(os.path.dirname(__file__), "..", ".env"),
    os.path.join(os.path.dirname(__file__), ".env"),
]
for p in env_paths:
    if os.path.exists(p):
        load_dotenv(p)

DATABASE_URL = os.getenv("DATABASE_URL")

# Load chunking configuration if available
try:
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    from eval.config import CHUNK_SIZE as DEFAULT_CHUNK_SIZE, CHUNK_OVERLAP as DEFAULT_CHUNK_OVERLAP
except ImportError:
    DEFAULT_CHUNK_SIZE = 600
    DEFAULT_CHUNK_OVERLAP = 100

CHUNK_SIZE = int(os.getenv("NYAAY_CHUNK_SIZE", DEFAULT_CHUNK_SIZE))
CHUNK_OVERLAP = int(os.getenv("NYAAY_CHUNK_OVERLAP", DEFAULT_CHUNK_OVERLAP))
EMBED_BATCH_SIZE = 64
INSERT_BATCH_SIZE = 200

splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    separators=["\n\n", "\n", ". ", " "]
)

def get_db(max_retries=5):
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL missing!")
    for attempt in range(1, max_retries + 1):
        try:
            return psycopg2.connect(
                DATABASE_URL,
                cursor_factory=RealDictCursor,
                keepalives=1,
                keepalives_idle=30,
                keepalives_interval=10,
                keepalives_count=5,
                connect_timeout=30
            )
        except Exception as e:
            if attempt == max_retries:
                raise
            sleep_time = attempt * 2
            print(f"[WARN] Connection failed ({e}). Retrying in {sleep_time}s... (attempt {attempt}/{max_retries})")
            time.sleep(sleep_time)

def insert_batch_with_retry(conn_holder, records, max_retries=5):
    """Inserts a batch of chunk records into LegalChunk using execute_values with auto-reconnect retry."""
    if not records:
        return
    for attempt in range(1, max_retries + 1):
        try:
            conn = conn_holder["conn"]
            with conn.cursor() as cur:
                execute_values(
                    cur,
                    '''
                    INSERT INTO "LegalChunk" ("id", "actId", "sectionId", "clauseId", "content", "embedding", "updatedAt")
                    VALUES %s
                    ''',
                    records,
                    template='(gen_random_uuid(), %s, %s, NULL, %s, %s::vector, NOW())',
                    page_size=INSERT_BATCH_SIZE
                )
            conn.commit()
            return
        except (psycopg2.OperationalError, psycopg2.DatabaseError, Exception) as e:
            print(f"\n[WARN] Database operation error (attempt {attempt}/{max_retries}): {e}")
            if attempt == max_retries:
                raise
            time.sleep(2 * attempt)
            try:
                if conn_holder.get("conn"):
                    conn_holder["conn"].close()
            except Exception:
                pass
            print("[INFO] Re-establishing database connection...")
            try:
                conn_holder["conn"] = get_db()
            except Exception as conn_err:
                print(f"[WARN] Reconnect attempt failed: {conn_err}")

def main():
    parser = argparse.ArgumentParser(description="Nyaay Embedding Pipeline")
    parser.add_argument("--clean", action="store_true", help="Clear all existing LegalChunk records before embedding")
    args = parser.parse_args()

    print("[START] Python Embedding Pipeline — (sentence-transformers/all-MiniLM-L6-v2)")
    print(f"   Dims: 384 | ChunkSize: {CHUNK_SIZE} | EmbedBatch: {EMBED_BATCH_SIZE} | InsertBatch: {INSERT_BATCH_SIZE}")
    print("=" * 60)

    conn = get_db()
    conn_holder = {"conn": conn}

    try:
        with conn_holder["conn"].cursor() as cur:
            if args.clean:
                print("\n [CLEAN] Clearing existing LegalChunk rows (--clean flag active)...")
                cur.execute('DELETE FROM "LegalChunk";')
                conn_holder["conn"].commit()
                print("   Done.\n")
                query = '''
                    SELECT a.id as act_id, a."shortName" as act_name, a.title as act_title, a.year as act_year,
                           s.id as section_id, s.number as section_number, s.title as section_title, s.content as section_content
                    FROM "Act" a
                    JOIN "Section" s ON s."actId" = a.id
                    ORDER BY a."shortName", s.number;
                '''
            else:
                print("\n [IDEMPOTENT] Checking for unprocessed sections without deleting existing chunks...")
                query = '''
                    SELECT a.id as act_id, a."shortName" as act_name, a.title as act_title, a.year as act_year,
                           s.id as section_id, s.number as section_number, s.title as section_title, s.content as section_content
                    FROM "Act" a
                    JOIN "Section" s ON s."actId" = a.id
                    WHERE NOT EXISTS (
                        SELECT 1 FROM "LegalChunk" lc WHERE lc."sectionId" = s.id
                    )
                    ORDER BY a."shortName", s.number;
                '''

            cur.execute(query)
            rows = cur.fetchall()

        if not rows:
            print(" [INFO] All sections already have embedded chunks in database. Nothing new to process!")
            print("        Pass '--clean' if you wish to wipe and recompute all embeddings from scratch.\n")
            return

        print(f" Found {len(rows)} Section(s) to process | Processing with Atomic Section Transactions...\n")
        total_chunks = 0

        for idx, r in enumerate(rows, 1):
            act_id = r["act_id"]
            act_name = r["act_name"]
            act_title = r["act_title"] or act_name
            act_year = r["act_year"] or ""
            section_id = r["section_id"]
            sec_num = r["section_number"]
            sec_title = r["section_title"] or ""
            sec_content = r["section_content"] or ""

            prefix = "Article" if "constitution" in act_name.lower() else "Section"
            section_raw = f"[Act: {act_title}] [Year: {act_year}] [{prefix}: {sec_num}] [Title: {sec_title}]\nContent:\n{sec_content}"

            chunks = splitter.split_text(section_raw)
            if not chunks:
                continue

            # Compute embeddings for all chunks of this section
            embeddings = embed_texts(chunks, batch_size=EMBED_BATCH_SIZE)
            records = []
            for chunk_text, emb in zip(chunks, embeddings):
                vector_str = f"[{','.join(map(str, emb))}]"
                records.append((act_id, section_id, chunk_text, vector_str))

            # Atomic transaction for the section: write all chunks in a single transaction.
            # A crash mid-section will roll back cleanly, leaving 0 chunks, so NOT EXISTS
            # guarantees this section is cleanly picked up and reprocessed on resume.
            conn = conn_holder["conn"]
            try:
                with conn.cursor() as cur:
                    cur.execute('DELETE FROM "LegalChunk" WHERE "sectionId" = %s;', (section_id,))
                    execute_values(
                        cur,
                        '''
                        INSERT INTO "LegalChunk" ("id", "actId", "sectionId", "clauseId", "content", "embedding", "updatedAt")
                        VALUES %s
                        ''',
                        records,
                        template='(gen_random_uuid(), %s, %s, NULL, %s, %s::vector, NOW())',
                        page_size=INSERT_BATCH_SIZE
                    )
                conn.commit()
                total_chunks += len(records)
            except Exception as sec_err:
                conn.rollback()
                print(f"[WARN] Failed to commit section {sec_num} ({section_id}): {sec_err}. Rolling back transaction.")
                raise sec_err

            if idx % 50 == 0 or idx == len(rows):
                sys.stdout.write(f"   -> [{act_name}] Processed {idx}/{len(rows)} sections ({total_chunks} chunks saved)\n")
                sys.stdout.flush()

        print("\n" + "=" * 60)
        print(f"[SUCCESS] Done! Inserted {total_chunks} LegalChunks with metadata headers and vector embeddings.")
        try:
            from cache import invalidate_search_cache
            inval = invalidate_search_cache()
            print(f"   [CACHE] Flushed search cache on embeddings update: {inval}")
        except Exception as cache_err:
            print(f"   [WARN] Could not flush cache: {cache_err}")
        print("Your RAG pipeline is fully updated with all Legal Acts!\n")
    finally:
        try:
            conn_holder["conn"].close()
        except Exception:
            pass

if __name__ == "__main__":
    main()
