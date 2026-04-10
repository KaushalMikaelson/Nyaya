# Nyaay – AI Legal Assistant for Indian Law
# Tech Stack & Development Log

---

## 1. Project Overview

**Nyaay** is a full-stack, production-ready AI-powered legal technology platform built to democratize access to Indian law. It serves four distinct user classes:

| Role | Description |
|------|-------------|
| **Citizen** | Asks legal questions, uploads documents for analysis, connects with lawyers |
| **Lawyer** | Gets verified via Bar Council credentials, lists services on the marketplace |
| **Judge** | Accesses judicial tools after government ID verification by admins |
| **Admin** | Manages verifications, invites new admins, oversees the platform |

---

## 2. Platform Features

### 🧠 AI & Legal Intelligence
- **RAG-powered Legal Chat** — Citizens ask natural-language legal questions. The system retrieves relevant Indian Acts/Sections via vector similarity search, reranks them with Cohere, and generates grounded answers via Groq LLaMA 3.3 70B.
- **Document Analyzer** — Upload PDF legal documents; the backend extracts text via `pdf-parse`, chunks it, embeds it via Voyage AI, and provides AI-powered analysis and summaries.
- **Case Intelligence Engine** — Dedicated `/intelligence` route providing case strategy, risk analysis, and next-step recommendations grounded in Indian law.
- **Legal Document Generator** — `/generate` route that produces structured legal documents (FIRs, notices, affidavits) from user inputs using Groq.

### 🔐 Authentication & Security
- **Multi-role JWT auth** — separate `access_token` (15 min) + `refresh_token` (7 days, rotation-based, stored in DB).
- **Passwordless OTP login** — 6-digit cryptographically secure codes sent via Gmail SMTP.
- **Aadhaar eKYC** — Stub integration with `aadhaar.service.ts` for future DigiLocker linking.
- **Biometric placeholders** — WebAuthn/FIDO2 credential storage hooks ready for mobile.
- **Rate limiting** — per-endpoint throttling via `express-rate-limit` (login: 10/hr, OTP send: 5/hr, etc.)
- **Security headers** — Helmet.js enforcing CSP, HSTS, X-Frame-Options, etc.
- **Admin invite-only** — Admins can only register via one-time invite tokens issued by existing admins.

### 🏛️ Lawyer Marketplace
- Verified lawyers create public listings with specialization, hourly rate, bio.
- Citizens browse, filter by specialization/state, and initiate contact.
- Admin team verifies lawyers by reviewing uploaded Bar Certificate, Degree, and Government ID documents.

### 💳 Monetization
- Free tier: 10 AI queries, 3 document analyses.
- **Nyaya PRO** upgrade via Razorpay: webhook updates `isPro = true` in database.

### 🔔 Notifications
- **BullMQ + Redis** queue for async email/WhatsApp job scheduling.
- Graceful fallback: if Redis is not running locally, jobs are mocked without crashing the server.
- Twilio WhatsApp sandbox for case follow-up reminders.

---

## 3. Technology Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **Next.js 14** (App Router) | SSR/CSR hybrid framework, file-based routing |
| **React 18** | Component model, hooks, context |
| **Tailwind CSS** | Utility-first styling |
| **Framer Motion** | Page transitions, modal animations, micro-interactions |
| **Lucide React** | Icon library |
| **Axios** | HTTP client with request/response interceptors for auto token refresh |
| **AuthContext** | Global auth state: login, logout, refresh, role checks, auto-session restore |

**Key Pages:**

| Route | Description |
|-------|-------------|
| `/login` | Password + passwordless OTP login with mode toggle |
| `/signup` | Multi-step registration (Role → Details → OTP → Done) for Citizen/Lawyer/Judge |
| `/` (dashboard) | Chat interface, analytics, quick actions |
| `/intelligence` | Case strategy analysis terminal |
| `/search` | Semantic legal database search |
| `/generate` | Legal document generator |
| `/marketplace` | Browse and filter verified lawyers |
| `/notifications` | In-app notification centre |
| `/forgot-password` | OTP-based password reset flow |
| `/auth/admin/register` | Admin invite-token registration page |

