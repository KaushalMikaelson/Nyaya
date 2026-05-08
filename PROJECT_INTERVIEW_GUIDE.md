# Nyaya — Project Interview Guide

## 1. Project Overview

**Nyaya** (also spelled "Nyaay") is a full-stack, production-ready **AI-powered legal technology platform** built to democratize access to Indian law. It serves as an intelligent legal advisor that combines a multi-role user system, a sophisticated RAG-based AI pipeline, and a verified professional marketplace.

### Problem Statement
Indian legal information is scattered, complex, and inaccessible to the average citizen. People either don't know their rights or cannot afford a lawyer consultation. Nyaya bridges this gap with AI that understands Indian law deeply.

### Target Users

| Role     | Description |
|----------|-------------|
| **Citizen** | Asks legal questions, uploads documents for analysis, browses lawyers |
| **Lawyer** | Gets Bar Council-verified, lists services on the marketplace |
| **Judge** | Gets government-ID verified by admins, accesses judicial tools |
| **Admin** | Manages platform, verifies professionals, issues invite tokens |

### USP (Unique Selling Proposition)
- Only platform combining RAG-grounded AI answers with a verified Indian lawyer marketplace
- Multi-role JWT auth with professional verification pipeline
- Hybrid semantic + keyword legal search with Cohere reranking
- Hindi language support in AI responses
- Freemium model with Razorpay payments

---

## 2. Tech Stack with Reasons

### Frontend

| Technology | Version | Why Chosen |
|------------|---------|------------|
| **Next.js** | 14 (App Router) | SSR for SEO, file-based routing, API routes for BFF pattern |
| **React** | 18 | Component model, hooks, concurrent features |
| **Tailwind CSS** | Latest | Utility-first, rapid styling, no CSS bloat |
| **Framer Motion** | Latest | Declarative animations, AnimatePresence for route transitions |
| **Axios** | Latest | Interceptors for automatic token refresh, cleaner than fetch |
| **Lucide React** | Latest | Tree-shakeable icon library |
| **@react-oauth/google** | Latest | Google OAuth 2.0 redirect flow |

### Backend

| Technology | Version | Why Chosen |
|------------|---------|------------|
| **Node.js + Express 5** | Latest | Non-blocking I/O for AI streaming, large ecosystem |
| **TypeScript** | Latest | Type safety across entire codebase |
| **Prisma ORM** | Latest | Type-safe queries, auto-generated client, migrations |
| **PostgreSQL** (Neon) | Latest | ACID compliance + pgvector extension for embeddings |
| **jsonwebtoken** | Latest | Stateless auth, rotation-based refresh tokens |
| **bcrypt** | Latest | Adaptive hashing — cost factor 12 citizens, 14 admins |
| **Nodemailer** | Latest | Gmail SMTP for OTP email delivery |
| **Helmet.js** | Latest | Security headers: CSP, HSTS, X-Frame-Options |
| **express-rate-limit** | Latest | Per-endpoint brute-force protection |
| **BullMQ + ioredis** | Latest | Background job queues for notifications |
| **Multer** | Latest | Multipart file uploads for verification documents |

### AI Stack

| Technology | Purpose |
|------------|---------|
| **Groq (LLaMA 3.3 70B)** | LLM inference — ultra-low latency via Groq Cloud |
| **Voyage AI (voyage-law-2)** | Legal-domain-tuned 1024-dim embeddings for search route |
| **Xenova/gte-large** | Local embeddings (no API cost) for chat route |
| **Cohere Rerank v3** | Cross-encoder reranking of hybrid search results |
| **LangChain** | Orchestration: message history, output parsers, Groq integration |
| **pgvector** | Native PostgreSQL vector similarity via HNSW index |
| **pdf-parse** | PDF text extraction for document analysis |
| **tesseract.js** | OCR for image-based legal documents |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| **Neon PostgreSQL** | Serverless Postgres, scales to zero, pgvector enabled |
| **Redis** | BullMQ job queue backend |
| **Razorpay** | Indian payment gateway for PRO subscriptions |
| **Twilio** | WhatsApp/SMS OTP delivery |
| **Docker + Docker Compose** | Containerized local dev; two services: backend + frontend |

---

## 3. Folder Structure

