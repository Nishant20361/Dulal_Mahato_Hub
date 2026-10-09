# Dulal Mahato Hub

> **Personal Cloud Storage and Class Notes Web Application**  
> Designed for students to seamlessly upload, organize, and preview lecture notes, PDFs, presentations, documents, code repositories, media, and assignments with Google Drive-like ease.

---

## Architecture Overview

Dulal Mahato Hub is engineered around a zero-proxy, high-performance cloud architecture:

```
                  ┌───────────────────────────────┐
                  │    Browser Client (React)     │
                  └──────┬─────────────────▲──────┘
                         │                 │
           1. Request    │                 │ 3. Direct Upload/Download
           Presigned URL │                 │    (Zero Backend Proxy)
                         ▼                 │
                  ┌──────────────┐         │
                  │ Express API  │         │
                  │ (TypeScript) │         │
                  └──────┬───────┘         │
                         │                 │
          2. Store/Fetch │                 ▼
             Metadata    │         ┌────────────────┐
                         ▼         │ Cloudflare R2  │
                  ┌──────────────┐ │ (Private File  │
                  │   Supabase   │ │  Object Store) │
                  │  PostgreSQL  │ └────────────────┘
                  └──────────────┘
```

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, TanStack Query, React Hook Form, Zod.
- **Backend**: Node.js, Express, TypeScript, Zod, Helmet, CORS, Rate Limiting, Cookie-based Auth.
- **Database**: Supabase PostgreSQL managed via Prisma ORM (contains users, metadata, folder trees, notes, OTP logs).
- **File Storage**: Cloudflare R2 (private bucket, accessed strictly via short-lived presigned URLs).
- **Email Service**: Brevo Transactional Email API for OTP password resets and account security.

---

## Directory Structure

```
Dulal Mahato Hub/
├── .env.example                 # Root configuration template
├── .gitignore                   # Git ignore patterns
├── package.json                 # Workspaces runner & coordinated scripts
├── README.md                    # Project manual & setup guide
├── backend/                     # API Server
│   ├── .env.example
│   ├── .env                     # Local environment settings
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── config/              # Zod environment validation
│       ├── controllers/         # Request handling logic
│       ├── middleware/          # Security, error, and rate-limiting
│       ├── routes/              # Centralized route definitions
│       ├── app.ts               # Express configuration
│       └── server.ts            # Server entrypoint
└── frontend/                    # Vite + React Client
    ├── .env.example
    ├── .env                     # Client environment settings
    ├── index.html
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── vite.config.ts
    └── src/
        ├── components/          # Reusable UI, theme toggles, and layout
        ├── contexts/            # Theme (Light/Dark/System)
        ├── lib/                 # Axios API client & utilities
        ├── pages/               # Views (HomePage, NotFound, Drive, etc.)
        ├── App.tsx
        ├── index.css
        └── main.tsx
```

---

## Prerequisites

- **Node.js**: v18.0.0 or later (v22+ recommended)
- **npm**: v9.0.0 or later

---

## Local Quick Start (Phase 1)

### 1. Clone or Open the Workspace

Ensure you are in `/Users/nishantkumar/Dulal Mahato Hub`:

```bash
cd "/Users/nishantkumar/Dulal Mahato Hub"
```

### 2. Install Dependencies

Install all dependencies across the root, backend, and frontend with a single command:

```bash
npm install
```

Or install individually:

```bash
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 3. Start Development Servers

Run both the backend API and frontend client concurrently:

```bash
npm run dev
```

Or run them in separate terminal tabs:

**Tab 1 - Backend (Port 5001):**
```bash
npm run dev:backend
# or: cd backend && npm run dev
```

**Tab 2 - Frontend (Port 5173):**
```bash
npm run dev:frontend
# or: cd frontend && npm run dev
```

### 4. Verify Live Services

- **Frontend Web UI**: Open [http://localhost:5173](http://localhost:5173) in your browser.
- **Backend API Health Check**: Open [http://localhost:5001/api/v1/health](http://localhost:5001/api/v1/health) or run:
  ```bash
  curl -s http://localhost:5001/api/v1/health
  ```

---

## Quality & Build Verification

Run TypeScript and production build checks across both packages:

```bash
# Type-check both frontend and backend without emitting files
npm run check

