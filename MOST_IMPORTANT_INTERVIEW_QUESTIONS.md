# Nyaya — Most Important Interview Questions & Answers

---

## 🧑‍💼 HR / PROJECT DISCUSSION QUESTIONS

### Q1: "Tell me about your project."

> "I built Nyaya — an AI-powered legal platform for Indian law. The core problem I solved is that Indian legal information is complex and inaccessible. Most people don't know their rights, and lawyer consultations are expensive.
>
> Nyaya has three main layers. First, a **RAG-based AI chatbot** — when a user asks a legal question, the system retrieves relevant sections from a database of Indian Acts using hybrid search: vector similarity AND keyword search fused with a technique called Reciprocal Rank Fusion. Those results are then reranked by Cohere's cross-encoder model, and the top chunks are fed as context into Groq's LLaMA 3.3 70B model to generate a grounded, cited answer.
>
> Second, a **multi-role auth system** — Citizens, Lawyers, Judges, and Admins each have different access levels. Lawyers must submit their Bar Council credentials, which admins manually verify. Third, a **Lawyer Marketplace** where verified lawyers can list their services.
>
> The stack is Next.js 14 on the frontend, Node.js/Express with TypeScript on the backend, PostgreSQL with pgvector for the legal knowledge base, and Prisma as the ORM."

---

### Q2: "What was your contribution?"

> "I built this entire platform end-to-end as a solo developer. Key contributions:
> - Designed and implemented the full database schema — 20+ Prisma models covering users, legal hierarchy (Acts→Sections→Clauses→Chunks), case management, payments, and subscriptions
> - Built the entire auth system: JWT rotation, OTP via crypto module, Google OAuth redirect flow, bcrypt hashing, rate limiting
> - Implemented the RAG pipeline from scratch: data ingestion scripts, embedding generation, hybrid search with RRF, Cohere reranking, and structured LLM prompting
> - Built all 16 backend route modules and the complete frontend with 20+ pages
> - Debugged a series of production-level issues including cross-origin cookie failures, Redis crash on startup, LangChain template parser conflicts with legal text"

---

### Q3: "What was your biggest technical challenge?"

> "The most interesting challenge was making the AI answers reliable — preventing hallucination while maintaining response quality.
>
> My first attempt used the `useChat` hook from `@ai-sdk/react` for streaming, but it had a state sync issue where the input would freeze after sending a message. I completely replaced it with a custom `fetch`-based streaming implementation using `ReadableStream`.
>
> The second challenge was prompt design. I initially used LangChain's `ChatPromptTemplate`, but legal text contains curly braces like `{resolvedLabel}` in section references, which LangChain's template parser mistook for unbound variables and threw errors. I switched to building a raw message array — `[SystemMessage, ...history, HumanMessage]` — and calling `.invoke()` directly.
>
> The third was embedding consistency. The chat route and search route needed to use the same embedding model (1024-dim) to ensure the query vector matched the stored chunk vectors. I chose Xenova's gte-large for chat (local, zero cost) and Voyage AI's voyage-law-2 for the search route (specialized legal embeddings)."

---

### Q4: "How would you scale this project?"

> "Several improvements for production scale:
>
> **Database**: Move from Node.js cosine similarity to native pgvector HNSW index — O(log N) instead of O(N). Already documented in my rag_architecture.md. Also add Redis caching for frequent query embeddings.
>
> **AI Pipeline**: Add response streaming via SSE or Server-Sent Events so the user sees tokens as they arrive instead of waiting for the full response. Add a query router (small fast model like llama-3.1-8b-instant) to classify query intent before hitting the expensive 70B model.
>
> **Infrastructure**: The Express backend is fully stateless, so horizontal scaling behind a load balancer is trivial. Refresh tokens are in the database, not memory, so any instance can validate them. Move to Kubernetes with auto-scaling on CPU/memory.
>
> **Reliability**: Add circuit breakers around Groq and Cohere APIs with graceful degradation — if Cohere reranking fails, fall back to pure hybrid scores. If Groq fails, return a cached similar response if available.
>
> **Observability**: Add distributed tracing (OpenTelemetry) to track the full RAG pipeline latency per step: embedding, retrieval, reranking, generation."

