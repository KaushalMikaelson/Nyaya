import os
import re
import sys
import argparse
import pypdf
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))
from ingestion_log import record_ingestion_failure

env_paths = [
    os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
    os.path.join(os.path.dirname(__file__), "..", ".env"),
    os.path.join(os.path.dirname(__file__), ".env"),
]
for p in env_paths:
    if os.path.exists(p):
        load_dotenv(p)

DATABASE_URL = os.getenv("DATABASE_URL")
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "data"))

ACT_METADATA = {
    "bharatiya_nagarik_suraksha_sanhita_2023.pdf": {
        "shortName": "BNSS",
        "title": "Bharatiya Nagarik Suraksha Sanhita, 2023",
        "year": 2023
    },
    "bharatiya_nyaya_sanhita_2023.pdf": {
        "shortName": "BNS",
        "title": "Bharatiya Nyaya Sanhita, 2023",
        "year": 2023
    },
    "bharatiya_sakshya_adhiniyam_2023.pdf": {
        "shortName": "BSA",
        "title": "Bharatiya Sakshya Adhiniyam, 2023",
        "year": 2023
    },
    "code_of_civil_procedure_1908.pdf": {
        "shortName": "CPC",
        "title": "The Code of Civil Procedure, 1908",
        "year": 1908
    },
    "constitution_of_india_2024.pdf": {
        "shortName": "Constitution",
        "title": "The Constitution of India",
        "year": 2024
    },
    "constitution_of_india_preamble.pdf": {
        "shortName": "ConstitutionPreamble",
        "title": "The Constitution of India (Preamble)",
        "year": 1950
    },
    "delhi_apartment_ownership_act_1986.pdf": {
        "shortName": "DelhiApartmentAct",
        "title": "The Delhi Apartment Ownership Act, 1986",
        "year": 1986
    },
    "digital_personal_data_protection_act_2023.pdf": {
        "shortName": "DPDP",
        "title": "The Digital Personal Data Protection Act, 2023",
        "year": 2023
    },
    "hindu_marriage_act_1955.pdf": {
        "shortName": "HinduMarriageAct",
        "title": "The Hindu Marriage Act, 1955",
        "year": 1955
    },
    "hindu_succession_act_1956.pdf": {
        "shortName": "HinduSuccessionAct",
        "title": "The Hindu Succession Act, 1956",
        "year": 1956
    },
    "indian_contract_act_1872.pdf": {
        "shortName": "ContractAct",
        "title": "The Indian Contract Act, 1872",
        "year": 1872
    },
    "insolvency_and_bankruptcy_code_2016.pdf": {
        "shortName": "IBC",
        "title": "The Insolvency and Bankruptcy Code, 2016",
        "year": 2016
    },
    "limitation_act_1963.pdf": {
        "shortName": "LimitationAct",
        "title": "The Limitation Act, 1963",
        "year": 1963
    },
    "pocso_act_2012.pdf": {
        "shortName": "POCSO",
        "title": "The Protection of Children from Sexual Offences Act, 2012",
        "year": 2012
    },
    "protection_of_women_from_domestic_violence_act_2005.pdf": {
        "shortName": "DomesticViolenceAct",
        "title": "The Protection of Women from Domestic Violence Act, 2005",
        "year": 2005
    },
    "repealing_and_amending_act_2023.pdf": {
        "shortName": "RepealingAmendingAct",
        "title": "The Repealing and Amending Act, 2023",
        "year": 2023
    },
    "specific_relief_act_1963.pdf": {
        "shortName": "SpecificReliefAct",
        "title": "The Specific Relief Act, 1963",
        "year": 1963
    }
}