# Build production bundles
npm run build
```

Individual checks:

```bash
# Backend checks
npm run check --workspace=backend
npm run build --workspace=backend

# Frontend checks
npm run check --workspace=frontend
npm run build --workspace=frontend
```

---

## Supabase PostgreSQL Setup Guide (Phase 2)

Dulal Mahato Hub connects to hosted PostgreSQL via Supabase and Prisma ORM.

### 1. Retrieve Your Connection Strings from Supabase
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard) and navigate to your project.
2. Go to **Project Settings** (gear icon) > **Database**.
3. Under **Connection string**, select the **URI** tab:
   - **Runtime Connection (`DATABASE_URL`)**: Select **Session Pooler** on port **5432** (IPv4-compatible via Supavisor):
     ```
     postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require
     ```
   - **Migration Connection (`DIRECT_URL`)**: Use the Session Pooler (port 5432) or direct connection:
     ```
     postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require
     ```
   > [!IMPORTANT]
   > Do NOT use the Transaction Pooler (port 6543) for migrations, as transaction pooling does not support session-level advisory locks required by Prisma migrate.

### 2. Configure Local Environment
Add the connection strings to `backend/.env`:

```bash
# backend/.env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require"
```

### 3. Run Database Migrations
Deploy the initial 7-table schema to your Supabase PostgreSQL instance:

```bash
# Apply migrations to your Supabase database
npm run prisma:deploy --workspace=backend

# Or in development mode (creates migration record and verifies state)
npm run prisma:migrate --workspace=backend
```

### 4. Inspect Tables with Prisma Studio (Optional)
```bash
npm run prisma:studio --workspace=backend
```

---

## Environment Variables Reference

See `.env.example` at the project root for full configuration options:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Backend HTTP port | `5001` |
| `NODE_ENV` | Environment mode | `development` |
| `FRONTEND_URL` | Allowed CORS client origin | `http://localhost:5173` |
| `VITE_API_URL` | Frontend API target endpoint | `http://localhost:5001/api/v1` |
| `DATABASE_URL` | Supabase PostgreSQL Session Pooler (port 5432) | `postgresql://...` |
| `DIRECT_URL` | Supabase PostgreSQL direct/pooler (port 5432) | `postgresql://...` |
| `JWT_SECRET` | Access token secret (Phase 3+) | `[SECRET]` |
| `BREVO_API_KEY` | Transactional email key (Phase 4+) | `xkeysib-...` |
| `R2_ACCOUNT_ID` | Cloudflare Account ID (Phase 6+) | `[R2_ACCOUNT_ID]` |

---

## Development Phases Roadmap

- [x] **Phase 1: Project Foundation** (Express, Vite, React, TS, Tailwind, Theme, Health Check)
- [x] **Phase 2: Supabase PostgreSQL + Prisma** (Schema, 7 Core Models, Migrations, Diagnostics)
- [ ] **Phase 3: Secure Authentication** (Signup, Login, HttpOnly Cookies, Auth Guards)
- [ ] **Phase 4: Brevo Email + OTP Password Reset** (6-digit OTP, Expiration, Rate Limits)
- [ ] **Phase 5: Main Dashboard Layout** (Sidebar, My Drive, Recent, Notes, Trash, Storage Pill)
- [ ] **Phase 6: Cloudflare R2 Direct Uploads** (Presigned URLs, Private Bucket, Metadata DB)
- [ ] **Phase 7: Folder Management** (Nested hierarchy, Breadcrumbs, Rename, Move, Tree)
- [ ] **Phase 8: File Upload Queue** (Single/multi upload, Progress bars, Drag & Drop)
- [ ] **Phase 9: Folder Upload** (Directory picker, preserve relative tree)
- [ ] **Phase 10: File Manager & Preview** (PDF, Doc, Image, Video, Audio preview, Download)
- [ ] **Phase 11: Personal Class Notes** (Editor, autosave, debouncing, pinning, Markdown)
- [ ] **Phase 12: Global Search & Recent Activity** (Instant search, recent timeline)
- [ ] **Phase 13: Security Audit & Quality Hardening** (CORS, cookies, ownership, sanitization)
- [ ] **Phase 14: Production Deployment** (Vercel frontend, Render backend, Supabase DB, R2 bucket)
