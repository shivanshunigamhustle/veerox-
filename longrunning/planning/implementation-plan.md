# Implementation Plan — Veerox AI

**Confirmed architecture (locked):**

| Concern | Choice |
|---|---|
| Voice AI | **OpenAI Realtime API** (`gpt-4o-realtime-preview`) |
| AI Brain (chat) | **OpenAI GPT-4o** (`gpt-4o`) |
| Telephony | **Twilio** (Voice + Media Streams) |
| WhatsApp | **Meta Cloud API direct** (no BSP) |

This is the build sheet. Every step is concrete enough to execute in order. Cross-reference [architecture.md](../architecture/architecture.md) for the *why*, [pitfalls.md](../operations/pitfalls.md) for the gotchas, and [plan.md](plan.md) for the day-level shape.

---

## The control plane — where all of this is controlled from

Everything below needs a place where a human can **see what the system is doing, change behaviour without redeploying, and stop it when it misbehaves**. That place is **`apps/web/`** — the Next.js 14 admin dashboard.

Today the dashboard is stat-card scaffolding. Across the sprint it gets promoted to the real control surface for the agent. The discipline:

> **Every new backend capability ships the same day with a matching admin endpoint + UI page. Backend without a control surface counts as half-done.**

### What the dashboard owns by end of Day 4

| Surface | Backed by | Lands |
|---|---|---|
| Live conversation viewer (both channels) | `GET /admin/conversations`, `GET /admin/conversations/{id}/messages` (exist) + 5-sec polling on detail page | Day 1 (text) → Day 3 (voice) |
| Stats dashboard with real metrics | `GET /admin/stats` extended w/ p50 latency, today's $ spend, error count | Day 4 |
| Lead inbox + CSV export | `GET /admin/leads` (exists) + `GET /admin/leads.csv` (new) | Day 2 |
| Prompt & tools inspector (read-only this sprint) | `GET /admin/prompts`, `GET /admin/tools` | Day 1 |
| Manual outbound — send WhatsApp / dial out | `POST /admin/outbound/whatsapp`, `POST /admin/outbound/call` | Day 2 / Day 3 |
| Kill switch ("agent paused" banner) | `POST /admin/kill-switch` writes a Redis flag; AgentCore checks every turn | Day 4 |
| Escalations inbox (`transfer_to_human` events) | `GET /admin/escalations` — reads from `human_handoff_queue` Redis list + `leads` | Day 1 (basic) → Day 4 (full) |
| Health view | `/health` + `/ready` surfaced as a page | Day 4 |

All admin endpoints are token-gated via the existing `X-Admin-Token` header in [apps/api/routers/admin.py](apps/api/routers/admin.py). Real auth is Phase 2.

### Why this matters

Without a control plane, the demo is the only way to inspect the system. The first time something misbehaves in front of the client, there's no way to diagnose or stop it. Building the control surface alongside the features (rather than at the end) costs ~25% of the time of building it after the fact, and pays back the first time a turn goes wrong.

---

## Phase 0 — Pre-flight (out-of-band, not blocking code)

These have lead time. Kick them off the moment you start.

- [ ] **OpenAI org access**: confirm API key works for *both* `gpt-4o` and `gpt-4o-realtime-preview`. Realtime needs to be enabled on the org — not all are.
- [ ] **Twilio account**: buy/port an India phone number (KYC 1–3 days). Note the `Account SID`, `Auth Token`, and the E.164 number.
- [ ] **Meta Business Manager**:
  - [ ] Verify the business (1–2 days if not done)
  - [ ] Create a WhatsApp Business App in Meta Developer Console
  - [ ] Add a phone number, get the `Phone Number ID` and a **System User access token** (permanent, not the short-lived test token)
  - [ ] Submit two utility templates (`appointment_confirmation`, `lead_followup`) — approval is 24–48h and *first submission usually gets rejected*. Submit Day 1, not Day 4.
- [ ] **Domain + HTTPS**: pick `api.<yourdomain>` and point it at the EC2 you'll host on. Meta and Twilio both refuse non-HTTPS webhooks. For dev, `ngrok http 8000` is fine — but pin the prod URL early.
- [ ] **EC2 t3.medium** in `ap-south-1` (Mumbai), with Postgres 16 either on the same box (sprint) or RDS (production). Open ports 80/443. Install Caddy for auto-TLS.

> ⚠ Do not start Phase 1 until you have the OpenAI key in hand. Everything else can lag.

---

## Phase 1 — Finish the foundation (the gaps in today's scaffold)

The scaffold is in place. These are the holes to close before any Day-1 code lands.

### 1.1 — Create `.env.example` at the repo root

The file is referenced everywhere but doesn't exist. Create it with every key from [config.py](apps/api/config.py), no values:

