import os
import re
import sys
import pypdf
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

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

def get_db():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL missing!")
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def detect_act(text: str) -> str:
    top = text[:2000].upper()
    if "BHARATIYA NYAYA SANHITA" in top:
        return "BNS"
    if "CONSTITUTION OF INDIA" in top:
        return "Constitution"
    return "Unknown"

def clean_text(raw: str) -> str:
    cleaned = raw.replace('\r\n', '\n').replace('\r', '\n')
    cleaned = re.sub(r'^\s*\d{1,4}\s*$', '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r'[ \t]{2,}', ' ', cleaned)
    cleaned = re.sub(r'[ \t]+$', '', cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    return cleaned.strip()

def parse_bns(text: str) -> list[dict]:
    cleaned = clean_text(text)
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
        m = re.match(r'^(\d{1,3}[A-Z]?)\.\s*(.*)', line.strip())
        if m and m.group(1).isdigit() and 1 <= int(m.group(1)) <= 358:
            flush()
            cur_num = m.group(1)
            rest = m.group(2).strip()
            cur_lines = [rest if rest else line.strip()]
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
    body_pages = reader.pages[32:235]
    full_text = ""
    for p in body_pages:
        txt = p.extract_text() or ""
        txt = re.sub(r'^THE CONSTITUTION OF INDIA[^\n]*\n?', '', txt)
        txt = re.sub(r'_{10,}.*', '', txt, flags=re.DOTALL)
        full_text += "\n" + txt

    clean_txt = re.sub(r'\d+\[', '', full_text)
    art_pattern = re.compile(
        r'(?<!\d)(\d{1,3}[A-Z]?)\.\s*([A-Z][^.\ufffd\r\n]+?)\.(?:\ufffd|[\u2014—\-]|(?=\s*[A-Z(]))'
    )

    matches = list(art_pattern.finditer(clean_txt))
    articles = []

    for i, m in enumerate(matches):
        art_num = m.group(1)
        title = m.group(2).strip()[:150]

        num_val = int(re.sub(r'\D', '', art_num))
        if not (1 <= num_val <= 395):
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
        if num not in dedup or len(a["content"]) > len(dedup[num]["content"]):
            dedup[num] = a

    return list(dedup.values())

def get_or_create_act(cur, short_name: str, title: str) -> str:
    cur.execute('SELECT id FROM "Act" WHERE "shortName" = %s;', (short_name,))
    row = cur.fetchone()
    if row:
        return row["id"]
    cur.execute('''
        INSERT INTO "Act" ("id", "title", "shortName", "year", "description", "updatedAt")
        VALUES (gen_random_uuid(), %s, %s, 2024, %s, NOW())
        RETURNING id;
    ''', (title, short_name, f"{title} — ingested by Python pipeline."))
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
    print("[START] Python Legal PDF Ingestion Pipeline (format-aware)")
    if not os.path.exists(DATA_DIR):
        print(f"[ERROR] Data directory not found at: {DATA_DIR}")
        return

    files = [f for f in os.listdir(DATA_DIR) if f.lower().endswith('.pdf')]
    if not files:
        print(f"[ERROR] No PDFs found in {DATA_DIR}")
        return

    print(f"   Found {len(files)} PDF(s): {', '.join(files)}")
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute('DELETE FROM "LegalChunk";')
            cur.execute('DELETE FROM "Clause";')
            cur.execute('DELETE FROM "Section";')
            cur.execute('DELETE FROM "Act";')
            conn.commit()

            bns_act_id = get_or_create_act(cur, "BNS", "Bharatiya Nyaya Sanhita")
            con_act_id = get_or_create_act(cur, "Constitution", "Constitution of India")
            conn.commit()

            for file in files:
                file_path = os.path.join(DATA_DIR, file)
                print(f"\n[FILE] Extracting: {file}")
                reader = pypdf.PdfReader(file_path)
                pages_text = [p.extract_text() or "" for p in reader.pages]
                full_text = "\n".join(pages_text)

                act_type = detect_act(full_text)
                print(f"   Detected: {act_type}")

                if act_type == "BNS":
                    sections = parse_bns(full_text)
                    print(f"   Parsed {len(sections)} BNS sections")
                    insert_sections(cur, bns_act_id, sections, "BNS")
                    conn.commit()
                elif act_type == "Constitution":
                    articles = parse_constitution(reader)
                    print(f"   Parsed {len(articles)} Constitution articles")
                    insert_sections(cur, con_act_id, articles, "Constitution")
                    conn.commit()
                else:
                    print(f"   [WARN] Could not detect act type for {file} — skipping")

        print("\n[SUCCESS] Legal PDF Ingestion complete!")
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Ingestion failed: {e}")
        raise e
    finally:
        conn.close()

if __name__ == "__main__":
    main()
