# Scaffold Plan

Goal: stand up the directory structure, config, server, DB, channel placeholders, and Next.js admin dashboard. External-API code (OpenAI, Twilio, Meta) is stubbed as empty placeholder files — real implementations come in Day 1-3 per [plan.md](plan.md).

This document is the single source of truth for Sonnet subagents working in parallel. Each "Workstream" below is independent and can be assigned to a separate subagent.

## Final directory tree

```
veerox-core/
├── .claude/                              # IDE config (untouched)
├── .env.example                          # all required keys (no values)
├── .gitignore
├── .python-version                       # 3.12
├── README.md                             # project root readme
├── alembic.ini                           # migrations config
├── compose.yml                           # docker-compose
├── Dockerfile                            # backend image
├── pyproject.toml                        # uv + ruff + mypy config
├── apps/
│   ├── api/                              # FastAPI backend
│   │   ├── __init__.py
│   │   ├── main.py                       # FastAPI app factory + lifespan
│   │   ├── config.py                     # pydantic-settings
│   │   ├── deps.py                       # FastAPI dependencies (db, redis, current_user)
│   │   ├── logging.py                    # structlog JSON setup
│   │   ├── sentry.py                     # sentry init (no-op if SENTRY_DSN unset)
│   │   ├── redis_client.py               # async redis client + helpers
│   │   ├── rate_limit.py                 # slowapi limiter
│   │   ├── core/                         # AGENT CORE
│   │   │   ├── __init__.py
│   │   │   ├── agent.py                  # AgentCore class — placeholder
│   │   │   ├── prompts.py                # base + per-channel prompt blocks
│   │   │   ├── tools.py                  # tool defs + dispatch table — placeholder
│   │   │   ├── memory.py                 # load_last_n / persist_turn — placeholder
│   │   │   └── llm.py                    # OpenAI wrapper — EMPTY placeholder
│   │   ├── channels/
│   │   │   ├── __init__.py
│   │   │   ├── whatsapp/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── webhook.py            # EMPTY placeholder
│   │   │   │   ├── client.py             # EMPTY placeholder
│   │   │   │   └── adapter.py            # EMPTY placeholder
│   │   │   └── voice/
│   │   │       ├── __init__.py
│   │   │       ├── twilio_webhook.py     # EMPTY placeholder
│   │   │       ├── realtime_bridge.py    # EMPTY placeholder
│   │   │       └── adapter.py            # EMPTY placeholder
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── session.py                # async SQLAlchemy engine + session
│   │   │   ├── base.py                   # DeclarativeBase + UUIDMixin + TimestampMixin
│   │   │   └── models/
│   │   │       ├── __init__.py           # re-export all models
│   │   │       ├── org.py                # Org
│   │   │       ├── user.py               # User
│   │   │       ├── conversation.py       # Conversation
│   │   │       ├── message.py            # Message
│   │   │       └── lead.py               # Lead
│   │   ├── schemas/                      # Pydantic v2 schemas
│   │   │   ├── __init__.py
│   │   │   ├── conversation.py
│   │   │   ├── message.py
│   │   │   └── lead.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── health.py                 # GET /health, /ready
│   │   │   ├── conversations.py          # GET /conversations/{user_id}
│   │   │   ├── leads.py                  # GET, POST /leads
│   │   │   └── admin.py                  # admin endpoints for the dashboard
│   │   ├── cli/
│   │   │   ├── __init__.py
│   │   │   └── chat.py                   # CLI test script for AgentCore
│   │   └── tests/
│   │       ├── __init__.py
│   │       ├── conftest.py
│   │       ├── test_health.py
│   │       └── test_agent_core_placeholder.py
│   └── web/                              # Next.js 14 admin dashboard
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.mjs
│       ├── tailwind.config.ts
│       ├── postcss.config.mjs
│       ├── .env.example
│       ├── .eslintrc.json
│       ├── README.md
│       ├── public/
│       │   └── favicon.ico
│       └── src/
│           ├── app/
│           │   ├── layout.tsx            # root layout w/ nav
│           │   ├── page.tsx              # dashboard home (stats cards)
│           │   ├── globals.css
│           │   ├── conversations/
│           │   │   ├── page.tsx          # list
│           │   │   └── [id]/page.tsx     # transcript viewer
│           │   ├── leads/page.tsx
│           │   ├── settings/page.tsx
│           │   └── login/page.tsx
│           ├── components/
│           │   ├── nav.tsx
│           │   ├── stat-card.tsx
│           │   ├── transcript-bubble.tsx
│           │   └── ui/                   # primitives (Button, Card, Table)
│           │       ├── button.tsx
│           │       ├── card.tsx
│           │       └── table.tsx
│           └── lib/
│               ├── api.ts                # typed fetch wrapper
│               └── types.ts              # shared types matching backend
├── migrations/                           # Alembic
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       └── .gitkeep                      # first migration generated post-scaffold
└── scripts/
    ├── dev.sh                            # boots compose + waits for healthy
    └── seed.py                           # inserts a demo org + user
```

