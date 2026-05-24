# Undeniable Engine

> Rajshri's personal AI learning command center — daily task tracker, visual roadmap, RAG chatbot, job pipeline, resource vault, and reflection journal. One Next.js app, one deploy.

## Stack

- **Frontend + Backend**: Next.js 16 (App Router) · TypeScript · TailwindCSS · Framer Motion
- **Database**: MongoDB (Mongoose) — all data persisted, zero hardcoding
- **AI**: OpenAI `gpt-4o-mini` — cold email, journal reflection, ClarityBot chatbot, task suggestions
- **Deploy**: Vercel (single app, frontend + API routes together)

---

## Local Setup

### 1. Prerequisites

- Node 20+
- A MongoDB Atlas cluster (free tier works) — [create one here](https://www.mongodb.com/atlas)
- An OpenAI API key — [get one here](https://platform.openai.com/api-keys)

### 2. Clone & configure

```bash
cd frontend
cp .env.local.example .env.local   # if example exists, otherwise create it
```

Edit `frontend/.env.local`:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>
OPENAI_API_KEY=sk-...
NEXTAUTH_SECRET=any-random-32-char-string
```

### 3. Install & run

```bash
cd frontend
npm install
npm run dev
# App is live at http://localhost:3000
```

That's it. No Python, no Docker, no second terminal.

---

## Seed the database (run once)

All content — roadmap stages, topics, daily quotes, North Star letter, journal prompts, badge definitions — lives in MongoDB. It needs to be seeded once. After that it persists forever across all restarts and deploys.

**With the dev server running**, call the seed endpoint:

```bash
curl -X POST http://localhost:3000/api/admin/seed
```

Expected response:

```json
{
  "ok": true,
  "message": "Seed complete — 11 stages, 42 topics, 5 settings keys upserted",
  "results": { "stages": 11, "topics": 42, "settings": 5 }
}
```

Or check seed status first (GET):

```bash
curl http://localhost:3000/api/admin/seed
# { "seeded": true, "stages": 11, "topics": 42, "settings": 5 }
```

> **Safe to re-run.** All operations are upserts. Re-running after editing `scripts/seed-data.ts` updates existing records without duplicating anything.

---

## Updating content

All content is in [`scripts/seed-data.ts`](frontend/scripts/seed-data.ts). Edit it, then re-seed:

```bash
# Server must be running
curl -X POST http://localhost:3000/api/admin/seed
```

Or update a single settings key directly:

```bash
curl -X PUT http://localhost:3000/api/settings/northstar_text \
  -H "Content-Type: application/json" \
  -d '{"value": "Dear Rajshri, ..."}'
```

Available settings keys: `northstar_text`, `daily_quotes`, `journal_prompts`, `journal_tags`, `badges`

---

## Pages

| Route | Description |
|-------|-------------|
| `/job-tracker-dashboard` | Home: streak, daily quote, task completion ring, North Star panel |
| `/job-tracker-dashboard/roadmap` | Visual AI + DSA roadmap — mark topics in progress / complete |
| `/job-tracker-dashboard/jobs` | Job pipeline (kanban), referral tracking, cold email generator |
| `/job-tracker-dashboard/chatbot` | ClarityBot — AI mentor with full knowledge base |
| `/job-tracker-dashboard/progress` | AI completion %, DSA stats, streak, badges |
| `/job-tracker-dashboard/vault` | Resource vault — courses, jobs, tools, checkpoints |
| `/job-tracker-dashboard/journal` | Daily reflection with mood, tags, AI reflection, heatmap |

---

## API Routes

All backend logic runs as Next.js API routes — no separate server.

```
GET  /api/roadmap                        → stages + topics + completion from DB
PATCH /api/roadmap/topics/[id]           → mark topic not_started / in_progress / completed

GET  /api/progress                       → AI%, DSA count, streak, badges
GET  /api/badges                         → badge definitions from DB

POST /api/chatbot/stream                 → SSE streaming (OpenAI + knowledge base)

GET/POST       /api/journal              → journal entries (paginated)
PATCH/DELETE   /api/journal/[id]

GET/POST       /api/vault                → resource vault
PATCH/DELETE   /api/vault/[id]

POST /api/streaks/freeze                 → use a monthly streak freeze

GET  /api/settings/[key]                 → read a settings value
PUT  /api/settings/[key]                 → update a settings value

POST /api/admin/seed                     → seed/update all content from seed-data.ts
GET  /api/admin/seed                     → check seed status

POST /api/ai/cold-email                  → generate cold email (OpenAI)
POST /api/ai/reflect                     → journal AI reflection (OpenAI)
POST /api/ai/suggestions                 → daily task suggestions (OpenAI)

GET/POST/PATCH/DELETE /api/jobs          → job applications
GET/POST/PATCH/DELETE /api/tasks         → daily tasks (with streak tracking)
```

---

## Deploy to Vercel

```bash
cd frontend
vercel --prod
```

Set these environment variables in the Vercel dashboard:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `OPENAI_API_KEY` | OpenAI API key |
| `NEXTAUTH_SECRET` | Any random 32-char string |

After deploy, run the seed once against the production URL:

```bash
curl -X POST https://your-app.vercel.app/api/admin/seed
```

Done. No backend to deploy separately.
