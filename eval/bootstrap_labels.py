"""
eval/bootstrap_labels.py
──────────────────────────────────────────────────────────────
Helper utility to automatically find and bootstrap chunk IDs
from PostgreSQL for sample evaluation queries.

Usage:
  python eval/bootstrap_labels.py
──────────────────────────────────────────────────────────────
"""

import os
import sys
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "rag"))

env_paths = [
    os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
    os.path.join(os.path.dirname(__file__), "..", ".env"),
    os.path.join(os.path.dirname(__file__), ".env"),
]
for p in env_paths:
    if os.path.exists(p):
        load_dotenv(p)

DATABASE_URL = os.getenv("DATABASE_URL")
QUERIES_FILE = os.path.join(os.path.dirname(__file__), "data", "queries.jsonl")

# Sample queries mapped to statutory Act and Section
BOOTSTRAP_DEFINITIONS = [
    {
        "id": "q001",
        "query": "What is the punishment for murder under Bharatiya Nyaya Sanhita?",
        "act_short": "BNS",
        "sec_num": "103",
        "difficulty": "easy",
        "split": "dev"
    },
    {
        "id": "q002",
        "query": "What is the protection of life and personal liberty under Article 21?",
        "act_short": "Constitution",
        "sec_num": "21",
        "difficulty": "easy",
        "split": "dev"
    },
    {
        "id": "q003",
        "query": "What constitutes cheating and dishonestly inducing delivery of property under BNS?",
        "act_short": "BNS",
        "sec_num": "318",
        "difficulty": "medium",
        "split": "dev"
    },
    {
        "id": "q004",
        "query": "What is equality before law and equal protection of laws under Article 14?",
        "act_short": "Constitution",
        "sec_num": "14",
        "difficulty": "easy",
        "split": "dev"
    },
    {
        "id": "q005",
        "query": "Explain the prohibition of discrimination on grounds of religion, race, caste, sex under Article 15.",
        "act_short": "Constitution",
        "sec_num": "15",
        "difficulty": "medium",
        "split": "dev"
    },
    {
        "id": "q006",
        "query": "Right to constitutional remedies and enforcement of rights by Supreme Court under Article 32",
        "act_short": "Constitution",
        "sec_num": "32",
        "difficulty": "easy",
        "split": "test"
    },
    {
        "id": "q007",
        "query": "Definition of theft and dishonest taking of movable property under BNS",
        "act_short": "BNS",
        "sec_num": "303",
        "difficulty": "medium",
        "split": "test"
    }
]


def bootstrap():
    if not DATABASE_URL:
        print("[ERROR] DATABASE_URL not set in environment or backend/.env.")
        return

    print("🔍 Connecting to PostgreSQL to lookup chunk IDs for sample queries...")
    try:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor, connect_timeout=5)
    except Exception as e:
        print(f"[ERROR] Could not connect to PostgreSQL: {e}")
        return

    updated_queries = []
    try:
        with conn.cursor() as cur:
            for item in BOOTSTRAP_DEFINITIONS:
                # Find matching section and legal chunk IDs
                cur.execute('''
                    SELECT lc.id as chunk_id, a."shortName" as act_name, s.number as sec_number
                    FROM "LegalChunk" lc
                    JOIN "Section" s ON s.id = lc."sectionId"
                    JOIN "Act" a ON a.id = lc."actId"
                    WHERE a."shortName" ILIKE %s AND s.number = %s
                    LIMIT 3;
                ''', (f"%{item['act_short']}%", item["sec_num"]))
                rows = cur.fetchall()
                chunk_ids = [r["chunk_id"] for r in rows]

                entry = {
                    "id": item["id"],
                    "query": item["query"],
                    "relevant_doc_ids": chunk_ids,
                    "target_act": item["act_short"],
                    "target_section": item["sec_num"],
                    "difficulty": item["difficulty"],
                    "split": item["split"]
                }
                updated_queries.append(entry)
                print(f"  ✓ {item['id']} ({item['act_short']} Sec {item['sec_num']}): found {len(chunk_ids)} chunk ID(s)")
    finally:
        conn.close()

    # Save to queries.jsonl
    with open(QUERIES_FILE, "w", encoding="utf-8") as f:
        for q in updated_queries:
            f.write(json.dumps(q) + "\n")

    print(f"\n✅ Successfully updated {len(updated_queries)} labeled queries in: {QUERIES_FILE}")
    print("Now you can run: python eval/runner.py --all --split dev")


if __name__ == "__main__":
    bootstrap()