## Workstreams

Each workstream is independent — they touch disjoint directories. Run them in parallel.

---

### Workstream A — Backend Python (apps/api/, migrations/, scripts/seed.py)

**Owner:** Sonnet subagent A
**Touches:** `apps/api/**`, `migrations/**`, `scripts/seed.py`
**Depends on:** root `pyproject.toml` and `.env.example` (created in foundation phase)

#### A.1 — Config + logging + sentry

- `apps/api/config.py` — `Settings(BaseSettings)` with fields:
  - `database_url: str`, `redis_url: str`
  - `openai_api_key: str | None`, `twilio_account_sid: str | None`, `twilio_auth_token: str | None`, `twilio_phone_number: str | None`
  - `meta_app_id: str | None`, `meta_app_secret: str | None`, `meta_verify_token: str | None`, `meta_phone_number_id: str | None`, `meta_access_token: str | None`
  - `sentry_dsn: str | None`, `environment: str = "dev"`, `log_level: str = "INFO"`
  - `default_org_id: str` (UUID — for single-tenant sprint, set in seed)
- `apps/api/logging.py` — `setup_logging()` configures structlog → JSON stdout. Use orjson renderer if available.
- `apps/api/sentry.py` — `init_sentry()` — no-op if `settings.sentry_dsn is None`.

#### A.2 — Database layer

- `apps/api/db/session.py` — async engine via `create_async_engine(settings.database_url)`, `AsyncSession` factory. Export `get_session()` async generator.
- `apps/api/db/base.py` — `class Base(DeclarativeBase)`. Mixins: `UUIDMixin` (id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)), `TimestampMixin` (created_at, updated_at).
- `apps/api/db/models/` — five SQLAlchemy 2.x models. **Every table has `org_id` FK to `orgs.id`** (except `orgs` itself).
  - `org.py` — `Org`: id, name, created_at
  - `user.py` — `User`: id, org_id, phone (unique within org), name, created_at
  - `conversation.py` — `Conversation`: id, org_id, user_id, channel ("voice"|"whatsapp"), started_at, ended_at (nullable)
  - `message.py` — `Message`: id, org_id, conversation_id, role ("user"|"assistant"|"tool"), content (Text), channel, tokens_in, tokens_out, audio_secs (nullable), created_at. **Index: `(user_id, created_at desc)` via conversation join — actually keep `user_id` denormalized for the memory loader's hot path.**
  - `lead.py` — `Lead`: id, org_id, user_id, name, phone, intent, metadata (JSONB), created_at
- `apps/api/db/models/__init__.py` — re-export all models.

Schema details mirror [diagrams.md §5](../architecture/diagrams.md).

#### A.3 — Alembic migration setup

- `alembic.ini` at repo root (basic config; `script_location = migrations`).
- `migrations/env.py` — async-aware Alembic env that imports `Base.metadata` from `apps.api.db.base` and all models from `apps.api.db.models` for autogenerate.
- `migrations/script.py.mako` — default template.
- `migrations/versions/.gitkeep` — empty (no initial migration in this scaffold; documented in README how to run `alembic revision --autogenerate -m "initial"`).

#### A.4 — Redis + rate limit

