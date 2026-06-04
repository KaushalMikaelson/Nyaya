# Nyaya — AI-Powered Legal Platform for Indian Law

Nyaya is a full-stack, AI-powered legal platform designed for Indian law. It utilizes Retrieval-Augmented Generation (RAG) to provide citizens, lawyers, and judges with legal query responses grounded in real Indian Acts. 

---

## ⚡ Quick Pitch
> "Nyaya leverages hybrid semantic and keyword search against PostgreSQL with pgvector, reranks results using Cohere, and generates precise, confidence-scored legal answers via Groq’s LLaMA 3.3 70B. It features full JWT-based role authentication, a verified lawyer marketplace, a subscription-based quota system powered by Razorpay, and comprehensive case and firm management."

---

## 🏗️ System Architecture
```
User ──> Next.js (App Router) ──> Axios Interceptors ──> Express API (Node/TS)
                                                            │
  ┌─────────────────────────────────────────────────────────┼────────────────────────────────────────┐
  │ RAG Pipeline                                            │ Auth & Database                        │
  │ 1. Context Query Expansion (Groq)                       │ 1. JWT Authentication                  │
  │ 2. local Embeddings (Xenova/gte-large)                  │ 2. Refresh Token Rotation (DB)         │
  │ 3. Hybrid Search (pgvector Cosine + BM25 tsvector GIN)  │ 3. Prisma ORM                          │
  │ 4. Reranking (Cohere rerank-english-v3.0)               │ 4. Neon serverless PostgreSQL          │
  │ 5. Generation (Groq LLaMA 3.3 70B via ChatGroq)         │ 5. BullMQ Queue Workers (Redis)        │
  └─────────────────────────────────────────────────────────┴────────────────────────────────────────┘
```

---

## ✨ Key Features
- **Context-Aware Legal RAG**: Conversational chat that expands queries using historical context, embeds text locally, retrieves relevant clauses using hybrid search, reranks using Cohere, and streams responses with confidence scoring.
- **Lawyer Marketplace & Verification**: A portal for lawyers to get verified, interact with clients, and manage legal consults.
- **Advanced Auth & Security**:
  - OTP-based registration and password resets (Email & SMS).
  - Silent Refresh Token Rotation with Reuse Detection (revokes all device sessions if reuse is detected).
  - Rate limiting, Helmet, CORS protection, and plan quota limiting.