### Backend

| Technology | Purpose |
|------------|---------|
| **Node.js + Express 5** | HTTP server, REST API |
| **TypeScript** | Type-safe backend via `ts-node` + `nodemon` in dev |
| **Prisma ORM** | Type-safe DB access, migrations, schema management |
| **PostgreSQL** (Neon serverless) | Primary relational database |
| **`@prisma/adapter-pg`** | Driver adapter connecting Prisma to pg Pool |
| **jsonwebtoken** | JWT signing/verification for access + refresh tokens |
| **bcrypt** | Password hashing (cost factor 12 for citizens, 14 for admins) |
| **Nodemailer** | SMTP email delivery (Gmail App Password configured) |
| **Twilio** | WhatsApp/SMS OTP and notification delivery |
| **Multer** | Multipart file uploads (lawyer/judge verification docs) |
| **pdf-parse** | Text extraction from uploaded PDF legal documents |
| **Helmet.js** | Security headers middleware |
| **express-rate-limit** | Per-endpoint rate limiting |
| **cookie-parser** | HTTP-only refresh token cookie parsing |
| **BullMQ + ioredis** | Background job queues for notifications |
| **Groq SDK** | LLaMA 3.3 70B inference for chat, generation, intelligence |
| **Voyage AI** | Legal text → embedding vectors (1024-dim) |
| **Cohere AI** | Reranking retrieved legal chunks for relevance |
| **Razorpay** | Payment gateway for PRO subscriptions |

**API Routes:**

| Route | Description |
|-------|-------------|
| `POST /api/auth/citizen/register` | Register citizen, send email OTP |
| `POST /api/auth/citizen/verify-email` | Verify OTP, issue JWT pair |
| `POST /api/auth/lawyer/register` | Lawyer registration with Bar Council number |
| `POST /api/auth/lawyer/submit-profile` | Upload verification documents |
| `POST /api/auth/judge/register` | Judge registration with Government ID |
| `POST /api/auth/login` | Universal password login (all roles) |
| `POST /api/auth/login/otp/request` | Send passwordless OTP |
| `POST /api/auth/login/otp/verify` | Verify OTP, issue tokens |
| `POST /api/auth/refresh` | Rotate refresh token, issue new access token |
| `POST /api/auth/logout` | Revoke current device token |
| `POST /api/auth/logout-all` | Revoke all sessions |
| `POST /api/auth/forgot-password` | Send password reset OTP |
| `POST /api/auth/reset-password` | Verify OTP + set new password |
| `GET /api/auth/me` | Get full authenticated user profile |
| `POST /api/admin/invite` | Admin issues invite token |
| `GET /api/admin/pending-lawyers` | List lawyers awaiting verification |
| `POST /api/admin/verify-lawyer` | Approve/reject lawyer |
| `POST /api/admin/verify-judge` | Approve/reject judge |
| `GET /api/chat` | List conversations |
| `POST /api/chat` | Send message, get RAG-grounded AI response |
| `GET /api/search` | Semantic search across Indian legal database |
| `POST /api/documents` | Upload + analyze PDF legal document |
| `POST /api/generate` | Generate structured legal document |
| `POST /api/intelligence` | Case intelligence & strategy analysis |
| `GET /api/marketplace` | Browse lawyer marketplace listings |
| `POST /api/payment/create-order` | Create Razorpay order |
| `POST /api/payment/verify` | Verify payment, set isPro flag |
| `POST /api/notifications/trigger` | Manually trigger notification |
| `POST /api/notifications/schedule` | Schedule follow-up notifications |
| `POST /api/uploads` | Upload verification files (lawyers/judges) |

### Services