```
# App
ENVIRONMENT=dev
LOG_LEVEL=INFO
DEFAULT_ORG_ID=00000000-0000-0000-0000-000000000001
ADMIN_TOKEN=change-me-before-prod

# Database / Redis
DATABASE_URL=postgresql+asyncpg://veerox:veerox@localhost:5432/veerox
REDIS_URL=redis://localhost:6379/0
TEST_DATABASE_URL=sqlite+aiosqlite:///:memory:

# OpenAI
OPENAI_API_KEY=
OPENAI_CHAT_MODEL=gpt-4o
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview
OPENAI_REALTIME_VOICE=alloy

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Meta WhatsApp Cloud API
META_APP_ID=
META_APP_SECRET=
META_VERIFY_TOKEN=
META_PHONE_NUMBER_ID=
META_ACCESS_TOKEN=
META_GRAPH_API_VERSION=v21.0

# Public base URL (used in TwiML <Stream url=...> and Meta webhook registration)
PUBLIC_BASE_URL=https://api.example.com

# Observability
SENTRY_DSN=
```

Also add the three new fields to [config.py](apps/api/config.py): `openai_chat_model`, `openai_realtime_model`, `openai_realtime_voice`, `meta_graph_api_version`, `public_base_url`.

### 1.2 — Generate the initial Alembic migration

```bash
uv run alembic revision --autogenerate -m "initial schema"
uv run alembic upgrade head
```

Verify the generated file under `migrations/versions/` includes all five tables, the `messages` user_id+created_at index, and the `users.phone` unique constraint scoped within `org_id` (composite unique on `(org_id, phone)`).

### 1.3 — Run the seed script

```bash
uv run python -m scripts.seed
```

This inserts the default Org with id matching `DEFAULT_ORG_ID`. The voice and WhatsApp adapters will look up / create users under this org during the sprint (single-tenant).

### 1.4 — Boot the stack end-to-end

```bash
docker compose up -d db redis
./scripts/dev.sh
curl localhost:8000/health   # → {"status":"ok"}
curl localhost:8000/ready    # → {"db":"ok","redis":"ok"}
```

If any of these fail, fix before writing a line of agent code.

---

## Phase 2 — Day 1: AI Brain (the one piece both channels depend on)

Order matters here. Each step depends on the previous.

### 2.1 — `apps/api/core/llm.py` — OpenAI chat wrapper

A *single* async function. Provider lives here and nowhere else.

```python
# Signature to implement:
async def chat_completion(
    messages: list[dict],
    tools: list[dict] | None = None,
    model: str | None = None,           # defaults to settings.openai_chat_model
    temperature: float = 0.4,
) -> ChatResult: ...

@dataclass
class ChatResult:
    content: str | None             # None when the model only emitted tool calls
    tool_calls: list[ToolCall]      # parallel tool calls supported
    tokens_in: int
    tokens_out: int
    finish_reason: str
```

Implementation notes:
- Use `openai.AsyncOpenAI(api_key=settings.openai_api_key)` — instantiate once at module load, reuse.
- Pass `tools=tools, tool_choice="auto"` when tools are provided.
- Convert `choice.message.tool_calls` into your own `ToolCall` dataclass with `id, name, arguments_json` so the agent layer is SDK-agnostic.
- Pull token counts from `response.usage.prompt_tokens` / `completion_tokens`.
- Wrap the call in `tenacity.retry` (3 attempts, exponential backoff) for transient 429/5xx — but **don't retry tool-call responses** (re-running the LLM after a tool result is the agent loop's job, not retry).

### 2.2 — `apps/api/core/memory.py` — load / persist

Replace the two `NotImplementedError` bodies:

**`load_last_n`** — return up to N messages as OpenAI-formatted dicts:

```python
stmt = (
    select(Message)
    .where(Message.user_id == user_id)
    .order_by(Message.created_at.desc())
    .limit(n)
)
rows = (await db.execute(stmt)).scalars().all()
rows.reverse()  # chronological for the LLM
return [{"role": m.role, "content": m.content} for m in rows]
```

Add a token-budget cap (default 4000 tokens) **on top of** the count cap — count via `tiktoken.encoding_for_model("gpt-4o")` and drop oldest until under budget. This is the [pitfalls.md](../operations/pitfalls.md) "context-blow on tool-heavy turn" guard.

**`persist_turn`** — write `(user_text, assistant_text)` as two rows in one transaction. Use a single `db.add_all([user_msg, asst_msg]); await db.commit()`. Populate `tokens_in` on the assistant row only.

### 2.3 — `apps/api/core/tools.py` — implement the four handlers

The dispatch table is already wired. Replace each `NotImplementedError`:

| Tool | What it does |
|---|---|
| `capture_lead(name, phone, intent)` | Upsert a `Lead` row (org_id from settings); return `{"status":"ok","lead_id":...}`. Idempotent on `(org_id, phone, intent)`. |
| `book_appointment(user_id, date, time, notes)` | For the sprint: write a row to a new `Appointment` table OR just persist into `Lead.metadata` with intent=`booking`. **Pick the second** — adding a model now is scope creep. Day 5 problem. |
| `transfer_to_human(reason, urgency)` | Log a structured event, push to a Redis list `human_handoff_queue`, and return a hand-off message ("I'm connecting you to a human agent, please hold."). |
| `lookup_customer(phone)` | `select(User).where(User.phone == phone, User.org_id == default_org)`. Return name + last conversation timestamp or `{"found": false}`. |

