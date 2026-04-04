# Nyaay – AI Legal Assistant for Indian Law

## 1. Project Overview
**Nyaay** is a cutting-edge, AI-powered legal technology platform designed to make Indian law accessible. It serves citizens by answering legal queries and analyzing documents, while also providing a marketplace connecting users with verified legal professionals (lawyers and judges).

---

## 2. Platform Features
- **AI Chat & Intelligence**: Users can ask legal questions and receive answers sourced from a massive database of Indian Acts, Sections, and Clauses using a Retrieval-Augmented Generation (RAG) pipeline.
- **Document Analysis**: Users can upload legal documents for automated AI analysis and summarization.
- **Role-Based Profiles & Workflows**: Dedicated interfaces and verification flows for Citizens, Lawyers, Judges, and Admins.
- **Lawyer Marketplace**: A platform for citizens to find and connect with specialized, verified lawyers.
- **Authentication**: Supports standard password authentication, secure JWT generation, and passwordless OTP login (Email/WhatsApp).
- **Automated Notifications**: Scheduled reminders and legal alerts handled through background job queues.
- **Subscriptions & Monetization**: Built-in limits for free users with upgrade paths to "Nyaya PRO" via Razorpay.

---

## 3. Technology Stack

### **Frontend Architecture**
- **Framework**: Next.js (App Router, React)
- **Styling**: Tailwind CSS for rapid UI development, custom CSS for dynamic glowing aesthetics and glassmorphism.
- **Animations**: `framer-motion` for complex page transitions, modal reveals, and smooth micro-interactions.
- **Icons**: `lucide-react`
- **State & Routing**: React Context API (`AuthContext`), standard hooks, and Next Navigation.

### **Backend Architecture**
- **Runtime & Framework**: Node.js, Express.js, TypeScript.
- **Database & ORM**: PostgreSQL paired with Prisma ORM.
- **Authentication**: `jsonwebtoken` for access/refresh routines, `bcrypt` for password hashing.
- **Queue System**: BullMQ backed by `ioredis` for asynchronous tasks (e.g., email dispatch, WhatsApp alerts).
- **File Uploads**: `multer` middleware for processing and securely storing document verification files.
- **Integrations**:
  - **Groq API**: High-speed LLaMA-based generation models for conversing with users.
  - **Voyage AI**: Employed for generating sophisticated embedding vectors of Indian law components.
  - **Cohere AI**: Utilized for the Reranking phase to surface the most relevant legal context out of search results.
  - **Nodemailer / Twilio**: Email and WhatsApp notification dispatching.

---

## 4. Database Schema (Prisma)
- **Users & Profiles**: `User`, `CitizenProfile`, `LawyerProfile`, `JudgeProfile`, `AdminProfile`.
- **Security**: `RefreshToken`, `Otp`, `AdminInvite`.
- **AI Interactions**: `Conversation`, `Message`.
- **Legal Knowledge Base**: `Act`, `Section`, `Clause`, `LegalChunk` (contains pgvector embeddings for similarity search).
- **System**: `Notification`, `MarketplaceListing`.

---

## 5. Development Log & Actions
*This log records troubleshooting actions performed to stabilize the application infrastructure.*

1. **Frontend Rendering Loop Fix**: Addressed a severe redirect loop on the frontend caused by backend connection refusals (`ERR_CONNECTION_REFUSED`).
2. **Prisma Type Synchronization**: The backend crashed due to a missing `UserRole` export. Executed `npx prisma generate` to sync Prisma Client types with the latest schema.
3. **Nodemailer Type Definitions**: Addressed TypeScript module resolution errors by installing `@types/nodemailer`.
4. **BullMQ Queue Parameters Fix**: Corrected a bug in `src/workers/notifications.ts` where the queued `opts` parameter threw errors; safely typed it as optional.
5. **Express Handler Crash Resolution**: Discovered that `src/routes/uploads.ts` was importing undefined non-existent middleware roles (`requireLawyer` and `requireJudge`). Updated the routing to correctly use `requireRole(UserRole.LAWYER)` and `requireRole(UserRole.JUDGE)`.
### **6. Recent Problem & Solution: User Signup Failure**
- **Problem**: The frontend displayed a "Registration failed. Please try again." error when attempting to sign up a new citizen or lawyer. The backend was crashing during the `.create` call in Prisma because the PostgreSQL database tables did not match the latest `schema.prisma` definitions (missing columns/relations like the Profiles and OTPs).
- **Solution**: Executed `npx prisma db push` in the backend to synchronize the schema state directly into the PostgreSQL database. This generated all the missing database tables and resolved the registration blockage.

---

