# Production RAG Architecture: Legal AI System

As an AI Architect, I have reviewed your current pipeline (which relies on manual JS `cosineSimilarity` and strict word-count boundaries) and mapped out a concrete, production-ready upgrade path. 

This upgrade will migrate you to **pgvector** for native similarity search, implement **Hybrid Search** (Vector + BM25) with **Reciprocal Rank Fusion (RRF)**, utilize **Cohere** for Re-ranking, and introduce **Hierarchical Overlap Chunking**.

---

## 1. Database & Indexing Optimization (pgvector + BM25)

Currently, doing cosine similarity in Node.js `O(N)` is not scalable. We must move the computation to PostgreSQL using `pgvector`.

### Prisma Schema Update (`schema.prisma`)
You must enable the `pgvector` extension and configure full-text search capabilities.

```prisma
// Enable postgresqlExtensions in your generator
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [vector]
}

model LegalChunk {
  id        String   @id @default(cuid())
  actId     String
  sectionId String
  clauseId  String?
  content   String
  
  // 1. pgvector integration
  embedding Unsupported("vector(1024)")? 
  
  // 2. Postgres Full-Text Search (TSVector)
  fts       Unsupported("tsvector")?     

  act       Act      @relation(fields: [actId], references: [id])
  section   Section  @relation(fields: [sectionId], references: [id])
  
  @@index([embedding]) // Consider HNSW or IVFFlat index for prod
  @@index([fts], type: Gin)
}
```

*Run Raw SQL in your migration to establish indexes and FTS triggers:*
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE INDEX ON "LegalChunk" USING hnsw (embedding vector_cosine_ops);
CREATE INDEX fts_idx ON "LegalChunk" USING GIN (fts);

-- Trigger to auto-update the searchable text
CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
ON "LegalChunk" FOR EACH ROW EXECUTE FUNCTION
tsvector_update_trigger(fts, 'pg_catalog.english', content);
```

---

## 2. Improved Chunking (Hierarchical + Overlap)

Strict 300-word buckets risk splitting critical legal context right down the middle. We will use `RecursiveCharacterTextSplitter` configured for legal domains, preserving Act/Section/Clause hierarchy.

```typescript
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { pipeline, env } from '@xenova/transformers';
import { prisma } from '../src/prisma';

env.allowLocalModels = true;

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1200,       // characters, not words (~300 tokens)
  chunkOverlap: 250,     // 20% overlap 
  separators: ["\n\n[Clause", "\n\n", "\n", ".", " "], // Prioritize legal boundaries
});

async function processSection(act: any, section: any) {
  const rawText = `[Act: ${act.shortName}] Section ${section.number}: ${section.title}\n${section.content}`;
  
  const chunks = await splitter.createDocuments([rawText], [{ 
    actShortName: act.shortName, 
    sectionNum: section.number 
  }]);

  const texts = chunks.map(c => c.pageContent);
  
  // Local batched embedding using Xenova/gte-large (1024 dims)
  const pipe = await pipeline('feature-extraction', 'Xenova/gte-large', { quantized: false });
  const output = await pipe(texts, { pooling: 'mean', normalize: true });
  
  for (let i = 0; i < chunks.length; i++) {
    const embedding = Array.from(output[i].data);
    // Insert using Raw SQL to handle the Unsupported(vector) type
    await prisma.$executeRaw`
      INSERT INTO "LegalChunk" ("id", "actId", "sectionId", "content", "embedding")
      VALUES (gen_random_uuid(), ${act.id}, ${section.id}, ${texts[i]}, ${embedding}::vector)
    `;
  }
}
```

---

## 3. Hybrid Search & Reciprocal Rank Fusion (RRF)

We combine exact keyword matching (for specific penal codes/section numbers) with semantic search (for contextual intent).

```typescript
// backend/src/services/retrieval.ts
import { prisma } from '../prisma';