All handlers take the `db: AsyncSession` *as a first arg* — update both the function signatures and the dispatch table to inject the session at call time. Easiest pattern: the dispatch table holds the *function*, and the agent loop passes `db` in when invoking.

### 2.4 — `apps/api/core/agent.py` — `AgentCore.handle_turn`

The brain. Pseudocode:

```python
async def handle_turn(self, db, user_id, channel, input_text) -> str:
    # 1. Resolve or create the conversation row (most recent open one for user+channel,
    #    or create a new Conversation if none open or last one ended >30min ago).
    conversation = await self._get_or_open_conversation(db, user_id, channel)

    # 2. Build the messages array:
    history = await load_last_n(db, user_id, n=20)
    system = BASE_SYSTEM_PROMPT + (VOICE_APPEND if channel == "voice" else WHATSAPP_APPEND)
    messages = [{"role": "system", "content": system}, *history, {"role": "user", "content": input_text}]

    # 3. Agent loop — up to 5 iterations of (LLM → tool calls → LLM → ...).
    for _ in range(5):
        result = await chat_completion(messages, tools=TOOL_DEFINITIONS)
        if not result.tool_calls:
            assistant_text = result.content or ""
            break
        messages.append({"role": "assistant", "tool_calls": [...], "content": None})
        for tc in result.tool_calls:
            handler = DISPATCH_TABLE[tc.name]
            tool_result = await handler(db, **json.loads(tc.arguments_json))
            messages.append({
                "role": "tool", "tool_call_id": tc.id,
                "content": json.dumps(tool_result),
            })
    else:
        assistant_text = "I'm having trouble completing that. Let me get a human."

    # 4. Persist turn (user + assistant rows).
    await persist_turn(db, conversation.id, user_id, default_org_id, channel,
                       input_text, assistant_text, tokens_in=result.tokens_in,
                       tokens_out=result.tokens_out)

    return assistant_text
```

**Critical:** the same `AgentCore` instance is shared across channels — make it a stateless class registered as a FastAPI dependency. No per-channel subclassing.

### 2.5 — `apps/api/cli/chat.py` — REPL for verification

A simple `while True: input(); print(asyncio.run(agent.handle_turn(...)))` loop. This is your Day-1 acceptance gate.

**Done when:** `python -m apps.api.cli.chat` lets you have a 5-turn conversation in English and Hindi, the model calls `capture_lead` correctly when you give it your name+phone+intent, and the rows show up in Postgres.

### 2.6 — Control plane: Day 1 additions

The brain is live; expose it to the dashboard the same day.

**Backend** ([apps/api/routers/admin.py](apps/api/routers/admin.py)):
- `GET /admin/prompts` → returns `{base, voice_append, whatsapp_append}` from `apps/api/core/prompts.py` (read-only — editing is Phase 2).
- `GET /admin/tools` → returns `TOOL_DEFINITIONS` so operators can see the agent's capabilities without grepping code.
- `GET /admin/escalations` → drains `human_handoff_queue` from Redis (or LRANGE for inspection) so operators see live transfer requests.

**Frontend** ([apps/web/src/app/](apps/web/src/app/)):
- Extend `settings/page.tsx` with two collapsible read-only blocks: "Active Prompts" (renders the strings) and "Registered Tools" (renders the JSON schemas).
- Extend `conversations/[id]/page.tsx` to poll `GET /admin/conversations/{id}/messages` every 5 sec so the operator sees the CLI conversation update live. Existing `useEffect` + `setInterval` — no WebSocket needed.
- New page `escalations/page.tsx` — simple table of pending human-handoff entries linked back to the originating conversation.

**Done when:** With the CLI running, the dashboard's `/conversations/<id>` page renders new turns within ~5 sec; `/settings` shows the active prompts and tool schemas; triggering `transfer_to_human` in the CLI causes a row to appear on `/escalations`.

---

## Phase 3 — Day 2: WhatsApp channel

Channel adapters are *thin translators*. They must not touch prompts, tools, or LLM logic.

### 3.1 — `apps/api/channels/whatsapp/client.py` — outbound send

```python
async def send_text(to_e164: str, body: str) -> dict:
    url = f"https://graph.facebook.com/{settings.meta_graph_api_version}/{settings.meta_phone_number_id}/messages"
    headers = {"Authorization": f"Bearer {settings.meta_access_token}"}
    payload = {
        "messaging_product": "whatsapp",
        "to": to_e164,
        "type": "text",
        "text": {"body": body},
    }
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(url, json=payload, headers=headers)
        r.raise_for_status()
        return r.json()

async def download_media(media_id: str) -> bytes:
    # Two-step: GET /<media_id> → url, then GET that url with auth header
    ...

async def mark_read(message_id: str) -> None:
    # POST /messages with {messaging_product, status:"read", message_id}
    ...
```

Reuse one `httpx.AsyncClient` at module level for connection pooling.

