# Pitfalls — Things That Will Bite You

Every one of these has burned an engineer-day on a similar build. They're not exotic; they're the boring stuff that gets forgotten.

## WhatsApp template approval takes 24-48 hours

Even though we don't use outbound notification templates until late in the sprint, **submit them on Day 1**. They'll get rejected at least once for cosmetic reasons (a stray emoji, wrong category, missing variable description). Plan for one rejection cycle.

## Meta requires webhooks to respond fast

- Verification GET must complete in **<10 seconds**
- POST handler must respond in **<15 seconds**

If you block on the LLM call, Meta retries the webhook and the user gets duplicate responses. The handler must ACK immediately and process the LLM turn in a background task (`FastAPI.BackgroundTasks` or equivalent).

## OpenAI Realtime is expensive

~$0.06/min input audio + $0.24/min output audio. A 5-minute call costs ~$1.50 in audio alone. The client absorbs this per the contract, **but raise it explicitly before the first invoice lands.** No one likes cost surprises. See [api-alternatives.md](../decisions/api-alternatives.md) for the full breakdown.

## Twilio's audio format is not OpenAI's audio format

- Twilio sends **μ-law, 8 kHz**
- OpenAI Realtime wants **PCM16, 24 kHz**

The conversion is one function call with stdlib `audioop`. Forget it and you spend hours debugging "why does the agent hear gibberish."

## Interruption handling needs Twilio mark events

When the user interrupts the agent mid-sentence, you need to tell Twilio to stop playback. This isn't automatic. Read the Realtime docs section on `mark` events carefully — this is the thing demos most visibly get wrong.

## Voice transcripts are ephemeral

The Realtime session dies when the call ends. If you wait until call-end to write the transcript to Postgres, the data is gone. **Stream transcription events to the DB during the call** — set this up on Day 3, not Day 4.

## Hindi code-mixing

Most demos only test pure English. Real users type things like "mujhe ek slot chahiye kal evening ke liye." GPT-4o handles this fine, but **test it explicitly** or you'll discover the failure on demo day.

Also: default prompts produce stilted, translated-sounding Hindi. Spend Day 4 afternoon on prompt engineering for natural Hindi output.

## API keys

- `.env` is **gitignored**, no exceptions
- `.env.example` is committed with every required key listed (no values)
- The client owns these credentials per the contract — when they rotate them, the swap should be a one-line change

## Background-task gotchas

`FastAPI.BackgroundTasks` runs after the response is sent, in the same event loop. That's fine for fast-ack webhooks. **But** if the worker process dies mid-task, the work is lost. For Day 4 add idempotency keys on the Meta side so retries don't double-respond.

## Webhook URL stability

Both Meta and Twilio store your webhook URL on their side. If you move from `ngrok-abc.io` to `xyz.ngrok.io` to a real domain, you have to update both. Pin to a real domain on a real server by Day 3 at the latest.

## CORS, TLS, and the dev-prod gap

Meta and Twilio both require HTTPS for webhooks. `ngrok` works for development, but the certificate chain is `ngrok.io`, not your domain. Some payload-signature validation libraries care. Test the prod TLS path on Day 3, not Day 4.

## Realtime cost monitoring

Wire a counter for input/output audio seconds **per user, per call**, into Postgres on Day 3. If a bug causes a stuck session, you find out in dollars; if you instrumented, you find out in seconds. The PDF's "voice transcript streaming" note covers this — just be sure the `seconds_used` columns are part of the schema.

## Idempotency on tool calls

If the LLM retries a tool call (rare but happens), you don't want to double-book the appointment. Tool handlers must be idempotent or carry a request ID.

## Multi-turn memory edge cases

The "load last N messages" memory pattern fails when a single turn contains many tool calls — you can blow the context window with one turn of history. Cap by token count, not by message count.

## "Done" doesn't include scale testing

The Day 4 acceptance is **one** call and **one** WhatsApp conversation working end-to-end. Production load (10 concurrent calls, 100 WhatsApp users) is Phase 2 work. The proposal's `₹15-25k/mo` cost floor assumes single-digit concurrent traffic — be clear with the client about this.
