# PromptPilot

> Turn prompts into live React apps. Type what you want, an AI agent writes and edits code in an isolated cloud sandbox, and you see a live preview instantly — like Lovable, self-hosted.

## Demo

https://github.com/bhupeshv29/Prompt-pilot/blob/main/frontend/public/PromptPilot.mp4

<video src="https://raw.githubusercontent.com/bhupeshv29/Prompt-pilot/main/frontend/public/PromptPilot.mp4" controls muted loop playsinline width="100%" poster="https://raw.githubusercontent.com/bhupeshv29/Prompt-pilot/main/frontend/public/samples/cafe.jpg">
  Your browser does not support the video tag.
  <a href="https://github.com/bhupeshv29/Prompt-pilot/blob/main/frontend/public/PromptPilot.mp4">Watch the PromptPilot demo (MP4)</a>
</video>

> Source file: [`frontend/public/PromptPilot.mp4`](./frontend/public/PromptPilot.mp4) — also embedded on the landing page below the hero section (`/` → `#demo`). If the player above doesn't load, [open the demo video directly](https://github.com/bhupeshv29/Prompt-pilot/blob/main/frontend/public/PromptPilot.mp4).

## Architecture

```mermaid
flowchart LR
    User[User - React Vite UI<br/>Landing / Studio / Project]
    API[Backend - Express on Bun :3000<br/>/auth /conversations /questions + SSE]
    Agent[Agent Loop - loop.ts<br/>compact + summarize context]
    Groq[Groq LLM<br/>openai/gpt-oss-120b]
    E2B[E2B Sandbox<br/>promptpilot-react<br/>/home/user/project :5173]
    DB[(Postgres + Prisma<br/>User / Conversation / Message<br/>AgentRun / ToolCall / Sandbox)]

    User -->|REST + SSE - Axios| API
    API -->|auth + history| DB
    API -->|run agent| Agent
    Agent -->|chat.completions| Groq
    Agent -->|read / write / bash / diff_apply| E2B
    Agent -->|text_delta / tool_start / preview_updated| User
    E2B -->|previewUrl in iframe| User
    E2B -->|snapshotId| DB
```

**Flow:** Prompt → `POST /conversations/:id/messages` → `runAgent()` loads history → `buildContextInput()` + `compactInput()` → Groq streams text + function calls → tools edit E2B files → SSE emits `preview_updated` → snapshot saved → assistant reply stored.

## Tech Stack

| Layer    | Tech                                                              |
| -------- | ----------------------------------------------------------------- |
| Frontend | React 19, Vite, Tailwind v4, React Router, Axios, Sonner          |
| Backend  | Bun, Express 5, Prisma 7, Postgres, JWT + bcrypt, Zod, SSE        |
| AI       | Groq OpenAI-compatible API, context summariser, 15-step tool loop |
| Sandbox  | E2B Code Interpreter, React+Vite template, snapshots              |

## Installation (Easiest Way)

### Prerequisites

- Bun: https://bun.sh
- Node.js 20+ + bun (for frontend)
- Postgres database URL (local or hosted e.g. Neon/Supabase)
- Groq API key: https://console.groq.com
- E2B API key: https://e2b.dev

### 1. Clone

```bash
git clone <your-repo-url>
cd PromptPilot
```

### 2. Backend setup

```bash
cd backend
bun install
cp .env.example .env
```

Fill `backend/.env`:

```
JWT_SECRET=any-long-random-string
JWT_EXPIRES_IN=7d
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/promptpilot
E2B_API_KEY=your-e2b-key
E2B_TEMPLATE=promptpilot-react
GROQ_API_KEY=your-groq-key
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=openai/gpt-oss-120b
FRONTEND_ORIGIN=http://localhost:5173
```

Then:

```bash
bunx prisma migrate dev
bun run src/e2b/build-template.ts   # one time: builds E2B template
bun run --watch src/index.ts        # backend on http://localhost:3000
```

### 3. Frontend setup (new terminal)

```bash
cd frontend
bun install
cp .env.example .env
```

`frontend/.env` already defaults to:

```
VITE_API_BASE_URL=http://localhost:3000
```

Then:

```bash
bun run dev   # app on http://localhost:5173
```

### 4. Use it

1. Open `http://localhost:5173` → Register → Login
2. Go to `/studio` → New project
3. Type e.g. `SaaS landing page` → watch code stream + live preview
4. Use Open Preview, Files, Download, Summary buttons in Project page


