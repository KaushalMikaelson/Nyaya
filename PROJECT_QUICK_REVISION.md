# Nyaya — Quick Revision Sheet

## ⚡ 30-Second Pitch
> "Nyaya is a full-stack AI-powered legal platform for Indian law. It uses a FastAPI RAG microservice to let citizens ask legal questions and get answers grounded in real Indian Acts. Retrieval uses PostgreSQL full-text search plus optional pgvector semantic search, Cohere reranking, and Groq's LLaMA 3.3 70B. The platform has 4 user roles with JWT-based auth, a verified lawyer marketplace, and a Razorpay freemium model."

---

## 🏗️ Architecture in One Line
```
User → Next.js (App Router) → Axios (with interceptors) → Express API
     → JWT Auth → RAG Pipeline → Groq LLM → Response with Confidence Score
```

---

## 🔑 Key Numbers to Remember

| Fact | Value |
|------|-------|
| Access token expiry | 2 hours |
| Refresh token expiry | 7 days |
| OTP expiry | 10 minutes |
| OTP max attempts | 5 |
| bcrypt cost (citizen) | 12 |
| bcrypt cost (admin) | 14 |
| Embedding dimensions | 384 in Python RAG vector mode |
| RRF constant k | 60 |
| Retrieval candidates | 30 vector + 30 keyword → RRF top 20 in vector mode; FTS top 20 on 512MB Render |
| After reranking | Top 8 chunks (chat) / Top 10 (search) |
| FREE plan limit | 100 API calls / 30 days |
| PRO plan limit | 10,000 API calls / 30 days |
| Login rate limit | 10 attempts / 15 min |
| Schema models | ~20 Prisma models |
| API routes | 16 route files, ~35+ endpoints |

---

## 🔐 Auth Flow (Memorize This)

```
Register → OTP Email → Verify → issueTokenPair()
                                   ↓
                      AccessToken (2h, JWT)  +  RefreshToken (7d, DB-stored)
                                   ↓
Login → same issueTokenPair()
                                   ↓
Silent Refresh (AuthContext mount) → POST /auth/refresh
  → rotateRefreshToken():
      1. verify JWT signature
      2. DB lookup by tokenId
      3. If already revoked → REVOKE ALL (reuse attack!)
      4. Revoke old → create new pair
```

---

## 🤖 RAG Pipeline (5 Steps)

```
1. EXPAND query with last 2 user messages (context-aware)
2. OPTIONAL EMBED via FastEmbed ONNX all-MiniLM-L6-v2 (384-dim)
   → disabled on 512MB Render with RAG_VECTOR_SEARCH=false
3. RETRIEVE:
   → full mode: pgvector HNSW <=> cosine + Postgres FTS, fused by RRF
   → Render low-memory mode: Postgres FTS + ILIKE fallback
4. RERANK: Top 20 → Cohere rerank-english-v3.0 → Top 8
5. GENERATE: LangChain ChatGroq(llama-3.3-70b, temp=0.1)
             → Structured output with confidence score
             → Prepend [[NYAYA_CONFIDENCE:N]] sentinel
```

---

## 📊 Database Quick Reference

```
User → CitizenProfile / LawyerProfile / JudgeProfile / AdminProfile (1:1)
User → RefreshToken[] (1:many) — device tracking
User → Otp[] (1:many) — type: EMAIL_VERIFY | LOGIN | PASSWORD_RESET | AADHAAR_LINK
User → Conversation → Message[] (chat history)
User → Subscription (1:1) — tier: FREE/BASIC/PRO/ENTERPRISE
Act → Section → Clause → LegalChunk (embedding: vector(384) optional, fts: tsvector)
Case → Hearing[] / CaseTimeline[] / CaseParty[] / CaseAdvocate[]
Firm → FirmMember[] (roles: OWNER/PARTNER/ASSOCIATE/PARALEGAL)
```

---

## 🛡️ Security Layers (In Order)

1. **Helmet.js** → HTTP security headers (CSP, HSTS, X-Frame)
2. **CORS** → Only `FRONTEND_URL` origin with credentials
3. **Rate limiters** → Per-endpoint throttling (express-rate-limit)
4. **JWT authenticate** → Bearer token verification
5. **requireRole()** → Role-based access
6. **requireEmailVerified** → Email check gate
7. **planLimiter** → Quota check per subscription tier
8. **requirePermission** → Granular admin permissions

---

## 🔥 Tricky Technical Decisions