### 3.2 — `apps/api/channels/whatsapp/webhook.py` — Meta verification + receipt

```python
@router.get("/webhook/whatsapp")
async def verify(hub_mode: str, hub_verify_token: str, hub_challenge: str):
    if hub_mode == "subscribe" and hub_verify_token == settings.meta_verify_token:
        return PlainTextResponse(hub_challenge)
    raise HTTPException(403)

@router.post("/webhook/whatsapp")
async def receive(request: Request, background: BackgroundTasks):
    # 1. Verify signature: hmac-sha256 of raw body with META_APP_SECRET,
    #    compare to X-Hub-Signature-256 header. Constant-time compare.
    body_bytes = await request.body()
    if not verify_signature(body_bytes, request.headers.get("x-hub-signature-256")):
        raise HTTPException(401)

    payload = await request.json()

    # 2. Fast-ACK: schedule processing, return 200 immediately.
    background.add_task(process_inbound, payload)
    return {"status": "ok"}
```

**This is the [pitfalls.md](../operations/pitfalls.md) `<15s ACK` rule.** Do NOT await the LLM call in the handler.

### 3.3 — `apps/api/channels/whatsapp/adapter.py` — the bridge

```python
async def process_inbound(payload: dict) -> None:
    # 1. Parse Meta envelope (nested: entry[].changes[].value.messages[]).
    msg = extract_message(payload)
    if msg is None:
        return  # status update, not a message — ignore

    # 2. Resolve user (find or create by phone within default org).
    async with AsyncSessionLocal() as db:
        user = await get_or_create_user(db, msg.from_phone)

        # 3. Convert media → text if needed.
        if msg.type == "audio":
            audio_bytes = await wa_client.download_media(msg.media_id)
            text = await transcribe(audio_bytes)   # Whisper, see below
        elif msg.type == "text":
            text = msg.text
        else:
            text = "(unsupported message type)"

        # 4. Idempotency: skip if msg.id already processed (Redis SETNX with 24h TTL).
        if not await mark_processed(msg.id):
            return

        # 5. Brain.
        reply = await agent_core.handle_turn(db, user.id, "whatsapp", text)

        # 6. Send + mark read.
        await wa_client.mark_read(msg.id)
        await wa_client.send_text(msg.from_phone, reply)
```

**Whisper transcription** lives in `apps/api/core/transcribe.py` (new file):

```python
async def transcribe(audio_bytes: bytes, mime: str = "audio/ogg") -> str:
    # openai.AsyncOpenAI().audio.transcriptions.create(
    #     model="whisper-1", file=(filename, audio_bytes, mime), language="hi" optional)
    ...
```

### 3.4 — Wire the router in [main.py](apps/api/main.py)

```python
from apps.api.channels.whatsapp.webhook import router as whatsapp_router
app.include_router(whatsapp_router)
```

### 3.5 — Register the webhook with Meta

In Meta Developer Console → WhatsApp → Configuration:
- Callback URL: `https://<your-domain>/webhook/whatsapp`
- Verify Token: paste `META_VERIFY_TOKEN` from `.env`
- Subscribe to fields: `messages`, `message_status`

**Done when:** texting "hi" / "नमस्ते" / "mujhe appointment book karna hai kal ke liye" to the WhatsApp number gets a sensible reply within ~3s; voice notes get transcribed and answered; a `lead` row appears for "I want a quote, my name is X, phone 9876543210".

### 3.6 — Control plane: Day 2 additions

**Backend** ([apps/api/routers/admin.py](apps/api/routers/admin.py)):
- `POST /admin/outbound/whatsapp` body `{phone, text}` → reuses `wa_client.send_text`, persists the outbound as a `Message` row with `role="assistant"` attributed to the admin token. Token-gated; rate-limited 30/min.
- `GET /admin/leads.csv` — same data as `GET /admin/leads` but as `text/csv`. The client will ask for this on Day 4; ship it now.

**Frontend** ([apps/web/src/app/](apps/web/src/app/)):
- `conversations/page.tsx` — add a "Channel" column with WhatsApp/Voice icons (voice icon greyed until Day 3). Clicking a WhatsApp row opens the live transcript page built on Day 1.
- New page `users/[id]/page.tsx` — single phone-input + "Send Message" button hitting `POST /admin/outbound/whatsapp`. Demo-recovery tool: if the agent flubs, the operator can take over.
- `leads/page.tsx` — add an "Export CSV" button hitting `/admin/leads.csv`.

**Done when:** A WhatsApp conversation appears on the dashboard within ~5 sec of the user sending a message; the operator can send an outbound WhatsApp from `users/[id]` and the user receives it; `leads.csv` download works.

---

## Phase 4 — Day 3: Voice channel (the hard one)

Pull up Twilio's [Media Streams + OpenAI Realtime reference](https://github.com/twilio-samples/speech-assistant-openai-realtime-api-python) and adapt — don't write the WebSocket dance from scratch. Three files to fill in.

### 4.1 — `apps/api/channels/voice/twilio_webhook.py` — inbound TwiML

