# Nyaya — AI-Powered Legal Platform for Indian Law

Nyaya is a full-stack, AI-powered legal platform designed for Indian law. It utilizes Retrieval-Augmented Generation (RAG) to provide citizens, lawyers, and judges with legal query responses grounded in real Indian Acts. 

---

## ⚡ Quick Pitch
> "Nyaya uses a FastAPI RAG microservice backed by PostgreSQL full-text search and optional pgvector semantic search, reranks legal chunks using Cohere, and generates precise, confidence-scored legal answers via Groq's LLaMA 3.3 70B. It features full JWT-based role authentication, a verified lawyer marketplace, a subscription-based quota system powered by Razorpay, and comprehensive case and firm management."

---

## 🏗️ System Architecture
```
User ──> Next.js (App Router) ──> Axios Interceptors ──> Express API (Node/TS, port 3001)
                                                              │
              ┌───────────────────────────────────────────────┼──────────────────────────────────┐
              │ Python RAG Microservice (FastAPI, port 8000)  │ Auth & Database                  │
              │                                               │                                  │
              │ 1. FastEmbed ONNX all-MiniLM-L6-v2             │ 1. JWT Authentication            │
              │    optional 384-dim vector embeddings          │ 2. Refresh Token Rotation (DB)   │
              │ 2. Hybrid Search:                             │ 3. Prisma ORM                    │
              │    pgvector Cosine + Postgres FTS/BM25        │ 4. Neon serverless PostgreSQL     │
              │    Reciprocal Rank Fusion (RRF)               │ 5. BullMQ Queue Workers (Redis)  │
              │ 3. Cohere Cross-Encoder Reranking             │                                  │
              │ 4. Groq LLaMA 3.3 70B Generation              │                                  │
              │ 5. Document OCR, Classification & Analysis    │                                  │
              └───────────────────────────────────────────────┴──────────────────────────────────┘
```

---

## ✨ Key Features
- **Context-Aware Legal RAG**: Conversational chat that expands queries using historical context, retrieves relevant clauses using Postgres full-text search plus optional pgvector semantic search, reranks using Cohere, and generates responses with confidence scoring.
- **Lawyer Marketplace & Verification**: A portal for lawyers to get verified, interact with clients, and manage legal consults.
- **AI Document Analysis**: Upload legal documents (PDF/images) for automated OCR, classification, and AI-powered legal analysis with relevant law citations.
- **Legal Document Generation**: AI-powered generation of legal documents (FIRs, Legal Notices, Contracts, NDAs, etc.) with automatic RAG-based law citation.
- **Case Intelligence**: AI analysis of case details with relevant legal provisions, risk assessment, and strategic recommendations.
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

### Backend (API Gateway)
- **Runtime & Language**: Node.js, Express, TypeScript (run via nodemon/ts-node)
- **Database & ORM**: PostgreSQL (Neon Serverless) with `pgvector` & Prisma ORM
- **Task Queue**: BullMQ & Redis for async emails, SMS OTPs, and background processing
- **Role**: Proxies all RAG/AI requests to the Python microservice

### Python RAG Microservice
- **Framework**: FastAPI with Uvicorn
- **Embedding Model**: FastEmbed ONNX `sentence-transformers/all-MiniLM-L6-v2` (384-dim normalized vectors) when `RAG_VECTOR_SEARCH=true`
- **Vector Database**: PostgreSQL pgvector (HNSW cosine index) for full semantic mode
- **Full-Text Search**: PostgreSQL `tsvector` / `websearch_to_tsquery`, with `ILIKE` fallback
- **Fusion**: Reciprocal Rank Fusion (RRF) combining vector + keyword results in full semantic mode
- **Render Low-Memory Mode**: `RAG_VECTOR_SEARCH=false` skips local model loading and uses Postgres text search + Cohere reranking to stay under 512MB
- **Reranker**: Cohere `rerank-english-v3.0` cross-encoder
- **LLM Inference**: Groq LLaMA 3.3 70B
- **Document Processing**: pypdf extraction and Groq structured classification/analysis

---