export async function hybridSearch(query: string, queryEmbedding: number[], topK = 15) {
  // We execute a raw query utilizing Reciprocal Rank Fusion (RRF)
  // This balances Vector similarity and BM25 (WebSearch) scores.
  const queryStr = query.replace(/[^a-zA-Z0-9 ]/g, ''); // Sanitize

  const results = await prisma.$queryRaw`
    WITH vector_search AS (
      SELECT id, content, "actId", "sectionId",
             ROW_NUMBER() OVER(ORDER BY embedding <=> ${queryEmbedding}::vector) as rnk
      FROM "LegalChunk"
      ORDER BY embedding <=> ${queryEmbedding}::vector
      LIMIT 30
    ),
    keyword_search AS (
      SELECT id, content, "actId", "sectionId",
             ROW_NUMBER() OVER(ORDER BY ts_rank(fts, websearch_to_tsquery('english', ${queryStr})) DESC) as rnk
      FROM "LegalChunk"
      WHERE fts @@ websearch_to_tsquery('english', ${queryStr})
      ORDER BY ts_rank(fts, websearch_to_tsquery('english', ${queryStr})) DESC
      LIMIT 30
    )
    SELECT 
      COALESCE(v.id, k.id) as id,
      COALESCE(v.content, k.content) as content,
      -- RRF Formula: 1 / (k + rank) where k is traditionally 60
      (COALESCE(1.0 / (60 + v.rnk), 0.0) + COALESCE(1.0 / (60 + k.rnk), 0.0)) as rrf_score
    FROM vector_search v
    FULL OUTER JOIN keyword_search k ON v.id = k.id
    ORDER BY rrf_score DESC
    LIMIT ${topK};
  `;
  
  return results;
}
```

---

## 4. Re-Ranking (Cohere)

Hybrid search retrieves the best 15 candidates. We pass them to a Cross-Encoder (Cohere Rerank v3) to confidently pick the top 5 most relevant documents for context optimization.

```typescript
import { CohereClient } from 'cohere-ai';
const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

async function rerankCandidates(query: string, candidates: any[]) {
  if (!candidates.length) return [];
  
  const documents = candidates.map(c => c.content);
  
  const reranked = await cohere.rerank({
    model: 'rerank-english-v3.0',
    query: query,
    documents: documents,
    topN: 5,
    returnDocuments: false
  });

  // Map back to original objects
  return reranked.results.map(res => candidates[res.index]);
}
```

---

## 5. Strong Legal Prompt & Context Optimization

Now that we have highly optimized, re-ranked context, we inject it into the prompt. To prevent token bloat and hallucination, we enforce strict grounding with citations.

```typescript
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';

const SYSTEM_TEMPLATE = `You are Nyaya Assistant, an expert Indian legal AI.

**CORE DIRECTIVE:** 
You must answer the user's query STRICTLY based on the provided LEGAL CONTEXT. Do not fabricate sections, laws, or case results. 

**CITATION RULES:**
When citing a law, you MUST use the exact bracketed source tag provided. 
Example: "Under the [Bharatiya Nyaya Sanhita - Sec 103], murder is punishable by..."

If the CONTEXT does not contain the answer, explicitly state: 
"I cannot verify the exact provision in the available legal databases, however..."

**LEGAL CONTEXT:**
{context_string}

**DISCLAIMER REQUIRED:** End your response acknowledging you are an AI, not a substitute for legal counsel.`;

const prompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM_TEMPLATE],
  new MessagesPlaceholder("history"),
  ["human", "{query}"]
]);
```

---

## 6. E2E Pipeline Architecture Diagram

```mermaid
graph TD
    A[User Query] --> B(Router/Guardrails Check)
    B --> C{Query Vectorization - Local Xenova/gte-large}
    
    C -->|Vector [1024d]| D_pgvector[(Postgres pgvector\nExact kNN/HNSW)]
    C -->|Keywords| D_bm25[(Postgres BM25\ntsvector GIN)]
    
    D_pgvector -->|Top 30| E[Reciprocal Rank Fusion RRF]
    D_bm25 -->|Top 30| E
    
    E -->|Top 15 Hybrid Candidates| F(Cohere Cross-Encoder Reranker)
    F -->|Top 4-5 Golden Chunks| G(Context Assembly)
    
    G --> H[LangChain Prompt + Citation Mapping]
    H --> I((LLAMA-3.3 70B Groq))
    
    I -->|Next.js Streaming TextResponse| J[User UI]
```

## Summary of Upgrades
1. **Performance**: Migrated `cosineSimilarity` out of Node JS directly into PostgreSQL via HNSW vector indexes. Query speed drops from `O(N)` traversing 100,000 DB records in JS to `O(log N)` C-level native DB searching.
2. **Recall Accuracy**: By leveraging **RRF (BM25 + Semantic)**, exact section queries (e.g. "BNS Sec 103") are heavily weighted by BM25, while descriptive queries ("What is the punishment for taking a life?") are resolved semantically.
3. **Precision**: Rerankers are expensive to run on full databases. The two-stage funnel (Retrieval -> Rerank) yields state-of-the-art accuracy.