```
nyaya/
├── docker-compose.yml         # Two-service compose: backend + frontend
├── rag_architecture.md        # Production RAG upgrade documentation
├── tech_stack_and_actions.md  # Development log
│
├── backend/
│   ├── src/
│   │   ├── index.ts           # Express server entry point, all route mounts
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── routes/            # 16 route files
│   │   │   ├── auth.ts        # 48KB — all auth flows
│   │   │   ├── chat.ts        # RAG chat with LangChain + Groq
│   │   │   ├── search.ts      # Hybrid pgvector + BM25 + Cohere search
│   │   │   ├── documents.ts   # PDF/OCR upload + AI analysis
│   │   │   ├── generate.ts    # Legal document generation (7 templates)
│   │   │   ├── intelligence.ts# Case strategy analysis
│   │   │   ├── payments.ts    # Razorpay order + verify
│   │   │   ├── admin.ts       # Admin dashboard APIs
│   │   │   ├── cases.ts       # Case management
│   │   │   ├── marketplace.ts # Lawyer listings
│   │   │   └── ...
│   │   ├── middleware/
│   │   │   ├── auth.ts        # JWT verification, requireRole, role guards
│   │   │   ├── planLimiter.ts # Plan-tier API quota enforcement
│   │   │   ├── rateLimiter.ts # Per-endpoint express-rate-limit configs
│   │   │   └── requirePermission.ts # Granular admin permissions
│   │   ├── services/
│   │   │   ├── token.service.ts   # JWT sign/verify/rotation/revocation
│   │   │   ├── otp.service.ts     # Crypto OTP gen, email/SMS send
│   │   │   ├── retrieval.ts       # hybridSearch + rerankCandidates
│   │   │   └── aadhaar.service.ts # Aadhaar eKYC stub
│   │   └── workers/
│   │       └── notifications.ts   # BullMQ worker for email/WhatsApp jobs
│   ├── prisma/
│   │   └── schema.prisma      # Full DB schema (633 lines)
│   └── Dockerfile
│
└── frontend/
    ├── src/
    │   ├── app/               # Next.js App Router pages
    │   │   ├── page.tsx       # Dashboard (46KB — main app)
    │   │   ├── login/         # Password + OTP + Biometric + Google OAuth
    │   │   ├── signup/        # Multi-step registration
    │   │   ├── admin/         # Admin dashboard
    │   │   ├── cases/         # Case management UI
    │   │   ├── documents/     # Document intelligence UI
    │   │   ├── marketplace/   # Lawyer marketplace
    │   │   ├── generate/      # Legal doc generator
    │   │   ├── intelligence/  # Case strategy terminal
    │   │   └── profile/       # Role-specific profile pages
    │   ├── contexts/
    │   │   └── AuthContext.tsx # Global auth state, token decode, routing
    │   └── lib/
    │       └── api.ts         # Axios instance with interceptors
    └── Dockerfile
```

---

## 4. Authentication Flow (Deep Dive)

### Registration Flow (Citizen)
```
1. POST /api/auth/citizen/register
   → Validate email/password, hash password (bcrypt cost=12)
   → Create User + CitizenProfile in DB
   → Call createOtp(email, 'EMAIL_VERIFY') → crypto.randomBytes(4) → 6-digit code
   → sendOtpEmail() via Nodemailer SMTP
   → Return 201

2. POST /api/auth/citizen/verify-email { email, code }
   → verifyOtp() — checks DB for unused, non-expired OTP
   → Mark OTP used, mark User.isEmailVerified = true
   → Call issueTokenPair(userId) →
       - Create RefreshToken row in DB
       - signAccessToken(payload, '2h')
       - signRefreshToken({ userId, tokenId }, '7d')
   → Set refreshToken in HTTP-only cookie (SameSite=None, Secure)
   → Return { accessToken, user }
```

### Login Flow
```
POST /api/auth/login { email, password }
   → bcrypt.compare(password, user.passwordHash)
   → If match → issueTokenPair() → return tokens
   → Frontend: AuthContext.login(token, user)
     → setAccessToken(token) in Axios headers
     → Role-based redirect:
       ADMIN → /admin
       LAWYER (unverified) → /profile/lawyer
       JUDGE → /profile/judge
       CITIZEN → /dashboard
```

### Token Refresh (Silent)
```
AuthContext useEffect on mount:
   → POST /api/auth/refresh (cookie auto-sent)
   → rotateRefreshToken():
       1. jwt.verify(oldToken, REFRESH_SECRET)
       2. DB lookup: if revokedAt set → SECURITY: revoke ALL user tokens
       3. Revoke old token, issue new pair
   → Frontend: setAccessToken(newToken) in Axios instance
```