- `apps/api/redis_client.py` — `redis.asyncio.from_url(settings.redis_url)`. Export `get_redis()` dependency.
- `apps/api/rate_limit.py` — slowapi `Limiter` keyed by remote address. Bind to FastAPI app in `main.py`.

#### A.5 — FastAPI app

- `apps/api/main.py` — app factory `create_app() -> FastAPI`:
  - lifespan: init sentry, structlog
  - mounts routers: health, conversations, leads, admin
  - CORS middleware (allow `http://localhost:3000` for the Next.js dev server)
  - registers slowapi limiter
- `apps/api/deps.py` — `get_db()`, `get_redis_dep()`, `get_settings()`.

#### A.6 — Routers

All return `application/json`. Use Pydantic v2 schemas from `apps/api/schemas/`.

- `apps/api/routers/health.py`
  - `GET /health` — returns `{"status": "ok"}`
  - `GET /ready` — pings Postgres + Redis, returns `{"db": "ok"|"down", "redis": "ok"|"down"}`
- `apps/api/routers/conversations.py`
  - `GET /conversations/{user_id}` — recent conversations for a user, paginated `?limit=20&offset=0`
  - `GET /conversations/{user_id}/{conversation_id}/messages` — transcript
- `apps/api/routers/leads.py`
  - `GET /leads` — list with optional `?intent=` filter
  - `POST /leads` — create (used by `capture_lead` tool, but also exposed for manual entry)
- `apps/api/routers/admin.py`
  - `GET /admin/stats` — counts: users today, calls today, leads today, p50 turn latency
  - **Auth:** placeholder header `X-Admin-Token` checked against `settings.admin_token` (sprint-level; real auth Phase 2).

#### A.7 — Pydantic schemas

- `apps/api/schemas/conversation.py` — `ConversationOut`, `MessageOut`
- `apps/api/schemas/lead.py` — `LeadCreate`, `LeadOut`
- All schemas use `from_attributes=True` (Pydantic v2 ORM mode).

#### A.8 — Agent Core placeholders

- `apps/api/core/agent.py`:
  ```python
  class AgentCore:
      async def handle_turn(self, user_id: UUID, channel: Literal["voice", "whatsapp"], input_text: str) -> str:
          raise NotImplementedError("Implemented in Day 1.")
  ```
- `apps/api/core/prompts.py` — `BASE_SYSTEM_PROMPT`, `VOICE_APPEND`, `WHATSAPP_APPEND` as string constants with brief placeholder copy.
- `apps/api/core/tools.py` — `TOOL_DEFINITIONS: list[dict]` with 4 OpenAI tool schemas (`capture_lead`, `book_appointment`, `transfer_to_human`, `lookup_customer`); each handler raises `NotImplementedError`.
- `apps/api/core/memory.py` — `async def load_last_n(...)`, `async def persist_turn(...)` — raise NotImplementedError, but include the correct signature and docstrings.
- `apps/api/core/llm.py` — **empty file** (single docstring line: "Placeholder. Implemented Day 1."). API-related per user instruction.

#### A.9 — Channel placeholders

All under `apps/api/channels/` — **empty files** with one-line docstrings. Per user instruction, no API code yet.

- `whatsapp/webhook.py`, `whatsapp/client.py`, `whatsapp/adapter.py`
- `voice/twilio_webhook.py`, `voice/realtime_bridge.py`, `voice/adapter.py`

#### A.10 — CLI test script

- `apps/api/cli/chat.py` — `python -m apps.api.cli.chat` opens a REPL, calls `AgentCore.handle_turn(...)`, prints response. Right now it'll raise NotImplementedError — that's expected.

#### A.11 — Tests skeleton

- `apps/api/tests/conftest.py` — `httpx.AsyncClient` fixture against the FastAPI app; in-memory SQLite or test Postgres URL (use env var `TEST_DATABASE_URL`).
- `apps/api/tests/test_health.py` — `GET /health` returns 200.
- `apps/api/tests/test_agent_core_placeholder.py` — asserts `handle_turn` raises NotImplementedError (this test is replaced on Day 1).

#### A.12 — Seed script

