# Day-by-Day Plan

Four days for the AI sprint. Brain on Day 1, WhatsApp on Day 2, voice on Day 3, polish on Day 4.

## Pre-flight (do before Day 1)

These have lead time. Start them when the contract is signed, not on Day 1.

- [ ] Client creates Meta Business account (or shares access to existing one)
- [ ] Client submits business verification to Meta if not already verified
- [ ] Submit WhatsApp **message templates** (even placeholder ones) — approval is 24-48h and they'll get rejected once
- [ ] Buy/transfer Twilio phone number (India numbers need KYC, can take 1-3 days)
- [ ] OpenAI API key with Realtime API access enabled on the org
- [ ] AWS account access (or wherever we're hosting) with EC2 + RDS Postgres provisioned
- [ ] Domain + DNS for the webhook URL (Meta and Twilio both need stable HTTPS endpoints)

## Day 1 — Foundation

The day everything else depends on. Botch this and Days 2 and 3 eat themselves.

**Deliverables:**
- [ ] FastAPI scaffold, `Dockerfile`, `compose.yml` for local dev
- [ ] `.env.example` (committed) with every required key documented
- [ ] Postgres schema migrations (`alembic`): `users`, `conversations`, `messages`, `leads` — every table has `org_id`
- [ ] Redis client and session helper
- [ ] `AgentCore` class with one public method: `async def handle_turn(user_id, channel, input_text) -> str`
- [ ] System prompts: one base + per-channel append blocks (`voice`, `whatsapp`)
- [ ] Tool definitions (skeleton handlers OK): `capture_lead`, `book_appointment`, `transfer_to_human`, `lookup_customer`
- [ ] Memory layer: load last N messages from Postgres, format for OpenAI
- [ ] Sentry wired in (don't bolt on later)
- [ ] CLI test script: type a message, agent processes it, response prints, turn persists to DB

**Done looks like:** the CLI conversation works end-to-end — no channels involved yet, just the brain in isolation.

**Parallelizable?** No. Day 1 is a single-threaded foundation.

## Day 2 — WhatsApp

The easier channel. Request/response over HTTP, relatively forgiving.

**Deliverables:**
- [ ] Meta Cloud API webhook (GET for verification, POST for messages)
- [ ] Payload parser (extract sender ID, message text, message type, voice-note URL)
- [ ] WhatsApp adapter that calls `agent_core.handle_turn(...)` and sends response back via the Cloud API
- [ ] **Fast-ack pattern:** webhook responds <15s, LLM call runs in `BackgroundTasks`. Never block the webhook.
- [ ] Voice-note handling: download audio from Meta URL, run through Whisper, feed transcript to the agent
- [ ] Tests in Hindi, English, and Hinglish ("mujhe appointment book karna hai kal ke liye")
- [ ] Rate limiting on the webhook (slowapi + Redis)

**Done looks like:** Send "hi" to the test WhatsApp number, get a sensible response. Try Hindi. Try a voice note. Try a multi-turn conversation ("book me an appointment" → "for tomorrow") — agent must remember context.

**Parallelizable?** Yes — once Day 1 is done, Day 2 (WhatsApp) and Day 3 (voice) can be done in parallel by two engineers.

## Day 3 — Voice (the hard day)

Where time disappears if you're not careful. Budget the whole day. Don't let other work slip onto it.

**Deliverables:**
- [ ] Twilio inbound webhook returning TwiML with `<Connect><Stream>`
- [ ] WebSocket endpoint that bridges Twilio audio (μ-law 8 kHz) ↔ OpenAI Realtime (PCM16 24 kHz) using `audioop`
- [ ] Realtime session setup: **same** system prompt and tools as WhatsApp, with "voice mode" instruction appended
- [ ] Tool-call interception: when Realtime emits a tool call, run it through the same handlers WhatsApp uses
- [ ] **Interruption handling**: when user interrupts, send Twilio `mark` events to stop playback (this is the thing demos visibly get wrong)
- [ ] **Voice transcript streaming to Postgres during the call** (not at end-of-call — session dies)
- [ ] Outbound: `POST /calls/initiate` endpoint that uses Twilio's REST API to dial out
- [ ] Hindi voice selection — `alloy` and `shimmer` are both decent

**Pro tip:** Start from Twilio's reference repo for the Media Streams + OpenAI Realtime bridge. Don't write the WebSocket dance from scratch — it's been solved well.

**Done looks like:** Call the Twilio number, talk to the agent in Hindi or English, complete a task (capture a name and book a tentative appointment), interrupt mid-sentence and the agent stops.

**Parallelizable?** Runs in parallel with Day 2 once Day 1 is done.

## Day 4 — Wire, test, polish

Unglamorous work that determines whether the demo holds up.

**Deliverables:**
- [ ] `GET /conversations/{user_id}` — returns recent transcripts as JSON
- [ ] Error handling: OpenAI 5xx mid-conversation → graceful fallback ("Sorry, one moment"), retry once, escalate if still failing
- [ ] `/health` and `/ready` endpoints
- [ ] Five end-to-end test scenarios per channel, run twice each
- [ ] One-page README: how to add a tool, how to change the prompt, how to swap LLM providers, what each env var does
- [ ] Hindi response polish — default prompts produce stilted translated-sounding Hindi. Real prompt engineering on Day 4 afternoon.

**Done looks like:** Run through every scenario from [How we know we're done](#how-we-know-were-done). All four pass.

## How we know we're done

By Day 4 evening, the demo covers:

1. A WhatsApp conversation in Hindi that captures a lead
2. A phone call in English where the agent books an appointment
3. Transcripts visible in the Postgres database
4. The system surviving a deliberate OpenAI outage gracefully (it apologizes and recovers, no crash)

If all four work, the AI sprint is done. Everything else is the next phase.

## Out of scope this sprint

(From the proposal — Phase 2+ work.)

- Admin dashboard
- Billing / subscriptions / Razorpay / Stripe
- Multi-tenant onboarding flow (we *are* building schema with `org_id`, just not the tenant-management UI)
- Campaign management, broadcast messaging, follow-up sequences
- Call recording analytics dashboard (data will exist in Postgres; the dashboard is later)
