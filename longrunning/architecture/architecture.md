# Architecture

## The core idea: one brain, two mouths

There is exactly **one** piece of code that talks to the LLM — the **Agent Core**. It accepts `(user_id, channel, input_text)` and returns a response. Voice and WhatsApp are thin transport adapters wrapped around it.

Why this matters: most teams ship two parallel implementations (one for voice, one for WhatsApp) and they drift. Prompts disagree, tool definitions diverge, bug fixes get applied to one side only. Within three months the system has split-personality disorder.

We avoid that by making the Agent Core channel-agnostic. The only thing it knows about transport is a single `channel` hint ("voice" or "whatsapp") that nudges response style — shorter and more conversational for voice, slightly longer with line breaks for WhatsApp.

## System diagram

```
External world:
    Twilio Voice                       WhatsApp Cloud API
        |                                      |
        | (WebSocket audio, μ-law 8kHz)        | (HTTPS webhook, JSON)
        v                                      v
+-----------------------------------------------------------+
|                      FastAPI backend                       |
|                                                            |
|     Voice adapter                       WhatsApp adapter   |
|     (audio bridge,                      (payload parser,   |
|      Realtime session)                   send client)      |
|           \                                /               |
|            \                              /                |
|             v                            v                 |
|                       Agent Core                           |
|         (prompts, tools, memory, LLM, routing)             |
+-----------------------------------------------------------+
                  |             |             |
                  v             v             v
              OpenAI         Postgres       Redis
            (GPT-4o +     (history,       (session
             Realtime)     leads)          state, RL)
```

## Component responsibilities

### Agent Core (`app/core/`)

- `agent.py` — `AgentCore` class with one public method: `async def handle_turn(user_id, channel, input_text) -> str`
- `prompts.py` — one base system prompt + per-channel append blocks
- `tools.py` — tool definitions (`capture_lead`, `book_appointment`, `transfer_to_human`, `lookup_customer`) and handlers
- `memory.py` — load last N messages from Postgres, format for OpenAI; persist new turns
- `llm.py` — thin wrapper around the OpenAI SDK. One place to swap providers later.

### Channels (`app/channels/`)

Adapters are **dumb translators**. They never touch prompts, tools, or LLM logic.

- `whatsapp/webhook.py` — Meta verification (GET) + message receipt (POST)
- `whatsapp/client.py` — send-message API wrapper
- `whatsapp/adapter.py` — Meta payload ↔ `handle_turn` translation
- `voice/twilio_webhook.py` — returns TwiML with `<Connect><Stream>`
- `voice/realtime_bridge.py` — the WebSocket that bridges Twilio audio ↔ OpenAI Realtime
- `voice/adapter.py` — Realtime events ↔ `handle_turn` translation for tool calls

### Persistence

- **Postgres**: `users`, `conversations`, `messages`, `leads`. Every table has `org_id` from Day 1 to keep multi-tenancy a future drop-in.
- **Redis**: in-flight call state, rate-limit counters, recent-message cache. Ephemeral by design.

## Channel-specific nuances

### Voice path (Twilio → OpenAI Realtime)

The audio formats don't match: Twilio sends μ-law 8 kHz, Realtime wants PCM16 24 kHz. Conversion happens in the bridge using stdlib `audioop`. Forget this and the agent hears gibberish — see [pitfalls.md](../operations/pitfalls.md).

Tool calls in voice are intercepted from the Realtime event stream, executed via the **same** handlers WhatsApp uses, and the result is fed back into the session. This is why the Agent Core sits below the adapters — both channels share tool execution.

Voice transcripts must be streamed to Postgres **during** the call. The Realtime session is ephemeral; when the call ends, the session dies. If we wait until call-end to persist, we lose everything.

### WhatsApp path (Meta Cloud API)

Webhook-driven. Meta requires a sub-15-second ACK on the POST, so we acknowledge immediately and process the LLM turn in a background task. Never block the webhook handler on the LLM call — Meta will retry, you'll respond twice.

Voice notes arrive as URLs in the payload. Download → Whisper transcript → feed text into the agent. Same code path as a typed message after that.

## What the `channel` hint does

A single string ("voice" / "whatsapp") appended to the system prompt. That's it. It tweaks response style — no separate prompts, no separate tools, no separate memory. The simplicity is the point.
