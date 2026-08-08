"""
rag/main.py
──────────────────────────────────────────────────────────────
FastAPI Standalone Python RAG Service.
Port: 8000
──────────────────────────────────────────────────────────────
"""

import os
import re
import json
import base64
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq

from embeddings import embed_texts, embed_query
from retrieval import hybrid_search, rerank_candidates
from document_processor import extract_text_from_pdf, classify_document, generate_rag_reports

env_paths = [
    os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
    os.path.join(os.path.dirname(__file__), "..", ".env"),
    os.path.join(os.path.dirname(__file__), ".env"),
]
for p in env_paths:
    if os.path.exists(p):
        load_dotenv(p)

app = FastAPI(title="Nyaay Python RAG Microservice", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

def infer_act_short_name(query: str) -> Optional[str]:
    """Infer a narrow Act filter from explicit user wording."""
    q = query.lower()
    if re.search(r'\b(bns|bharatiya nyaya sanhita)\b', q):
        return "BNS"
    if re.search(r'\b(constitution|constitutional|article|art\.)\b', q):
        return "Constitution"
    return None

class EmbedRequest(BaseModel):
    texts: List[str]

class HybridSearchRequest(BaseModel):
    query: str
    act: Optional[str] = None
    topK: Optional[int] = 20

class SearchRequest(BaseModel):
    query: str
    filters: Optional[Dict[str, Any]] = None

class RerankRequest(BaseModel):
    query: str
    candidates: List[Dict[str, Any]]
    topN: Optional[int] = 8

class ChatRagRequest(BaseModel):
    content: str
    priorMessages: Optional[List[str]] = []
    language: Optional[str] = "english"

class CaseIntelligenceRequest(BaseModel):
    caseDetails: str

class ProcessDocumentRequest(BaseModel):
    pdfBase64: Optional[str] = None
    text: Optional[str] = None

@app.get("/health")
def health():
    return {"status": "ok", "service": "Python RAG Engine"}

@app.post("/embed")
def embed_endpoint(req: EmbedRequest):
    if not req.texts:
        return {"embeddings": []}
    embeddings = embed_texts(req.texts)
    return {"embeddings": embeddings}

@app.post("/hybrid-search")
def hybrid_search_endpoint(req: HybridSearchRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query is required")
    
    act_name = req.act or infer_act_short_name(req.query)
    query_emb = embed_query(req.query)
    results = hybrid_search(
        query=req.query,
        query_embedding=query_emb,
        act_short_name=act_name,
        top_k=req.topK or 20
    )
    return {"results": results}

@app.post("/search")
def search_endpoint(req: SearchRequest):
    """
    Full search pipeline matching search.ts:
    embed -> RRF hybrid search (with optional act filter) -> content sub-filter -> Cohere rerank -> payload.
    """
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query is required")

    filters = req.filters or {}
    act_name = filters.get("act") if filters.get("act") != "All Acts" else None
    if not act_name:
        act_name = infer_act_short_name(req.query)

    query_emb = embed_query(req.query)
    candidates = hybrid_search(
        query=req.query,
        query_embedding=query_emb,
        act_short_name=act_name,
        top_k=20
    )

    if not candidates:
        return {"results": []}

    # Content sub-filtering (category / court)
    content_filters = []
    if filters.get("category") and filters["category"] != "All Categories":
        content_filters.append(filters["category"].lower().split()[0])
    if filters.get("court") and filters["court"] != "All Courts":
        content_filters.append(filters["court"].lower().split()[0])
    if content_filters:
        candidates = [
            c for c in candidates
            if all(f in (c.get("content") or "").lower() for f in content_filters)
        ]

    top15 = candidates[:15]

    # Cohere reranking
    reranked = rerank_candidates(req.query, top15, top_n=10)

    # Clean payload (strip embedding/fts fields, match TS response shape)
    payload = []
    for c in reranked:
        entry = {k: v for k, v in c.items() if k not in ("embedding", "fts")}
        entry["score"] = c.get("score") or c.get("rrf_score") or 0
        payload.append(entry)

    return {"results": payload}

@app.post("/rerank")
def rerank_endpoint(req: RerankRequest):
    results = rerank_candidates(
        query=req.query,
        candidates=req.candidates,
        top_n=req.topN or 8
    )
    return {"results": results}

@app.post("/chat-rag")
def chat_rag_endpoint(req: ChatRagRequest):
    content = req.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Content is required")

    # 1. Expanded RAG Query from context
    prior = req.priorMessages or []
    expanded_query = f"{' | '.join(prior[-2:])} | {content}" if prior else content

    # 2. Python Embedding
    query_emb = embed_query(expanded_query)

    # 3. Hybrid Search & Reranking
    act_name = infer_act_short_name(expanded_query)
    hybrid_candidates = hybrid_search(expanded_query, query_emb, act_short_name=act_name, top_k=20)
    final_docs = rerank_candidates(content, hybrid_candidates, top_n=8)

    if final_docs:
        retrieved_context = "\n\n---\n\n".join([
            f"[Source {idx + 1}: {doc.get('act', {}).get('shortName') if isinstance(doc.get('act'), dict) else 'Law'} Sec {doc.get('section', {}).get('number') if isinstance(doc.get('section'), dict) else 'N/A'}]\n{doc.get('content', '')}"
            for idx, doc in enumerate(final_docs)
        ])
    else:
        retrieved_context = "No relevant legal context was found in the database for this query."

    # 4. Groq LLM Generation
    if not GROQ_API_KEY:
        return {
            "aiResponse": "[[NYAYA_CONFIDENCE:0]] Groq API Key is not configured.",
            "retrievedContext": retrieved_context,
            "confidenceScore": 0
        }

    groq = Groq(api_key=GROQ_API_KEY)
    hindi_inst = "\nCRITICAL RULE: YOU MUST RESPOND ENTIRELY IN THE HINDI LANGUAGE USING DEVANAGARI SCRIPT. Maintain formatting.\n" if req.language == "hindi" else ""

    system_prompt = f"""You are Nyaya, a precise legal assistant for Indian law.

You MUST answer ONLY using the provided context.
Do NOT use outside knowledge.

STRICT RULES:
1. Do NOT mix different legal domains (e.g., Constitution vs BNS vs IPC).
2. Always identify the correct Act (e.g., Bharatiya Nyaya Sanhita, Constitution of India).
3. Always mention the correct Section/Article number.
4. If the context is insufficient or unclear, say exactly:
   "Insufficient legal context to answer accurately."
5. Do NOT hallucinate, infer, or assume missing information.

CONFIDENCE SCORING GUIDE (be precise and honest):
- 90-100: Context directly answers the question with explicit section/article text.
- 70-89:  Context is relevant but only partially covers the question.
- 50-69:  Context is loosely related; the answer requires some inference.
- 20-49:  Context is marginally related; the answer is mostly uncertain.
- 0-19:   Context is irrelevant or insufficient to answer the question at all.

OUTPUT FORMAT (MANDATORY — follow this exactly):

🔹 Confidence:
<integer 0–100 only, no other text>

🔹 Act:
<Full Act Name>

🔹 Section / Article:
<Number only, e.g. "Section 14" or "Article 21">

🔹 Explanation:
<Clear, concise explanation of what the law says>

🔹 Punishment (if applicable):
- <point 1>
- <point 2>

🔹 Source:
<Exact source reference from context, e.g. "[Constitution] Article 15">
{hindi_inst}
---
CONTEXT:
{retrieved_context}
---"""

    final_prompt = f"[TRANSLATE AND RESPOND TO THE FOLLOWING STRICTLY IN HINDI USING DEVANAGARI SCRIPT]:\n\n{content}" if req.language == "hindi" else content

    try:
        completion = groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": final_prompt}
            ]
        )
        raw_ans = completion.choices[0].message.content or ""

        conf_match = re.search(r'🔹\s*Confidence:\s*(\d+)', raw_ans)
        if conf_match:
            conf_score = min(100, max(0, int(conf_match.group(1))))
            clean_ans = re.sub(r'🔹\s*Confidence:\s*\d+\s*\n?', '', raw_ans).strip()
        elif "insufficient legal context" in raw_ans.lower():
            conf_score = 0
            clean_ans = raw_ans
        else:
            conf_score = 75
            clean_ans = raw_ans

        formatted_ans = f"[[NYAYA_CONFIDENCE:{conf_score}]]\n{clean_ans}"
        return {
            "aiResponse": formatted_ans,
            "retrievedContext": retrieved_context,
            "confidenceScore": conf_score,
            "documents": final_docs
        }
    except Exception as e:
        return {
            "aiResponse": f"[[NYAYA_CONFIDENCE:0]] Error generating legal response: {e}",
            "retrievedContext": retrieved_context,
            "confidenceScore": 0
        }

