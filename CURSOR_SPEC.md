# Proffy — Full Stack Spec for Cursor

## Project Overview
AI study assistant for Israeli university students (TAU, Technion, HUJI, BGU, Bar Ilan, Ariel).
Students upload course slides/exams, then chat with an AI that answers from their actual material.

---

## Monorepo Structure
```
apps/web          → Next.js 14 App Router frontend (port 3000)
backend           → Express.js API (port 3001)
packages/processor → Python FastAPI document pipeline (port 8001)
packages/db       → PostgreSQL schema + migrations
packages/ai       → AI helpers
packages/crawler  → CheeseFork Playwright scraper (Technion courses)
packages/drive-watcher → Google Drive watcher
infra/            → Docker Compose (Postgres 5432, Qdrant 6333, Redis)
```

---

## Frontend Stack
- Next.js 14 App Router
- Framer Motion animations
- NextAuth (credentials + Google OAuth)
- KaTeX for LaTeX math rendering
- All inline styles using CSS variables (no Tailwind, no CSS modules)
- pnpm workspaces + Turborepo

## Frontend Design System
Dark theme. CSS variables defined in globals.css:
- `--bg-base` (darkest), `--bg-surface`, `--bg-elevated`, `--bg-hover`
- `--border`, `--border-light`
- `--text-primary`, `--text-secondary`, `--text-muted`, `--text-disabled`
- `--blue`: #4f8ef7, `--purple`: #a78bfa, `--green`: #34d399, `--amber`: #fbbf24, `--red`: #f87171
- Primary CTA gradient: `linear-gradient(135deg, #4f8ef7, #a78bfa)`
- Border radius: 10-12px cards, 8-9px inputs/buttons, 99px pills
- Framer Motion animations on mount (opacity + y slide)
- AppShell: collapsible Sidebar (240px) + Main + optional RightPanel (256px)
- Fonts: Cormorant Garamond (display), DM Sans (body), JetBrains Mono (code)

## Existing Frontend Pages
| Page | Status | Notes |
|------|--------|-------|
| `/` | Done | Marketing landing page |
| `/login` | Done | Credentials + Google |
| `/register` | Done | With email verification |
| `/onboarding` | Done | 8-step wizard |
| `/dashboard` | Done | Chat + course strip + stats |
| `/course/[id]` | Done | Course detail + chat |
| `/courses/new` | Done | Add course form |
| `/upload` | Done | File upload UI |
| `/flashcards` | Done | SM-2 spaced repetition UI |
| `/notes` | Done | 4 note types with filter tabs |
| `/checkout` | Done UI | Stripe not wired |
| `/settings` | Exists | Needs completion |
| `/groups` | Exists | Study groups stub |
| `/help` | Exists | Help page stub |
| `/chat` | Exists | Standalone chat page |
| `/admin` | Exists | Admin dashboard |

---

## Backend Stack
- Express.js + TypeScript (tsx watch)
- Anthropic SDK (Claude claude-sonnet-4-6)
- OpenAI SDK (text-embedding-3-small — embeddings only)
- PostgreSQL via `pg`
- Qdrant vector store
- Redis (caching)
- Stripe + Payplus (payment)
- Multer (file uploads)
- Helmet + CORS + Morgan

---

## API Endpoints

### Base URL
- Dev: `http://localhost:3001`
- Auth: `Authorization: Bearer <nextauth-jwt>` on all routes except `/health` and `/api/payment/webhook`

---

### Chat — POST /api/chat
SSE streaming endpoint.

**Request body:**
```json
{
  "message": "string (1-4000 chars, required)",
  "courseId": "uuid (optional)",
  "university": "string (optional)",
  "department": "string (optional)",
  "course": "string (optional)",
  "professor": "string (optional)",
  "history": [{ "role": "user|assistant", "content": "string" }]
}
```

**Response:** `text/event-stream`
```
data: {"type":"sources","sources":[{"filename":"slides.pdf","type":"slides","professor":"Cohen","score":0.92}]}
data: {"type":"token","text":"Based on..."}
data: {"type":"done"}
data: {"type":"error","message":"..."}
```

**Rate limiting:** Free = 10 questions/day. Pro/Max = unlimited.

