"""
rag/document_processor.py
──────────────────────────────────────────────────────────────
RAG Document Processor Engine in Python.
Handles PDF/OCR text extraction, Groq document classification,
and RAG-augmented legal analysis report generation (English + Hindi).
──────────────────────────────────────────────────────────────
"""

import os
import io
import json
from typing import Dict, Any, List, Optional
import pypdf
from groq import Groq
from dotenv import load_dotenv
env_paths = [
    os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
    os.path.join(os.path.dirname(__file__), "..", ".env"),
    os.path.join(os.path.dirname(__file__), ".env"),
]
for p in env_paths:
    if os.path.exists(p):
        load_dotenv(p)

from retrieval import get_db_connection

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

def get_groq_client() -> Groq:
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY environment variable missing!")
    return Groq(api_key=GROQ_API_KEY)

def type_specific_instructions(doc_type: str) -> str:
    """Returns type-specific legal analysis instructions (mirrors TS typeSpecificInstructions)."""
    mapping = {
        'Contract/Agreement': 'Focus on termination clauses, liabilities, financial obligations, specific performance, breach consequences, and unfair terms.',
        'Legal Notice': 'Focus on the timeline to respond, demanded actions, statutory violations claimed, and the legal weight of the threats made.',
        'FIR/Police Report': 'Focus on the penal sections applied, chronology of events, severity of charges (bailable/non-bailable), and immediate legal steps the accused should take.',
        'Court Judgment/Order': 'Focus on the ratio decidendi (reasoning), the final decree/order, precedents cited, and compliance obligations.',
        'Petition': 'Identify the reliefs sought, grounds raised, jurisdiction, and strength of the legal arguments.',
        'Affidavit': 'Check for completeness, accuracy of statements, statutory compliance, and whether a notary/oath commissioner attestation is required.',
        'Power of Attorney': 'Identify the scope of powers granted, revocation clauses, duration, and risks of misuse.',
        'Will/Testament': 'Focus on clarity of asset distribution, witness requirements under the Indian Succession Act, and any ambiguous clauses.',
        'Identity/KYC Document': 'Briefly confirm validity and flag any exposed PII that may create legal risks under the DPDP Act 2023.',
    }
    return mapping.get(doc_type, 'Identify the core legal themes, potential risks, and compliance requirements under Indian law.')

def translate_to_hindi(text: str, groq: Groq) -> str:
    """Translates a single sentence to Hindi using Groq (llama-3.1-8b-instant)."""
    try:
        fast_model = os.getenv("GROQ_FAST_MODEL", "qwen/qwen3.6-27b")
        res = groq.chat.completions.create(
            model=fast_model,
            messages=[{
                'role': 'user',
                'content': f'Translate this single sentence strictly into plain Hindi, returning only the translation without quotes: "{text}"'
            }]
        )
        return (res.choices[0].message.content or text).strip()
    except Exception:
        return text

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extracts text content from PDF bytes using pypdf."""
    try:
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        pages_text = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(pages_text).strip()
    except Exception as e:
        print(f"⚠️ PDF extraction error: {e}")
        return ""

def chunk_text(text: str, max_words: int = 300) -> List[str]:
    words = text.split()
    chunks = []
    current = []
    for word in words:
        current.append(word)
        if len(current) >= max_words:
            chunks.append(" ".join(current))
            current = []
    if current:
        chunks.append(" ".join(current))
    return chunks

def classify_document(text: str) -> Dict[str, Any]:
    """Classifies document type, generates high-level summary, and lists parties involved using Groq."""
    groq = get_groq_client()
    system_prompt = (
        "Analyze the following Indian legal document extract and classify it. "
        "Return strictly valid JSON with no markdown wrapping and exact keys:\n"
        '{\n'
        '  "documentType": "Contract/Agreement" | "Legal Notice" | "Court Judgment/Order" | "FIR/Police Report" | "Identity/KYC Document" | "Petition" | "Affidavit" | "Power of Attorney" | "Will/Testament" | "Other",\n'
        '  "summary": "A 1-2 sentence high-level summary",\n'
        '  "partiesInvolved": ["Party Name 1", "Party Name 2"]\n'
        '}'
    )

    try:
        fast_model = os.getenv("GROQ_FAST_MODEL", "qwen/qwen3.6-27b")
        res = groq.chat.completions.create(
            model=fast_model,
            temperature=0,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text[:2000]}
            ]
        )
        content = res.choices[0].message.content or "{}"
        content = content.replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        return {
            "documentType": data.get("documentType", "Other"),
            "summary": data.get("summary", "Document summary unavailable."),
            "partiesInvolved": data.get("partiesInvolved", [])
        }
    except Exception as err:
        print(f"⚠️ Document classification error: {err}")
        return {
            "documentType": "Other",
            "summary": "Classification unavailable.",
            "partiesInvolved": []
        }

def get_legal_context_from_db(limit: int = 50) -> str:
    """Retrieves top recent legal chunks from DB to populate legal context (matches TS: take 50, use top 5)."""
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT c.content, a."shortName" as act_name, s.number as sec_num
                FROM "LegalChunk" c
                LEFT JOIN "Act" a ON c."actId" = a.id
                LEFT JOIN "Section" s ON c."sectionId" = s.id
                ORDER BY c."createdAt" DESC
                LIMIT %s;
            """, (limit,))
            rows = cur.fetchall()
            if not rows:
                return "No specific laws retrieved. Apply general Indian legal principles."
            # Use only the top 5, matching TS behavior
            top_rows = list(rows)[:5]
            contexts = [f"[{r.get('act_name') or 'Law'} Sec {r.get('sec_num') or 'N/A'}] {r['content']}" for r in top_rows]
            return "\n\n".join(contexts)
    except Exception as e:
        print(f"[WARN] Context fetch error: {e}")
        return "Apply general Indian legal principles."
    finally:
        try: conn.close()
        except: pass