@app.post("/case-intelligence")
def case_intelligence_endpoint(req: CaseIntelligenceRequest):
    """
    Matches intelligence.ts:
    embed caseDetails -> hybrid search top5 -> Groq structured JSON output.
    """
    if not req.caseDetails or not req.caseDetails.strip():
        raise HTTPException(status_code=400, detail="Case details are required")

    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

    # Embed and retrieve relevant laws
    query_emb = embed_query(req.caseDetails)
    top_chunks = hybrid_search(req.caseDetails, query_emb, top_k=20)
    top_laws = top_chunks[:5]

    relevant_context = "\n\n".join([
        f"[Framework: {c.get('act', {}).get('shortName', '') if isinstance(c.get('act'), dict) else ''} Sec {c.get('section', {}).get('number', '') if isinstance(c.get('section'), dict) else ''}] {c.get('content', '')}"
        for c in top_laws
    ])

    system_prompt = f"""You are Nyaay's Core Case Intelligence Engine.
The user is providing an informal situation or case conflict.
Analyze the situation strictly based on the extracted Indian Laws provided.
You MUST output your response strictly as a valid JSON object without any markdown wrapping (no ```json) with exactly the following schema:
{{
  "understanding": "A short 2-3 sentence logical summary of the legal issue at hand.",
  "violatedRights": ["List of laws broken or rights violated"],
  "legalPath": ["Step 1: issue notice...", "Step 2: wait 14 days...", "Step 3: file civil suit..."],
  "documents": ["List the exact legal documents needed, e.g. Legal Notice, Civil Suit for Injunction"],
  "courtInfo": "A brief string noting the relevant court jurisdiction or tribunal format to approach."
}}

*** RELEVANT EXTRACTED INDIAN LAWS ***
{relevant_context}
"""

    groq = Groq(api_key=GROQ_API_KEY)
    try:
        completion = groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=2000,
            temperature=0.2,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Case Details: {req.caseDetails}"}
            ]
        )
        raw = (completion.choices[0].message.content or "{}").replace("```json", "").replace("```", "").strip()
        struct = json.loads(raw)
        return {
            "intelligence": struct,
            "mappedLaws": [
                {
                    "act": c.get("act", {}).get("shortName") if isinstance(c.get("act"), dict) else None,
                    "section": c.get("section", {}).get("number") if isinstance(c.get("section"), dict) else None,
                    "content": c.get("content")
                }
                for c in top_laws
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Case intelligence failed: {e}")

@app.post("/process-document")
def process_document_endpoint(req: ProcessDocumentRequest):
    extracted_text = ""
    if req.pdfBase64:
        try:
            pdf_bytes = base64.b64decode(req.pdfBase64)
            extracted_text = extract_text_from_pdf(pdf_bytes)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to decode/parse PDF: {e}")
    elif req.text:
        extracted_text = req.text
    else:
        raise HTTPException(status_code=400, detail="pdfBase64 or text is required")

    if not extracted_text.strip():
        return {
            "status": "FAILED",
            "summary": "Document is empty or unreadable.",
            "extractedText": ""
        }

    # Classification
    doc_class = classify_document(extracted_text)
    # Reports (includes summaryHi translation)
    reports = generate_rag_reports(doc_class, extracted_text)

    return {
        "status": "READY",
        "documentType": doc_class["documentType"],
        "summary": doc_class["summary"],
        "summaryHi": reports.get("summaryHi", doc_class["summary"]),
        "partiesInvolved": doc_class["partiesInvolved"],
        "extractedText": extracted_text,
        "analysisReport": reports["analysisReport"],
        "analysisReportHi": reports["analysisReportHi"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