### Google OAuth Flow
```
1. User clicks "Sign in with Google"
2. Browser redirects to Google OAuth URL (implicit grant)
3. Google redirects back to /login#access_token=...
4. useEffect reads hash params, calls Google userinfo API
5. POST /api/auth/google/token { access_token, email, name, googleId }
6. Backend upserts user, issues JWT pair
7. Frontend login() + redirect
```

---

## 5. RAG Pipeline (Deep Dive)

### Ingestion (Offline)
```
seed_legal_data.ts:
  Acts (BNS, CrPC, Constitution...) 
    → Sections → Clauses → LegalChunks
  
generate_embeddings.ts:
  Each chunk → Voyage AI voyage-law-2 → 1024-dim vector
  Stored in LegalChunk.embedding (pgvector type)
  PostgreSQL GIN index on fts (tsvector)
  HNSW index on embedding for O(log N) ANN search
```

### Query Time (chat.ts: `POST /conversations/:id/messages`)

```
Step A: Context-Aware Query Expansion
  priorUserMessages.slice(-2) + currentQuery joined with " | "
  Prevents "What does that mean?" from retrieving garbage chunks

Step B: Embed expanded query
  → Xenova/gte-large (local, lazy-loaded singleton via getPipeline())
  → 1024-dim Float32Array
  Fallback: generateMockEmbedding() if model fails

Step C: Hybrid Search (retrieval.ts: hybridSearch())
  Postgres Raw Query (pgvector + BM25 via RRF):
  
  WITH vector_search AS (
    SELECT id, content, ROW_NUMBER() OVER(ORDER BY embedding <=> queryVec) as rnk
    FROM "LegalChunk" LIMIT 30
  ),
  keyword_search AS (
    SELECT id, content, ROW_NUMBER() OVER(ORDER BY ts_rank_cd(fts, query)) as rnk
    FROM "LegalChunk" WHERE fts @@ websearch_to_tsquery(...) LIMIT 30
  )
  SELECT COALESCE(v.id, k.id),
         (1.0/(60+v.rnk) + 1.0/(60+k.rnk)) as rrf_score
  FROM vector_search v FULL OUTER JOIN keyword_search k ON v.id = k.id
  ORDER BY rrf_score DESC LIMIT 20
  
  Then: Hydrate chunks with Act + Section relations

Step D: Reranking (retrieval.ts: rerankCandidates())
  Top 20 → Cohere rerank-english-v3.0 → Top 8 "golden" chunks
  Fallback: slice(0, limit) if Cohere unavailable

Step E: Prompt Construction
  SystemMessage with retrieved context interpolated directly (NOT LangChain template)
  Reason: legal text has {braces} that break LangChain template parser
  Structured output format enforced: Confidence, Act, Section, Explanation, Punishment, Source
  
Step F: LLM Call
  ChatGroq(llama-3.3-70b-versatile, temperature=0.1)
  .pipe(StringOutputParser()).invoke(messages)
  Confidence score extracted via regex: /🔹\s*Confidence:\s*(\d+)/
  Prepended as sentinel: [[NYAYA_CONFIDENCE:85]] (stripped before display)

Step G: Persist
  Save user + assistant messages to DB
  Increment user.queriesCount
  Update conversation.updatedAt
```

### RRF Formula
```
score = 1/(60 + rank_vector) + 1/(60 + rank_keyword)
k=60 is traditional constant preventing high ranks from dominating
```
- **Time complexity**: O(log N) for HNSW vector search vs O(N) for naive cosine in JS
- **Space complexity**: O(N × d) for the index where d=1024

---

## 6. Database Schema & Relationships

```
User (1) ──→ (1) CitizenProfile
     (1) ──→ (1) LawyerProfile
     (1) ──→ (1) JudgeProfile
     (1) ──→ (1) AdminProfile
     (1) ──→ (many) RefreshToken   [device session tracking]
     (1) ──→ (many) Otp            [EMAIL_VERIFY, LOGIN, PASSWORD_RESET, AADHAAR_LINK]
     (1) ──→ (many) Conversation ──→ (many) Message
     (1) ──→ (many) Notification
     (1) ──→ (many) MarketplaceListing
     (1) ──→ (many) Case [as client or primaryCounsel]
     (1) ──→ (1)  Subscription
     (1) ──→ (many) Payment
     (1) ──→ (many) UserDocument

Act (1) ──→ (many) Section ──→ (many) Clause
Act (1) ──→ (many) LegalChunk (embedding: vector(1024), fts: tsvector)

Case (1) ──→ (many) Hearing
     (1) ──→ (many) CaseTimeline
     (1) ──→ (many) CaseDocument
     (1) ──→ (many) CaseParty [PLAINTIFF, DEFENDANT, WITNESS...]
     (1) ──→ (many) CaseAdvocate

Firm (1) ──→ (many) FirmMember (roles: OWNER, PARTNER, ASSOCIATE, PARALEGAL)
     (1) ──→ (many) Case
     (1) ──→ (1)  Subscription
```