| File | Responsibility |
|------|---------------|
| `src/services/token.service.ts` | JWT signing, refresh token rotation, revocation |
| `src/services/otp.service.ts` | OTP generation (crypto), DB storage, email + SMS dispatch |
| `src/services/aadhaar.service.ts` | Aadhaar eKYC stub (DigiLocker-ready) |

### Middleware

| File | Responsibility |
|------|---------------|
| `src/middleware/auth.ts` | JWT Bearer token verification, `AuthRequest` type injection |
| `src/middleware/rateLimiter.ts` | Per-endpoint express-rate-limit configurations |
| `src/middleware/requirePermission.ts` | Granular admin permission checks |

### Workers

| File | Responsibility |
|------|---------------|
| `src/workers/notifications.ts` | BullMQ worker: email + WhatsApp job processing; graceful Redis fallback |

---

## 4. Database Schema (Prisma)

### Enums
- `UserRole`: `CITIZEN | LAWYER | JUDGE | ADMIN`
- `VerificationStatus`: `PENDING | VERIFIED | REJECTED | SUSPENDED`
- `OtpType`: `EMAIL_VERIFY | LOGIN | PASSWORD_RESET | AADHAAR_LINK`

### Models

| Model | Key Fields |
|-------|-----------|
| `User` | id, email, phone, passwordHash, role, isEmailVerified, isPro, queriesCount, docsCount |
| `CitizenProfile` | fullName, aadhaarNumber (masked), aadhaarVerified, dateOfBirth, address, state, pincode |
| `LawyerProfile` | barCouncilNumber, barCouncilState, specializations[], practiceAreas[], verificationStatus, barCertificateUrl, degreeCertificateUrl |
| `JudgeProfile` | governmentId, court, courtLevel, jurisdiction, departmentCode, verificationStatus |
| `AdminProfile` | fullName, department, permissions[], invitedBy |
| `RefreshToken` | token, userId, userAgent, ipAddress, expiresAt, revokedAt |
| `Otp` | target (email/phone), code, type, attempts, used, expiresAt |
| `AdminInvite` | token, email, invitedBy, used, expiresAt |
| `Conversation` | userId, title, messages[] |
| `Message` | role (user/assistant), content, conversationId |
| `Act` | title, shortName, year, sections[], chunks[] |
| `Section` | actId, number, title, content, clauses[], chunks[] |
| `Clause` | sectionId, number, content, chunks[] |
| `LegalChunk` | content, embedding (Float[]), actId, sectionId, clauseId |
| `Notification` | userId, title, message, type, read |
| `MarketplaceListing` | userId, title, description, specialization, hourlyRate, isAvailable |

---

## 5. Environment Configuration (`.env`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Signs 15-minute access tokens |
| `JWT_REFRESH_SECRET` | Signs 7-day refresh tokens |
| `PORT` | Backend port (default 3001) |
| `NODE_ENV` | `development` or `production` |
| `FRONTEND_URL` | CORS origin (default `http://localhost:3000`) |
| `SMTP_HOST` | Gmail: `smtp.gmail.com` |
| `SMTP_PORT` | `587` (STARTTLS) |
| `SMTP_USER` | Gmail address for sending OTPs |
| `SMTP_PASS` | Gmail App Password (16 chars, 2FA required) |
| `TWILIO_ACCOUNT_SID` | Twilio account for SMS/WhatsApp |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio sender number |
| `GROQ_API_KEY` | Groq Cloud API key for LLaMA inference |
| `VOYAGE_API_KEY` | Voyage AI key for text embeddings |
| `COHERE_API_KEY` | Cohere key for reranking |
| `RAZORPAY_KEY_ID` | Razorpay public key |
| `RAZORPAY_KEY_SECRET` | Razorpay secret key |
| `REDIS_HOST` | Redis host (default `127.0.0.1`) |
| `REDIS_PORT` | Redis port (default `6379`) |

---

## 6. Development Log & Bug Fixes

