# Tech Stack (refined)

The PDF specified the top layer. This doc fills in the rest — the things you have to choose before Day 1 that the PDF skipped.

## Core (from the PDF)

| Layer | Choice | Why |
|-------|--------|-----|
| Backend framework | FastAPI | Python LLM/audio ecosystem maturity, async, type hints |
| LLM (chat) | OpenAI GPT-4o | Native Hindi + code-mixing, mature tool-calling |
| LLM (voice) | OpenAI Realtime API | ~500ms latency vs 3-4s for classic pipeline, native VAD/turn-taking |
| Telephony | Twilio + Media Streams | Reference repo exists for the Realtime bridge |
| WhatsApp | Meta Cloud API direct | Cheapest, no middleman, client owns Meta Business account |
| RDBMS | PostgreSQL | Conversations, leads, transcripts. `pgvector` is a future drop-in for RAG. |
| Cache/sessions | Redis | In-flight call state, rate limit counters |

For tradeoff analysis of the four external APIs, see [api-alternatives.md](api-alternatives.md).

## Additions the PDF didn't specify

These are the choices you'd otherwise make ad-hoc on Day 1. Pinning them here saves an hour.

### Python tooling

| Concern | Pick | Notes |
|---------|------|-------|
| Python version | 3.12 | Stable, broadly supported. Avoid 3.13 — some audio libs lag. |
| Dependency mgmt | **uv** | 10-100x faster than pip/poetry. `uv pip compile` for lockfile. |
| Linter/formatter | **ruff** | One tool, fast. `ruff check` + `ruff format`. |
| Type checking | mypy (strict on `app/core/`, lenient on adapters) | The brain is where bugs are expensive |
| Testing | pytest + pytest-asyncio + respx | `respx` mocks httpx for Meta/Twilio API tests |

### Runtime libraries

| Concern | Pick | Notes |
|---------|------|-------|
| ORM | **SQLAlchemy 2.x async** | Mature, async-native. Alembic for migrations. |
| Migrations | Alembic | Autogenerate from SQLAlchemy models |
| Schemas | Pydantic v2 | FastAPI native. Use v2's `model_validate` not deprecated `parse_obj`. |
| HTTP client | httpx (async) | Outbound to Meta API, Twilio REST, OpenAI |
| WebSocket | starlette built-in (inbound from Twilio) + `websockets` lib (outbound to OpenAI) | Two different libs because role differs |
| Audio conversion | stdlib `audioop` | μ-law ↔ PCM16. Don't pull in numpy/scipy unless needed. |
| Background jobs | FastAPI `BackgroundTasks` | Sufficient for the webhook fast-ack pattern. Defer Celery/arq until Phase 2. |
| Rate limiting | `slowapi` | Redis-backed, Starlette-aware |
| Logging | `structlog` + JSON output | Greppable, ships cleanly to any log aggregator |
| Error tracking | Sentry | Free tier is plenty for Day 4 demo. Wire it on Day 1, don't bolt it on. |
| Config | `pydantic-settings` | Loads from `.env`, type-checked, fails fast on missing keys |

### Infrastructure

| Concern | Pick | Notes |
|---------|------|-------|
| Container | Docker + docker-compose | One `compose.yml` runs FastAPI + Postgres + Redis locally |
| Process mgr | uvicorn (single process) | No gunicorn for the sprint. Add it for prod scale. |
| Reverse proxy | **Caddy** | Auto-TLS, one-line config. Or use the platform's edge proxy. |
| Hosting | AWS EC2 (t3.medium) per the proposal | Single instance is fine for sprint. Scale-out is Phase 2. |
| TLS / public URL for webhooks | ngrok (dev) → Caddy on the EC2 (prod) | Meta and Twilio both require HTTPS |
| Secrets (dev) | `.env` (gitignored) + `.env.example` (committed, no values) | PDF already mandates this |
| Secrets (prod) | AWS SSM Parameter Store | Client rotates, we do a one-line swap |

### Database design notes

- **Every table has an `org_id` column from Day 1**, even though we're single-tenant for the sprint. The PDF flags this — it makes Phase 2 multi-tenancy a non-event.
- **UUID primary keys** (not auto-increment int). Avoids leaking volume info and makes future federation easier.
- **`messages` table has a `channel` column** so transcripts can be filtered by source.
- **Voice transcripts stream in during the call** — don't batch at end-of-call; the session dies and you lose data.
- **Indexes**: `(user_id, created_at desc)` on `messages` for the memory loader's "last N" query.

### What to defer

These come up naturally on similar builds but don't belong in the sprint:

- **pgvector / RAG** — not needed until there's a knowledge base to search. Add it when the business spec arrives.
- **Celery / arq** — `BackgroundTasks` covers Day 4 scope. Don't drag in a broker yet.
- **OpenTelemetry / distributed tracing** — Sentry + structured logs cover the demo. Add OTel when there's more than one service.
- **Feature flags** — premature.
- **Multi-region / failover** — Phase 3.

## Why this stack composes well

- One language end-to-end (Python). No JS/Python boundary to debug at 2am.
- Async everywhere — FastAPI, SQLAlchemy 2.x, httpx, the OpenAI SDK. No sync/async hybrid traps.
- Standard PostgreSQL — no exotic extensions on Day 1, just `pgcrypto` for UUIDs.
- Containerized from Day 1 — the demo machine, the prod machine, and the laptop run the same image.
- No vendor SDK lock-in beyond OpenAI/Twilio/Meta themselves, which the proposal already names.

## Cost ballpark, monthly, at low pilot volume

| Item | Estimate (USD) | Notes |
|------|----------------|-------|
| EC2 t3.medium + storage | $35 | Ondemand. Reserved drops it further. |
| OpenAI (GPT-4o + Realtime) | $150-400 | Highly volume-dependent. See [api-alternatives.md](api-alternatives.md) for the breakdown. |
| Twilio (number + Media Streams + call mins) | $50-150 | India outbound dominates this |
| Meta WhatsApp conversations | $20-80 | Marketing convs dominate; utility/service much cheaper |
| Sentry / logging | $0 | Free tiers |
| **Total** | **~$250-700/mo** | Roughly ₹20k-60k. PDF estimates ₹15-25k at *very* low volume — that's WhatsApp-heavy / voice-light. |

These are pilot-volume numbers. Production scale is a different conversation.
