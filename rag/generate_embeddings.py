"""
rag/generate_embeddings.py
──────────────────────────────────────────────────────────────
Python Embedding Pipeline using SentenceTransformers (all-MiniLM-L6-v2).
Splits Act sections/clauses, computes 384-dim normalized vector embeddings,
and populates the LegalChunk table with pgvector in PostgreSQL.
──────────────────────────────────────────────────────────────
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
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
BATCH_SIZE = 16

splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    separators=["\n\n", "\n", ". ", " "]
)

def get_db():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL missing!")
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def main():
    print("[START] Python Embedding Pipeline — (sentence-transformers/all-MiniLM-L6-v2)")
    print(f"   Dims: 384 | ChunkSize: {CHUNK_SIZE} | Batch: {BATCH_SIZE}")
    print("=" * 60)

    conn = get_db()
    try:
        with conn.cursor() as cur:
            print("\n [CLEAN] Clearing existing LegalChunk rows...")
            cur.execute('DELETE FROM "LegalChunk";')
            conn.commit()
            print("   Done.\n")

            cur.execute('''
                SELECT a.id as act_id, a."shortName" as act_name,
                       s.id as section_id, s.number as section_number, s.title as section_title, s.content as section_content
                FROM "Act" a
                JOIN "Section" s ON s."actId" = a.id
                ORDER BY a."shortName", s.number;
            ''')
            rows = cur.fetchall()

        print(f" Found {len(rows)} Section(s) across Acts | Processing...\n")
        total_chunks = 0

        for r in rows:
            act_id = r["act_id"]
            act_name = r["act_name"]
            section_id = r["section_id"]
            sec_num = r["section_number"]
            sec_title = r["section_title"] or ""
            sec_content = r["section_content"] or ""

            prefix = "Article" if act_name == "Constitution" else "Section"
            section_raw = f"[{act_name}] {prefix} {sec_num}: {sec_title}\n{sec_content}"

            chunks = splitter.split_text(section_raw)
            if not chunks:
                continue

            sys.stdout.write(f"  {prefix} {str(sec_num):<6} \"{sec_title[:38]}\" -> {len(chunks)} chunk(s)... ")
            embeddings = embed_texts(chunks, batch_size=BATCH_SIZE)

            with conn.cursor() as cur:
                for chunk_text, emb in zip(chunks, embeddings):
                    vector_str = f"[{','.join(map(str, emb))}]"
                    cur.execute('''
                        INSERT INTO "LegalChunk" ("id", "actId", "sectionId", "clauseId", "content", "embedding", "updatedAt")
                        VALUES (gen_random_uuid(), %s, %s, NULL, %s, %s::vector, NOW());
                    ''', (act_id, section_id, chunk_text, vector_str))
            conn.commit()
            total_chunks += len(chunks)
            print("[OK]")

        print("\n" + "=" * 60)
        print(f"[SUCCESS] Done! Inserted {total_chunks} LegalChunks with Python embeddings.")
        print("Your Python RAG pipeline is live — semantic search ready!\n")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