### Key Design Decisions in Schema
- `RefreshToken` stores `userAgent` + `ipAddress` → device fingerprinting
- `AdminInvite` has `expiresAt` + `used` → one-time invite tokens
- `Otp.attempts` tracked → max 5 tries before lockout
- `LegalChunk.embedding` uses `Unsupported("vector(1024)")` — Prisma doesn't natively support pgvector, raw SQL needed for inserts
- `Case.aiAnalysis` cached as JSON to avoid repeated LLM calls
- `UserDocument` has `deletedAt` for soft-delete (DPDP Act compliance)
- `CaseParty.aadhaarMasked` stores only last 4 digits after eKYC

---

## 7. Security Implementation

### JWT Strategy
- **Access Token**: 2h expiry, signed with `JWT_ACCESS_SECRET`, carries `{ userId, email, role, isPro, isEmailVerified }`
- **Refresh Token**: 7d expiry, signed with `JWT_REFRESH_SECRET`, carries `{ userId, tokenId }` where tokenId references DB row
- **Rotation**: Every refresh creates a new token pair, old one is revoked (`revokedAt = now()`)
- **Reuse Detection** (`token.service.ts:rotateRefreshToken`): If a revoked token is presented → ALL user sessions nuked immediately

### Middleware Chain (auth.ts)
```typescript
authenticate → verifies Bearer JWT → injects req.user
requireRole(...roles) → checks req.user.role
requireEmailVerified → checks req.user.isEmailVerified

// Shorthand guards:
adminOnly = [authenticate, requireRole(UserRole.ADMIN)]
lawyerOnly = [authenticate, requireRole(UserRole.LAWYER)]
professionalOnly = [authenticate, requireRole(LAWYER, JUDGE, ADMIN)]
```

### OTP Security (otp.service.ts)
- Generated via `crypto.randomBytes(4) % 1000000` — cryptographically secure
- 10-minute expiry
- Max 5 attempts → auto-invalidated
- Existing OTPs invalidated before new one is created (prevents overlap attacks)

### Rate Limiting (rateLimiter.ts)
| Endpoint | Window | Max |
|----------|--------|-----|
| Login | 15 min | 10 |
| OTP Send | 10 min | 5 |
| OTP Verify | 5 min | 10 |
| Register | 1 hour | 5 |
| Password Reset | 30 min | 3 |
| Token Refresh | 5 min | 30 |

### Plan Limiter (planLimiter.ts)
```
FREE: 100 API calls/30 days
BASIC: 1,000/30 days
PRO: 10,000/30 days
ENTERPRISE: 100,000/30 days
Auto-provisions FREE subscription on first touch
Resets counter on billing period rollover
```

### Other Security
- **Helmet.js**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- **CORS**: `origin: FRONTEND_URL` with `credentials: true`
- **bcrypt**: cost=12 citizens, cost=14 admins (higher cost = slower brute-force)
- **Admin Invite System**: Admins can only be created via `AdminInvite` tokens issued by existing admins

---

## 8. API Documentation (Key Routes)

### Auth Routes
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/citizen/register` | None | Register + send email OTP |
| POST | `/api/auth/citizen/verify-email` | None | Verify OTP, get tokens |
| POST | `/api/auth/login` | None | Universal password login |
| POST | `/api/auth/login/otp/request` | None | Send passwordless OTP |
| POST | `/api/auth/login/otp/verify` | None | Verify OTP, get tokens |
| POST | `/api/auth/refresh` | Cookie | Rotate refresh token |
| POST | `/api/auth/logout` | Bearer | Revoke current session |
| POST | `/api/auth/logout-all` | Bearer | Revoke all sessions |
| GET  | `/api/auth/me` | Bearer | Get full user profile |

### AI Routes
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/chat/conversations` | Bearer | List user conversations |
| POST | `/api/chat/conversations` | Bearer | Create conversation |
| POST | `/api/chat/conversations/:id/messages` | Bearer + planLimiter | RAG chat message |
| POST | `/api/search` | Bearer | Hybrid legal search |
| POST | `/api/documents` | Bearer | Upload + analyze PDF |
| POST | `/api/generate` | Bearer | Generate legal document |
| POST | `/api/intelligence` | Bearer | Case strategy analysis |