**How it works:**
1. Embeds query with OpenAI `text-embedding-3-small`
2. Searches Qdrant `studyai_chunks` collection (top 8 results, filtered by course context)
3. Streams Claude claude-sonnet-4-6 response with retrieved chunks as context
4. Sources emitted before tokens start

---

### File Upload — POST /api/upload
Multipart form, max 50MB. Forwarded to Python processor.

**Form fields:**
```
file        (binary, required)
university  (string)
department  (string)
course      (string)
professor   (string)
year        (number)
```

**Response:**
```json
{ "success": true }
```

---

### Courses — GET /api/courses
Returns user's courses.

**Response:**
```json
{ "courses": [] }
```

---

### Courses — POST /api/courses
Create a course.

**Request body:**
```json
{
  "university": "string",
  "department": "string (optional)",
  "course": "string",
  "professor": "string (optional)",
  "examDate": "date (optional)",
  "semester": "string (optional)"
}
```

---

### Technion Courses — GET /api/courses/technion?semester=2025a
Returns cached Technion course catalog from CheeseFork.

**Response:**
```json
{ "courses": [], "source": "cheesefork" }
```

---

### Payment — POST /api/payment/checkout
**Request body:**
```json
{ "plan": "pro|max|whatsapp" }
```
**Response:**
```json
{ "url": "stripe-checkout-url", "plan": "pro" }
```

---

### Subscription — GET /api/payment/subscription
**Response:**
```json
{ "plan": "free|pro|max|whatsapp", "expiresAt": null }
```

---

### Payment Webhook — POST /api/payment/webhook
Public (no auth). Handles Stripe + Payplus webhooks.

---

### Admin — GET /api/admin/stats
**Response:**
```json
{ "totalUsers": 0, "activeSubscriptions": 0, "totalChunks": 0 }
```

### Admin — POST /api/admin/sync-drive
Triggers Drive sync.

### Admin — GET /api/admin/crawler-status
Returns last CheeseFork scrape info.

---

### Health — GET /health
```json
{ "status": "ok" }
```

---

## Rate Limiting
- Window: 24 hours
- Free: 10 questions/day
- Pro/Max: Unlimited
- Key: user ID
- Error message: "Daily question limit reached. Upgrade to Pro for unlimited access."

---

## Database Schema (PostgreSQL)

### users
```sql
id UUID PK
email TEXT UNIQUE
name TEXT
image TEXT
password_hash TEXT
university TEXT
field_of_study TEXT
study_challenge TEXT
hours_per_week INTEGER
study_goal TEXT          -- "pass" | "good" | "excellent"
learning_style TEXT      -- "visual" | "practice" | "reading" | "mixed"
onboarding_done BOOLEAN
courses_created INTEGER
email_verified BOOLEAN
current_semester TEXT
created_at, updated_at TIMESTAMPTZ
```

### subscriptions
```sql
id UUID PK
user_id UUID FK → users
plan TEXT                -- "free" | "pro" | "max" | "whatsapp"
status TEXT              -- "active" | "cancelled" | "past_due"
stripe_customer_id TEXT
stripe_sub_id TEXT
payplus_sub_id TEXT
current_period_end TIMESTAMPTZ
created_at, updated_at TIMESTAMPTZ
UNIQUE (user_id)
```

### platform_subscriptions
```sql
id UUID PK
user_id UUID FK → users
platform TEXT            -- "uni" | "psycho" | "yael" | "bagrut"
plan TEXT                -- "free" | "pro" | "max"
status TEXT
stripe_customer_id, stripe_sub_id, payplus_sub_id TEXT
current_period_end TIMESTAMPTZ
UNIQUE (user_id, platform)
```

### courses
```sql
id UUID PK
user_id UUID FK → users
name TEXT
name_hebrew TEXT
university TEXT
department TEXT
professor TEXT
course_number TEXT
semester TEXT            -- "2025a" | "2025b" | "2025s"
exam_date DATE
credits INTEGER
user_level TEXT          -- "beginner" | "some" | "strong"
goal TEXT                -- "pass" | "good" | "excellent"
hours_per_week INTEGER
color VARCHAR(20)
created_at, updated_at TIMESTAMPTZ
```

### flashcards (SM-2 spaced repetition)
```sql
id UUID PK
user_id, course_id UUID FK
front TEXT               -- question
back TEXT                -- answer
next_review_at TIMESTAMPTZ
interval_days FLOAT      -- starts at 1
ease_factor FLOAT        -- starts at 2.5
review_count INTEGER
created_at TIMESTAMPTZ
```

