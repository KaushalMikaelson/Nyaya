# Nyaya — Quick Revision Sheet

## ⚡ 30-Second Pitch
> "Nyaya is a full-stack AI-powered legal platform for Indian law. It uses RAG — Retrieval Augmented Generation — to let citizens ask legal questions and get answers grounded in real Indian Acts. The backend is Node.js/Express with PostgreSQL and pgvector for hybrid semantic + keyword search. LLM inference is via Groq's LLaMA 3.3 70B. The platform has 4 user roles with JWT-based auth, a verified lawyer marketplace, and a Razorpay freemium model."

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
| Embedding dimensions | 1024 |
| RRF constant k | 60 |
| Hybrid search candidates | 30 vector + 30 keyword → RRF top 20 |
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
2. EMBED via Xenova/gte-large local model (1024-dim)
3. HYBRID SEARCH: vector (pgvector HNSW <=> cosine) + BM25 (tsvector GIN)
                  → Reciprocal Rank Fusion: 1/(60+rank)
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
Act → Section → Clause → LegalChunk (embedding: vector(1024), fts: tsvector)
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
| Xenova local model in chat (not Voyage API) | Zero cost per chat query |
| Voyage AI in search route | Better legal domain precision |
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
| `backend/src/services/retrieval.ts` | hybridSearch (RRF) + rerankCandidates (Cohere) |
| `backend/src/routes/chat.ts` | Full RAG pipeline implementation |
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
VOYAGE_API_KEY       # Legal embeddings (search route)
COHERE_API_KEY       # Reranking
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

- **"Why PostgreSQL?"** → pgvector extension for native vector similarity, ACID, Prisma support
- **"Why Groq?"** → Sub-100ms inference for LLaMA 70B — fastest free LLM API available
- **"Why Voyage AI?"** → voyage-law-2 is domain-tuned for legal text; standard models miss legal nuances
- **"Why BullMQ?"** → Async email/WhatsApp jobs don't block HTTP response; retry on failure
- **"Why Neon?"** → Serverless Postgres that scales to zero; perfect for dev/staging; pgvector supported
- **"Why Cohere reranking?"** → Two-stage funnel: cheap vector retrieval narrows candidates, expensive cross-encoder picks the best
- **"Why RRF over weighted sum?"** → RRF is rank-based, not score-based → immune to score scale differences between BM25 and cosine similarity