```python
@router.post("/webhook/voice")
async def voice_inbound(request: Request):
    # Validate Twilio signature (X-Twilio-Signature) — use twilio.request_validator.RequestValidator
    form = await request.form()
    if not validate_twilio_signature(request):
        raise HTTPException(403)

    # Build TwiML: <Connect><Stream url="wss://...">
    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<Response>'
        '<Connect>'
        f'<Stream url="wss://{settings.public_base_url_host}/ws/voice">'
        f'<Parameter name="caller" value="{form["From"]}"/>'
        f'<Parameter name="call_sid" value="{form["CallSid"]}"/>'
        '</Stream>'
        '</Connect>'
        '</Response>'
    )
    return Response(content=twiml, media_type="application/xml")
```

Configure the Twilio number in the console: Voice → A Call Comes In → Webhook → `https://<your-domain>/webhook/voice` (HTTP POST).

### 4.2 — `apps/api/channels/voice/realtime_bridge.py` — the WebSocket bridge

This is the heart of voice. One FastAPI WebSocket endpoint that simultaneously:
- Accepts the Twilio Media Stream WebSocket (μ-law 8 kHz, base64 frames)
- Opens a `websockets.connect("wss://api.openai.com/v1/realtime?model=...")` to OpenAI
- Pumps audio in *both* directions, converting on the fly

Skeleton:

```python
@router.websocket("/ws/voice")
async def voice_ws(twilio_ws: WebSocket):
    await twilio_ws.accept()

    # Wait for Twilio "start" frame — carries streamSid and our <Parameter> values
    start = await twilio_ws.receive_json()
    stream_sid = start["start"]["streamSid"]
    custom = {p["name"]: p["value"] for p in start["start"]["customParameters"]}
    caller, call_sid = custom["caller"], custom["call_sid"]

    # Resolve user (or create), open conversation.
    async with AsyncSessionLocal() as db:
        user = await get_or_create_user(db, caller)
        conversation = await open_conversation(db, user.id, "voice")
        conv_id, user_id = conversation.id, user.id

    # Open OpenAI Realtime WS.
    async with websockets.connect(
        f"wss://api.openai.com/v1/realtime?model={settings.openai_realtime_model}",
        extra_headers={
            "Authorization": f"Bearer {settings.openai_api_key}",
            "OpenAI-Beta": "realtime=v1",
        },
    ) as oai_ws:
        # Send session config: voice, instructions, tools, audio formats.
        await oai_ws.send(json.dumps({
            "type": "session.update",
            "session": {
                "modalities": ["audio", "text"],
                "instructions": BASE_SYSTEM_PROMPT + VOICE_APPEND,
                "voice": settings.openai_realtime_voice,
                "input_audio_format": "g711_ulaw",   # native Twilio
                "output_audio_format": "g711_ulaw",  # avoid resampling both ways
                "input_audio_transcription": {"model": "whisper-1"},
                "turn_detection": {"type": "server_vad"},
                "tools": TOOL_DEFINITIONS_REALTIME,  # see 4.3
                "tool_choice": "auto",
            },
        }))

        # Two pumps in parallel.
        async def twilio_to_oai():
            async for msg in twilio_ws.iter_json():
                if msg["event"] == "media":
                    await oai_ws.send(json.dumps({
                        "type": "input_audio_buffer.append",
                        "audio": msg["media"]["payload"],   # already base64 μ-law
                    }))
                elif msg["event"] == "stop":
                    break

        async def oai_to_twilio():
            async for raw in oai_ws:
                evt = json.loads(raw)
                await handle_oai_event(evt, twilio_ws, stream_sid, db_factory=..., conv_id=conv_id, user_id=user_id)

        await asyncio.gather(twilio_to_oai(), oai_to_twilio())

    # Close conversation row on exit.
    async with AsyncSessionLocal() as db:
        await close_conversation(db, conv_id)
```

**The `g711_ulaw` trick:** OpenAI Realtime supports μ-law I/O natively. Telling the session to use it on *both* sides eliminates the `audioop` resampling step entirely — fewer bugs, lower latency. This supersedes the [tech-stack.md](../decisions/tech-stack.md) note about `audioop`; only use `audioop` if you ever switch the voice to `pcm16`.

**Critical event handling in `handle_oai_event`:**

| Event type | What to do |
|---|---|
| `response.audio.delta` | base64 audio → wrap in Twilio `{"event":"media","streamSid":...,"media":{"payload":...}}` → send to Twilio WS |
| `response.audio.done` | Send `{"event":"mark","streamSid":...,"mark":{"name":"resp_end_<id>"}}` so we can detect interruptions |
| `input_audio_buffer.speech_started` | **Interruption!** Send `{"event":"clear","streamSid":...}` to Twilio to flush buffered audio, and `response.cancel` to OpenAI. This is the part demos most visibly get wrong — see [pitfalls.md](../operations/pitfalls.md). |
| `response.audio_transcript.delta` / `done` | Accumulate the assistant transcript — **persist incrementally**, not at call end |
| `conversation.item.input_audio_transcription.completed` | The user's transcript landed — persist as a `Message` row immediately |
| `response.function_call_arguments.done` | Tool call! See 4.3 |
| `error` | Log to Sentry, optionally play "one moment please" via a `response.create` |