---

### Q5: "Why did you choose this tech stack?"

> "Each choice was deliberate:
> - **Next.js 14 App Router**: SSR for SEO (legal information pages need to be indexed), file-based routing, and the ability to add API routes for BFF patterns later.
> - **PostgreSQL + pgvector**: I needed a relational DB for the complex user/case schema AND vector storage for embeddings. pgvector lets me do both in one database without managing a separate vector store like Pinecone.
> - **Groq**: Fastest LLM inference available — sub-100ms for LLaMA 70B. For a chat interface, latency matters more than raw accuracy.
> - **Voyage AI**: Their `voyage-law-2` model is specifically trained on legal corpora. General-purpose embeddings miss legal term nuances like the difference between 'bail' and 'surety'.
> - **Cohere reranking**: Cross-encoders are more accurate than bi-encoders for ranking but too slow for retrieval. Two-stage pipeline: fast retrieval with bi-encoders, accurate ranking with cross-encoder.
> - **Neon**: Serverless Postgres scales to zero cost when not in use — perfect for a side project that may have variable traffic."

---

## 🧑‍💻 TECHNICAL / INTERMEDIATE QUESTIONS

### Q6: "Explain JWT and your refresh token strategy."

> "A JWT has three parts: header, payload, signature. I sign access tokens with `JWT_ACCESS_SECRET` and set 2-hour expiry. The payload carries `{ userId, email, role, isPro, isEmailVerified }`.
>
> The problem with JWTs is they can't be invalidated before expiry. So I use a **refresh token with DB backing**. When a user logs in, I create a `RefreshToken` row in the database with `tokenId`, then sign a JWT with `{ userId, tokenId }` as the refresh token.
>
> On each `/auth/refresh` call, I verify the JWT signature, look up the `tokenId` in the DB. If `revokedAt` is set, I know someone reused an old token — potential theft — so I immediately revoke ALL tokens for that user. Otherwise, I revoke the old token and issue a new pair. This is called **rotation-based refresh**."

---

### Q7: "What is Reciprocal Rank Fusion and why did you use it?"

> "RRF is a way to merge two ranked lists into one without caring about the actual scores — only the ranks matter. The formula is:
> ```
> score = 1/(60 + rank_vector) + 1/(60 + rank_keyword)
> ```
> The constant 60 prevents top ranks from being infinitely valuable.
>
> Why not a weighted sum of scores? Because BM25 scores and cosine similarity scores are on completely different scales. A BM25 score of 0.8 doesn't mean the same thing as a cosine similarity of 0.8. If I multiplied them with weights, the higher-scale scores would dominate.
>
> RRF is scale-agnostic — a document ranked #1 in both lists will score highest, regardless of what the raw scores were. It's also simple and empirically proven to outperform many complex fusion methods."

---

### Q8: "How does OTP generation work? Is it secure?"

> "In `otp.service.ts`, I use Node's `crypto.randomBytes(4)` which generates 4 cryptographically secure random bytes using the OS CSPRNG (on Linux: `/dev/urandom`). I then read these 4 bytes as a 32-bit unsigned integer and take modulo 1,000,000 to get a 6-digit number, left-padded to 6 digits.
>
> This is NOT `Math.random()` — which is a pseudo-random number generator not suitable for security. `crypto.randomBytes` is suitable.
>
> Additional security: OTPs expire in 10 minutes, have a 5-attempt limit after which they're invalidated, and any existing OTP for the same target+type is invalidated before creating a new one, preventing overlap attacks."

---

### Q9: "Explain bcrypt and why you use different cost factors."