- **Case & Firm Management**: Dynamic portals tracking cases (Hearings, Timelines, Parties, Advocates) and law firm teams (Owner, Partner, Associate, Paralegal).
- **Freemium Payments**: Multi-tier API rate limiting and plan subscriptions integrated with Razorpay.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js](https://nextjs.org) 16 (App Router, React 19)
- **Styling**: Tailwind CSS v4 & Framer Motion for smooth micro-animations
- **State & Querying**: React Context, Axios with interceptors, React Markdown for legal text presentation
- **Icons**: Lucide React

### Backend
- **Runtime & Language**: Node.js, Express, TypeScript (run via nodemon/ts-node)
- **Database & ORM**: PostgreSQL (Neon Serverless) with `pgvector` & Prisma ORM
- **Task Queue**: BullMQ & Redis for async emails, SMS OTPs, and background processing

### AI & Search
- **Local Embedding Model**: Xenova/gte-large (1024 dimensions) for local, zero-cost query embeddings in chat
- **Remote Embedding Model**: Voyage AI (`voyage-law-2`) for precise search-route embeddings
- **Reranker**: Cohere `rerank-english-v3.0`
- **LLM Inference**: Groq LLaMA 3.3 70B (via LangChain `@langchain/groq`)

---

## 📁 Repository Structure
```
Nyaya/
├── backend/                  # Node.js/Express API (TypeScript)
│   ├── prisma/               # Prisma Schema & Migrations
│   ├── src/
│   │   ├── index.ts          # Server bootstrap
│   │   ├── routes/           # Endpoint controllers (auth, chat, cases, etc.)
│   │   ├── middleware/       # Auth, role check, rate limiting, plan quota check
│   │   └── services/         # Token, OTP, RAG retrieval logic
│   └── package.json
│
├── frontend/                 # Next.js App
│   ├── src/
│   │   ├── app/              # Next.js Pages & Layouts (App Router)
│   │   ├── components/       # UI Components
│   │   └── contexts/         # React Contexts (Auth, Theme)
│   └── package.json
│
├── docker-compose.yml        # Docker Multi-Container Compose File
└── README.md                 # Project Documentation (This File)
```

---

## ⚙️ Environment Configuration

You will need to set up environment variables in both the `backend` and `frontend` directories.

### Backend Config (`backend/.env`)
Create a `.env` file in the `backend/` directory:
```bash
# Database & Redis
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
REDIS_URL="redis://localhost:6379"

# Token Secret Keys
JWT_ACCESS_SECRET="your-jwt-access-secret"
JWT_REFRESH_SECRET="your-jwt-refresh-secret"

# LLM & AI Providers
GROQ_API_KEY="gsk_..."
VOYAGE_API_KEY="pa-..."
COHERE_API_KEY="..."

# Payment Integration
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."

# Notifications / Verification (Email / SMS)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
TWILIO_ACCOUNT_SID="..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="..."

# Client URLs
FRONTEND_URL="http://localhost:3000"
PORT=3001
```

### Frontend Config (`frontend/.env.local`)
Create a `.env.local` file in the `frontend/` directory:
```bash
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-oauth-client-id"
```

---

## 🚀 Getting Started

There are two main ways to run Nyaya locally.

### Option A: Running with Docker Compose (Recommended)
Make sure you have Docker and Docker Compose installed, then spin up the services using:

```bash
docker-compose up --build
```
- Backend is exposed at: `http://localhost:3001`
- Frontend is exposed at: `http://localhost:3000`

---

### Option B: Running Manually

#### 1. Start the Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run Database Migrations & Generate Prisma Client:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```
4. Start the backend developer server:
   ```bash
   npm run dev
   ```

#### 2. Start the Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🧬 RAG Pipeline Walkthrough
1. **Query Expansion**: The chat system passes the query and recent chat context to Groq to generate an expanded, search-friendly query.
2. **Local Vector Embedding**: The search string is embedded locally using `@xenova/transformers` with `gte-large` (1024-dim), resulting in zero external latency and API cost for embeddings.
3. **Hybrid PostgreSQL Search**:
   - Performs a Cosine Distance match on pgvector embeddings.
   - Performs a Text Search (BM25) match on `tsvector` indexed columns.
   - Merges results using **Reciprocal Rank Fusion (RRF)**:
     $$\text{RRF Score} = \sum_{m \in M} \frac{1}{60 + \text{rank}_m(d)}$$
4. **Cohere Reranking**: Filters candidates down to top 20, then feeds them to Cohere's cross-encoder Rerank API to select the top 8 high-relevance chunks.
5. **Generation**: The LLaMA 3.3 70B model parses the context, structures the answer citing specific sections, assigns a confidence rating, and streams the output to the citizen.

---

## 📊 Database Entities (Prisma)
- **User profiles**: `User` 1-to-1 with `CitizenProfile` / `LawyerProfile` / `JudgeProfile` / `AdminProfile`.
- **Auth metadata**: `RefreshToken` (for device management and tracking) and `Otp` (supporting Aadhaar verification, logins, email verification, etc.).
- **Acts & Sections**: `Act` ──> `Section` ──> `Clause` ──> `LegalChunk` (contains vector embeddings and text indexes).
- **Cases & Timeline**: `Case` ──> `Hearing` / `CaseTimeline` / `CaseParty` / `CaseAdvocate`.
- **Firms**: `Firm` ──> `FirmMember` (with Owner, Partner, Associate, and Paralegal roles).