### Payment Routes
| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/payment/create-order` | `{ tier }` | `{ orderId, amount, keyId }` |
| POST | `/api/payment/verify-payment` | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature, tier }` | `{ success, subscription }` |

**Payment Verification**: HMAC-SHA256 of `orderId|paymentId` compared to Razorpay signature

---

## 9. Frontend Architecture

### AuthContext (contexts/AuthContext.tsx)
```typescript
State: user (AuthUser | null), loading (boolean)
Functions:
  login(token, user) → setAccessToken + role-based redirect
  logout() → POST /auth/logout → clear state → router.replace('/')
  logoutAll() → POST /auth/logout-all → clear all
  refreshUser() → re-fetch /auth/me + decode new token
  isRole(...roles) → boolean role check
  isVerified() → email verified (citizen) OR verificationStatus=VERIFIED

Auto-session restore: useEffect on mount → POST /auth/refresh
  → If refresh token cookie valid → decode JWT → restore session silently
  → If on /login → redirect to dashboard
  → If token fails + not public route → redirect to /
```

### Axios Instance (lib/api.ts)
- Base URL: `NEXT_PUBLIC_API_URL`
- Request interceptor: attach `Authorization: Bearer <accessToken>`
- Response interceptor: on 401 → call `/auth/refresh` → retry original request
- This implements the **silent token refresh** pattern

### Login Page (app/login/page.tsx)
Three modes via tab toggle: `password | otp | biometric`
- **Password**: Standard email + password form
- **OTP**: Two-step (request email → verify 6-digit code with OtpInput component)
- **Biometric**: WebAuthn/PublicKeyCredential mock for UI demo
- **Google**: Full-page redirect OAuth (not popup) → handles `#access_token=` hash on return

---

## 10. Docker / DevOps

### docker-compose.yml
```yaml
services:
  backend:
    build: ./backend
    ports: 3001:3001
    env_file: ./backend/.env
    volumes: ./backend/uploads:/app/uploads  # persist uploaded docs

  frontend:
    build: ./frontend
    ports: 3000:3000
    depends_on: [backend]
    args: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_GOOGLE_CLIENT_ID
```

- Backend `Dockerfile`: Multi-stage Node build
- Frontend `Dockerfile`: `next build` + standalone output
- Workers conditionally loaded: only when `REDIS_URL` points to external host (not localhost)

---

## 11. Major Design Decisions & Tradeoffs

### 1. Local Embeddings (Xenova) vs API (Voyage AI)
- **Chat route** uses Xenova/gte-large locally → zero cost per query, higher latency on first load
- **Search route** uses Voyage AI voyage-law-2 → better legal domain accuracy, costs per call
- **Tradeoff**: Cost vs quality. Chat gets local model, Search (more critical for precision) gets specialized model.

### 2. No LangChain Templates for Chat
- Legal text contains `{braces}` in section references that break LangChain's template parser
- **Solution**: Build raw message array `[SystemMessage, ...history, HumanMessage]` and call `.invoke()` directly

### 3. Refresh Token in Both Cookie AND JSON Response
- Browsers on `localhost:3000` calling `localhost:3001` → cross-origin
- `SameSite=Strict` blocks cookies across ports → changed to `SameSite=None; Secure=true`
- Also returned in JSON body as fallback for mobile clients and for interceptor-based refresh

### 4. Workers Only Load with External Redis
- In development/local: Redis often not running → `ioredis` emits unhandled error → server crash
- **Solution**: `index.ts` checks if `REDIS_URL` is external (not localhost). Only then imports worker files dynamically via `Promise.all([import(...)])`.
- Development falls back to synchronous document processing.

### 5. Confidence Score via Sentinel Pattern
- LLM returns confidence as `[[NYAYA_CONFIDENCE:85]]` prepended to response
- Frontend strips sentinel before rendering
- AI message stored with sentinel in DB → stripped on read for history injection
- **Why**: Avoids separate API calls; confidence travels with the response