- `scripts/seed.py` — inserts a single demo `Org` with id = `settings.default_org_id` and a sample `User`. Idempotent (uses `INSERT ... ON CONFLICT DO NOTHING`).

---

### Workstream B — Next.js admin dashboard (apps/web/)

**Owner:** Sonnet subagent B
**Touches:** `apps/web/**` only
**Depends on:** nothing (fully isolated)

Use **Next.js 14 App Router + TypeScript + Tailwind CSS**. No external UI library — hand-rolled primitives.

#### B.1 — Project config

- `package.json` — deps: `next@14`, `react@18`, `react-dom@18`, `typescript@5`, `tailwindcss@3`, `@types/react`, `@types/node`. Scripts: `dev`, `build`, `start`, `lint`, `typecheck`.
- `tsconfig.json` — Next.js default + `"paths": { "@/*": ["./src/*"] }`.
- `next.config.mjs` — empty config with `reactStrictMode: true`.
- `tailwind.config.ts` — content `./src/**/*.{ts,tsx}`. Theme: extend with a single `primary` color (gray scale is fine).
- `postcss.config.mjs` — tailwindcss + autoprefixer.
- `.eslintrc.json` — `"extends": "next/core-web-vitals"`.
- `.env.example` — `NEXT_PUBLIC_API_URL=http://localhost:8000`, `ADMIN_TOKEN=<paste-from-backend-env>`.

#### B.2 — Layout + nav

- `src/app/layout.tsx` — root layout. Renders `<Nav />` sidebar + `{children}`.
- `src/components/nav.tsx` — links: Home, Conversations, Leads, Settings. Highlight active route via `usePathname()`.
- `src/app/globals.css` — Tailwind directives + a few global resets.

#### B.3 — Pages (all placeholder UIs that fetch from the FastAPI backend)

- `src/app/page.tsx` — Dashboard home. Four `<StatCard />` components for: Users Today, Calls Today, Leads Today, p50 Turn Latency. Fetches `GET /admin/stats`.
- `src/app/conversations/page.tsx` — Table of recent conversations. Columns: User, Channel, Started, Ended, # Messages. Links each row to `/conversations/[id]`.
- `src/app/conversations/[id]/page.tsx` — Transcript viewer. Renders `<TranscriptBubble />` for each message, color-coded by role.
- `src/app/leads/page.tsx` — Table of leads with intent filter.
- `src/app/settings/page.tsx` — Read-only view of env config (only non-secret fields).
- `src/app/login/page.tsx` — Single input for admin token, stores in localStorage. (Sprint-level; real auth Phase 2.)

#### B.4 — Components

- `src/components/stat-card.tsx` — label + big number + optional sublabel.
- `src/components/transcript-bubble.tsx` — `{role, content, timestamp}` → styled bubble.
- `src/components/ui/button.tsx`, `card.tsx`, `table.tsx` — minimal Tailwind primitives.

#### B.5 — API client

- `src/lib/api.ts` — typed `apiFetch<T>(path, init)` that:
  - prepends `process.env.NEXT_PUBLIC_API_URL`
  - injects `X-Admin-Token` from localStorage (`getToken()` helper)
  - throws on non-2xx with parsed error body
- `src/lib/types.ts` — TypeScript types matching `apps/api/schemas/`: `Conversation`, `Message`, `Lead`, `Stats`.

#### B.6 — README

- `apps/web/README.md` — how to dev (`npm install && npm run dev`), required env vars, where pages live, how the API client works.

---

### Workstream C — Infra + tooling (root files)

**Owner:** Sonnet subagent C
**Touches:** repo root files only: `pyproject.toml`, `Dockerfile`, `compose.yml`, `scripts/dev.sh`, `README.md`, `alembic.ini`, `.python-version`
**Depends on:** nothing — runs first or alongside A/B

#### C.1 — pyproject.toml

uv-managed. Pin to Python 3.12.

Deps (runtime):
- fastapi
- uvicorn[standard]
- pydantic
- pydantic-settings
- sqlalchemy[asyncio]
- asyncpg
- alembic
- redis
- httpx
- websockets
- slowapi
- structlog
- orjson
- sentry-sdk[fastapi]