## 📁 Repository Structure
```
Nyaya/
├── backend/                  # Node.js/Express API Gateway (TypeScript)
│   ├── prisma/               # Prisma Schema & Migrations
│   ├── src/
│   │   ├── index.ts          # Server bootstrap (port 3001)
│   │   ├── routes/           # Endpoint controllers (auth, chat, search, cases, etc.)
│   │   ├── middleware/       # Auth, role check, rate limiting, plan quota check
│   │   ├── services/         # Token, OTP, RAG retrieval proxy
│   │   └── workers/          # BullMQ document processor, notification workers
│   ├── data/                 # Source legal PDFs (Constitution, BNS)
│   └── package.json
│
├── rag/                      # Python RAG Microservice (FastAPI)
│   ├── main.py               # FastAPI app — all AI/RAG endpoints (port 8000)
│   ├── embeddings.py         # Lazy FastEmbed ONNX embedding engine / mock fallback
│   ├── retrieval.py          # pgvector + FTS retrieval, Render text-search fallback, Cohere reranking
│   ├── document_processor.py # PDF extraction, AI classification & legal analysis
│   ├── generate_embeddings.py# Batch embedding pipeline for LegalChunk table
│   ├── ingest_legal_pdfs.py  # PDF ingestion into Act/Section/Clause tables
│   ├── check_db.py           # Quick DB health check utility
│   ├── requirements.txt      # Python dependencies
│   └── Dockerfile            # Container definition
│
├── frontend/                 # Next.js App (port 3000)
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

## 🧬 RAG Pipeline Walkthrough
1. **Query Expansion**: The chat system passes the user query and recent conversation context to construct an expanded, search-friendly query string.
2. **Optional Vector Embedding**: When `RAG_VECTOR_SEARCH=true`, the query is embedded with FastEmbed ONNX `all-MiniLM-L6-v2` (384-dim normalized vectors). On 512MB Render services, this is disabled to avoid model memory pressure.
3. **PostgreSQL Retrieval**:
   - In full semantic mode, performs a **Cosine Distance** match on pgvector embeddings (HNSW index).
   - Performs a **Text Search (BM25-style)** match using Postgres `tsvector` / `websearch_to_tsquery`, with `ILIKE` fallback if no FTS rows match.
   - Merges results using **Reciprocal Rank Fusion (RRF)**:
     $$\text{RRF Score} = \sum_{m \in M} \frac{1}{60 + \text{rank}_m(d)}$$
4. **Cohere Reranking**: Filters candidates down to top 15, then feeds them to Cohere's cross-encoder Rerank API to select the top 8 high-relevance legal chunks.
5. **Generation**: Groq's LLaMA 3.3 70B model parses the context, structures the answer citing specific sections/articles, assigns a confidence rating (0–100), and returns the response with source citations.

---

## 🔌 Python RAG API Endpoints

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/health` | GET | Service health check |
| `/embed` | POST | Generate embeddings for text array |
| `/hybrid-search` | POST | pgvector + FTS retrieval when vector mode is enabled; FTS fallback when disabled |
| `/search` | POST | Full search pipeline (optional embed → retrieve → filter → rerank) |
| `/rerank` | POST | Cohere cross-encoder reranking |
| `/chat-rag` | POST | Full RAG chat (search → rerank → Groq LLM generation) |
| `/case-intelligence` | POST | AI case analysis with legal provisions |
| `/process-document` | POST | PDF OCR, classification & AI legal analysis |

---

## ⚙️ Environment Configuration

You will need to set up environment variables in the `backend` and `frontend` directories.

### Backend Config (`backend/.env`)
Create a `.env` file in the `backend/` directory:
```bash
# Database & Redis
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
REDIS_URL="redis://localhost:6379"

# Token Secret Keys
JWT_ACCESS_SECRET="your-jwt-access-secret"
JWT_REFRESH_SECRET="your-jwt-refresh-secret"

# Python RAG Microservice
PYTHON_RAG_URL="http://127.0.0.1:8000"
RAG_VECTOR_SEARCH="true"          # Set false on 512MB Render instances
RAG_EMBEDDING_PROVIDER="fastembed" # Set mock/disabled with RAG_VECTOR_SEARCH=false
PYTHON_VERSION="3.11.11"          # Render native Python runtime pin

# LLM & AI Providers
GROQ_API_KEY="gsk_..."
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
- Python RAG is exposed at: `http://localhost:8000`

---

### Option B: Running Manually

#### 1. Start the Backend
```bash
cd backend
npm install
npx prisma migrate dev
npx prisma generate
npm run dev
```

#### 2. Start the Python RAG Microservice
```bash
cd rag
pip install -r requirements.txt
python main.py
```

For Render free/512MB deployments, keep the blueprint values in `render.yaml`:
```bash
PYTHON_VERSION=3.11.11
RAG_VECTOR_SEARCH=false
RAG_EMBEDDING_PROVIDER=mock
```
This starts the service without importing/loading the local embedding model. Retrieval still works through Postgres full-text search and Cohere reranking. Upgrade the instance memory and switch `RAG_VECTOR_SEARCH=true` to restore full pgvector semantic retrieval.

#### 3. Ingest Legal Data & Generate Embeddings (First Time Only)
```bash
cd backend
npm run rag:ingest    # Ingest legal PDFs into Act/Section/Clause tables
npm run rag:embed     # Generate 384-dim vector embeddings for all LegalChunks
```

#### 4. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 📊 Database Entities (Prisma)
- **User profiles**: `User` 1-to-1 with `CitizenProfile` / `LawyerProfile` / `JudgeProfile` / `AdminProfile`.
- **Auth metadata**: `RefreshToken` (for device management and tracking) and `Otp` (supporting Aadhaar verification, logins, email verification, etc.).
- **Acts & Sections**: `Act` ──> `Section` ──> `Clause` ──> `LegalChunk` (contains optional 384-dim vector embeddings and tsvector FTS indexes).
- **Cases & Timeline**: `Case` ──> `Hearing` / `CaseTimeline` / `CaseParty` / `CaseAdvocate`.
- **Firms**: `Firm` ──> `FirmMember` (with Owner, Partner, Associate, and Paralegal roles).
- **Documents**: `UserDocument` (uploaded legal documents with AI classification, summary, and analysis reports).
- **Conversations**: `Conversation` ──> `Message` (chat history with RAG-powered AI responses).

---

## 📈 Current Database Stats
- **Acts**: 2 (Constitution of India, Bharatiya Nyaya Sanhita)
- **Sections**: 704 (346 Constitutional Articles + 358 BNS Sections)
- **LegalChunks**: 3,917 target chunks after ingestion/embedding generation
- **Embedding Coverage**: 100% in full vector mode after `npm run rag:embed`; not required for Render low-memory text-search mode
