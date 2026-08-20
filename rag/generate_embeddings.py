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
CHUNK_SIZE = 600
CHUNK_OVERLAP = 100
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
    print("[START] Python Embedding Pipeline — (sentence-transformers/all-MiniLM-L6-v2)")
    print(f"   Dims: 384 | ChunkSize: {CHUNK_SIZE} | EmbedBatch: {EMBED_BATCH_SIZE} | InsertBatch: {INSERT_BATCH_SIZE}")
    print("=" * 60)

    conn = get_db()
    conn_holder = {"conn": conn}

    try:
        with conn_holder["conn"].cursor() as cur:
            print("\n [CLEAN] Clearing existing LegalChunk rows...")
            cur.execute('DELETE FROM "LegalChunk";')
            conn_holder["conn"].commit()
            print("   Done.\n")

            cur.execute('''
                SELECT a.id as act_id, a."shortName" as act_name, a.title as act_title, a.year as act_year,
                       s.id as section_id, s.number as section_number, s.title as section_title, s.content as section_content
                FROM "Act" a
                JOIN "Section" s ON s."actId" = a.id
                ORDER BY a."shortName", s.number;
            ''')
            rows = cur.fetchall()

        print(f" Found {len(rows)} Section(s) across Acts | Processing with Bulk Inserts...\n")
        total_chunks = 0
        pending_chunks = []  # tuples of (act_id, section_id, chunk_text)

        def flush_pending():
            nonlocal total_chunks, pending_chunks
            if not pending_chunks:
                return
            texts = [c[2] for c in pending_chunks]
            embeddings = embed_texts(texts, batch_size=EMBED_BATCH_SIZE)
            records = []
            for (act_id, section_id, chunk_text), emb in zip(pending_chunks, embeddings):
                vector_str = f"[{','.join(map(str, emb))}]"
                records.append((act_id, section_id, chunk_text, vector_str))
            
            insert_batch_with_retry(conn_holder, records)
            total_chunks += len(records)
            pending_chunks = []

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
            for c in chunks:
                pending_chunks.append((act_id, section_id, c))

            # Flush when buffer reaches batch limit
            if len(pending_chunks) >= INSERT_BATCH_SIZE:
                flush_pending()

            if idx % 50 == 0 or idx == len(rows):
                sys.stdout.write(f"   -> [{act_name}] Processed {idx}/{len(rows)} sections ({total_chunks + len(pending_chunks)} chunks queued/saved)\n")
                sys.stdout.flush()

        # Flush any remaining chunks
        flush_pending()

        print("\n" + "=" * 60)
        print(f"[SUCCESS] Done! Inserted {total_chunks} LegalChunks with metadata headers and vector embeddings.")
        print("Your RAG pipeline is fully updated with all Legal Acts!\n")
    finally:
        try:
            conn_holder["conn"].close()
        except Exception:
            pass

if __name__ == "__main__":
    main()