### course_notes
```sql
id UUID PK
user_id, course_id UUID FK
title TEXT
content TEXT
note_type TEXT           -- "note" | "trick" | "prof_said" | "formula"
created_at, updated_at TIMESTAMPTZ
```

### chat_sessions
```sql
id UUID PK
user_id UUID FK
course_id UUID FK (nullable)
title TEXT
created_at TIMESTAMPTZ
```

### chat_messages
```sql
id UUID PK
message_id UUID
session_id UUID FK → chat_sessions
role TEXT                -- "user" | "assistant"
content TEXT
sources JSONB            -- [{filename, type, professor, score}]
created_at TIMESTAMPTZ
```

### documents
```sql
id UUID PK
course_id, user_id UUID FK
filename TEXT
type TEXT                -- "slides" | "exam" | "notes" | "textbook"
professor TEXT
size_bytes INTEGER
chunk_count INTEGER
created_at TIMESTAMPTZ
```

### professor_patterns
```sql
id UUID PK
course_id, user_id UUID FK
topic TEXT
pct INTEGER              -- 0-100 exam focus %
source_file TEXT
created_at TIMESTAMPTZ
```

### usage
```sql
id UUID PK
user_id UUID FK
date DATE
questions INTEGER
tokens_input, tokens_output INTEGER
UNIQUE (user_id, date)
```

### student_insights
```sql
id UUID PK
user_id, course_id UUID FK
topic TEXT
status TEXT              -- "weak" | "needs_review" | "mastered"
note TEXT
updated_at TIMESTAMPTZ
UNIQUE (user_id, course_id, topic)
```

### quiz_attempts
```sql
id UUID PK
user_id, course_id UUID FK
topic TEXT
student_answer TEXT
correct_answer TEXT
is_correct BOOLEAN
created_at TIMESTAMPTZ
```

### technion_courses
```sql
id UUID PK
course_number TEXT
name TEXT
name_hebrew TEXT
lecturer TEXT
credits INTEGER
semester TEXT
exam_date DATE
prerequisites TEXT[]
UNIQUE (course_number, semester)
```

---

## AI Features

### Chat
- Model: `claude-sonnet-4-6`
- Max tokens: 2048
- Streaming: SSE
- System prompt includes course context + up to 8 RAG chunks from Qdrant
- Supports LaTeX ($$...$$)

### Embeddings
- Model: `text-embedding-3-small` (OpenAI)
- Used for: indexing documents + querying Qdrant

### Professor Fingerprinting
- Extracts question patterns from past exams
- Stored in `professor_patterns` table as topic + exam focus %

### SM-2 Flashcards
- Quality 0-5 rating per review
- Updates `ease_factor`, `interval_days`, `next_review_at`
- ease_factor never drops below 1.3

### Platform Course Memory
- Aggregates insights across all students for same course
- `platform_course_memory` + `course_knowledge_docs` tables
- Improves responses for popular courses over time

---

## Subscription Plans
| Plan | Price | Limits |
|------|-------|--------|
| free | ₪0 | 10 questions/day |
| pro | ₪79/mo | Unlimited |
| max | ₪149/mo | Unlimited + premium features |
| whatsapp | TBD | WhatsApp integration |

---

## Environment Variables Needed
```env
# AI
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Database
DATABASE_URL=postgresql://studyai:studyai@localhost:5432/studyai

# Vector DB
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Payment
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PAYPLUS_API_KEY=
PAYPLUS_SECRET_KEY=

# Services
PROCESSOR_URL=http://localhost:8001
RESEND_API_KEY=
RESEND_FROM=

# Storage
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET=studyai-files

# Google Drive
GOOGLE_APPLICATION_CREDENTIALS=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_DRIVE_FOLDER_ID=

# Misc
PORT=3001
NODE_ENV=development
TELEGRAM_BOT_TOKEN=
SERPAPI_KEY=
```

---

## Dev Commands
```bash
pnpm dev:web        # Frontend on :3000
pnpm dev:backend    # Backend on :3001
pnpm infra:up       # Start Postgres, Qdrant, Redis via Docker
pnpm build          # Build everything
```