def generate_rag_reports(doc_class: Dict[str, Any], extracted_text: str) -> Dict[str, str]:
    """Generates structured English and Hindi legal analysis reports using RAG context.
    Fully mirrors the TS documentProcessor.ts analysis step.
    """
    groq = get_groq_client()
    legal_context = get_legal_context_from_db(limit=50)
    doc_selection = "\n\n".join(chunk_text(extracted_text)[:6])
    doc_type = doc_class.get('documentType', 'Other')
    summary = doc_class.get('summary', '')
    parties = ', '.join(doc_class.get('partiesInvolved', [])) or 'Unknown'
    task = type_specific_instructions(doc_type)

    # Translate summary to Hindi (matches TS behavior)
    summary_hi = translate_to_hindi(summary, groq)

    system_prompt_en = f"""You are Nyaya, an elite legal document analyzer for Indian law.
Document Type: **{doc_type}**
Summary: {summary}
Parties: {parties}

TASK: {task}

Produce a structured legal analysis report in Markdown.
Cite applicable Indian laws. Note potential risks. End with a plain-language summary.
Do NOT give binding legal advice.

RELEVANT INDIAN LAWS:
{legal_context}"""

    system_prompt_hi = f"""You are Nyaya, an elite legal document analyzer for Indian law.
Document Type: **{doc_type}**
Parties: {parties}

TASK: {task}

Produce a structured legal analysis report in Markdown. YOU MUST WRITE THE ENTIRE REPORT EXCLUSIVELY IN HINDI USING DEVANAGARI SCRIPT.
Cite applicable Indian laws. Note potential risks. End with a plain-language summary. Do NOT give binding legal advice.

RELEVANT INDIAN LAWS:
{legal_context}"""

    try:
        groq_model = os.getenv("GROQ_MODEL", "groq/compound")
        res_en = groq.chat.completions.create(
            model=groq_model,
            max_tokens=2048,
            messages=[
                {"role": "system", "content": system_prompt_en},
                {"role": "user", "content": f"Analyze this document:\n\n{doc_selection}"}
            ]
        )
        res_hi = groq.chat.completions.create(
            model=groq_model,
            max_tokens=2048,
            messages=[
                {"role": "system", "content": system_prompt_hi},
                {"role": "user", "content": f"Analyze this document. Your output MUST be completely in Hindi:\n\n{doc_selection}"}
            ]
        )
        return {
            "summaryHi": summary_hi,
            "analysisReport": res_en.choices[0].message.content or "Analysis could not be generated.",
            "analysisReportHi": res_hi.choices[0].message.content or "Hindi analysis could not be generated."
        }
    except Exception as err:
        print(f"[WARN] Legal report generation error: {err}")
        return {
            "summaryHi": summary_hi,
            "analysisReport": f"Analysis encountered an error: {err}",
            "analysisReportHi": f"Hindi analysis error: {err}"
        }