> "bcrypt is an adaptive password hashing function. The cost factor determines how many iterations the algorithm runs — `cost=12` means 2^12 = 4,096 rounds. Higher cost = slower to compute = harder to brute-force.
>
> I use cost=12 for citizens and cost=14 for admins. Admin accounts are higher-value targets — compromising an admin allows verifying fraudulent lawyers or accessing all user data. The extra two rounds (2^14 = 16,384 iterations) make each admin password guess ~4x slower, significantly raising the cost of a brute-force attack on admin credentials.
>
> The tradeoff is login time — cost=14 takes ~500ms vs ~125ms for cost=12. For an admin who logs in rarely, this is acceptable."

---

### Q10: "What is planLimiter and how does it work?"

> "planLimiter is a custom middleware in `src/middleware/planLimiter.ts` that enforces API quotas per subscription tier.
>
> When a request hits a protected route (like `/chat`), planLimiter:
> 1. Fetches the user's `Subscription` record from the DB
> 2. If none exists, auto-provisions a FREE subscription (100 calls/30 days)
> 3. Checks if the billing period has expired → resets `apiTokensUsed` to 0
> 4. Compares `apiTokensUsed >= apiTokensLimit` → returns 429 if exceeded
> 5. Otherwise, increments `apiTokensUsed` atomically via Prisma
>
> It fails-open on errors — if the DB call fails, it calls `next()` rather than blocking the user. This is a deliberate reliability tradeoff."

---

## 🔬 ADVANCED / SYSTEM DESIGN QUESTIONS

### Q11: "How would you add streaming responses to the chat?"

> "Currently the chat endpoint does `await groq.invoke()` and returns the full response. For streaming, I'd:
> 1. Use `groq.stream()` which returns an async iterator of token chunks
> 2. Set `Content-Type: text/event-stream` on the response
> 3. For each chunk: `res.write('data: ' + JSON.stringify({token}) + '\n\n')`
> 4. On the frontend, use `EventSource` or `fetch` with `body.getReader()` to consume the stream
> 5. The confidence sentinel `[[NYAYA_CONFIDENCE:N]]` would need to be extracted during streaming — I'd buffer until I find the sentinel pattern, then strip it and start rendering the visible content.
>
> The challenge is persisting the full message after streaming completes — I'd need to buffer the entire streamed content server-side or client-side before the DB `prisma.message.create()` call."

---

### Q12: "Design the legal knowledge ingestion pipeline."