| # | Issue | Root Cause | Fix |
|---|-------|-----------|-----|
| 1 | Frontend redirect loop | Backend `ERR_CONNECTION_REFUSED` caused `router.push('/login')` to loop | Fixed backend startup; added public route guards in `AuthContext` |
| 2 | Prisma type sync crash | `UserRole` not exported after schema change | Ran `npx prisma generate` |
| 3 | Nodemailer TS errors | Missing `@types/nodemailer` | Installed type definitions |
| 4 | BullMQ opts parameter crash | `opts` typed incorrectly in worker | Made parameter optional |
| 5 | Upload route crash | `requireLawyer` / `requireJudge` imports didn't exist | Replaced with `requireRole(UserRole.LAWYER)` |
| 6 | Backend clean exit on start | `ioredis` emitting unhandled `error` event before `.ping()` when Redis not running | Moved `connection.on('error', () => {})` before `await connection.ping()` |
| 7 | Login 500 error | New database URL had no tables — Prisma schema not synced | Ran `npx prisma db push` to create all tables |
| 8 | Refresh token 401 | Cookie `SameSite=Strict` blocked cross-port cookies between `:3000` and `:3001` | Changed to `SameSite=None; Secure=true` + included `refreshToken` in JSON responses |
| 9 | OTP sent to console not email | `SMTP_USER` was blank in `.env` | Filled in Gmail credentials + App Password |
| 10 | Registration fails | Account already existed with same email from test runs | Register with a fresh email |
| 11 | OTP invalid despite correct code | Multiple registrations → older OTP invalidated; user had stale email | Added debug logging to `verifyOtp`; use freshest OTP email received |

---

## 7. Build History

### Phase 1 — Infrastructure
- Monorepo: `frontend/` (Next.js App Router) + `backend/` (Node/Express/TypeScript)
- PostgreSQL via Neon serverless; Prisma ORM with full schema design

### Phase 2 — Auth & Security
- Multi-role JWT system with token rotation, `bcrypt` hashing
- OTP service with Nodemailer (email) + Twilio (SMS/WhatsApp)
- Rate limiting, Helmet security headers, admin invite-only system

### Phase 3 — AI & RAG Pipeline
- Groq LLaMA 3.3 70B for chat generation
- Voyage AI for 1024-dim legal text embeddings
- Ingestion scripts (`seed_legal_data.ts`, `generate_embeddings.ts`) to chunk Acts into Sections and Clauses
- Hybrid Legal Search Engine: custom BM25 + Vector Semantic Search with unified normalization
- Cohere API for re-ranking hybrid results (topN)
- Contextual search filters (Act, Category, Court)

### Phase 4 — Frontend UI
- Dark theme (`#07070d`), glassmorphism, gradient text, Framer Motion animations
- Auth pages: login (password + OTP modes), multi-step signup, forgot password
- Dashboard: chat, search, intelligence, generate, marketplace, notifications

### Phase 5 — Jobs & Payments
- BullMQ workers for async email/WhatsApp notifications with Redis fallback
- Multer for verification document uploads (PDFs, images ≤10MB)
- Razorpay integration for PRO tier upgrades

### Phase 6 — QA & Stabilization
- Resolved ioredis crash on Redis-less environments
- Fixed cross-origin cookie policy for local dev
- Synced Prisma schema to new Neon database
- SMTP health-test script (`scripts/test-smtp.ts`)


Auth Flow Audit — Complete
What I found & fixed
Backend — all implemented correctly: All 4 role flows, OTP service, Aadhaar eKYC mock, Bar Council upload, biometric stubs, admin invite were already built and working.

Frontend — 4 pages were missing, 3 files needed fixes:

Item	What I built
/profile/lawyer	Full profile submission form: bio, specializations, practice areas, 4 document uploads (Bar Certificate, Degree, Gov ID, Photo) with status banner (PENDING/VERIFIED/REJECTED)
/profile/citizen/aadhaar	4-step eKYC flow: intro → 12-digit Aadhaar input → mobile OTP → verified state
/profile/judge	Account status page: PENDING/VERIFIED/REJECTED card, registration details, gov ID doc upload, access panel when verified
/admin	Full admin dashboard: platform stats, pending lawyers/judges queue with Approve/Reject buttons, role-aware header
Wiring fixes
AuthContext.tsx — Login now routes smartly:

LAWYER (not verified) → /profile/lawyer
LAWYER (verified) → /
JUDGE → /profile/judge (always, to check status)
ADMIN → /admin
CITIZEN → /
signup/page.tsx — Done step now routes:

Judge → /profile/judge with "Check Status →"
Lawyer → /profile/lawyer with "Complete Profile →"
page.tsx (dashboard) — Added:

🔵 Citizen: "Complete eKYC" banner + sidebar button
🟡 Lawyer pending: "Submit docs" banner; 🔴 Rejected: "Resubmit" banner
🟣 Judge pending: "Account pending approval" banner
Role-specific sidebar shortcuts (Aadhaar eKYC / Lawyer Profile / Account Status)
Judge: Register → Email OTP → /profile/judge → Upload gov ID → Admin approves → Verified status
Admin: Receive invite email → /auth/admin/register?token=… → Register (12-char password) → Email OTP → /admin dashboard → Approve Lawyers/Judges

Search Engine Implementation — Complete
Architecture:
- Text normalization and tokenization for BM25 term frequencies
- Custom inverse document frequency (IDF) calculation spanning the entire `LegalChunk` space
- Voyage AI contextual legal embeddings yielding 1024-dimensional vectors
- Scoring formula: `HybridScore = (norm(Vector) * 0.6) + (norm(BM25) * 0.4)`
- Cohere Re-ranking: Processes the Top-20 hybrid items and collapses into Top-10 highly relevant chunks
Query Flow:
- User submits natural language query via `/search` (e.g. "Penalty for sedition")
- Selects contextual filters (Act: BNS, Category: Criminal Law)
- System reranks, responds with top acts/sections/clauses
- User clicks "Ask AI", appending context to local context-window on dashboard chat for natural language explanation

AI Chatbot Implementation (RAG) — Complete
Features Implemented:
- LangChain Pipeline Integration: Replaced the raw Groq SDK pipeline with modular LangChain tools (`@langchain/groq`, `@langchain/core`) for cleaner chaining and maintainability.
- Multi-language Routing: Added an LLM Router (`llama-3.1-8b-instant`) that determines the user's language and decides whether the query requires lawyer escalation.
- Prompt Construction & Escalation Handling: Enhanced the RAG system prompt. If the router flags the query as highly critical/urgent, it injects an `escalation_context` to steer the generated response towards strongly advising the user to use the marketplace to find a lawyer.
- Hallucination Guard: Validates the AI response against the provided `context_string` using a secondary LLM chain. If it fails, the response is overridden safely.
- Monetization Checks: Pre-generation check validates free tier usage (10 queries max) versus Pro subscription status limits.

Document Intelligence & Generation — Complete
Features Implemented:
- Enhanced Upload & OCR Pipeline (`/api/documents/analyze`): Multi-format support, now checking mimetypes. If the file is an image (`image/*`), it runs through `tesseract.js` for full OCR text extraction before chunking.
- Intelligent Auto-Classification: Uses LangChain + Groq (`llama-3.1-8b-instant`) with `zod` schema to enforce structured extraction. It classifies standard documents into [Contract, Notice, FIR, Judgment, KYC, Other].
- Type-Specific Analysis Engine: Post-classification, the analysis instruction adapts (e.g., Contracts look for liabilities and termination clauses, while FIRs look for penal codes and bailability).
- 7 Master Document Generation Templates (`/api/generate`): The `generate.ts` module was heavily restructured with a hybrid template engine, actively enforcing specific formatting and required structures for: Legal Notice, FIR, Rent/Lease Agreement, NDA, Employment Contract, Bail Application, and Judicial Affidavit. Each explicitly integrates RAG retrieval references within its scaffolding.