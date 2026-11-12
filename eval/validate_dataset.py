"""
eval/validate_dataset.py
──────────────────────────────────────────────────────────────
Validates eval/data/queries.jsonl:
  1. Every entry has required fields: id, query, relevant_doc_ids, difficulty, split
  2. Split is 'dev' or 'test' only
  3. Difficulty is 'easy', 'medium', or 'hard'
  4. IDs are unique
  5. Every relevant_doc_id exists in the LegalChunk table (requires DB connection)
  6. Reports split distribution

Usage:
  python eval/validate_dataset.py [--skip-db]
──────────────────────────────────────────────────────────────
"""

import json
import os
import sys
import argparse

# Add parent dir so we can import rag modules for DB access
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "rag"))

QUERIES_FILE = os.path.join(os.path.dirname(__file__), "data", "queries.jsonl")
REQUIRED_FIELDS = {"id", "query", "relevant_doc_ids", "difficulty", "split"}
VALID_SPLITS = {"dev", "test"}
VALID_DIFFICULTIES = {"easy", "medium", "hard"}


def load_queries(filepath: str) -> list[dict]:
    """Load and parse JSONL file."""
    queries = []
    with open(filepath, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
                entry["_line"] = line_num
                queries.append(entry)
            except json.JSONDecodeError as e:
                print(f"  ✗ Line {line_num}: Invalid JSON — {e}")
    return queries


def validate_structure(queries: list[dict]) -> list[str]:
    """Check required fields, valid splits, valid difficulties, unique IDs."""
    errors = []
    seen_ids = set()

    for q in queries:
        line = q.get("_line", "?")
        qid = q.get("id", f"<missing @ line {line}>")

        # Check required fields
        missing = REQUIRED_FIELDS - set(q.keys())
        if missing:
            errors.append(f"  ✗ {qid} (line {line}): Missing fields: {missing}")

        # Check split
        split = q.get("split")
        if split and split not in VALID_SPLITS:
            errors.append(f"  ✗ {qid} (line {line}): Invalid split '{split}' (must be dev or test)")

        # Check difficulty
        diff = q.get("difficulty")
        if diff and diff not in VALID_DIFFICULTIES:
            errors.append(f"  ✗ {qid} (line {line}): Invalid difficulty '{diff}' (must be easy, medium, or hard)")

        # Check unique ID
        if qid in seen_ids:
            errors.append(f"  ✗ {qid} (line {line}): Duplicate ID")
        seen_ids.add(qid)

        # Check relevant_doc_ids is a list
        doc_ids = q.get("relevant_doc_ids")
        if doc_ids is not None and not isinstance(doc_ids, list):
            errors.append(f"  ✗ {qid} (line {line}): relevant_doc_ids must be a list")

        # Warn if relevant_doc_ids is empty
        if isinstance(doc_ids, list) and len(doc_ids) == 0:
            errors.append(f"  ⚠ {qid} (line {line}): relevant_doc_ids is empty (needs labeling)")

    return errors


def validate_doc_ids_in_db(queries: list[dict]) -> list[str]:
    """Check that every relevant_doc_id exists in the LegalChunk table."""
    errors = []

    # Collect all unique doc IDs
    all_doc_ids = set()
    for q in queries:
        doc_ids = q.get("relevant_doc_ids", [])
        if isinstance(doc_ids, list):
            all_doc_ids.update(doc_ids)

    if not all_doc_ids:
        print("  ℹ No relevant_doc_ids to validate against DB (all empty)")
        return errors

    try:
        from retrieval import get_db_connection
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                'SELECT id FROM "LegalChunk" WHERE id IN %s;',
                (tuple(all_doc_ids),)
            )
            found_ids = {row["id"] for row in cur.fetchall()}
        conn.close()

        missing = all_doc_ids - found_ids
        if missing:
            for mid in sorted(missing):
                # Find which queries reference this ID
                for q in queries:
                    if mid in q.get("relevant_doc_ids", []):
                        errors.append(
                            f"  ✗ {q['id']}: relevant_doc_id '{mid}' not found in LegalChunk table"
                        )
        else:
            print(f"  ✓ All {len(all_doc_ids)} relevant_doc_ids verified in database")

    except Exception as e:
        errors.append(f"  ⚠ Could not connect to database: {e}")

    return errors


def print_summary(queries: list[dict]):
    """Print dataset statistics."""
    splits = {}
    diffs = {}
    labeled = 0
    for q in queries:
        s = q.get("split", "unknown")
        d = q.get("difficulty", "unknown")
        splits[s] = splits.get(s, 0) + 1
        diffs[d] = diffs.get(d, 0) + 1
        if q.get("relevant_doc_ids"):
            labeled += 1

    print(f"\n  Dataset Summary:")
    print(f"    Total queries: {len(queries)}")
    print(f"    Labeled (non-empty relevant_doc_ids): {labeled}/{len(queries)}")
    print(f"    Splits: {splits}")
    print(f"    Difficulties: {diffs}")


def main():
    parser = argparse.ArgumentParser(description="Validate eval dataset")
    parser.add_argument("--skip-db", action="store_true", help="Skip database validation")
    parser.add_argument("--file", default=QUERIES_FILE, help="Path to queries.jsonl")
    args = parser.parse_args()

    print(f"\nValidating: {args.file}\n")

    if not os.path.exists(args.file):
        print(f"  ✗ File not found: {args.file}")
        sys.exit(1)

    queries = load_queries(args.file)
    if not queries:
        print("  ✗ No queries found in file")
        sys.exit(1)

    print(f"  ✓ Loaded {len(queries)} queries\n")

    # Structure validation
    errors = validate_structure(queries)
    if errors:
        print("Structure validation errors:")
        for e in errors:
            print(e)
    else:
        print("  ✓ All queries pass structure validation")

    # DB validation
    if not args.skip_db:
        print("\nDatabase validation:")
        db_errors = validate_doc_ids_in_db(queries)
        errors.extend(db_errors)
        if db_errors:
            for e in db_errors:
                print(e)
    else:
        print("\n  ℹ Skipping database validation (--skip-db)")

    print_summary(queries)

    # Exit with error code if there are real errors (not warnings)
    real_errors = [e for e in errors if "✗" in e]
    if real_errors:
        print(f"\n  ✗ {len(real_errors)} error(s) found. Fix them before running evaluation.")
        sys.exit(1)
    else:
        print(f"\n  ✓ Dataset is valid!")


if __name__ == "__main__":
    main()