> "The ingestion pipeline has three phases:
>
> **Phase 1 — Seed** (`seed_legal_data.ts`): Parse raw Indian Act JSON files. Create DB records: `Act → Section → Clause` hierarchy.
>
> **Phase 2 — Chunk**: Use `RecursiveCharacterTextSplitter` (LangChain) with `chunkSize=1200, chunkOverlap=250`. Legal-specific separators: `['\n\n[Clause', '\n\n', '\n', '.']` to prefer clause and paragraph boundaries over arbitrary character splits. Store as `LegalChunk` records.
>
> **Phase 3 — Embed** (`generate_embeddings.ts`): Batch chunks through Voyage AI `voyage-law-2` → 1024-dim vectors. Insert using raw SQL:
> ```sql
> INSERT INTO "LegalChunk" (id, actId, content, embedding)
> VALUES (uuid(), $1, $2, $3::vector)
> ```
> (Prisma can't handle the `vector` type in writes — must use raw SQL.)
>
> **Phase 4 — Index** (raw SQL migration):
> ```sql
> CREATE INDEX USING hnsw (embedding vector_cosine_ops);
> CREATE INDEX USING GIN (fts);
> CREATE TRIGGER tsvectorupdate ... tsvector_update_trigger(fts, 'pg_catalog.english', content);
> ```
> The trigger auto-populates `fts` on insert/update."

---

### Q13: "What are the security risks and how did you mitigate them?"

> "Key risks and mitigations:
>
> **1. JWT theft**: Short-lived access tokens (2h). If stolen, expires quickly.
> **2. Refresh token theft/reuse**: DB-backed rotation with reuse detection. If someone steals a refresh token, using it after the legitimate client rotated it triggers revocation of ALL sessions.
> **3. Brute force login**: `loginLimiter` — 10 attempts per 15 min per IP.
> **4. OTP bombing** (flooding someone's inbox/SMS): `otpSendLimiter` — 5 requests per 10 min per IP.
> **5. SQL injection**: Prisma parameterized queries by default. Raw SQL uses tagged template literals (Prisma auto-parameterizes).
> **6. XSS**: Helmet CSP headers restrict script sources. HTTP-only refresh token cookie not accessible to JavaScript.
> **7. CSRF**: Access token is a Bearer token (not cookie), immune to CSRF. Refresh token cookie uses SameSite=None but only sent to `/auth/refresh` endpoint.
> **8. Privilege escalation**: `requireRole()` middleware checks `req.user.role` from verified JWT — not from request body.
> **9. Fake lawyer verification**: Admins manually review Bar Certificate, Degree, and Government ID documents before setting `verificationStatus = VERIFIED`."

---

### Q14: "Explain the Google OAuth flow in detail."

> "I implemented the OAuth 2.0 Implicit Grant (redirect) flow:
>
> 1. User clicks 'Sign in with Google' in `login/page.tsx`
> 2. Frontend constructs Google OAuth URL with `response_type=token` (implicit) and redirects the browser
> 3. User authenticates on Google, Google redirects back to `/login#access_token=...&expires_in=3600`
> 4. A `useEffect` in `login/page.tsx` parses `window.location.hash` to extract `access_token`
> 5. Frontend calls Google's `userinfo` endpoint with the access token to get `{ email, name, sub }`
> 6. Frontend POSTs to `/api/auth/google/token` with `{ access_token, email, name, googleId }`
> 7. Backend upserts the user (create if new, find if existing), then calls `issueTokenPair()`
> 8. Frontend calls `login(accessToken, user)` from AuthContext → redirects by role
> 9. `window.history.replaceState()` cleans the URL (removes the hash fragment)
>
> Note: I switched from popup to redirect mode (`window.location.href = url`) because popup-blockers were preventing the OAuth window in production on Vercel."

---

## 🎯 FOLLOW-UP / TRAP QUESTIONS

### "Isn't implicit grant flow deprecated?"

> "You're right — the OAuth 2.0 implicit grant with `response_type=token` is deprecated in OAuth 2.1 in favour of PKCE (Proof Key for Code Exchange). The concern is that access tokens in the URL hash can leak via browser history, Referrer headers, or server logs.
>
> For a production hardening, I'd migrate to `response_type=code` with PKCE: the frontend generates a random `code_verifier`, hashes it as `code_challenge`, includes it in the auth request. Google returns an authorization `code`. The backend exchanges the code for tokens at Google's token endpoint, sending the `code_verifier` for verification. This keeps access tokens server-side."

---

### "If both BM25 and vector search return 30 results, couldn't you just intersect them?"

> "Intersection would only keep documents appearing in BOTH lists — potentially zero if the keyword and semantic matches have no overlap. That's why we use a FULL OUTER JOIN. The value of hybrid search is precisely that BM25 excels at exact keyword matching (e.g., 'BNS Section 103') while vector search excels at semantic intent ('what is the punishment for murder'). These often retrieve complementary documents, and RRF merges them fairly."

---

### "What happens if Groq API goes down?"

> "Currently, the chat route returns a 500 error with the message. In production, I'd add:
> 1. **Retry with exponential backoff** for transient failures
> 2. **Fallback model**: Route to a different provider (e.g., Anthropic Claude or OpenAI) via LangChain's `ChatOpenAI` swapped in
> 3. **Cached responses**: If the exact same query was answered before, return cached response
> 4. **Graceful degradation**: Return the raw retrieved chunks with a message 'AI analysis temporarily unavailable, here are the relevant legal sections'
>
> The `retrieval.ts` service already gracefully falls back from Cohere to slice-based ranking, so retrieval itself is resilient."

---

### "Why not use a vector database like Pinecone or Weaviate?"

> "For this project, Postgres + pgvector was the pragmatic choice:
> - **Fewer moving parts**: One database for both relational data (users, cases) and vector data
> - **ACID transactions**: A single transaction can insert a user AND their profile, no consistency issues across two databases
> - **Cost**: Neon Postgres scales to zero; Pinecone has minimum costs
> - **Joins**: I can do `LegalChunk JOIN Section JOIN Act` in one query — impossible with a standalone vector DB
>
> At true scale (50M+ chunks), I would separate them: use pgvector for chunks ≤10M, then evaluate Weaviate/Qdrant for larger corpora since HNSW performance degrades with very large datasets."

---

### "Your OTP is 6 digits — how many possibilities does that give?"

> "10^6 = 1,000,000 possibilities. With the 5-attempt limit and 10-minute expiry, an attacker gets 5 guesses. Probability of guessing: 5/1,000,000 = 0.0005%. Rate limiting (5 OTP requests per 10 min per IP) also prevents generating fresh OTPs rapidly. For a legal platform, this is sufficient — financial platforms typically use 6 digits with the same limits."

---

## 📝 STRUCTURED ANSWERS FOR KEY SCENARIOS

### "Explain one complex feature end-to-end."

> "I'll explain the RAG chat pipeline in detail.
>
> When a user sends a message in the chat interface (`POST /api/chat/conversations/:id/messages`):
>
> **1. Query Expansion**: I take the last 2 user messages and join them with the current message. If someone asks 'What about minors?' after asking about IPC 302, the expanded query becomes 'IPC 302 murder | What about minors?' — this ensures the vector search retrieves contextually relevant chunks, not generic 'minor' chunks.
>
> **2. Embedding**: The expanded query is passed to Xenova's `gte-large` model running locally via `@xenova/transformers`. This generates a 1024-dimensional float vector. It's lazy-loaded on first request and cached as a singleton.
>
> **3. Hybrid Search** (`retrieval.ts`): A single PostgreSQL raw query runs two CTEs — one using pgvector's cosine distance operator `<=>` on the HNSW index, another using `ts_rank_cd` on the full-text search GIN index. These 30+30 results are merged via a FULL OUTER JOIN and ranked by RRF scores. The top 20 are returned.
>
> **4. Reranking** (`retrieval.ts`): The 20 candidates plus the original query are sent to Cohere's `rerank-english-v3.0`. This cross-encoder model reads each (query, document) pair jointly — much more accurate than bi-encoder similarity. Top 8 returned.
>
> **5. Prompt**: I build the system prompt as a plain string (not LangChain template) interpolating the retrieved context directly. The prompt enforces structured output: Confidence score, Act name, Section number, Explanation, Punishment, Source citation.
>
> **6. Generation**: `ChatGroq(llama-3.3-70b-versatile, temperature=0.1).pipe(StringOutputParser()).invoke(messages)`. The response is parsed with regex to extract confidence, then prepended as `[[NYAYA_CONFIDENCE:85]]` sentinel.
>
> **7. Persistence**: User message + assistant message saved to DB. User's `queriesCount` incremented."

---

### "What would you do differently if you built this again?"

> "Three things:
>
> 1. **Implement streaming from day one.** The non-streaming approach was a shortcut. Building streaming into the architecture from the start is cleaner than retrofitting it.
>
> 2. **Use a proper query router.** Before hitting the expensive 70B model, a small fast model (8B parameters) should classify: Is this query about Indian law? Does it need RAG? Is it a simple factual question answerable from metadata? This reduces LLM costs significantly.
>
> 3. **Separate the ingestion pipeline.** Currently, the ingestion scripts live in the backend directory as TypeScript files. A production system should have a dedicated ingestion service with its own versioning, observability, and ability to run incremental updates when new Acts are published — without touching the main API server."