### 4.3 — `apps/api/channels/voice/adapter.py` — tool-call bridging

Realtime tool definitions are *slightly* different from chat-completions: same JSON Schema but flat (no `function:` wrapper). Translate once:

```python
TOOL_DEFINITIONS_REALTIME = [
    {"type": "function", "name": t["function"]["name"],
     "description": t["function"]["description"],
     "parameters": t["function"]["parameters"]}
    for t in TOOL_DEFINITIONS
]
```

When `response.function_call_arguments.done` arrives:

```python
async def on_tool_call(evt, oai_ws, db):
    name = evt["name"]
    args = json.loads(evt["arguments"])
    handler = DISPATCH_TABLE[name]
    result = await handler(db, **args)

    # Feed result back to the model.
    await oai_ws.send(json.dumps({
        "type": "conversation.item.create",
        "item": {
            "type": "function_call_output",
            "call_id": evt["call_id"],
            "output": json.dumps(result),
        },
    }))
    await oai_ws.send(json.dumps({"type": "response.create"}))
```

**Same `DISPATCH_TABLE` as WhatsApp.** That's the whole point of the architecture — do not write voice-specific tool handlers.

### 4.4 — Streaming transcript persistence

In `handle_oai_event`, every time a `*.transcript.completed` event arrives for either side, write a `Message` row with the correct `role` and `audio_secs` (from the Realtime event's `usage` block when available, else compute from timestamps). Use a per-WebSocket `AsyncSession` so transactions are short.

**This is non-negotiable.** Wait until call-end and the session is gone — see [pitfalls.md](../operations/pitfalls.md).

### 4.5 — Outbound calling — `POST /calls/initiate`

New file: `apps/api/routers/calls.py`:

```python
@router.post("/calls/initiate")
async def initiate(payload: InitiateCallIn, _admin=Depends(require_admin)):
    client = TwilioClient(settings.twilio_account_sid, settings.twilio_auth_token)
    call = client.calls.create(
        to=payload.to,
        from_=settings.twilio_phone_number,
        url=f"{settings.public_base_url}/webhook/voice",  # same TwiML endpoint
    )
    return {"call_sid": call.sid, "status": call.status}
```

### 4.6 — Local dev with ngrok

```bash
ngrok http 8000
# Note the https://<id>.ngrok.io URL.
# Update PUBLIC_BASE_URL in .env to wss://<id>.ngrok.io for the <Stream url=...>
# Update Twilio number's webhook to https://<id>.ngrok.io/webhook/voice
# Update Meta webhook to https://<id>.ngrok.io/webhook/whatsapp (and re-verify)
```

**Done when:** call the Twilio number → English / Hindi conversation works → `capture_lead` fires when you give details → interrupting mid-sentence stops playback within ~200ms → transcript rows appear in Postgres *during* the call (verify with `SELECT * FROM messages ORDER BY created_at DESC LIMIT 5;` while talking).

### 4.7 — Control plane: Day 3 additions

**Backend** ([apps/api/routers/admin.py](apps/api/routers/admin.py)):
- `POST /admin/outbound/call` body `{to_phone}` → thin wrapper around `POST /calls/initiate` from §4.5; records the initiator from the admin token. Rate-limit 10/min.
- `GET /admin/conversations` already exists — live voice calls now surface with `channel="voice"` and `ended_at=null`; the existing endpoint just works.
- **In-call transcript streaming:** since `realtime_bridge.py` writes `Message` rows incrementally (§4.4), the existing 5-sec polling on `/conversations/[id]` already shows live voice transcripts. No new endpoint needed.

**Frontend** ([apps/web/src/app/](apps/web/src/app/)):
- `conversations/page.tsx` — render a pulsing red dot next to rows where `ended_at` is null (i.e. live calls).
- New page `dial/page.tsx` — single phone-input + "Dial Now" button hitting `POST /admin/outbound/call`. Useful for showing the client outbound capability live.
- `conversations/[id]/page.tsx` — voice transcripts render with the same `<TranscriptBubble />` as WhatsApp; only diff is a small "🎙" badge.

**Done when:** A live call appears on `/conversations` with the pulsing dot; transcript bubbles append on `/conversations/[id]` as the user speaks; `/dial` successfully calls a real phone number that then connects to the agent.

---

## Phase 5 — Day 4: Polish, error handling, observability

### 5.1 — Graceful LLM failure

Wrap `chat_completion` callsite in `agent.py`:

```python
try:
    result = await chat_completion(...)
except (openai.APIStatusError, openai.APIConnectionError) as e:
    logger.warning("openai_error", error=str(e), user_id=str(user_id))
    return "Sorry, one moment — having trouble on my end. Could you say that again?"
```

For Realtime, on a session-level `error` event, send a single TTS prompt ("one moment please") via `response.create` with text instructions, and re-establish the session after 2s if the error is fatal.

### 5.2 — Rate limiting per channel

Apply slowapi decorators:

```python
@limiter.limit("60/minute")  # WhatsApp webhook
@router.post("/webhook/whatsapp") ...

@limiter.limit("5/minute")   # outbound dial — admin only
@router.post("/calls/initiate") ...
```

For WhatsApp, also rate-limit *per user phone* in the adapter (Redis `INCR` with TTL). 20 msgs/min/user is a safe ceiling.

### 5.3 — Structured logs for cost tracking

In `handle_turn` and at each Realtime event:

```python
logger.info("turn_completed",
    user_id=str(user_id),
    channel=channel,
    tokens_in=tokens_in,
    tokens_out=tokens_out,
    audio_secs=audio_secs,
    cost_usd=estimate_cost(...))
```

Aggregate later via SQL on the `messages` table — that's why those columns exist.

### 5.4 — Admin endpoints — fill in [admin.py](apps/api/routers/admin.py)

```python
@router.get("/admin/stats")
async def stats(_=Depends(require_admin), db=Depends(get_db)):
    today = date.today()
    return {
        "users_today": await count_users_today(db, today),
        "calls_today": await count_conversations_today(db, today, "voice"),
        "leads_today": await count_leads_today(db, today),
        "p50_turn_latency_ms": await p50_latency(db, today),  # needs latency col — defer if tight
    }
```

The Next.js dashboard already fetches this. Smoke-test by opening `localhost:3000`.

### 5.5 — Five test scenarios per channel

Document and manually run (no auto-test infra in scope):

**WhatsApp:**
1. English greeting → small talk
2. Hindi lead capture ("mera naam Rahul hai, number 98765 43210, gym membership chahiye")
3. Voice note in English → reply in English
4. Multi-turn appointment booking with context retention
5. Deliberate gibberish → graceful "I didn't catch that"

**Voice:**
1. English call → introduce self → agent greets
2. Hindi call → lead capture → check DB
3. Mid-sentence interruption → agent stops cleanly
4. 3-minute call → transcript present in DB *during* the call
5. Force OpenAI error (bad API key for 10s) → agent recovers without crashing the call

### 5.6 — Control plane: Day 4 final cut (the kill switch + cost surface)

**Backend** ([apps/api/routers/admin.py](apps/api/routers/admin.py)):
- `POST /admin/kill-switch` body `{enabled: bool}` → sets/deletes `Redis SET veerox:kill_switch "1"`.
- AgentCore (`agent.py`) checks this key on every turn (one extra `await redis.get(...)`). If set, returns the canned `"We're handling a quick issue — back in a moment. Please try again shortly."` instead of calling OpenAI. For voice, the same check inside `realtime_bridge.py` before opening the OpenAI session — refuse with a TTS message + hang up.
- Extend `GET /admin/stats` with:
  - `p50_turn_latency_ms` — Redis-backed rolling histogram fed by structlog `turn_completed` events from §5.3.
  - `usd_spend_today` — SQL sum over today's `messages`: `tokens_in * input_rate + tokens_out * output_rate + audio_secs * realtime_rate`. Rates from new `apps/api/core/costs.py` constants.
  - `error_count_today` — Redis counter incremented in the global exception handler.

**Frontend** ([apps/web/src/app/](apps/web/src/app/)):
- Dashboard home (`page.tsx`):
  - Add a **"Pause Agent" / "Resume Agent"** button top-right that POSTs to `/admin/kill-switch` and reflects current state via a red banner across the top when paused.
  - Add a 5th stat card: **"USD Spend Today"** wired to the new `usd_spend_today` field.
  - p50 latency surfaced on the existing latency card.
- `escalations/page.tsx` (built Day 1) — extend with the `transfer_to_human` `reason` and `urgency` columns, plus a "Mark Handled" button that DELETEs from the Redis list.

**Done when:** Pausing the agent from the dashboard mid-call causes the agent to refuse the next turn; resuming restores normal behaviour. Cost card shows non-zero USD spend with sane numbers after 30 min of testing.

### 5.7 — Production hardening checklist

- [ ] Move `.env` to AWS SSM Parameter Store; container reads via `boto3` at startup
- [ ] Caddy in front of FastAPI on the EC2 — auto-TLS for `api.<yourdomain>`
- [ ] Sentry DSN populated, test with a forced exception
- [ ] `uvicorn --workers 2` (don't go higher until you measure — voice WS pins one worker)
- [ ] Postgres backup: nightly `pg_dump` to S3 (one-line cron)
- [ ] Twilio webhook signature validation **enabled** (not just present)
- [ ] Meta webhook signature validation **enabled**

---

## Phase 6 — Demo-day acceptance gate

All four must pass back-to-back. Run them in this order:

1. **WhatsApp Hindi lead capture.** Send "mujhe gym ka package chahiye, mera number hai 98765 43210, naam Priya." Agent confirms; `lead` row exists in Postgres within 5s.
2. **Voice English appointment.** Call → "Hi, I want to book a slot tomorrow at 4pm, my name is Alex." Agent confirms; assistant + user transcripts exist in `messages` table.
3. **Dashboard transcripts.** Open `localhost:3000/conversations`, click the most recent row, confirm both turns render with correct roles.
4. **OpenAI outage survival.** Set `OPENAI_API_KEY=invalid` for 30 seconds, send a WhatsApp message and start a call. Both should respond with the graceful fallback line, neither should crash the FastAPI process. Restore the key — next message works.

**Plus the control-plane bar** (the new gate, per §1):

5. **Live visibility:** Open `localhost:3000/conversations` while running scenarios 1 and 2. The WhatsApp conversation appears within 5 sec; the live voice call shows the pulsing dot and transcript bubbles append in near-real-time.
6. **Operator override:** Click "Pause Agent" on the dashboard mid-conversation → the next user turn gets the canned pause response, not an LLM reply. Click "Resume" → normal behaviour returns.
7. **Outbound from the dashboard:** Use `/dial` to call your phone and `/users/[id]` to send a WhatsApp — both succeed and appear in the conversation list.
8. **Cost visibility:** The "USD Spend Today" stat card shows a non-zero, sane number after running the demo.

If all eight pass, the AI sprint is done.

---

## File-by-file work tracker

Use this to mark progress. The "Status" column shows what exists today.

| File | Status | Phase | Notes |
|---|---|---|---|
| `.env.example` (root) | **missing** | 1.1 | Create with all keys |
| `apps/api/config.py` | needs 5 new fields | 1.1 | Add `openai_chat_model`, `openai_realtime_model`, `openai_realtime_voice`, `meta_graph_api_version`, `public_base_url` |
| `migrations/versions/0001_initial.py` | **missing** | 1.2 | `alembic revision --autogenerate` |
| `apps/api/core/llm.py` | empty | 2.1 | Implement `chat_completion` + `ChatResult` |
| `apps/api/core/memory.py` | placeholders | 2.2 | Implement both functions + token cap |
| `apps/api/core/tools.py` | handlers raise | 2.3 | Implement 4 handlers; thread `db` through dispatch |
| `apps/api/core/agent.py` | raises | 2.4 | Implement `handle_turn` agent loop |
| `apps/api/core/transcribe.py` | **missing** | 3.3 | New file — Whisper wrapper |
| `apps/api/channels/whatsapp/client.py` | empty | 3.1 | `send_text`, `download_media`, `mark_read` |
| `apps/api/channels/whatsapp/webhook.py` | empty | 3.2 | GET verify, POST receive (fast-ACK + signature check) |
| `apps/api/channels/whatsapp/adapter.py` | empty | 3.3 | `process_inbound` background task |
| `apps/api/channels/voice/twilio_webhook.py` | empty | 4.1 | TwiML `<Connect><Stream>` |
| `apps/api/channels/voice/realtime_bridge.py` | empty | 4.2 | WebSocket bridge + interruption |
| `apps/api/channels/voice/adapter.py` | empty | 4.3 | Realtime tool-call bridging |
| `apps/api/routers/calls.py` | **missing** | 4.5 | `POST /calls/initiate` |
| `apps/api/routers/admin.py` | stub | 5.4 + control-plane subsections | Real stats query + prompts/tools/escalations/kill-switch/outbound/leads.csv endpoints |
| `apps/api/core/costs.py` | **missing** | 5.6 | New file — model pricing constants used by `usd_spend_today` |
| `apps/api/main.py` | scaffold | 3.4, 4.1 | Mount new routers + voice WS |
| `apps/web/src/app/settings/page.tsx` | scaffold | 2.6 | Add Active Prompts + Registered Tools blocks |
| `apps/web/src/app/conversations/[id]/page.tsx` | scaffold | 2.6 | 5-sec polling for live updates |
| `apps/web/src/app/conversations/page.tsx` | scaffold | 3.6, 4.7 | Channel column + pulsing dot for live calls |
| `apps/web/src/app/escalations/page.tsx` | **missing** | 2.6, 5.6 | New page — handoff inbox |
| `apps/web/src/app/users/[id]/page.tsx` | **missing** | 3.6 | New page — outbound WhatsApp send |
| `apps/web/src/app/dial/page.tsx` | **missing** | 4.7 | New page — outbound call trigger |
| `apps/web/src/app/page.tsx` | scaffold | 5.6 | Pause/Resume button + USD spend stat card |
| `apps/web/src/lib/api.ts` | scaffold | 2.6+ | Add the new admin endpoint wrappers |

---

## What's intentionally out of scope

- Multi-tenant org switching (schema supports it; UI doesn't)
- Billing / usage reports per org
- Campaign templates beyond the two utility templates
- Call recording playback in the dashboard
- Knowledge-base RAG (no `pgvector` until there's content to search)
- Celery / arq — `BackgroundTasks` covers the sprint
- Auto-test suite for the channels (manual scenarios above)
- Browser-based voice (LiveKit) — Phase 2

These are listed so they don't sneak in. If anyone proposes adding one mid-sprint, the answer is "Phase 2."