## 6. Step-by-Step Project Build History
*The chronological roadmap detailing exactly how the Nyaay platform was constructed from the ground up.*

### **Phase 1: Project Initialization & Infrastructure Structuring**
1. **Monorepo Setup**: Initialized separate directories for `frontend/` and `backend/`. Bootstrapped the frontend utilizing Next.js (App router enabled) and configured the backend using Node.js, Express, and standard TypeScript transpilation setup (`tsc`).
2. **Database Engine**: Handpicked PostgreSQL for data integrity and mapped it deeply with Prisma ORM. Designed `schema.prisma` mapping out enums and models defining the structural integrity of the legal hub.

### **Phase 2: Defining the Security & Identity Architecture**
3. **Multi-Role User Auth**: Implemented highly granular roles (`CITIZEN`, `LAWYER`, `JUDGE`, `ADMIN`). Formulated individualized schema profile models corresponding to these access levels.
4. **JWT Flow & Middleware**: Established robust secure token exchanges employing `jsonwebtoken`. Programmed an `access_token` and HTTP-only cookie-based `refresh_token` framework.
5. **Passwordless OTP Logic**: Designed the passwordless/OTP framework via `otp.service.ts` routing one-time codes using Nodemailer (for emails) or Twilio (for WhatsApp/SMS).
6. **Rate Limiting Hooks**: Placed robust middleware guardrails ensuring the endpoints protecting logins, resets, and registrations are actively throttled preventing Brute Force attacks.

### **Phase 3: Deep AI & Legal Intelligence Engineering**
7. **Integrating the LLM (Groq)**: Wired the platform's chat assistant with the Groq API utilizing dynamic mapping to fast models like `llama-3.3-70b-versatile` ensuring lightning-fast advice processing.
8. **Developing the RAG Context Ecosystem**: To make the intelligence purely Indian law-centric, built a chunking data pipeline parsing Acts, Clauses, and Sections.
9. **Vector Databases & Embeddings**: Injected Voyage AI to convert legal syntax into semantic numerical vectors, allowing context-aware search functionalities via cosine similarity across PostgreSQL.
10. **Refined Cohere Reranking**: Processed initial Vector similarity queries via Cohere, reranking matching candidate passages contextually, passing only precise paragraphs up to the Groq Chat model to avoid hallucinations.

### **Phase 4: Constructing the User Interfaces (Frontend Design)**
11. **Modern Layout Integration**: Outfitted the Next.js frontend with Tailwind CSS employing dark aesthetics ("#07070d"), glassmorphism, glowing auras, and gradient texts to wow users.
12. **Complex Motion Graphics**: Set up advanced user experiences implementing `framer-motion` for sidebar overlays, seamless page transitions, and responsive loading carousels.
13. **Building the Dashboards**: Constructed distinct page routing segments:
    - **Authentication Portals**: Clean `login`, `signup`, and `forgot-password` pages.
    - **Intelligence Command Center**: Live chat terminal with contextual references and deep search engines.
    - **Marketplace Hub**: Interfaces allowing citizens to scroll, read bios, and filter verified legal counsel profiles.
    - **Alerts Hub (`/notifications`)**: A dedicated interface highlighting case updates or verification status changes.
14. **React Context Engineering**: Centralized the user lifecycle securely across the entire frontend app tree using `AuthContext.tsx`.

### **Phase 5: Scaling Verified Environments & Jobs**
15. **Background Workers Setup (BullMQ)**: Installed Redis locally acting as the store. Wired up `BullMQ` inside `src/workers` establishing reliable delayed jobs formatting automated case follow-ups and notifications.
16. **Document Upload Routing Pipelines**: Implemented `multer` for physical disk storage formatting verification uploads (such as High Court IDs, graduation degrees, and Lawyer Bar Council scripts). Configured routing handlers enabling the subsequent Admin verification flows.
17. **Tier Limitations & Monetization Gates**: Embedded logic constraining `CITIZEN` queries on a free tier maxing at 10 runs. Bootstrapped Razorpay scripting mapping UI 'Upgrade Checkouts' bridging successful payments to database `isPro` flags.

### **Phase 6: Quality Assurance & Bug Triage (The Final Pass)**
18. **Eliminating Infinite React Rerenders**: Rectified deep Next.js development server clashes by isolating backend outages originally triggering Next `router.push('/login')` loops.
19. **Strict Typescript Compilations**: Resolved missing parameter inputs across `notifications.ts`, and updated `express` endpoints targeting bad exported handles (`requireLawyer` replaced securely with `requireRole(UserRole.LAWYER)`).
20. **Final Database Synchronization**: Overcame standard local development misalignments running `prisma generate` and `prisma db push` finalizing column relationships allowing the Nyaay platform to run perfectly.