### 6. `router.replace()` vs `router.push()` for Auth Guards
- `router.push('/')` on logout/auth failure adds entries to browser history → back button returns to protected page
- **Fix**: All auth guards and logout functions use `router.replace()` → no history entry created

---

## 12. Development Challenges & Solutions

| # | Challenge | Root Cause | Solution |
|---|-----------|-----------|----------|
| 1 | Frontend redirect loop | Backend `ERR_CONNECTION_REFUSED` → 401 → `router.push('/login')` loop | Fixed backend startup; auth guards became `router.replace('/')` on public route |
| 2 | Prisma types crash after schema change | `UserRole` enum not exported | `npx prisma generate` after every schema change |
| 3 | BullMQ crash on start | `ioredis` emitting `error` event before connection | Moved `connection.on('error', ()=>{})` before `connection.ping()` |
| 4 | Chat frozen, messages not sending | `useChat` hook from `@ai-sdk/react` state mismatch | Removed `useChat`, implemented custom `fetch`-based streaming with `ReadableStream` |
| 5 | OTP invalid despite correct code | Multiple registrations → older OTP not invalidated → user submitting wrong one | Added `.updateMany({ used: true })` before creating new OTP |
| 6 | Login "Invalid credentials" | Email casing mismatch (`Email@` vs `email@`) | `.toLowerCase().trim()` on all auth email inputs |
| 7 | Refresh token 401 cross-origin | `SameSite=Strict` blocked port-crossing cookies | Changed to `SameSite=None; Secure=true` |
| 8 | `NEXT_PUBLIC_API_URL` 404 HTML | Missing `/api` suffix → receiving HTML 404 as JSON | Added `/api` suffix to env variable |

---

## 13. Scalability Considerations

### Current Bottlenecks
1. **Xenova model**: ~2-3s cold start for first embedding in chat
2. **Synchronous LLM call**: No streaming to browser (response waits for full LLM output)
3. **N+1 on hydration**: `hybridSearch` runs raw SQL then second Prisma query to hydrate chunks

### Production Upgrades (from rag_architecture.md)
1. **pgvector HNSW index** → O(log N) ANN search instead of O(N) cosine in JS
2. **BM25 via tsvector GIN index** → native Postgres full-text search
3. **Hierarchical chunking** with `RecursiveCharacterTextSplitter` (1200 char, 250 overlap)
4. **Streaming responses** via `TextDecoderStream` / SSE
5. **Redis caching** of embeddings and frequent query results

### Horizontal Scaling
- Express is stateless → multiple instances behind load balancer
- Refresh tokens in DB → any instance can validate
- Neon Postgres auto-scales compute

---

## 14. Resume Bullet Points

```
• Built Nyaya, a full-stack AI legal platform (Next.js 14 + Node.js/Express + PostgreSQL/pgvector)
  implementing a 4-role auth system with JWT rotation, OTP verification, and Google OAuth

• Engineered a production RAG pipeline: Hybrid BM25 + vector search (Reciprocal Rank Fusion)
  + Cohere cross-encoder reranking achieving O(log N) retrieval via HNSW index

• Designed a multi-model AI system using Groq LLaMA 3.3 70B, Voyage AI legal embeddings,
  and Xenova local models with confidence scoring and hallucination guards

• Implemented enterprise security: bcrypt adaptive hashing, refresh token rotation with reuse
  detection, Helmet.js headers, per-endpoint rate limiting (express-rate-limit)

• Built freemium SaaS monetization: Razorpay payment verification (HMAC-SHA256 signature
  validation), plan-tier API quota middleware, and subscription management

• Integrated BullMQ + Redis background job queue for async email/WhatsApp notifications
  with graceful Redis fallback preventing server crashes in dev environments
```

### LinkedIn Description
```
Nyaya | AI Legal Platform for Indian Law
Tech: Next.js • Node.js • PostgreSQL/pgvector • Groq LLaMA 3.3 70B • LangChain • Cohere

Built a production-grade LegalTech platform democratizing access to Indian law through:
- RAG-powered AI chat grounded in real Indian Acts (BNS, CrPC, Constitution)
- Hybrid semantic + keyword search with cross-encoder reranking
- Multi-role system: Citizens, Verified Lawyers, Judges, Admins
- Secure multi-modal auth: JWT rotation, OTP (email+SMS), Google OAuth
- Lawyer marketplace with Bar Council document verification
- Razorpay freemium model with plan-tier API quotas
```