Deps (dev, in `[dependency-groups]`):
- ruff
- mypy
- pytest
- pytest-asyncio
- respx
- aiosqlite (for fast tests)

Tool config in same file:
- `[tool.ruff]` — line-length 100, target py312, select `E,F,I,UP,B,SIM`
- `[tool.ruff.format]` — defaults
- `[tool.mypy]` — strict on `apps.api.core.*`, lenient (`disable_error_code = ["import-untyped"]`) on adapters
- `[tool.pytest.ini_options]` — `asyncio_mode = "auto"`, `testpaths = ["apps/api/tests"]`

#### C.2 — .python-version

```
3.12
```

#### C.3 — Dockerfile

Multi-stage:
1. `builder` — install uv, copy `pyproject.toml` + lockfile, `uv sync --frozen`
2. `runtime` — copy `.venv` from builder, copy `apps/` and `migrations/`, run `uvicorn apps.api.main:app --host 0.0.0.0 --port 8000`

Use `python:3.12-slim-bookworm` base. Non-root user.

#### C.4 — compose.yml

Services:
- `api` — builds Dockerfile, depends on `db` + `redis`, env from `.env`, ports `8000:8000`
- `db` — `postgres:16-alpine`, volume `pgdata`, env `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, healthcheck `pg_isready`
- `redis` — `redis:7-alpine`, healthcheck `redis-cli ping`
- `web` — builds `apps/web`, depends on `api`, ports `3000:3000` (or remove and run web outside compose if simpler)

Networks: default bridge is fine.

#### C.5 — scripts/dev.sh

POSIX shell — boots `docker compose up -d db redis`, waits for healthchecks, runs `alembic upgrade head`, then `uvicorn apps.api.main:app --reload`.

#### C.6 — alembic.ini

Standard. `script_location = migrations`. `sqlalchemy.url` is read from env in `migrations/env.py`, so leave the ini's url blank.

#### C.7 — README.md (root)

One-pager. Sections:
- What this repo is (1 paragraph; link to `longrunning/README.md`)
- Quick start: clone → `cp .env.example .env` → `./scripts/dev.sh` → `cd apps/web && npm install && npm run dev`
- Repo layout (compressed tree)
- How to add a new tool to AgentCore (link to `core/tools.py`)
- How to swap LLM provider (link to `core/llm.py`)
- How to add a new migration (`alembic revision --autogenerate -m "..."`)
- Where logs and Sentry live

---

## Foundation phase (done before workstreams kick off)

I (the orchestrating agent) handle these first because they're tiny and the workstreams depend on them:

- `.gitignore` — Python + Node + IDE defaults; explicitly ignore `.env`, `.venv`, `node_modules`, `__pycache__`, `.next`, `dist`, `*.db`, `.DS_Store`
- `.env.example` — every key from `apps/api/config.py` plus the Next.js `NEXT_PUBLIC_API_URL` and `ADMIN_TOKEN`
- Empty directory placeholders (`.gitkeep`) where needed

## Acceptance — scaffold is "done" when

1. `docker compose up` brings up Postgres, Redis, and the FastAPI server with no errors.
2. `curl localhost:8000/health` returns `{"status": "ok"}`.
3. `curl localhost:8000/ready` returns both `db` and `redis` as `"ok"`.
4. `cd apps/web && npm install && npm run dev` opens a Next.js app at `localhost:3000` with the sidebar nav rendering (pages can show empty states pulling from a not-yet-implemented backend).
5. `alembic revision --autogenerate -m "initial"` produces a migration file with all five tables (`orgs`, `users`, `conversations`, `messages`, `leads`), each with `org_id`.
6. `pytest` runs and the placeholder tests pass.
7. `ruff check` and `mypy apps/api/core` both pass on the placeholder code.

What's explicitly NOT done after scaffold (deferred to Day 1-4):

- Any real OpenAI / Twilio / Meta API code
- AgentCore.handle_turn logic
- Tool handler implementations
- Real prompt copy
- Webhook signature verification
- Realtime audio bridge
- Authentication for the admin dashboard (just the token placeholder)
