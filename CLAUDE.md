# Project: Nyaay
Legal document retrieval system. Stack: Next.js, Node.js, PostgreSQL + pgvector,
Redis, Prisma ORM, LangChain, Groq (LLM), Cohere Rerank, FastEmbed ONNX embeddings, Docker.
Retrieval: BM25 + semantic search fused with RRF, then Cohere rerank.
Corpus: ~8,166 legal chunks from 17 Indian Acts ingested via an ETL pipeline
(extraction, OCR, cleaning, dedup, chunking, embedding, indexing).

# Working rules
- Before changing anything, explore the repo and summarize the relevant code paths.
  Propose a plan and wait for my approval.
- Make small, reviewable commits. Never rewrite working code without telling me why.
- Never invent metrics. Every number must come from a script I can rerun.
- Keep evaluation code in /eval, separate from application code.
- Pin dependency versions. Write or update tests for everything you change.
- Config (RRF constant k, top-k, chunk size, model names) must come from one config
  file, never hard-coded, so experiments are reproducible.
- Explain non-obvious design choices in code comments or docs/DECISIONS.md.