| Decision | Why |
|----------|-----|
| FastEmbed lazy import | Avoids loading the embedding runtime during startup |
| Render text-search mode | Keeps the RAG service under the 512MB memory ceiling |
| No LangChain ChatPromptTemplate in chat | Legal text has `{braces}` → breaks parser |
| Redis workers = conditional import | Prevents `ioredis` crash in dev without Redis |
| `router.replace()` not `router.push()` on auth guards | Back button can't return to protected pages |
| `SameSite=None` on refresh token cookie | Cross-port (3000→3001) in local dev |
| Refresh token returned in JSON + cookie | Mobile clients / interceptor fallback |
| Confidence sentinel `[[NYAYA_CONFIDENCE:N]]` | Confidence travels with response, stripped before display |

---

## 📁 Most Important Files

| File | What It Does |
|------|-------------|
| `backend/src/index.ts` | Server bootstrap, all 16 route mounts, worker init |
| `backend/src/services/token.service.ts` | JWT signing, issueTokenPair, rotateRefreshToken |
| `backend/src/services/otp.service.ts` | crypto OTP, email/SMS send, verifyOtp with attempt tracking |
| `backend/src/services/retrieval.ts` | Proxies backend calls to the Python RAG service |
| `rag/main.py` | FastAPI RAG endpoints: search, chat-rag, document processing |
| `rag/retrieval.py` | pgvector/FTS retrieval, Render fallback, Cohere reranking |
| `rag/embeddings.py` | Lazy FastEmbed ONNX embeddings / mock fallback |
| `backend/src/middleware/auth.ts` | authenticate, requireRole, role guard shortcuts |
| `backend/src/middleware/planLimiter.ts` | Plan-tier API quota enforcement |
| `backend/src/middleware/rateLimiter.ts` | All rate limit configs |
| `backend/prisma/schema.prisma` | Full DB schema (633 lines) |
| `frontend/src/contexts/AuthContext.tsx` | Global auth state, token decode, silent refresh |
| `frontend/src/app/login/page.tsx` | Password + OTP + Biometric + Google OAuth |

---

## ⚙️ Environment Variables (Key Ones)

```bash
# Backend
DATABASE_URL         # Neon PostgreSQL
JWT_ACCESS_SECRET    # Signs 2h access tokens
JWT_REFRESH_SECRET   # Signs 7d refresh tokens
GROQ_API_KEY         # LLaMA 3.3 70B inference
COHERE_API_KEY       # Reranking
PYTHON_RAG_URL       # Backend -> FastAPI RAG service
RAG_VECTOR_SEARCH    # true locally/full mode, false on 512MB Render
RAG_EMBEDDING_PROVIDER # fastembed normally, mock/disabled on Render fallback
PYTHON_VERSION       # 3.11.11 on Render native Python
RAZORPAY_KEY_ID / KEY_SECRET  # Payments
SMTP_USER / SMTP_PASS         # Gmail OTP emails
REDIS_URL            # BullMQ workers (optional in dev)

# Frontend
NEXT_PUBLIC_API_URL            # Must include /api suffix!
NEXT_PUBLIC_GOOGLE_CLIENT_ID   # Google OAuth
```

---

## 🐳 Docker Setup
```yaml
# Two services: backend (3001) + frontend (3000)
# Backend: env_file, uploads volume persisted
# Frontend: depends_on backend, build args for public env vars
# Workers: only start when REDIS_URL is NOT localhost
```

---

## 💡 One-Liners for Common Questions

- **"Why PostgreSQL?"** → One DB for relational legal data, FTS retrieval, and optional pgvector similarity
- **"Why Groq?"** → Sub-100ms inference for LLaMA 70B — fastest free LLM API available
- **"Why FastEmbed?"** → ONNX embeddings are lighter than torch/SentenceTransformers and can be lazy-loaded
- **"Why BullMQ?"** → Async email/WhatsApp jobs don't block HTTP response; retry on failure
- **"Why Neon?"** → Serverless Postgres that scales to zero; perfect for dev/staging; pgvector supported
- **"Why Cohere reranking?"** → Two-stage funnel: cheap retrieval narrows candidates, cross-encoder ranking picks the best
- **"Why disable vectors on Render free?"** → 512MB is too tight for local embedding models; FTS + rerank keeps production alive
- **"Why RRF over weighted sum?"** → RRF is rank-based, not score-based → immune to score scale differences between BM25 and cosine similarity