def get_db():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL missing!")
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def clean_text(raw: str) -> str:
    cleaned = raw.replace('\r\n', '\n').replace('\r', '\n')
    cleaned = re.sub(r'^\s*\d{1,4}\s*$', '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r'[ \t]{2,}', ' ', cleaned)
    cleaned = re.sub(r'[ \t]+$', '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    return cleaned.strip()

def parse_generic_act(reader: pypdf.PdfReader) -> list[dict]:
    pages_text = [p.extract_text() or "" for p in reader.pages]
    full_text = "\n".join(pages_text)
    cleaned = clean_text(full_text)
    lines = cleaned.split('\n')

    sections = []
    cur_num = ""
    cur_lines = []

    def flush():
        nonlocal cur_num, cur_lines
        if not cur_num or not cur_lines:
            return
        content = "\n".join(cur_lines).strip()
        if len(content) < 15:
            return
        first_line = cur_lines[0].strip()
        title = re.sub(r'^[(\d)]+\s*', '', first_line)[:120] or f"Section {cur_num}"
        sections.append({"number": cur_num, "title": title, "content": content})

    for line in lines:
        sline = line.strip()
        m = re.match(r'^(?:SECTION|SECTIONS|ARTICLE)?\s*(\d{1,4}[A-Z]?)\.\s*(.*)', sline, re.IGNORECASE)
        if m and m.group(1).isdigit() and 1 <= int(m.group(1)) <= 600:
            flush()
            cur_num = m.group(1)
            rest = m.group(2).strip()
            cur_lines = [rest if rest else sline]
        elif cur_num:
            cur_lines.append(line)
    flush()

    dedup = {}
    for s in sections:
        num = s["number"]
        if num not in dedup or len(s["content"]) > len(dedup[num]["content"]):
            dedup[num] = s
    return list(dedup.values())

def parse_constitution(reader: pypdf.PdfReader) -> list[dict]:
    # Detect body page boundaries to skip Table of Contents and trailing Schedules/Appendices
    start_page = 0
    end_page = len(reader.pages)

    for i, page in enumerate(reader.pages):
        txt = page.extract_text() or ""
        if "PART I" in txt and "THE UNION AND ITS TERRITORY" in txt and "1. Name and territory" in txt:
            if "CONTENTS" not in txt and "Contents" not in txt:
                start_page = i
                break

    for i in range(start_page, len(reader.pages)):
        txt = reader.pages[i].extract_text() or ""
        if "FIRST SCHEDULE" in txt and ("[Articles 1 and 4]" in txt or "I. THE STATES" in txt):
            end_page = i
            break

    pages_text = []
    for p in reader.pages[start_page:end_page]:
        raw_p = p.extract_text() or ""
        # Strip footnote blocks starting with 5+ underscores at the bottom of pages
        p_no_fn = re.sub(r'_{5,}[\s\S]*$', '', raw_p)
        pages_text.append(p_no_fn)

    full_text = "\n".join(pages_text)
    clean_txt = re.sub(r'\d+\[', '', full_text)
    clean_txt = re.sub(r'THE CONSTITUTION OF\s+INDIA\s*\([^\n)]+\)\s*\d*', ' ', clean_txt)
    
    art_pattern = re.compile(
        r'(?<!\d)(\d{1,3}(?:[A-Z]{1,2}|[A-Z]-[A-Z])?)\.\s*([A-Z][^.\ufffd\r\n]{2,180}?)\.(?:\ufffd|[\u2014—\-]|(?=\s*[A-Z(]))'
    )
    matches = list(art_pattern.finditer(clean_txt))
    articles = []

    for i, m in enumerate(matches):
        art_num = m.group(1)
        title = m.group(2).strip()[:150]

        num_val = int(re.sub(r'\D', '', art_num))
        if not (1 <= num_val <= 395):
            continue

        if title.startswith(("Cl", "Subs", "Ins", "Omitted", "See", "The words", "Paragraph")):
            continue

        start_pos = m.start()
        end_pos = matches[i + 1].start() if i + 1 < len(matches) else start_pos + 4000
        raw_content = clean_txt[start_pos:end_pos].strip()

        cleaned_content = re.sub(r'\n\d+\.\s+Subs\..*', '', raw_content)
        cleaned_content = re.sub(r'\n\d+\.\s+Ins\..*', '', cleaned_content)
        cleaned_content = re.sub(r'[\ufffd]', '', cleaned_content).strip()

        if len(cleaned_content) < 30:
            continue

        articles.append({
            "number": art_num,
            "title": title,
            "content": cleaned_content[:4000]
        })

    dedup = {}
    for a in articles:
        num = a["number"]
        if num not in dedup:
            dedup[num] = a
    return list(dedup.values())

def get_or_create_act(cur, short_name: str, title: str, year: int) -> str:
    cur.execute('SELECT id FROM "Act" WHERE "shortName" = %s;', (short_name,))
    row = cur.fetchone()
    if row:
        return row["id"]
    cur.execute('''
        INSERT INTO "Act" ("id", "title", "shortName", "year", "description", "updatedAt")
        VALUES (gen_random_uuid(), %s, %s, %s, %s, NOW())
        RETURNING id;
    ''', (title, short_name, year, f"{title} — ingested by Python pipeline."))
    return cur.fetchone()["id"]

def insert_sections(cur, act_id: str, sections: list[dict], label: str):
    for idx, s in enumerate(sections, 1):
        cur.execute('''
            INSERT INTO "Section" ("id", "actId", "number", "title", "content", "updatedAt")
            VALUES (gen_random_uuid(), %s, %s, %s, %s, NOW())
            ON CONFLICT ("actId", "number") DO UPDATE
            SET "title" = EXCLUDED."title", "content" = EXCLUDED."content";
        ''', (act_id, s["number"], s["title"], s["content"]))
        if idx % 50 == 0 or idx == len(sections):
            sys.stdout.write(f"   -> [{label}] Inserted {idx}/{len(sections)} sections\n")

def main():
    parser = argparse.ArgumentParser(description="Nyaay Legal PDF Ingestion Pipeline")
    parser.add_argument("--clean", action="store_true", help="Force clean database before re-ingestion (destructive)")
    args = parser.parse_args()

    print("[START] Python Legal PDF Ingestion Pipeline (17 Legal Acts Support)")
    if not os.path.exists(DATA_DIR):
        print(f"[ERROR] Data directory not found at: {DATA_DIR}")
        return

    files = [f for f in os.listdir(DATA_DIR) if f.lower().endswith('.pdf')]
    if not files:
        print(f"[ERROR] No PDFs found in {DATA_DIR}")
        return

    print(f"   Found {len(files)} PDF(s) to process.")
    conn = get_db()
    try:
        with conn.cursor() as cur:
            if args.clean:
                print("\n [CLEAN] Resetting database tables for fresh re-ingestion (--clean flag active)...")
                cur.execute('DELETE FROM "LegalChunk";')
                cur.execute('DELETE FROM "Clause";')
                cur.execute('DELETE FROM "Section";')
                cur.execute('DELETE FROM "Act";')
                conn.commit()
                print("   Database cleared successfully.\n")
            else:
                print("\n [IDEMPOTENT] Ingesting without table wipe (use --clean for fresh reset).\n")

            total_sections = 0
            failures = 0

            for file in sorted(files):
                file_path = os.path.join(DATA_DIR, file)
                meta = ACT_METADATA.get(file, {
                    "shortName": re.sub(r'[^a-zA-Z0-9]', '', file.replace('.pdf', '')),
                    "title": file.replace('.pdf', '').replace('_', ' ').title(),
                    "year": 2024
                })

                print(f"[FILE] Ingesting: {file} ({meta['title']})")
                try:
                    act_id = get_or_create_act(cur, meta['shortName'], meta['title'], meta['year'])
                    conn.commit()

                    reader = pypdf.PdfReader(file_path)
                    if "constitution" in file.lower():
                        sections = parse_constitution(reader)
                    else:
                        sections = parse_generic_act(reader)

                    if not sections:
                        pages_text = [p.extract_text() or "" for p in reader.pages]
                        full_text = "\n".join(pages_text).strip()
                        sections = [{"number": "1", "title": meta['title'], "content": full_text[:4000]}]

                    print(f"   Parsed {len(sections)} section(s)")
                    insert_sections(cur, act_id, sections, meta['shortName'])
                    conn.commit()
                    total_sections += len(sections)
                except Exception as file_err:
                    conn.rollback()
                    failures += 1
                    record_ingestion_failure(file, "parse_or_insert", file_err, {"meta": meta})
                    print(f"   [WARN] Failed to process {file}: {file_err}. Continuing with remaining files.")

        print("\n" + "=" * 60)
        print(f"[SUCCESS] Ingestion completed! Total Sections: {total_sections}, Failures: {failures}")
        try:
            from cache import invalidate_search_cache
            inval = invalidate_search_cache()
            print(f"   [CACHE] Flushed search cache on ingestion completion: {inval}")
        except Exception as cache_err:
            print(f"   [WARN] Could not flush cache: {cache_err}")
        print("Next step: Run 'python rag/generate_embeddings.py' to generate vector embeddings.\n")
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Fatal ingestion pipeline error: {e}")
        raise e
    finally:
        conn.close()

if __name__ == "__main__":
    main()
