# Diagrams

ASCII first. They render in any editor, copy cleanly into Slack/email, and don't drift away from the code.

## 1. System overview

```
                          External world
        +---------------------------+---------------------------+
        |                                                       |
   Twilio Voice                                       WhatsApp Cloud API
   (μ-law 8 kHz)                                       (HTTPS JSON)
        |                                                       |
        | WebSocket                                             | webhook POST
        v                                                       v
   +--------------------+                          +--------------------+
   |  Voice adapter     |                          |  WhatsApp adapter  |
   |  (realtime bridge, |                          |  (payload parser,  |
   |   PCM16 conversion)|                          |   send client)     |
   +---------+----------+                          +----------+---------+
             \                                                /
              \                                              /
               v                                            v
        +-------------------------------------------------------+
        |                       AGENT CORE                      |
        |   handle_turn(user_id, channel, input_text) -> str    |
        |                                                       |
        |   prompts   tools   memory   llm_wrapper   routing    |
        +---------+----------------+----------------+-----------+
                  |                |                |
                  v                v                v
              OpenAI            Postgres          Redis
           GPT-4o + Realtime    (history,        (session
                                 leads, users)    state, RL)
```

## 2. WhatsApp message sequence

```
User      Meta Cloud API     FastAPI webhook     Agent Core     OpenAI       Postgres
  |              |                  |                |              |              |
  |--message---->|                  |                |              |              |
  |              |--POST webhook--->|                |              |              |
  |              |<-----200 OK------|  (immediate ack, <15s)        |              |
  |              |                  |---bg task----->|              |              |
  |              |                  |                |--load hist-->|              |
  |              |                  |                |<--history----|              |
  |              |                  |                |--chat req--->|              |
  |              |                  |                |<-response----|              |
  |              |                  |                |--save msg--->|              |
  |              |<--send message---|<---response----|              |              |
  |<--reply------|                  |                |              |              |
```

Key invariant: the 200 OK goes back **before** the LLM call starts. If you reverse that order, Meta retries and your user sees duplicates.

## 3. Voice call sequence

```
User       Twilio        FastAPI       Realtime Bridge    OpenAI Realtime   Postgres
  |          |             |                 |                  |             |
  |--call--->|             |                 |                  |             |
  |          |--POST------>|                 |                  |             |
  |          |<-TwiML------|                 |                  |             |
  |          | (Connect+Stream)              |                  |             |
  |          |---WebSocket start------------>|                  |             |
  |          |                               |--session.create->|             |
  |          |                               |<--session.created|             |
  |<==audio==|<--μ-law audio (8kHz)----------|                  |             |
  |          |                               |--PCM16 (24kHz)-->|             |
  |          |                               |<--audio response-|             |
  |          |<--μ-law audio-----------------|                  |             |
  |<==audio==|                               |                  |             |
  |          |                               |--transcript-----------------> (stream)
  | (user interrupts)                        |                  |             |
  |          |--user audio------------------>|                  |             |
  |          |                               |---input.commit-->|             |
  |          |<--mark stop-------------------|                  |             |
  |          |                               |                  |             |
  |          |                               | (tool call from Realtime)      |
  |          |                               |--handler exec--->|             |
  |          |                               |--tool result---->|             |
  |          |<--μ-law audio-----------------|<--continuation---|             |
  |<==audio==|                               |                  |             |
  | hangs up |                               |                  |             |
  |          |---WebSocket close------------>|                  |             |
  |          |                               |--final transcript----------->  |
```

Two things to notice:
1. Audio format converts at the bridge — μ-law 8 kHz ↔ PCM16 24 kHz.
2. Transcript writes happen during the call (streaming arrow). If you batch them at WebSocket close, you'll lose data on dropped calls.

## 4. Tool-call flow (shared across both channels)

```
                +---------------------+
                |    Agent Core       |
                | (channel-agnostic)  |
                +----------+----------+
                           |
                           |  emit tool_call(name, args)
                           v
                +---------------------+
                |   tools.py          |
                |   dispatch table    |
                +----------+----------+
                           |
        +------------------+------------------+------------------+
        v                  v                  v                  v
+---------------+  +---------------+  +---------------+  +---------------+
| capture_lead  |  | book_appoint. |  | transfer_human|  | lookup_cust.  |
| (Postgres     |  | (calendar /   |  | (queue + SMS) |  | (Postgres     |
|  INSERT lead) |  |  external)    |  |               |  |  SELECT)      |
+-------+-------+  +-------+-------+  +-------+-------+  +-------+-------+
        \                  |                  |                  /
         \                 v                  v                 /
          +-------------> return tool_result <------------------+
                           |
                           v
                +---------------------+
                |    Agent Core       |
                | (continues turn)    |
                +---------------------+
```

The point: **one** dispatch table. Both voice (Realtime tool events) and WhatsApp (GPT-4o tool calls) hit the same code. If you find yourself writing two implementations, stop — the architecture has slipped.

## 5. Data model

```
+---------------+       +-------------------+       +-------------------+
|    users      |       |   conversations   |       |     messages      |
+---------------+       +-------------------+       +-------------------+
| id (uuid) PK  |<------| user_id   FK      |<------| conversation_id FK|
| org_id  FK    |       | id (uuid) PK      |       | id (uuid)    PK   |
| phone         |       | org_id    FK      |       | role              |
| name          |       | channel           |       | content           |
| created_at    |       | started_at        |       | channel           |
+---------------+       | ended_at  (null)  |       | tokens_in         |
                        +-------------------+       | tokens_out        |
                                                    | audio_secs (null) |
                                                    | created_at        |
                                                    +-------------------+

+---------------+
|    leads      |
+---------------+
| id (uuid) PK  |
| org_id   FK   |
| user_id  FK   |
| name          |
| phone         |
| intent        |
| metadata jsonb|
| created_at    |
+---------------+
```

Every table has `org_id`. The proposal's no-vendor-lock-in + multi-tenant Phase 2 requirements both depend on this column being there from Day 1.

`audio_secs` on `messages` is null for text, populated for voice — enables per-call cost tracking without joining a separate billing table.
